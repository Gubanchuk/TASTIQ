import test from 'node:test';
import assert from 'node:assert/strict';
import { createConversationClient, CONVERSATION_KEY } from '../src/server/public/shared/conversation-client.js';

const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
const state=(revision=0,id='one')=>({version:1,id,revision,mode:'guided',phase:'talk',turns:[],facts:[],context:{},question:{id:'direction',title:'Что сегодня?',options:[],controls:['unknown']}});
const response=(revision=0,id='one')=>({state:state(revision,id),screen:{type:'question',question:state().question,canBack:revision>0}});
const ok=data=>({ok:true,json:async()=>data});
const defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};

test('start and reload only send actionless resume and retain typed draft',async()=>{
 const store=storage(),bodies=[];const fetch=async(_,opts)=>{bodies.push(JSON.parse(opts.body));return ok(response());};
 const first=createConversationClient({fetch,storage:store});await first.start();first.saveDraft('direction',{text:'Хочу историю',selected:['story']});
 const restored=createConversationClient({fetch,storage:store});assert.equal(restored.draft('direction').text,'Хочу историю');await restored.start();
 assert.equal(bodies.length,2);assert.equal(bodies[1].action,undefined);assert.equal(bodies[1].state.id,'one');assert.ok(store.getItem(CONVERSATION_KEY));
});
test('back invalidates a pending answer even if it resolves after the back',async()=>{
 const slow=defer();let count=0;const client=createConversationClient({storage:storage(),fetch:async()=>++count===1?ok(response(2)):count===2?slow.promise:ok(response(3))});
 await client.start();const pending=client.send({type:'answer',questionId:'direction',selected:[],text:'старый ответ'});await client.send({type:'back'});slow.resolve(ok(response(4)));await pending;assert.equal(client.state.revision,3);
});
test('restart invalidates late answer for old identity',async()=>{
 const slow=defer();let count=0;const client=createConversationClient({storage:storage(),fetch:async()=>++count===1?ok(response()):count===2?slow.promise:ok(response(0,'new'))});
 await client.start();const pending=client.send({type:'answer'});await client.send({type:'restart'});slow.resolve(ok(response(1)));await pending;assert.equal(client.state.id,'new');
});
test('response from a different conversation or older revision is rejected',async()=>{
 let next=response(4);const client=createConversationClient({storage:storage(),fetch:async()=>ok(next)});await client.start();next=response(3);await client.send({type:'review'});assert.equal(client.state.revision,4);assert.ok(client.error);next=response(5,'other');await client.send({type:'review'});assert.equal(client.state.id,'one');
});
test('network retry repeats identical input rather than replaying as a new answer',async()=>{
 const bodies=[];let fail=false;const client=createConversationClient({storage:storage(),fetch:async(_,opts)=>{bodies.push(opts.body);if(fail){fail=false;throw TypeError('Failed to fetch');}return ok(response(bodies.length));}});
 await client.start();fail=true;await client.send({type:'answer',questionId:'direction',text:'История',selected:[]});assert.match(client.error,/Нет связи с сервером/);await client.retry();assert.equal(bodies[1],bodies[2]);assert.equal(client.error,null);
});
test('drafts survive pending render and failed request; restart clears them',async()=>{
 const client=createConversationClient({storage:storage(),fetch:async()=>ok(response())});await client.start();client.saveDraft('direction',{text:'Не потерять',selected:['story']});await client.send({type:'review'});assert.equal(client.draft('direction').text,'Не потерять');await client.send({type:'restart'});assert.equal(client.draft('direction').text,'');
});
test('corrupt storage and unavailable storage fall back to memory',async()=>{
 const store={getItem:()=>'{bad',setItem:()=>{throw Error();}};const client=createConversationClient({storage:store,fetch:async()=>ok(response())});await client.start();client.saveDraft('direction',{text:'Текст'});assert.equal(client.draft('direction').text,'Текст');assert.equal(client.persistent,false);
});
test('starting from saved error never retries paid action on reload',async()=>{
 const store=storage();let fail=false;const bodies=[];const fetch=async(_,opts)=>{bodies.push(JSON.parse(opts.body));if(fail)throw Error();return ok(response());};
 const first=createConversationClient({fetch,storage:store});await first.start();fail=true;await first.send({type:'confirm'});fail=false;const second=createConversationClient({fetch,storage:store});await second.start();assert.equal(bodies.at(-1).action,undefined);
});
test('planner failure with a committed answer retries from returned state, keeping draft',async()=>{
 const bodies=[];const client=createConversationClient({storage:storage(),fetch:async(_,opts)=>{
  bodies.push(JSON.parse(opts.body));return ok(bodies.length===2?{...response(1),error:'Модель недоступна',retryable:true}:response(bodies.length));
 }});await client.start();client.saveDraft('direction',{text:'Спокойная стратегия',selected:[]});
 await client.send({type:'answer',questionId:'direction',text:'Спокойная стратегия',selected:[]});assert.ok(client.error);
 const committed=client.state;await client.retry();assert.deepEqual(bodies[2].action,{type:'retry'});assert.deepEqual(bodies[2].state,committed);assert.equal(client.draft('direction').text,'Спокойная стратегия');
});
test('failed restart retry accepts the fresh conversation identity and clears drafts',async()=>{
 let count=0;const client=createConversationClient({storage:storage(),fetch:async()=>{
  count++;if(count===2)throw Error('offline');return ok(count===1?response():response(0,'new'));
 }});await client.start();client.saveDraft('direction',{text:'Старый ответ'});await client.send({type:'restart'});assert.ok(client.error);await client.retry();assert.equal(client.state.id,'new');assert.equal(client.draft('direction').text,'');
});
test('malformed saved draft is safe and never grows beyond input limits',()=>{
 const store=storage();store.setItem(CONVERSATION_KEY,JSON.stringify({version:1,drafts:{direction:{text:4,selected:'story',kind:'invalid'}}}));
 const client=createConversationClient({storage:store});assert.deepEqual(client.draft('direction'),{text:'',selected:[],kind:'answer'});
 client.saveDraft('direction',{text:'я'.repeat(1700),selected:['story',null,5],kind:'none'});assert.equal(client.draft('direction').text.length,1600);assert.deepEqual(client.draft('direction').selected,['story']);
});

