import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCatalogs,makeCatalog} from '../src/core/catalog.js';
import {createMediaConversationService} from '../src/server/media-conversation-service.js';
import {criteriaOf,constraintSchema,validateConstraintChecks} from '../src/ai/pick-constraints.js';
import {aiPick,checkPicks,candidatesOf} from '../src/ai/pick.js';
import {SCHEMA} from '../src/ai/prompt.js';
import {mediaConversationToLegacy} from '../src/core/media-conversation.js';
const saved=JSON.parse(readFileSync(new URL('./fixtures/media-more-known-conflict-2026-11-03.json',import.meta.url),'utf8'));
const original=JSON.parse(readFileSync(new URL('./fixtures/'+saved.requestFixture,import.meta.url),'utf8')).request;
const response=out=>({status:'completed',model:'offline-recorded',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(out)}]}]});
const catalogs=loadCatalogs();
const legacy=()=>mediaConversationToLegacy(structuredClone(original.state),catalogs.cartoon.dict,catalogs.cartoon);
const checks=(criteria,status='unknown')=>criteria.map(c=>({key:c.key,status,reason:'Недостаточно проверенных данных о содержании'}));
const checkedOutput=criteria=>({...saved.output,picks:saved.output.picks.map(p=>({...p,constraintChecks:checks(criteria)}))});

test('the delivered explicit hard-conflict admission cannot replace the original family result',async()=>{
 let calls=0;const service=createMediaConversationService({domain:'cartoon',catalogs,api:async()=>{calls++;return response(saved.output);}});
 const out=await service(original);assert.equal(calls,1);assert.ok(out.error,'unchecked old wire output must not become checked recommendations');
 assert.deepEqual(out.state.result,original.state.result);assert.deepEqual(out.state.familiar,original.state.familiar);assert.deepEqual(out.state.browseSeen,original.state.browseSeen);
});

test('constrained sole media candidate uses the checked picker instead of bypassing it',async()=>{
 const ids=[original.state.result.top.id,...original.state.result.alternatives.map(c=>c.id),'tt2709692'];
 const catalog=makeCatalog({...catalogs.cartoon,items:catalogs.cartoon.items.filter(c=>ids.includes(c.id))},'cartoon');let calls=0;
 const service=createMediaConversationService({domain:'cartoon',catalogs:{cartoon:catalog},api:async request=>{
  calls++;const keys=request.text.format.schema.properties.picks.items.properties.constraintChecks.items.properties.key.enum;
  return response({understood:'Проверено',picks:[{...saved.output.picks[0],constraintChecks:keys.map(key=>({key,status:'unknown',reason:'Не проверено'}))}]});
 }});
 const out=await service(original);assert.equal(calls,1);assert.equal(out.error,undefined);assert.equal(out.state.result.top.id,'tt2709692');
 assert.ok(out.state.result.top.feasibility.some(c=>c.status==='unknown'&&c.text.includes('Страшные сцены исключены')));
});

test('active criteria require an exact current answer and exclude soft/history/retracted facts',()=>{
 const state=legacy(),criteria=criteriaOf(state);assert.deepEqual(criteria.map(c=>c.key.replace(/:[a-f0-9]{16}$/u,'')),['fact:format.movie','fact:tone.creepy','context:childAge','session:minutes']);
 assert.deepEqual(criteriaOf({...state,domain:'game'}),[]);assert.deepEqual(criteriaOf({...state,conversation:null}),[]);
 for(const patch of [{scope:'history'},{stance:'avoid'},{stance:'conditional'},{sourceId:'foreign'},{quote:'not in source'}]){
  const next=structuredClone(state);Object.assign(next.conversation.facts.find(f=>f.key==='tone.creepy'),patch);assert.ok(!criteriaOf(next).some(c=>c.key.startsWith('fact:tone.creepy:')));
 }
 const removed=structuredClone(state);removed.conversation.retractions.push({key:'tone.creepy',sourceId:criteria[1].sourceId,quote:criteria[1].quote,feature:'tone.creepy'});assert.ok(!criteriaOf(removed).some(c=>c.key.startsWith('fact:tone.creepy:')));
 const superseded=structuredClone(state);superseded.conversation.turns[0].superseded=true;assert.deepEqual(criteriaOf(superseded),[]);
 const ageRemoved=structuredClone(state);ageRemoved.conversation.retractions.push({kind:'context',key:'childAge',sourceId:criteria[2].sourceId});assert.ok(!criteriaOf(ageRemoved).some(c=>c.key.startsWith('context:childAge:')));
});

