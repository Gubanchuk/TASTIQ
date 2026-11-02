import { test } from 'node:test';
import assert from 'node:assert/strict';
import { screenFixture } from './fixture.js';
import { AI } from '../src/ai/config.js';
const {aiMediaConversation:run}=await import('../src/ai/media-conversation.js').catch(()=>({}));
const {newMediaConversation:fresh,answerMediaConversation:reduce}=await import('../src/core/media-conversation.js').catch(()=>({}));
const context=()=>({company:null,childAge:null,timeMode:null,commitment:null,onlyEnded:null,format:null});
const proposal=()=>({summary:'Хочется тёплой истории',facts:[],uncertainties:[],action:'question',question:{id:'tone',title:'Какой тон ближе?',why:'Проясним настроение',options:[],multiple:true,controls:['unknown','indifferent','none']},context:context(),sessionTime:null});
const response=(out=proposal(),patch={})=>({status:'completed',model:'stub-model',usage:{input_tokens:100,output_tokens:20},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(out)}]}],...patch});
const state=(domain='film')=>{const s=fresh({domain,id:'ai-test'});return reduce(s,{type:'answer',questionId:s.question.id,text:'Хочу тёплую историю с юмором',selected:[]});};

test('media planner is a separate injectable adapter with a private bounded domain-specific request',async()=>{
  assert.equal(typeof run,'function','media planner is missing');
  for(const domain of ['film','series','cartoon']) {
    let request;let calls=0;const s=state(domain);s.profile={secret:'must-not-import'};s.result={top:{id:'t1'},alternatives:[],secret:'must-not-import'};
    const out=await run(screenFixture(domain),s,{api:async body=>{calls++;request=body;return response();}});
    assert.equal(calls,1);assert.deepEqual(out.proposal,proposal());assert.equal(out.model,'stub-model');assert.equal(out.usage.input_tokens,100);
    const input=JSON.parse(request.input);assert.equal(input.domain,domain);assert.deepEqual(input.turns,s.turns);assert.doesNotMatch(request.input,/must-not-import/);
    assert.equal(request.store,false);assert.equal(request.model,AI.model);assert.equal(request.reasoning.effort,AI.effort);
  }
});

test('strict schema requires exact grounded media context, title identity and time without game fields',async()=>{
  let request;await run(screenFixture('film'),state(),{api:async body=>{request=body;return response();}});
  const format=request.text.format;assert.equal(format.strict,true);const schema=format.schema;
  assert.deepEqual(schema.required.toSorted(),['action','context','facts','question','sessionTime','summary','uncertainties']);
  const f=schema.properties.facts.items;assert.ok(f.required.includes('titleId'));assert.ok(f.required.includes('titleIntent'));assert.ok(!f.required.includes('gameId'));
  const child=schema.properties.context.properties.childAge.anyOf.find(s=>s.type==='object');assert.deepEqual(child.required.toSorted(),['quote','sourceId','value']);
  const visit=node=>{if(!node||typeof node!=='object')return;if(node.type==='object'){assert.equal(node.additionalProperties,false);assert.deepEqual(node.required.toSorted(),Object.keys(node.properties).toSorted());}for(const x of Object.values(node))if(Array.isArray(x))x.forEach(visit);else visit(x);};visit(schema);
});

test('known titles include identity evidence only and cannot smuggle properties or exposure into planning',async()=>{
  let request;const s=state();const knownTitles=[{id:'t1',name:'Short One',aliases:['Short One'],evidence:[{sourceId:s.turns[0].id,quote:'Short One',aliasId:'local',exposure:'finished'}],exposure:'finished',mechanics:'must-not-import'}];
  await run(screenFixture('film'),s,{knownTitles,api:async body=>{request=body;return response();}});
  const sent=JSON.parse(request.input).knownTitles[0];assert.equal(sent.exposure,undefined);assert.equal(sent.mechanics,undefined);assert.deepEqual(sent.evidence,[{sourceId:s.turns[0].id,quote:'Short One',aliasId:'local'}]);
});

test('malformed media response fails locally with billed usage and never repeats the request',async()=>{
  for(const out of [null,{}, {...proposal(),context:undefined},{...proposal(),extra:true},{...proposal(),facts:[{key:'bad'}]},{...proposal(),context:{...context(),childAge:{value:7,sourceId:'x'}}},{...proposal(),question:{...proposal().question,options:Array(7).fill({id:'x',label:'X'})}},{...proposal(),sessionTime:{minutes:30,sourceId:'x',quote:'30 мин',extra:true}}]) {
    let calls=0;const result=await run(screenFixture('film'),state(),{api:async()=>{calls++;return response(out);}});assert.ok(result.error,JSON.stringify(out));assert.equal(result.proposal,undefined);assert.equal(calls,1);assert.equal(result.usage.input_tokens,100);
  }
});

test('mismatched domains, invalid snapshots, excessive titles and insufficient budget never dispatch',async()=>{
  const noCall=async()=>assert.fail('invalid context must not dispatch');
  for(const [catalog,s,options] of [[screenFixture('series'),state(),{}],[screenFixture('film'),{...state(),domain:'game'},{}],[null,state(),{}],[screenFixture('film'),{...state(),turns:Array(25).fill(state().turns[0])},{}],[screenFixture('film'),state(),{knownTitles:Array(65).fill({id:'x',name:'X'})}],[screenFixture('film'),state(),{maxCostUsd:0}]]) {
    const out=await run(catalog,s,{api:noCall,...options});assert.equal(out.notRequested,true);assert.ok(out.error);
  }
});

test('transport refusal, incomplete and provider failures do not retry or leak internal details',async()=>{
  for(const stub of [async()=>response(null,{status:'incomplete'}),async()=>response(null,{output:[{type:'message',content:[{type:'refusal'}]}]}),async()=>{throw Error('secret-provider-detail');}]) {
    let calls=0;const out=await run(screenFixture('film'),state(),{api:async request=>{calls++;return stub(request);}});assert.ok(out.error);assert.doesNotMatch(out.error,/secret-provider/);assert.equal(calls,1);
  }
});
