import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeedbackRepository,feedbackVerificationNamespace} from '../src/server/feedback-repository.js';
import {createHmac} from 'node:crypto';
import {createFeedbackService} from '../src/server/feedback-service.js';
const run={version:1,id:'run-1',dialogueId:'d-1',domain:'game',revision:2,at:'2026-11-03T10:00:00Z',updatedAt:'2026-11-03T10:01:00Z',context:{},cards:[{id:'1',title:'untrusted title',origin:'engine'}],responses:[],selectionReview:{verdict:'reject',issue:'fit',note:'Too tense',requestSummary:'Quiet game',transcript:'Current visible selection',learn:true}};
const catalogs={game:{byId:new Map([['1',{id:'1',name:'One'}]]),dict:{featureById:new Map()}}};
test('repository uses the scoped TASTIQ ingestion endpoint and acknowledges only its durable receipt',async()=>{
 let sent;const r=createFeedbackRepository({url:'https://example.supabase.co',secret:'SERVER_SECRET',fetch:async(url,options)=>{sent={url,options};return new Response(JSON.stringify({ok:true,id:run.id,revision:run.revision}),{status:200});}});
 assert.deepEqual(await r.save(run),{ok:true,id:run.id,revision:run.revision});
 assert.equal(sent.url,'https://example.supabase.co/functions/v1/tastiq-feedback');assert.equal(sent.options.headers.apikey,undefined);assert.equal(sent.options.headers.Authorization,'Bearer SERVER_SECRET');
 assert.equal(JSON.parse(sent.options.body).p_payload.id,run.id);assert.ok(!JSON.stringify(await r.save(run)).includes('SERVER_SECRET'));
});
test('unset database, timeout, DB error and wrong ACK never become a successful receipt',async()=>{
 await assert.rejects(()=>createFeedbackRepository({}).save(run),/хранилище|баз/i);
 for(const response of [new Response('{}',{status:503}),new Response(JSON.stringify({ok:true,id:run.id,revision:1}),{status:200}),new Response('invalid',{status:200})]){
  const r=createFeedbackRepository({url:'https://example.supabase.co',secret:'secret',fetch:async()=>response});await assert.rejects(()=>r.save(run));
 }
 const r=createFeedbackRepository({url:'https://example.supabase.co',secret:'secret',fetch:async()=>{throw Error('Timeout with secret and private URL');}});
 await assert.rejects(()=>r.save(run),error=>error.status===503&&!error.message.includes('private URL'));
});
test('service validates/canonicalizes feedback, awaits DB and excludes QA from real persistence',async()=>{
 const records=[];const service=createFeedbackService({catalogs,repository:{save:async data=>{records.push(data);return {ok:true,id:data.id,revision:data.revision};}}});
 const ack=await service({run});assert.equal(ack.ok,true);assert.equal(records[0].cards[0].title,'One');assert.equal(records[0].selectionReview.note,'Too tense');
 await service({run},{qa:true});assert.equal(records.length,1);
 await assert.rejects(()=>service({run:{...run,cards:[{id:'foreign',title:'X',origin:'engine'}]}}),error=>error.status===400);
 await assert.rejects(()=>service({run:{...run,selectionReview:{...run.selectionReview,transcript:'a'.repeat(48001)}}}),error=>error.status===400);
});
test('production DB failure keeps feedback pending; local file fallback is explicit',async()=>{
 let journal=0;const noDb=createFeedbackRepository({});
 const production=createFeedbackService({catalogs,repository:noDb,production:true,journal:()=>journal++});
 await assert.rejects(()=>production({run}),error=>error.status===503);assert.equal(journal,0);
 const local=createFeedbackService({catalogs,repository:noDb,production:false,journal:()=>journal++});
 assert.deepEqual(await local({run}),{ok:true,id:run.id,revision:run.revision});assert.equal(journal,1);
});

test('only a server-key authenticated QA probe may write a separate verification namespace',async()=>{
 const qaRun='probe_test',secret='TEST_ONLY',signature=createHmac('sha256',secret).update('tastiq-feedback-probe:'+qaRun).digest('hex');
 assert.equal(feedbackVerificationNamespace({run:qaRun,signature,secret}),'qa:'+qaRun);
 for(const value of [{run:'other',signature,secret},{run:qaRun,signature:'0'.repeat(64),secret},{run:qaRun,signature,secret:null}])assert.equal(feedbackVerificationNamespace(value),undefined);
 const calls=[],service=createFeedbackService({catalogs,production:true,repository:{configured:true,save:async(data,options)=>{calls.push(options);return {ok:true,id:data.id,revision:data.revision};}}});
 await service({run},{qa:true});assert.equal(calls.length,0);
 await service({run},{qa:true,namespace:'qa:'+qaRun});assert.deepEqual(calls,[{namespace:'qa:'+qaRun}]);
 await assert.rejects(()=>service({run},{qa:true,namespace:'production'}),e=>e.status===400);
});
