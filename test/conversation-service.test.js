import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createConversationService} from '../src/server/conversation-service.js';
import {newConversation,answerConversation,applyConversationProposal} from '../src/core/conversation.js';
import {fixtureCatalog} from './fixture.js';
import {rankAll} from '../src/core/recommend.js';
import {profileOf,sessionOf} from '../src/core/dialogue.js';
import {aiPick} from '../src/ai/pick.js';
const catalog=fixtureCatalog(), catalogs={game:catalog};
const reply=(s,id,text='')=>answerConversation(s,{type:'answer',questionId:s.question.id,selected:id?[id]:[],text,kind:'answer'});
function pending(){let s=newConversation({id:'service'});s=reply(s,'rpg');s=reply(s,'windows');return reply(s,'solo');}
const q={id:'experience',title:'Что хочется от игры?',why:'Уточним цель',options:[],multiple:true,controls:['unknown','indifferent','none']};
const proposal={summary:'Ищем RPG',facts:[],uncertainties:[],action:'question',question:q};
const goodPlan=async()=>({proposal,usage:{input_tokens:100,output_tokens:50},model:'stub'});
test('initial and actionless restore never trigger paid planning',async()=>{
  let calls=0;const service=createConversationService({catalogs,plan:async()=>{calls++;return goodPlan();}});
  const start=await service({mode:'free'}); assert.equal(start.state.mode,'free');assert.equal(start.screen.question.id,'direction');
  await service({state:pending()});assert.equal(calls,0);
});
test('duplicate requests share in-flight planner and successful cache',async()=>{
  let calls=0,release;const wait=new Promise(r=>release=r);
  const service=createConversationService({catalogs,plan:async()=>{calls++;await wait;return goodPlan();}});
  const body={state:pending(),action:{type:'retry'}};
  const a=service(body),b=service(body);release(); const [x,y]=await Promise.all([a,b]);
  assert.equal(calls,1);assert.deepEqual(x,y);assert.equal(x.screen.question.id,'experience');
  await service(body);assert.equal(calls,1);
});
test('failed interpretation preserves the answer and offers explicit retry without accepting invented evidence',async()=>{
  const service=createConversationService({catalogs,plan:async()=>({error:'проверочный отказ'})});
  const out=await service({state:pending(),action:{type:'retry'}});
  assert.equal(out.state.turns.length,3);assert.equal(out.retryable,true);assert.equal(out.state.failedAction,'plan');
  assert.ok(out.screen.question);assert.match(out.error,/отказ/);
});
test('review is free and confirmed final picks use the same adapter for both modes',async()=>{
  let plans=0,picks=0,seen=[];
  const service=createConversationService({catalogs,plan:async()=>{plans++;return goodPlan();},pick:async(_,s)=>{picks++;seen.push(s);return {picks:[{id:'2',reason:'По словам',caveat:'Есть риск'}],understood:'Понял'};}});
  for(const mode of ['guided','free']){
    const state={...pending(),id:mode,mode};const review=await service({state,action:{type:'review'}});
    assert.equal(review.screen.type,'review');
    const out=await service({state:review.state,action:{type:'confirm'}});
    assert.equal(out.screen.type,'result');assert.equal(out.screen.result.top.id,'2');assert.ok(out.feedbackState);
  }
  assert.equal(plans,0);assert.equal(picks,2);assert.deepEqual(seen[0].session,seen[1].session);
});
test('stale question action is rejected before any paid call',async()=>{
  let calls=0;const service=createConversationService({catalogs,plan:async()=>{calls++;return goodPlan();}});
  await assert.rejects(()=>service({state:newConversation(),action:{type:'answer',questionId:'wrong',text:'test'}}),/уже изменился/);
  assert.equal(calls,0);
});
test('disabled AI provides explicit local recovery and provisional engine results, without spending',async()=>{
  let calls=0;const service=createConversationService({catalogs,access:()=>({allowed:false,reason:'AI выключен'}),spend:()=>calls++,plan:goodPlan});
  const out=await service({state:pending(),action:{type:'retry'}});
  assert.equal(calls,0);assert.ok(out.screen.question);assert.equal(out.retryable,false);
  const review=await service({state:out.state,action:{type:'review'}});
  const result=await service({state:review.state,action:{type:'confirm'}});
  assert.equal(result.screen.type,'result');assert.equal(result.screen.provisional,true);assert.equal(calls,0);
});

