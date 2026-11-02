import {test} from 'node:test';
import assert from 'node:assert/strict';
const {createQaSession}=await import('../src/server/public/shared/qa-session.js').catch(()=>({}));
const memory=()=>{const data=new Map();return{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),key:i=>[...data.keys()][i]??null,get length(){return data.size;}};};
test('QA storage and navigation preserve all original user values',()=>{
 assert.equal(typeof createQaSession,'function');const session=memory(),raw=memory();raw.setItem('plans','OWNER_DATA');
 const qa=createQaSession({search:'?qa_run=live-a',session});const storage=qa.storage(raw);assert.equal(storage.length,0);assert.equal(storage.getItem('plans'),null);
 storage.setItem('plans','QA_DATA');assert.equal(raw.getItem('plans'),'OWNER_DATA');assert.equal(storage.getItem('plans'),'QA_DATA');assert.equal(storage.key(0),'plans');
 const next=createQaSession({search:'',session});assert.equal(next.storage(raw).getItem('plans'),'QA_DATA');
 assert.equal(createQaSession({search:'?qa_run=off',session}).storage(raw),raw);assert.equal(raw.getItem('plans'),'OWNER_DATA');
});
test('QA fetch adds a bounded request marker and reports billing without response content',async()=>{
 assert.equal(typeof createQaSession,'function');const seen=[],receipts=[];
 const qa=createQaSession({search:'?qa_run=live-b',session:memory(),origin:'https://example.com',onMeter:r=>receipts.push(r),fetcher:async(input,init)=>{seen.push(init);return new Response(JSON.stringify({state:{summary:'PRIVATE_WORDS'},qaBilling:{run:'live-b',calls:[]}}),{headers:{'content-type':'application/json'}});}});
 await qa.fetch('/api/conversation',{method:'POST',body:JSON.stringify({action:{type:'answer'},text:'PRIVATE_WORDS'})});
 assert.equal(new Headers(seen[0].headers).get('x-tastiq-max-reserve-usd'),'0.25');assert.equal(new Headers(seen[0].headers).get('x-tastiq-qa-run'),'live-b');
 assert.equal(receipts.length,1);assert.ok(!JSON.stringify(receipts).includes('PRIVATE_WORDS'));
});
test('ordinary fetch and storage remain unchanged',async()=>{
 assert.equal(typeof createQaSession,'function');const raw=memory(),options={method:'GET'},reply=new Response('{}');let seen;
 const normal=createQaSession({search:'',session:memory(),fetcher:async(_,init)=>{seen=init;return reply;}});
 assert.equal(normal.storage(raw),raw);assert.deepEqual(normal.feedbackOptions(raw),{});assert.equal(await normal.fetch('/api/meta',options),reply);assert.equal(seen,options);
});