test('strict schema is per request and requires checks without mutating the legacy protocol',()=>{
 const before=JSON.stringify(SCHEMA),criteria=criteriaOf(legacy()),schema=constraintSchema(SCHEMA,criteria);
 assert.equal(JSON.stringify(SCHEMA),before);assert.equal(constraintSchema(SCHEMA,[]),SCHEMA);assert.ok(schema.properties.picks.items.required.includes('constraintChecks'));
 assert.deepEqual(schema.properties.picks.items.properties.constraintChecks.items.properties.key.enum,criteria.map(c=>c.key));
});

test('missing, duplicate, foreign, malformed and conflicting checks cannot pass',()=>{
 const criteria=criteriaOf(legacy()),valid={reason:'Добрая история',caveat:'Есть грустные воспоминания',constraintChecks:checks(criteria)};
 assert.equal(validateConstraintChecks(valid,criteria).ok,true);assert.equal(validateConstraintChecks({...valid,constraintChecks:checks(criteria,'compatible')},criteria).ok,true);
 for(const rows of [undefined,[],checks(criteria).slice(1),checks(criteria).map((c,i)=>i===1?{...c,key:criteria[0].key}:c),checks(criteria).map((c,i)=>i?c:{...c,key:'foreign'}),checks(criteria).map((c,i)=>i?c:{...c,status:'yes'}),checks(criteria).map((c,i)=>i?c:{...c,reason:''}),checks(criteria).map((c,i)=>i?c:{...c,status:'conflict'})])assert.equal(validateConstraintChecks({...valid,constraintChecks:rows},criteria).ok,false);
});

test('the recorded admission overrides a compatible claim while uncertainty and negated violation stay allowed',()=>{
 const criteria=criteriaOf(legacy()),bad={...saved.output.picks[1],constraintChecks:checks(criteria,'compatible')};assert.equal(validateConstraintChecks(bad,criteria).reason,'conflict');
 for(const caveat of ['Неизвестно, соответствует ли строгому условию; нужно проверить.','Не нарушает твоего строгого условия; данные всё равно нужно проверить.','Есть грустные воспоминания.'])assert.equal(validateConstraintChecks({...bad,reason:'История о дружбе',caveat,constraintChecks:checks(criteria)},criteria).ok,true,caveat);
 const withoutScaryBan=criteria.filter(c=>!c.key.startsWith('fact:tone.creepy:'));
 assert.equal(validateConstraintChecks({...bad,constraintChecks:checks(withoutScaryBan,'compatible')},withoutScaryBan).ok,true,'an obsolete quoted condition must not become an active ban');
});

test('conflict cannot be rescued by a duplicate id or a title/year alias in either order',()=>{
 const criteria=criteriaOf(legacy()),catalog=catalogs.cartoon,rows=candidatesOf(catalog,legacy(),60).rows,ranked=catalog.items.map(game=>({game}));
 const bad={...saved.output.picks[1],constraintChecks:checks(criteria,'compatible')},good={...bad,caveat:'Нужно проверить содержание',constraintChecks:checks(criteria)};
 const alias={...bad,id:'',title:'The Aristocats',year:1970};
 for(const picks of [[good,bad],[bad,good],[good,alias],[alias,good]])assert.ok(!checkPicks({picks},rows,4,ranked,criteria).picks.some(p=>p.id==='tt0065421'));
});

test('partial checked output replaces only with allowed identities and shows specific unknown conditions',async()=>{
 const state=legacy(),criteria=criteriaOf(state);let request;
 const service=createMediaConversationService({domain:'cartoon',catalogs,api:async r=>{request=r;return response(checkedOutput(criteria));}});
 const out=await service(original);assert.equal(out.error,undefined);assert.equal(out.state.result.top.id,'tt2709692');assert.equal(out.state.result.alternatives.length,0);
 assert.ok(request.instructions.includes('fact:tone.creepy'));assert.ok(out.state.result.top.feasibility.some(c=>c.status==='unknown'&&c.text.includes('Страшные сцены исключены')));
 assert.deepEqual((await service({domain:'cartoon',state:out.state,action:{type:'undo_replacement'}})).state.result,original.state.result);
});