const resultState=()=>({...pending(),phase:'result',needsPlan:false,summary:'Сегодня нужна история',result:{top:{id:'1',name:'Old',ai:{reason:'Старое объяснение'}},alternatives:[{id:'3',name:'Keep',ai:{reason:'Оставить'}}],ai:{model:'old'}}});
test('batch replaces only marked slots once, preserves goal and untouched cards, excludes editions and restores for free',async()=>{
  let plans=0,picks=0,candidates;
  const service=createConversationService({catalogs,plan:async()=>{plans++;return goodPlan();},pick:async(_,s)=>{
    picks++;candidates=rankAll(catalog,profileOf(s),sessionOf(s)).ranked.map(r=>r.game.id);
    assert.equal(s.conversation.summary,'Сегодня нужна история');
    return {picks:[{id:'2',reason:'Не должно пройти'},{id:'4',reason:'Новое объяснение',caveat:'Оговорка'}],model:'stub'};
  }});
  const original=resultState();
  const marked=await service({state:original,action:{type:'familiar_mark',id:'1'}});
  assert.equal(picks,0);assert.equal(plans,0);assert.equal(marked.state.result.top.id,'1');
  const replaced=await service({state:marked.state,action:{type:'replace_familiar'}});
  assert.equal(picks,1);assert.equal(plans,0);assert.ok(!candidates.includes('1'));assert.ok(!candidates.includes('2'));assert.ok(!candidates.includes('3'));
  assert.equal(replaced.state.result.top.id,'4');assert.equal(replaced.state.result.top.ai.reason,'Новое объяснение');
  assert.deepEqual(replaced.state.result.alternatives[0],original.result.alternatives[0]);assert.deepEqual(replaced.feedbackCarry.retainedIds,['3']);
  const restored=await service({state:replaced.state,action:{type:'undo_replacement'}});
  assert.deepEqual(restored.state.result,original.result);assert.deepEqual(restored.state.familiar.marked,['1']);assert.equal(picks,1);
});

test('replacement errors retain cards and marks; retry replaces without planning and partial result keeps unresolved slots',async()=>{
  let calls=0;
  const service=createConversationService({catalogs,plan:async()=>{throw Error('planner must stay unused');},pick:async()=>++calls===1?{error:'offline'}:{picks:[{id:'4',reason:'Fresh'}]}});
  let out=await service({state:resultState(),action:{type:'familiar_mark',id:'1'}});
  out=await service({state:out.state,action:{type:'familiar_mark',id:'3'}});
  const before=out.state.result;
  out=await service({state:out.state,action:{type:'replace_familiar'}});
  assert.equal(out.state.phase,'result');assert.deepEqual(out.state.result,before);assert.deepEqual(out.state.familiar.marked,['1','3']);assert.equal(out.state.failedAction,'replace');
  out=await service({state:out.state,action:{type:'retry'}});
  assert.equal(calls,2);assert.equal(out.state.result.top.id,'4');assert.equal(out.state.result.alternatives[0].id,'3');
  assert.deepEqual(out.state.familiar.marked,['3']);assert.deepEqual(out.state.replacement.unresolvedIds,['3']);assert.ok(out.state.replacement.notice);
});

test('remembered exclusions survive restart, hide editions without banning a series and respect keep-return',async()=>{
  let seen;
  const service=createConversationService({catalogs,pick:async(_,s)=>{seen=rankAll(catalog,profileOf(s),sessionOf(s)).ranked.map(r=>r.game.id);return {picks:[{id:'3',reason:'Fresh'}]};}});
  let out=await service({state:resultState(),rememberedExclusions:['1']});
  out=await service({state:out.state,action:{type:'familiar_keep',id:'1'},rememberedExclusions:['1']});
  await service({state:out.state,action:{type:'confirm'},rememberedExclusions:['1']});assert.ok(seen.includes('1'));
  out=await service({state:out.state,action:{type:'restart'},rememberedExclusions:['1']});
  assert.deepEqual(out.state.familiar.excluded,['1']);assert.deepEqual(out.state.familiar.keep,[]);
  const stale=await service({state:out.state,rememberedExclusions:['missing']});assert.deepEqual(stale.state.familiar.excluded,[]);
  await assert.rejects(()=>service({state:out.state,rememberedExclusions:[3]}),/игр/);
  await assert.rejects(()=>service({state:out.state,rememberedExclusions:['bad id']}),/игр/);
  const again=await service({state:out.state,action:{type:'restart'}});assert.deepEqual(again.state.familiar.excluded,['1']);
});

