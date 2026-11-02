import test from 'node:test';
import assert from 'node:assert/strict';
import {createMediaConversationService} from '../src/server/media-conversation-service.js';
import {screenFixture,title} from './fixture.js';
import {makeCatalog} from '../src/core/catalog.js';
import {computeIdf} from '../src/core/idf.js';
import {rankAll} from '../src/core/recommend.js';
import {profileOf,sessionOf} from '../src/core/dialogue.js';

const domains=['film','series','cartoon'];
const catalogOf=domain=>{
  const base=screenFixture(domain),items=[...base.items,...['t4','t5','t6'].map(id=>({...title(id,`New ${id}`,domain,{'humor.funny':1,'format.animation':1}),domain}))];
  return makeCatalog({...base,items,...computeIdf(items)},domain);
};
const catalogs=Object.fromEntries(domains.map(d=>[d,catalogOf(d)]));
const question={id:'experience',title:'Какого впечатления хочется?',why:'Уточним желание',options:[],multiple:false,controls:['unknown','indifferent','none']};
const proposal={summary:'Сегодня нужна история',facts:[],uncertainties:[],action:'question',question,context:{company:null,childAge:null,timeMode:null,commitment:null,onlyEnded:null,format:null},sessionTime:null};
const goodPlan=async()=>({proposal,model:'stub',usage:{input_tokens:100,output_tokens:40}});
const create=(domain='film',options={})=>createMediaConversationService({domain,catalogs,plan:goodPlan,...options});
const answerBody=start=>({domain:start.state.domain,state:start.state,action:{type:'answer',questionId:start.screen.question.id,selected:[],text:'Хочу историю на вечер',kind:'answer'}});
const resultState=async service=>{
  const {state}=await service({domain:'film'});
  return {...state,phase:'result',needsPlan:false,summary:'Сегодня нужна история',result:{top:{id:'t1',domain:'film',name:'Old',ai:{reason:'Старое объяснение'}},alternatives:[{id:'t2',domain:'film',name:'Keep',ai:{reason:'Оставить'}}],ai:{model:'old'}}};
};

