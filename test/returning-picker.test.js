import test from 'node:test';
import assert from 'node:assert/strict';
import {answerConversation,newConversation,normalizeConversation} from '../src/core/conversation.js';
import {createConversationClient,conversationStorageKey} from '../src/server/public/shared/conversation-client.js';
import {createSelectionArchive} from '../src/server/public/shared/selection-archive.js';
import {savedPickerSession,isArchivedResult} from '../src/server/public/shared/saved-picker-session.js';
import {readUsualPlatform,saveUsualPlatform} from '../src/server/public/shared/game-platform.js';
import {selectionModeChooser} from '../src/server/public/shared/selection-mode.js';

function storage(){
 const rows=new Map();return {getItem:key=>rows.get(key)??null,setItem:(key,value)=>rows.set(key,value),removeItem:key=>rows.delete(key)};
}
const direction=(text='Хочу головоломку',platform='linux')=>({type:'answer',questionId:'direction',selected:[],kind:'answer',platform,text});

test('a saved game platform skips only its own question, survives resume and follows the direction turn on Back',()=>{
 const fresh=newConversation({requireDirection:true,savedSource:{version:1,domain:'game',ids:['10']}});
 const next=answerConversation(fresh,direction());
 assert.deepEqual(next.context,{platform:'linux',company:null,partySize:null});
 assert.equal(next.question.id,'company');assert.equal(next.turns.length,1);
 const company=answerConversation(normalizeConversation(next),{type:'answer',questionId:'company',selected:['solo']});
 const correction=answerConversation(company,{type:'correct',text:'Сегодня всё-таки играю на Steam Deck'});
 assert.equal(correction.question.id,'platform');assert.deepEqual(correction.context,{platform:null,company:'solo',partySize:null});
 const changed=answerConversation(normalizeConversation(correction),{type:'answer',questionId:'platform',selected:['deck']});
 assert.equal(changed.context.platform,'deck');assert.equal(changed.context.company,'solo');assert.notEqual(changed.question?.id,'company');
 const undoChange=answerConversation(correction,{type:'back'});assert.equal(undoChange.context.platform,'linux');
 const group=answerConversation(next,{type:'answer',questionId:'company',selected:['group']});
 const clarified=answerConversation(group,{type:'correct',text:'Сегодня играем на Mac'});
 assert.equal(answerConversation(clarified,{type:'answer',questionId:'platform',selected:['mac']}).question.id,'party');
 const back=answerConversation(company,{type:'back'});assert.deepEqual(back.context,next.context);
 const first=answerConversation(back,{type:'back'});assert.equal(first.question.id,'direction');assert.equal(first.context.platform,null);
 assert.equal(answerConversation(next,{type:'restart'}).context.platform,null);
 assert.deepEqual(next.savedSource,fresh.savedSource);
 for(const text of ['Сегодня играю на Steam Deck','На Mac или на ПК','На консоли, а не за компьютером','Сегодня не на линуксе']){
  const conflicting=answerConversation(fresh,direction(text));assert.equal(conflicting.context.platform,null,text);assert.equal(conflicting.question.id,'platform');
 }
 assert.equal(answerConversation(fresh,direction('Хочу строить города','unrecognized')).question.id,'platform');
 assert.equal(answerConversation(fresh,direction('Сегодня хочу спокойный платформер')).question.id,'company');
});

test('retries reread taste revisions and suppressed history while preserving the exclusions of the action',async()=>{
 const bodies=[],rows=[{id:'pref',domain:'film',text:'Первое предпочтение',revision:1,source:{kind:'manual'}}];
 let exclusions=['old'],reviews=[{note:'dirty-review'}];
 const c=createConversationClient({domain:'film',storage:storage(),localStart:true,tasteMemory:()=>rows,
  qualityFeedback:()=>reviews,rememberedExclusions:()=>exclusions,fetch:async(_,init)=>{
   const body=JSON.parse(init.body);bodies.push(body);if(bodies.length<3)throw TypeError('offline');
   return {ok:true,json:async()=>({state:body.state,screen:{domain:'film',type:'question',question:body.state.question}})};
  }});
 c.chooseDepth('standard');await c.send({type:'review'});
 rows[0]={...rows[0],text:'Новая формулировка',revision:2};exclusions=['new'];reviews=[];
 await c.retry();rows.length=0;await c.retry();
 assert.deepEqual(bodies.map(body=>body.tasteMemory?.map(row=>row.text)),[['Первое предпочтение'],['Новая формулировка'],[]]);
 assert.deepEqual(bodies[1].rememberedExclusions,['old']);assert.equal(bodies[1].qualityFeedback,undefined);
 assert.equal(c.state.tasteMemory,undefined);
});

test('a general archived result opens offline without replacing the active draft and modes label a revisit explicitly',async()=>{
 const store=storage(),tab=storage(),domain='film',result={top:{id:'old'},alternatives:[]};
 const ordinary=createConversationClient({domain,storage:store,localStart:true});ordinary.chooseDepth('deep');ordinary.saveDraft('wish',{text:'Новый вечер'});
 const before=store.getItem(conversationStorageKey(domain));
 const archived=createSelectionArchive({storage:store}).capture({state:{version:1,domain,id:'archive',revision:5,phase:'result',turns:[],result},screen:{domain,type:'result',result}});
 const route=savedPickerSession({params:new URLSearchParams({domain,selection:archived.id}),domain,storage:store,session:tab});
 let calls=0;const c=createConversationClient({domain,localStart:true,storage:route.draftStorage,storageKey:route.key,archiveStorage:store,selectionId:route.selection,fetch:async()=>{calls++;throw TypeError('offline');}});
 await c.start();assert.equal(calls,0);assert.equal(c.error,null);assert.deepEqual(c.screen.result,result);
 assert.equal(isArchivedResult(route,c.state),true);
 assert.equal(isArchivedResult(route,{...c.state,result:{top:{id:'next'}}}),false);
 assert.equal(isArchivedResult(route,{...c.state,id:'new-visit'}),false);
 assert.equal(store.getItem(conversationStorageKey(domain)),before);
 for(const param of ['selection','archive','savedArchive']){
  assert.equal(savedPickerSession({params:new URLSearchParams({domain,[param]:''}),domain,storage:store,session:tab}).missing,true);
 }
 for(const [type,text] of [['result','Открыть прошлый результат'],['question','Продолжить черновик']]){
  const html=selectionModeChooser({intent:'new',canResume:true,resumeType:type});assert.ok(html.includes(text));assert.match(html,/Новый подбор/);
 }
});

test('the platform default stores just a supported platform on an explicit write and can be removed',()=>{
 const data=storage();assert.equal(readUsualPlatform(data),null);
 assert.ok(saveUsualPlatform(data,'deck'));assert.equal(readUsualPlatform(data),'deck');
 assert.equal(saveUsualPlatform(data,{platform:'linux',company:'friend'}),false);assert.equal(readUsualPlatform(data),'deck');
 assert.ok(saveUsualPlatform(data,''));assert.equal(readUsualPlatform(data),null);
 assert.equal(saveUsualPlatform(null,'linux'),false);
});