test('familiar actions reject a forged visible ID absent from the real catalog',async()=>{
  const service=createConversationService({catalogs});
  const state=resultState();state.result.top.id='missing';
  await assert.rejects(()=>service({state,action:{type:'familiar_mark',id:'missing'}}),/карточ/);
});

test('repeated replace requests share one picker and reload never retries replacement',async()=>{
  let calls=0,release;const gate=new Promise(resolve=>release=resolve);
  const service=createConversationService({catalogs,pick:async()=>{calls++;await gate;return {picks:[{id:'4',reason:'Fresh'}]};}});
  const marked=await service({state:resultState(),action:{type:'familiar_mark',id:'1'}});
  const body={state:marked.state,action:{type:'replace_familiar'}};
  const a=service(body),b=service(body);release();const [one,two]=await Promise.all([a,b]);assert.deepEqual(one,two);assert.equal(calls,1);
  await service(body);await service({state:one.state});assert.equal(calls,1);
});

test('no eligible candidates and invalid picker IDs leave every familiar card visible and do not fill silently',async()=>{
  let calls=0,spends=0;
  const service=createConversationService({catalogs,pick:async()=>{calls++;return {picks:[{id:'2',reason:'Edition'},{id:'1',reason:'Same'},{id:'3',reason:'Retained'}]};},spend:()=>spends++});
  const marked=await service({state:resultState(),action:{type:'familiar_mark',id:'1'}});
  const blocked=await service({state:marked.state,action:{type:'replace_familiar'},rememberedExclusions:catalog.items.map(g=>g.id)});
  assert.equal(calls,0);assert.equal(spends,0);assert.deepEqual(blocked.state.result,marked.state.result);assert.ok(blocked.error);
  const invalid=await service({state:marked.state,action:{type:'replace_familiar'}});
  assert.equal(calls,1);assert.deepEqual(invalid.state.result,marked.state.result);assert.deepEqual(invalid.state.familiar.marked,['1']);assert.ok(invalid.error);
});

test('replacement does not recycle previously hidden editions and continues to allow another game in the series',async()=>{
  const cat=fixtureCatalog();cat.items.find(g=>g.id==='4').series=['The Witcher'];
  const service=createConversationService({catalogs:{game:cat},pick:async(_,s)=>{
    const available=rankAll(cat,profileOf(s),sessionOf(s)).ranked.map(r=>r.game.id);
    assert.ok(!available.includes('1'));assert.ok(!available.includes('2'));assert.ok(available.includes('4'));
    return {picks:[{id:'4',reason:'Different game in same series'}]};
  }});
  let marked=await service({state:resultState(),action:{type:'familiar_mark',id:'1'}});
  const out=await service({state:marked.state,action:{type:'replace_familiar'}});assert.equal(out.state.result.top.id,'4');
  const restore=await service({state:out.state});assert.deepEqual(restore.state.familiar.hidden,['1']);
});

test('the sole admissible replacement is shown honestly from catalog without any picker dispatch or spend',async()=>{
  let apiCalls=0,spends=0,picks=0;
  const service=createConversationService({catalogs,api:async()=>{apiCalls++;throw Error('Must not dispatch');},spend:()=>spends++,pick:async(...args)=>{picks++;return aiPick(...args);}});
  const marked=await service({state:resultState(),action:{type:'familiar_mark',id:'1'}});
  const out=await service({state:marked.state,action:{type:'replace_familiar'},rememberedExclusions:catalog.items.filter(g=>!['1','3','4'].includes(g.id)).map(g=>g.id)});
  assert.equal(out.error,undefined);assert.equal(out.state.result.top.id,'4');assert.equal(out.state.result.top.ai,undefined);assert.equal(out.state.result.top.replacementSource,'engine');
  assert.deepEqual(out.state.result.alternatives[0],marked.state.result.alternatives[0]);assert.equal(apiCalls,0);assert.equal(picks,0);assert.equal(spends,0);assert.match(out.state.replacement.notice,/только один/);
});