test('media services require an explicit supported matching domain before planning or spending',async()=>{
  let spends=0,calls=0;const service=create('film',{spend:()=>spends++,plan:async()=>{calls++;return goodPlan();}});
  for(const body of [{},{domain:'game'},{domain:'series'},{domain:'film',state:{domain:'series'}},{domain:'film',state:{domain:'game'}}])await assert.rejects(()=>service(body),e=>e.status===400);
  assert.equal(calls,0);assert.equal(spends,0);
});
test('each media domain starts and restores without a model call and keeps a local fallback question',async()=>{
  for(const domain of domains){
    let calls=0;const service=create(domain,{plan:async()=>{calls++;return goodPlan();}});
    const start=await service({domain,mode:'free'});assert.equal(start.state.domain,domain);assert.equal(start.state.mode,'free');assert.ok(start.screen.question);
    const recovery={...start.state,phase:'talk',question:null,needsPlan:true,failedAction:'plan'};
    const restored=await service({domain,state:recovery});assert.ok(restored.state.question);assert.equal(restored.state.question.id,restored.screen.question.id);assert.equal(calls,0);
  }
});
test('identical concurrent and cached media requests share one scoped model call, other users do not',async()=>{
  let calls=0,spends=0,release;const wait=new Promise(r=>release=r);
  const service=create('film',{spend:()=>spends++,plan:async()=>{calls++;await wait;return goodPlan();}});
  const body=answerBody(await service({domain:'film'}));
  const a=service(body,{uid:'one'}),b=service(body,{uid:'one'});release();const [first,shared]=await Promise.all([a,b]);
  assert.deepEqual(first,shared);assert.equal(calls,1);assert.equal(spends,1);assert.equal(first.screen.question.id,'experience');
  await service(body,{uid:'one'});assert.equal(calls,1);
  await service(body,{uid:'two'});assert.equal(calls,2);
});
test('media planning receives only domain-bound identity with exact evidence and rejects invented title facts',async()=>{
  let known,source;
  const service=create('film',{plan:async(_,s,options)=>{known=options.knownTitles;source=s.turns.at(-1);return {proposal:{...proposal,action:'review',question:null,facts:[{key:'seen',text:'Short One просмотрен',stance:'history',scope:'history',sourceId:source.id,quote:'Short One посмотрел',feature:null,titleId:'t1',exposure:'finished',titleIntent:null}]}};}});
  const body=answerBody(await service({domain:'film'}));body.action.text='Short One только начал';
  const out=await service(body);
  assert.equal(known[0].domain,'film');assert.equal(known[0].exposure,undefined);assert.equal(known[0].evidence[0].sourceId,source.id);
  assert.ok(out.error);assert.equal(out.state.failedAction,'plan');assert.equal(out.state.turns.at(-1).answer,'Short One только начал');assert.ok(out.screen.question);assert.equal(out.state.facts.length,0);
});
test('disabled access keeps answers and offers provisional catalog results without spending',async()=>{
  let spends=0;const service=create('series',{access:()=>({allowed:false,reason:'AI выключен'}),spend:()=>spends++});
  let out=await service(answerBody(await service({domain:'series'})));assert.ok(out.error);assert.equal(out.retryable,false);assert.equal(out.state.turns.length,1);
  out=await service({domain:'series',state:out.state,action:{type:'review'}});
  out=await service({domain:'series',state:out.state,action:{type:'confirm'}});
  assert.equal(out.screen.type,'result');assert.equal(out.screen.provisional,true);assert.equal(out.feedbackState.domain,'series');assert.equal(spends,0);
});
test('media confirm re-sieves real catalog picks and journals the shared injected transport usage',async()=>{
  const journal=[],api=async()=>{},seen=[];
  const service=create('cartoon',{api,journal:row=>journal.push(row),pick:async(all,legacy,options)=>{seen.push(legacy);assert.equal(options.api,api);assert.equal(all.cartoon,catalogs.cartoon);return {picks:[{id:'foreign'},{id:'t1',reason:'По желанию',caveat:'Длительность неизвестна'}],model:'stub',usage:{input_tokens:100,output_tokens:20}};}});
  let out=await service({domain:'cartoon'});out=await service({domain:'cartoon',state:out.state,action:{type:'review'}});out=await service({domain:'cartoon',state:out.state,action:{type:'confirm'}});
  assert.equal(seen[0].domain,'cartoon');assert.equal(out.state.result.top.id,'t1');assert.equal(out.state.result.top.domain,'cartoon');assert.equal(out.state.result.top.ai.reason,'По желанию');assert.equal(out.feedbackState.domain,'cartoon');
  assert.equal(journal[0].event,'media-conversation-pick');assert.equal(journal[0].data.domain,'cartoon');assert.ok(journal[0].data.usage.estimatedUsd>0);
});
test('replacement errors retain cards and marks, partial retry preserves retained feedback, undo is free',async()=>{
  let picks=0,spends=0;const service=create('film',{spend:()=>spends++,pick:async(_,legacy)=>{
    picks++;const ids=rankAll(catalogs.film,profileOf(legacy),sessionOf(legacy)).ranked.map(r=>r.game.id);assert.ok(!ids.includes('t1'));assert.ok(!ids.includes('t2'));
    return picks===1?{error:'offline'}:{picks:[{id:'t4',reason:'Новое'}]};
  }});
  const original=await resultState(service);
  let out=await service({domain:'film',state:original,action:{type:'familiar_mark',id:'t1'}});out=await service({domain:'film',state:out.state,action:{type:'familiar_mark',id:'t2'}});
  const marked=out.state;out=await service({domain:'film',state:marked,action:{type:'replace_familiar'}});
  assert.deepEqual(out.state.result,original.result);assert.deepEqual(out.state.familiar.marked,['t1','t2']);assert.equal(out.state.failedAction,'replace');
  out=await service({domain:'film',state:out.state,action:{type:'retry'}});
  assert.equal(out.state.result.top.id,'t4');assert.deepEqual(out.state.result.alternatives[0],original.result.alternatives[0]);assert.deepEqual(out.state.familiar.marked,['t2']);assert.deepEqual(out.feedbackCarry.retainedIds,['t2']);
  out=await service({domain:'film',state:out.state,action:{type:'undo_replacement'}});assert.deepEqual(out.state.result,original.result);assert.deepEqual(out.state.familiar.marked,marked.familiar.marked);assert.equal(picks,2);assert.equal(spends,2);
});
test('scoped saved exclusions survive restart, explicit keep-return overrides them without taste changes',async()=>{
  let available;const service=create('film',{pick:async(_,legacy)=>{available=rankAll(catalogs.film,profileOf(legacy),sessionOf(legacy)).ranked.map(r=>r.game.id);return {picks:[{id:'t1',reason:'Вернуться'}]};}});
  let out=await service({domain:'film',state:await resultState(service),rememberedExclusions:['t1','foreign']});
  out=await service({domain:'film',state:out.state,action:{type:'familiar_keep',id:'t1'},rememberedExclusions:['t1']});
  await service({domain:'film',state:out.state,action:{type:'confirm'},rememberedExclusions:['t1']});assert.ok(available.includes('t1'));
  out=await service({domain:'film',state:out.state,action:{type:'restart'}});assert.deepEqual(out.state.familiar.excluded,['t1']);assert.deepEqual(out.state.familiar.keep,[]);
  await assert.rejects(()=>service({domain:'film',state:out.state,rememberedExclusions:['bad id']}),e=>e.status===400);
});
test('forged foreign result and familiar ids are rejected before replacement dispatch',async()=>{
  let calls=0;const service=create('film',{pick:async()=>{calls++;return {picks:[]};}});
  const s=await resultState(service);s.result.top.domain='series';
  await assert.rejects(()=>service({domain:'film',state:s,action:{type:'familiar_mark',id:'t1'}}),e=>e.status===400);
  const valid=await resultState(service);await assert.rejects(()=>service({domain:'film',state:valid,action:{type:'familiar_mark',id:'foreign'}}),e=>e.status===400);assert.equal(calls,0);
});
test('planner failure after the local question list is exhausted still stores an answerable question',async()=>{
  const service=create('film',{access:()=>({allowed:false,reason:'offline'})});
  let out=await service({domain:'film'});
  for(let i=0;i<5;i++){
    out=await service(answerBody(out));
    assert.equal(out.state.question?.id,out.screen.question.id,'visible recovery question must be accepted on the next answer');
  }
});
test('disabled access with no admissible titles keeps a valid review snapshot and actionable error',async()=>{
  const service=create('film',{access:()=>({allowed:false,reason:'offline'})});
  let out=await service({domain:'film'});out=await service({domain:'film',state:out.state,action:{type:'review'}});
  out=await service({domain:'film',state:out.state,rememberedExclusions:catalogs.film.items.map(x=>x.id),action:{type:'confirm'}});
  assert.ok(out.error);assert.equal(out.screen.type,'review');
  const restored=await service({domain:'film',state:out.state});assert.equal(restored.screen.type,'review');
});
test('unknown episode runtime, zero child age, status and series commitment are visible caveats',async()=>{
  const family=catalogOf('series');family.byId.get('t3').features['content.family']={r:1,c:1,src:['fact'],ev:[]};
  const service=create('series',{catalogs:{series:family},pick:async(_,legacy)=>{
    assert.equal(sessionOf(legacy).maxRuntime,45);return {picks:[{id:'t3',reason:'По запросу'}]};
  }});
  let out=await service({domain:'series'});out=await service({domain:'series',state:out.state,action:{type:'set_context',context:{company:'children',childAge:0,minutes:45,timeMode:'episode',onlyEnded:true,commitment:'short'}}});
  out=await service({domain:'series',state:out.state,action:{type:'review'}});out=await service({domain:'series',state:out.state,action:{type:'confirm'}});
  assert.equal(out.error,undefined);const checks=out.state.result.top.feasibility;
  for(const key of ['minutes','age','ended','commitment'])assert.equal(checks.find(x=>x.key===key)?.status,'unknown',key);
});
test('a long model list is bounded to four catalog cards and remains restorable',async()=>{
  const service=create('film',{pick:async()=>({picks:catalogs.film.items.map(x=>({id:x.id,reason:'Ответ модели'}))})});
  let out=await service({domain:'film'});out=await service({domain:'film',state:out.state,action:{type:'review'}});out=await service({domain:'film',state:out.state,action:{type:'confirm'}});
  assert.equal(1+out.state.result.alternatives.length,4);
  assert.equal((await service({domain:'film',state:out.state})).screen.type,'result');
});
test('undo snapshots cannot introduce a foreign-domain card into a valid outer state',async()=>{
  const service=create('film'),start=await service({domain:'film'}),undo=await resultState(service);
  delete undo.factRemovalUndo;undo.id=start.state.id;undo.result.top.domain='series';start.state.factRemovalUndo=undo;
  await assert.rejects(()=>service({domain:'film',state:start.state,action:{type:'undo_fact_removal'}}),e=>e.status===400);
});