test('incomplete conflicts and disagreeing duplicate checks cannot be rescued by ordering',()=>{
 const state=legacy(),criteria=criteriaOf(state),rows=candidatesOf(catalogs.cartoon,state,60).rows,ranked=catalogs.cartoon.items.map(game=>({game}));
 const good={...saved.output.picks[0],constraintChecks:checks(criteria,'compatible')};
 const incomplete={...good,constraintChecks:[{key:criteria[1].key,status:'conflict',reason:''}]},unknown={...good,constraintChecks:checks(criteria)};
 for(const picks of [[good,incomplete],[incomplete,good],[good,unknown],[unknown,good]])assert.equal(checkPicks({picks},rows,4,ranked,criteria).picks.length,0);
 assert.doesNotThrow(()=>checkPicks({picks:[{...incomplete,id:{trim:true},title:'The Grinch',year:2018}]},rows,4,ranked,criteria));
});

test('a corrected criterion cannot reuse a check from the old source under the same fact key',()=>{
 const state=legacy(),old=criteriaOf(state),next=structuredClone(state),fact=next.conversation.facts.find(f=>f.key==='tone.creepy');
 next.conversation.turns.push({id:'later',kind:'answer',answer:'Без внезапных пугалок'});Object.assign(fact,{sourceId:'later',quote:'Без внезапных пугалок',text:'Внезапные пугалки исключены'});
 assert.equal(validateConstraintChecks({constraintChecks:checks(old)},criteriaOf(next)).ok,false);
});

test('unknown structural conditions need checks while a sole catalog-proven time/status stays free',()=>{
 const state=legacy(),c=state.conversation;c.facts=[];c.context.company='solo';c.context.childAge=null;c.context.onlyEnded=true;
 c.turns.push({id:'ended',kind:'answer',answer:'Только завершённый сериал'});c.contextEvidence.onlyEnded={value:true,sourceId:'ended',quote:'Только завершённый сериал'};
 assert.deepEqual(criteriaOf(state).map(c=>c.key.replace(/:[a-f0-9]{16}$/u,'')),['context:onlyEnded','session:minutes']);
 assert.deepEqual(criteriaOf(state,{runtime:80,status:'Ended'}),[]);
 assert.equal(criteriaOf(state,{runtime:null,status:null}).length,2);
 c.retractions.push({kind:'session_time',sourceId:c.sessionTime.sourceId});assert.ok(!criteriaOf(state).some(c=>c.key.startsWith('session:minutes:')));
});

test('first confirm and partial familiar replacement use the same checked path and preserve retained feedback',async()=>{
 const criteria=criteriaOf(legacy()),service=createMediaConversationService({domain:'cartoon',catalogs,api:async()=>response(checkedOutput(criteria))});
 const first=await service({domain:'cartoon',state:original.state,action:{type:'confirm'}});assert.equal(first.error,undefined);assert.equal(first.state.result.top.id,'tt2709692');
 const marked=await service({domain:'cartoon',state:original.state,action:{type:'familiar_mark',id:original.state.result.top.id}});
 const replaced=await service({domain:'cartoon',state:marked.state,action:{type:'replace_familiar'}});assert.equal(replaced.error,undefined);
 assert.deepEqual(replaced.state.result.alternatives,original.state.result.alternatives);assert.deepEqual(replaced.feedbackCarry.retainedIds,original.state.result.alternatives.map(c=>c.id));
 assert.deepEqual((await service({domain:'cartoon',state:replaced.state,action:{type:'undo_replacement'}})).state.result,original.state.result);
});

test('AI-off preliminary output labels hard semantic criteria as unknown without inventing a check',async()=>{
 const service=createMediaConversationService({domain:'cartoon',catalogs,access:()=>({allowed:false,reason:'offline'}),api:async()=>assert.fail('paid transport must not run')});
 const out=await service({domain:'cartoon',state:original.state,action:{type:'confirm'}});assert.equal(out.error,undefined);assert.equal(out.state.provisional,true);
 assert.ok(out.state.result.top.feasibility.some(c=>c.status==='unknown'&&c.text.includes('Страшные сцены исключены')));
 assert.ok(!out.state.result.top.ai?.constraintChecks);
});
