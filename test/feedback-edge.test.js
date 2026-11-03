import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createFeedbackEdgeHandler} from '../src/server/feedback-edge-handler.js';
const token='TEST_ONLY_INGEST_TOKEN_0123456789_ABCDEFGHIJKLMN',tokenHash=createHash('sha256').update(token).digest('hex');
const run={version:1,id:'edge-run',dialogueId:'edge-dialogue',domain:'film',revision:1,at:'2026-11-03T10:00:00Z',updatedAt:'2026-11-03T10:01:00Z',context:{note:'PRIVATE_CONTEXT'},cards:[{id:'tt1',title:'Synthetic',origin:'model',reason:'PRIVATE_EXPLANATION'}],responses:[],selectionReview:{verdict:'partial',issue:'fit',note:'Synthetic only',requestSummary:'Current wish',transcript:'Visible selection',learn:false}};
const request=(payload={p_payload:run,p_namespace:'qa:edge_test'},key=token)=>new Request('https://example.supabase.co/functions/v1/tastiq-feedback',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(payload)});
test('scoped ingestion token reaches only the fixed feedback RPC; family credential never leaves backend',async()=>{
 let sent;const handler=createFeedbackEdgeHandler({tokenHash,projectUrl:'https://example.supabase.co',serviceKey:'FAMILY_SERVER_ONLY',fetch:async(url,options)=>{sent={url,options};return new Response(JSON.stringify({ok:true,id:run.id,revision:run.revision}));}});
 const response=await handler(request()),out=await response.json();assert.equal(response.status,200);assert.deepEqual(out,{ok:true,id:run.id,revision:run.revision});
 assert.equal(sent.url,'https://example.supabase.co/rest/v1/rpc/tastiq_record_feedback');assert.equal(sent.options.headers.apikey,'FAMILY_SERVER_ONLY');
 const body=JSON.parse(sent.options.body);assert.equal(body.p_namespace,'qa:edge_test');assert.equal(body.p_payload.selectionReview.note,'Synthetic only');assert.ok(!sent.options.body.includes('PRIVATE_'));
 assert.ok(!JSON.stringify(out).includes('FAMILY_SERVER_ONLY'));
});
test('bad/missing token, read request, malformed payload and oversized body do not reach the family database',async()=>{
 let calls=0;const handler=createFeedbackEdgeHandler({tokenHash,projectUrl:'https://example.supabase.co',serviceKey:'private',fetch:async()=>{calls++;throw Error('must not dispatch');}});
 assert.equal((await handler(request(undefined,'wrong'))).status,401);
 assert.equal((await handler(new Request('https://example.supabase.co/functions/v1/tastiq-feedback'))).status,405);
 assert.equal((await handler(request({p_payload:run,p_namespace:'family'}))).status,400);
 assert.equal((await handler(request({p_payload:{...run,revision:-1}}))).status,400);
 assert.equal((await handler(request({p_payload:run,extra:'x'.repeat(262145)}))).status,413);
 assert.equal(calls,0);
});
test('upstream errors, timeouts and inconsistent receipts expose no family credentials or data',async()=>{
 for(const reply of [new Response(JSON.stringify({error:'FAMILY_DATA'}),{status:500}),new Response(JSON.stringify({ok:true,id:'foreign',revision:1}))]){
  const handler=createFeedbackEdgeHandler({tokenHash,projectUrl:'https://example.supabase.co',serviceKey:'FAMILY_KEY',fetch:async()=>reply});const out=await handler(request());assert.equal(out.status,503);assert.ok(!(await out.text()).includes('FAMILY_'));
 }
 const conflict=createFeedbackEdgeHandler({tokenHash,projectUrl:'https://example.supabase.co',serviceKey:'key',fetch:async()=>new Response('{}',{status:409})});assert.equal((await conflict(request())).status,409);
});
