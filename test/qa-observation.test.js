import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reserveCost,estimateCost} from '../src/ai/usage.js';
const {runQaRequest,qaReceipt,observeQaApi,isQaRequest}=await import('../src/server/qa-observation.js').catch(()=>({}));
const request={model:'gpt-6.1-sol',input:'PRIVATE_QA_INPUT',max_output_tokens:8000};
const response={id:'resp_qa_fixture',model:'gpt-6.1-sol',status:'completed',usage:{input_tokens:1000,output_tokens:200,input_tokens_details:{cached_tokens:100}},output:[{text:'PRIVATE_QA_OUTPUT'}]};
const headers={'x-tastiq-qa-run':'production-check','x-tastiq-max-reserve-usd':'0.25'};

test('ordinary traffic keeps its original transport response and has no QA metadata',async()=>{
 assert.equal(typeof runQaRequest,'function');
 await runQaRequest({headers:{}},async()=>{assert.equal(isQaRequest(),false);assert.equal(qaReceipt(),null);assert.equal(await observeQaApi(async()=>response)(request),response);});
});
test('QA receipts contain exact usage and hashes without prompts, outputs or credentials',async()=>{
 assert.equal(typeof runQaRequest,'function');
 await runQaRequest({headers},async()=>{await observeQaApi(async()=>response)(request);const receipt=qaReceipt();
  assert.equal(receipt.run,'production-check');assert.equal(receipt.calls.length,1);
  assert.equal(receipt.calls[0].costUsd,estimateCost(response.usage,response.model));assert.equal(receipt.calls[0].responseId,response.id);
  assert.equal(receipt.calls[0].requestHash.length,64);assert.deepEqual(receipt.calls[0].usage,response.usage);
  assert.ok(!JSON.stringify(receipt).includes('PRIVATE_QA'));});
});
test('QA reservation cap stops an expensive request before the model is called',async()=>{
 assert.equal(typeof runQaRequest,'function');let calls=0;
 await runQaRequest({headers:{...headers,'x-tastiq-max-reserve-usd':'0.001'}},async()=>{
  await assert.rejects(observeQaApi(async()=>{calls++;return response;})(request),e=>e.code==='AI_BUDGET_LIMIT'&&e.notRequested);
  assert.equal(calls,0);assert.equal(qaReceipt().calls[0].costUsd,0);assert.equal(qaReceipt().calls[0].notRequested,true);
 });
});
test('one QA HTTP request cannot dispatch a second model call even with unused reserve',async()=>{
 let calls=0;await runQaRequest({headers},async()=>{const api=observeQaApi(async()=>{calls++;return response;});
  await api(request);await assert.rejects(api(request),e=>e.code==='AI_BUDGET_LIMIT');assert.equal(calls,1);
 });
});
test('aggregate reservation and uncertain transport cannot dispatch another paid call',async()=>{
 assert.equal(typeof runQaRequest,'function');let calls=0;
 await runQaRequest({headers:{...headers,'x-tastiq-max-reserve-usd':String(reserveCost(request)*1.5)}},async()=>{
  const api=observeQaApi(async()=>{calls++;return response;});await api(request);await assert.rejects(api(request),e=>e.code==='AI_BUDGET_LIMIT');assert.equal(calls,1);
 });
 await runQaRequest({headers},async()=>{const api=observeQaApi(async()=>{throw Error('timeout');});await assert.rejects(api(request));
  assert.equal(qaReceipt().calls[0].status,'uncertain');await assert.rejects(api(request),e=>e.code==='AI_SPEND_UNCERTAIN');
 });
});
