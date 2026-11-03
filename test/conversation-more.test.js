import test from 'node:test';
import assert from 'node:assert/strict';
import {createConversationService} from '../src/server/conversation-service.js';
import {createMediaConversationService} from '../src/server/media-conversation-service.js';
import {initialConversation} from '../src/server/public/shared/conversation-entry.js';
import {game,title,fixtureCatalog,screenFixture} from './fixture.js';
import {makeCatalog} from '../src/core/catalog.js';
import {computeIdf} from '../src/core/idf.js';
import {rankAll} from '../src/core/recommend.js';
import {profileOf,sessionOf} from '../src/core/dialogue.js';
import {aiPick} from '../src/ai/pick.js';
const cards=result=>[result?.top,...(result?.alternatives??[])].filter(Boolean);
function setup(domain,overrides={}){
 const items=Array.from({length:18},(_,i)=>domain==='game'?game(101+i,`Game ${i}`,{'story.central':1}):title(`t${i}`,`Title ${i}`,domain,{'humor.funny':1,'format.animation':1}));
 const base=domain==='game'?fixtureCatalog(items):screenFixture(domain);
 const catalog=domain==='game'?base:makeCatalog({...base,items,...computeIdf(items)},domain);
 let calls=0;const service=(domain==='game'?createConversationService:createMediaConversationService)({domain,catalogs:{[domain]:catalog},pick:async(_,legacy)=>{
  calls++;return {picks:rankAll(catalog,profileOf(legacy),sessionOf(legacy)).ranked.slice(0,4).map(r=>({id:r.game.id,reason:'stub'}))};
 },...overrides});
 const state=initialConversation({domain,id:`more-${domain}`});if(domain==='game')state.context={platform:'windows',company:'solo',partySize:null};
 Object.assign(state,{phase:'result',summary:'История на вечер',question:null,result:{top:{id:items[0].id,domain,name:'First'},alternatives:items.slice(1,4).map(x=>({id:x.id,domain,name:x.name}))}});
 return {service,state,calls:()=>calls,domain};
}
for(const domain of ['game','film','series','cartoon'])test(`${domain}: more preserves the request, avoids all shown works, never infers familiarity, supports undo`,async()=>{
 const {service,state,calls}=setup(domain),seen=new Set(cards(state.result).map(c=>c.id));let current=state,previous;
 for(let i=0;i<3;i++){
  previous=current;const out=await service({domain,state:current,action:{type:'more'}});assert.equal(out.error,undefined);current=out.state;
  assert.ok(cards(current.result).length);for(const card of cards(current.result)){assert.ok(!seen.has(card.id),card.id);assert.equal(card.ai?.reason,'stub');seen.add(card.id);}
  assert.deepEqual(current.turns,state.turns);assert.deepEqual(current.facts,state.facts);assert.deepEqual(current.context,state.context);
  assert.deepEqual(current.familiar.excluded,[]);assert.deepEqual(current.familiar.marked,[]);assert.deepEqual(current.familiar.hidden,[]);assert.deepEqual(current.familiar.keep,[]);assert.equal(current.summary,state.summary);
 }
 assert.equal(calls(),3);
 const undo=await service({domain,state:current,action:{type:'undo_replacement'}});assert.deepEqual(undo.state.result,previous.result);
 const next=await service({domain,state:undo.state,action:{type:'more'}});for(const card of cards(next.state.result))assert.ok(!seen.has(card.id));
});
for(const domain of ['game','film'])test(`${domain}: more failure preserves cards; explicit retry retains the operation and access guard`,async()=>{
 let fail=true,calls=0;const {service,state}=setup(domain,{pick:async()=>{calls++;return fail?{error:'offline'}:{picks:[{id:domain==='game'?'110':'t10'}]};}});
 const failed=await service({domain,state,action:{type:'more'}});assert.equal(failed.state.failedAction,'more');assert.deepEqual(failed.state.result,state.result);
 fail=false;const retry=await service({domain,state:failed.state,action:{type:'retry'}});assert.equal(retry.error,undefined);assert.equal(calls,2);assert.notEqual(retry.state.result.top.id,state.result.top.id);
 const guarded=setup(domain,{access:()=>({allowed:false,reason:'limit'}),pick:async()=>{throw Error('must not call');}});
 const blocked=await guarded.service({domain,state:guarded.state,action:{type:'more'}});assert.match(blocked.error,/limit/);assert.equal(blocked.retryable,false);assert.deepEqual(blocked.state.result,guarded.state.result);
});
for(const domain of ['game','film'])test(`${domain}: more coalesces duplicate requests, rejects recycled IDs, and reports exhaustion without losing the last page`,async()=>{
 const {service,state,calls}=setup(domain);
 const body={domain,state,action:{type:'more'}};const [a,b]=await Promise.all([service(body),service(body)]);
 assert.deepEqual(a,b);assert.equal(calls(),1);
 let current=a.state,seen=new Set([...cards(state.result),...cards(a.state.result)].map(c=>c.id)),failed;
 for(let i=0;i<20;i++){
  const out=await service({domain,state:current,action:{type:'more'}});
  if(out.error){failed=out;break;}
  for(const card of cards(out.state.result)){assert.ok(!seen.has(card.id));seen.add(card.id);}
  current=out.state;
 }
 assert.ok(failed);assert.equal(failed.retryable,false);assert.deepEqual(failed.state.result,current.result);
 const recycled=setup(domain,{pick:async()=>({picks:[{id:state.result.top.id}]})});
 const invalid=await recycled.service({domain,state:recycled.state,action:{type:'more'}});
 assert.ok(invalid.error);assert.deepEqual(invalid.state.result,recycled.state.result);
});

for(const domain of ['game','film','series','cartoon'])test(`${domain}: real more prompt treats shown cards as neutral pagination, preserving actual exclusions`,async()=>{
 let prompt;const {service,state}=setup(domain,{pick:async(catalogs,legacy,options)=>aiPick(catalogs,legacy,{...options,api:async request=>{
  prompt=request.input;const catalog=catalogs[domain];
  const picks=rankAll(catalog,profileOf(legacy),sessionOf(legacy)).ranked.slice(0,4).map(r=>({id:r.game.id,reason:'stub',caveat:'caveat'}));
  return {status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({picks})}]}]};
 }})});
 state.browseSeen=[domain==='game'?'110':'t10'];state.familiar.excluded=[domain==='game'?'115':'t15'];
 const out=await service({domain,state,action:{type:'more'}});assert.equal(out.error,undefined);
 const old=domain==='game'?'Game 9':'Title 10',banned=domain==='game'?'Game 14':'Title 15';
 const rejection=prompt.split('\n').find(line=>line.startsWith('Отказался сейчас'))??'';
 assert.ok(rejection.includes(banned));assert.ok(!rejection.includes(old));
 assert.doesNotMatch(prompt,/Уже показано и не устроило/);
 const neutral=prompt.split('\n').find(line=>line.startsWith('Уже показано для выбора'))??'';
 assert.ok(neutral.includes(old));assert.match(neutral,/не означает отказ|не означает неприязнь/);
});