const mixedCartoons=()=>{
  const items=[...['f1','f2','f3','f4'].map(id=>({...title(id,`Feature ${id}`,'film',{'format.animation':1,'humor.funny':1},{runtime:90}),domain:'cartoon'})),
    ...['s1','s2','s3','s4'].map(id=>({...title(id,`Tiny Saga ${id}`,'series',{'format.animation':1,'humor.funny':1},{runtime:20,episodes:100}),domain:'cartoon'})),
    {...title('unknown-kind','Unknown Kind','film',{'format.animation':1}),domain:'cartoon',kind:null}];
  return makeCatalog({items,...computeIdf(items),stats:{}},'cartoon');
};
const formatReview=async(service,format)=>{
  let out=await service({domain:'cartoon'});
  out=await service({domain:'cartoon',state:out.state,action:{type:'set_context',context:{format,timeMode:format==='movie'?'runtime':'episode',minutes:120}}});
  return service({domain:'cartoon',state:out.state,action:{type:'review'}});
};
test('explicit animation format filters model shortlist and final picks in both directions',async()=>{
  for(const [format,kind,wanted,wrong] of [['movie','film','f1','s1'],['episodic','series','s1','f1']]){
    let seen;const catalog=mixedCartoons(),service=create('cartoon',{catalogs:{cartoon:catalog},pick:async(all)=>{
      seen=all.cartoon.items.map(x=>x.kind);return {picks:[{id:wrong,reason:'Wrong format'},{id:'unknown-kind',reason:'Unknown'},{id:wanted,reason:'Expected format'}]};
    }});
    const review=await formatReview(service,format),out=await service({domain:'cartoon',state:review.state,action:{type:'confirm'}});
    assert.ok(seen.length>0&&seen.every(x=>x===kind),'picker shortlist contains only confirmed requested format');
    assert.equal(out.state.result.top.id,wanted);assert.equal(out.state.result.alternatives.length,0);
    assert.ok(out.state.uncertainties.some(x=>/формат/iu.test(x)&&/не (?:указан|подтвержд)|без/iu.test(x)),'unknown kind is not guaranteed');
  }
});
test('explicit animation format also filters local fallback and restored result or undo cards',async()=>{
  for(const [format,kind,wrong] of [['movie','film','s1'],['episodic','series','f1']]){
    const catalog=mixedCartoons(),service=create('cartoon',{catalogs:{cartoon:catalog},access:()=>({allowed:false})});
    const review=await formatReview(service,format),out=await service({domain:'cartoon',state:review.state,action:{type:'confirm'}});
    assert.equal(out.error,undefined);assert.ok([out.state.result.top,...out.state.result.alternatives].every(c=>catalog.byId.get(c.id).kind===kind));
    const forged=structuredClone(out.state);forged.result.top.id=wrong;
    await assert.rejects(()=>service({domain:'cartoon',state:forged}),e=>e.status===400);
    const undo=structuredClone(out.state);undo.familiar.undo={result:{top:{id:wrong,domain:'cartoon'},alternatives:[]},marked:[],keep:[],hidden:[],replacement:null};
    await assert.rejects(()=>service({domain:'cartoon',state:undo}),e=>e.status===400);
  }
});
test('familiar replacement retains the same explicit animation format through model and local sole choice',async()=>{
  for(const [format,kind,prefix,wrong] of [['movie','film','f','s1'],['episodic','series','s','f1']]){
    let calls=0;const catalog=mixedCartoons(),service=create('cartoon',{catalogs:{cartoon:catalog},pick:async(all)=>{
      calls++;assert.ok(all.cartoon.items.every(x=>x.kind===kind));return {picks:[{id:wrong},{id:`${prefix}3`,reason:'Same format'}]};
    }});
    const review=await formatReview(service,format),state={...review.state,phase:'result',result:{top:{id:`${prefix}1`,domain:'cartoon'},alternatives:[{id:`${prefix}2`,domain:'cartoon'}]}};
    const marked=await service({domain:'cartoon',state,action:{type:'familiar_mark',id:`${prefix}1`}});
    const replaced=await service({domain:'cartoon',state:marked.state,action:{type:'replace_familiar'}});
    assert.equal(calls,1);assert.equal(replaced.state.result.top.id,`${prefix}3`);assert.equal(replaced.state.result.alternatives[0].id,`${prefix}2`);
    const sole=await service({domain:'cartoon',state:marked.state,rememberedExclusions:[`${prefix}4`],action:{type:'replace_familiar'}});
    assert.equal(calls,1);assert.equal(sole.state.result.top.id,`${prefix}3`);assert.equal(sole.state.result.top.replacementSource,'engine');
  }
});
test('format-limited planning keeps reference identities from the complete domain catalog',async()=>{
  let known,seen;const catalog=mixedCartoons(),service=create('cartoon',{catalogs:{cartoon:catalog},plan:async(scoped,_,options)=>{
    seen=scoped.items.map(x=>x.kind);known=options.knownTitles;return {error:'fixture stop'};
  }});
  let out=await service({domain:'cartoon'});out=await service({domain:'cartoon',state:out.state,action:{type:'set_context',context:{format:'movie'}}});
  const body=answerBody(out);body.action.text='Tiny Saga s1 только начал; хочу другой полнометражный фильм';await service(body);
  assert.ok(seen.every(x=>x==='film'));assert.deepEqual(known.map(x=>x.id),['s1']);
});