test('explicit remembered exclusions travel on restore and new actions without changing a network retry',async()=>{
 const bodies=[];let exclusions=['steam:1'],fail=false;
 const client=createConversationClient({storage:storage(),rememberedExclusions:()=>exclusions,fetch:async(_,opts)=>{
  bodies.push(JSON.parse(opts.body));if(fail){fail=false;throw Error('offline');}return ok(response(bodies.length));
 }});
 await client.start();assert.deepEqual(bodies[0].rememberedExclusions,['steam:1']);
 exclusions=['steam:2'];fail=true;await client.send({type:'confirm'});exclusions=[];await client.retry();
 assert.deepEqual(bodies[1].rememberedExclusions,['steam:2']);assert.deepEqual(bodies[2],bodies[1]);
 await client.send({type:'review'});assert.deepEqual(bodies.at(-1).rememberedExclusions,[]);
});

test('restart preserves a free restorable previous conversation and its drafts across reload',async()=>{
 const store=storage(),bodies=[];
 const fetch=async(_,opts)=>{const b=JSON.parse(opts.body);bodies.push(b);return ok(b.action?.type==='restart'?response(0,'new'):b.state?{state:b.state,screen:response().screen}:response(3));};
 const client=createConversationClient({storage:store,fetch});await client.start();client.saveDraft('direction',{text:'Не потерять'});
 await client.send({type:'restart'});assert.equal(client.state.id,'new');assert.equal(client.canRestorePrevious,true);
 const reload=createConversationClient({storage:store,fetch});await reload.start();assert.equal(reload.canRestorePrevious,true);
 await reload.restorePrevious();assert.equal(reload.state.id,'one');assert.equal(reload.draft('direction').text,'Не потерять');
 assert.equal(bodies.at(-1).action,undefined);assert.equal(reload.canRestorePrevious,false);
});
