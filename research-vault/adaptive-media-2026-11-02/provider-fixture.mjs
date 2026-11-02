// QA only: replays this diagnostic's settled real responses. Never sends network traffic to an AI provider.
import assert from 'node:assert/strict';
import {readFileSync,appendFileSync} from 'node:fs';
const ledger=JSON.parse(readFileSync('research-vault/taste-quality-strategy-2026-10/eval/quality-round-2/budget.json','utf8'));
const receipts=ledger.calls.filter(c=>c.id.startsWith('adaptive-media-20261102:')&&c.status==='settled');
assert.equal(receipts.length,12);
const fixtureLog='research-vault/adaptive-media-2026-11-02/provider-fixture.ndjson';
let calls=0;const failedDomains=new Set();let firstSuccessful=true;
globalThis.fetch=async(url,init)=>{
 assert.equal(String(url),'https://api.openai.com/v1/responses','Unexpected external request rejected');
 const request=JSON.parse(init.body),name=request.text?.format?.name;let receipt,current,domain;
 if(name?.includes('conversation')){
  current=JSON.parse(request.input);
  domain=current.domain;
  receipt=receipts.find(c=>{if(c.request.text.format.name!==name)return false;const prior=JSON.parse(c.request.input);return prior.domain===current.domain&&prior.turns.length===current.turns.length;});
 }else{
  domain=String(request.input).startsWith('Что ищет: поиграть.')?'game':String(request.input).startsWith('Что ищет: посмотреть сериал.')?'series':String(request.input).startsWith('Что ищет: посмотреть мультфильм.')?'cartoon':'film';
  receipt=receipts.find(c=>c.request.text.format.name===name&&(domain==='game'?c.request.input.startsWith('Что ищет: поиграть.'):c.request.input.startsWith(`Что ищет: посмотреть ${domain==='series'?'сериал':domain==='cartoon'?'мультфильм':'фильм'}.`)));
 }
 assert.ok(receipt,'Unexpected model request shape: fixture cannot invent an answer');
 let response=structuredClone(receipt.response);
 if(current){
  const prior=JSON.parse(receipt.request.input),replace=value=>typeof value==='string'?value.replaceAll(prior.id,current.id):Array.isArray(value)?value.map(replace):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,value])=>[key,replace(value)])):value;
  for(const message of response.output??[])for(const content of message.content??[])if(content.type==='output_text')content.text=JSON.stringify(replace(JSON.parse(content.text)));
 }
 const index=++calls;appendFileSync(fixtureLog,JSON.stringify({index,name,receipt:receipt.id,paid:false})+'\n');
 // One controlled 503 followed by the identical request on explicit retry; no state is lost.
 if(process.env.QA_FAIL_FIRST==='1'&&!failedDomains.has(domain)){failedDomains.add(domain);return new Response(JSON.stringify({error:{code:'fixture_unavailable'}}),{status:503});}
 const delay=firstSuccessful?Number(process.env.QA_CAPTURE_DELAY_MS??process.env.QA_DELAY_MS??1500):Number(process.env.QA_DELAY_MS??1500);firstSuccessful=false;
 await new Promise(resolve=>setTimeout(resolve,delay));
 return new Response(JSON.stringify(response),{status:200,headers:{'Content-Type':'application/json'}});
};
await import('../../src/server/server.js');
