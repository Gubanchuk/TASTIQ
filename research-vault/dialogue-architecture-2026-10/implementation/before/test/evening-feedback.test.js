import test from 'node:test';
import assert from 'node:assert/strict';
import { createFeedbackStore, publicFeedback, normalizeFeedback } from '../src/server/public/shared/evening-feedback.js';
const state = { domain:'game',seed:1,platform:'windows',situation:{note:'Только мои исходные слова',company:'solo'},answers:{},stops:[] };
const result = {ai:{model:'stub'},top:{id:'1',name:'One',ai:{reason:'my quoted reason'}},alternatives:[{id:'2',name:'Two'}]};
function memory() { const data = new Map(); return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}; }
let lockTail=Promise.resolve();
const locks={request:(_,fn)=>{const work=lockTail.then(fn);lockTail=work.catch(()=>{});return work;}};
function store(storage=memory(), send=async(p)=>({ok:true,id:p.id,revision:p.revision})) { let seq=0; return createFeedbackStore({storage,send,locks,id:()=>`run-${++seq}`,now:()=> '2026-10-31T12:00:00.000Z'}); }

test('the actual visible snapshot deduplicates reload, distinguishes origin and keeps evenings separate', async () => {
  const storage=memory(), s=store(storage);
  const a=await s.observe('dialogue-1',state,result);
  assert.equal((await s.observe('dialogue-1',state,result)).id,a.id);
  assert.deepEqual(a.cards.map(c=>c.origin),['model','fill']);
  await s.flush();
  const resumed=store(storage);
  assert.equal((await resumed.observe('dialogue-1',state,result)).id,a.id);
  assert.notEqual((await resumed.observe('dialogue-2',state,result)).id,a.id);
  assert.equal(s.get(a.id).responses.length,0);
});

test('fit, choice and outcome are separate; not-started never turns into a rejection or taste', async () => {
  const s=store(), run=await s.observe('d1',state,result);
  await s.update(run.id,'1',{type:'fit',value:'conditional'});
  assert.equal(s.get(run.id).responses[0].chosen,false);
  await s.update(run.id,'1',{type:'choose',value:true});
  await s.update(run.id,'1',{type:'outcome',value:'not_started'});
  let a=s.get(run.id).responses[0];
  assert.equal(a.fit,'conditional');assert.equal(a.started,false);assert.equal(a.chosen,true);
  await s.update(run.id,'1',{type:'outcome',value:'liked'});
  a=s.get(run.id).responses[0];assert.equal(a.started,true);assert.equal(a.fit,'conditional');
  assert.deepEqual(state.answers,{});
  assert.equal(await s.update(run.id,'unshown',{type:'fit',value:'accept'}),false);
});

test('offline delivery survives reload and a late ack cannot erase a newer revision', async () => {
  const storage=memory(); let fail=true, payloads=[], finish;
  const send=async(p)=>{payloads.push(p);if(fail)throw Error('offline');return new Promise(resolve=>{finish=()=>resolve({ok:true,id:p.id,revision:p.revision});});};
  const s=store(storage,send), run=await s.observe('d1',state,result);
  await s.flush(); assert.equal(s.status(run.id),'pending');
  fail=false; const pending=s.flush();
  await new Promise(setImmediate);
  await s.update(run.id,'1',{type:'fit',value:'reject'}); fail=true; finish();
  await pending;
  assert.equal(s.status(run.id),'pending');
  const resumed=store(storage);
  assert.equal(resumed.get(run.id).responses[0].fit,'reject');
  await resumed.flush(); assert.equal(resumed.status(run.id),'sent');
  assert.ok(payloads.every(p=>!JSON.stringify(p).includes('Только мои исходные слова')));
});

test('public snapshot strips private words and explanation; only explicitly submitted review text travels', async () => {
  const s=store(), r=await s.observe('d1',state,result);
  await s.update(r.id,'1',{type:'fit',value:'reject'});
  await s.update(r.id,'1',{type:'explain',reason:'mood',note:'Сегодня слишком тревожно'});
  const p=publicFeedback(s.get(r.id));
  assert.equal(p.context.note,undefined);assert.equal(p.cards[0].reason,undefined);
  assert.equal(p.responses[0].note,'Сегодня слишком тревожно');
  assert.ok(normalizeFeedback(p));
  assert.equal(normalizeFeedback({...p,cards:[p.cards[0],p.cards[0]]}),null);
  assert.equal(normalizeFeedback({...p,responses:[{...p.responses[0],cardId:'foreign'}]}),null);
  assert.equal(normalizeFeedback({...p,revision:-1}),null);
});

test('confirmed feature IDs are valid and company details only describe the current company', async () => {
  const s=store();
  const current={...state,situation:{...state.situation,partySize:'4',childAge:'7',intent:{source:'confirmed',sourceText:state.situation.note,wants:[{f:'story.central'}],avoids:[{f:'tension.high'}]}}};
  const r=await s.observe('d1',current,result);
  assert.ok(r);assert.deepEqual(r.context.wants,['story.central']);
  assert.equal(r.context.partySize,null);assert.equal(r.context.childAge,null);
});

test('a change during delivery is sent in the same flush without a new page visit', async () => {
  let finish;const sent=[];
  const s=store(memory(),async p=>{sent.push(p);if(sent.length===1)await new Promise(resolve=>{finish=resolve;});return {ok:true,id:p.id,revision:p.revision};});
  const r=await s.observe('d1',state,result), delivery=s.flush();
  await new Promise(setImmediate);
  await s.update(r.id,'1',{type:'fit',value:'accept'});finish();await delivery;
  assert.deepEqual(sent.map(p=>p.revision),[0,1]);assert.equal(s.status(r.id),'sent');
});

test('two open tabs preserve each other’s snapshots and sequential edits', async () => {
  const storage=memory(),a=store(storage),b=store(storage);
  const first=await a.observe('d1',state,result),second=await b.observe('d2',state,result);
  await a.update(first.id,'1',{type:'choose',value:true});
  await b.update(first.id,'1',{type:'fit',value:'accept'});
  const resumed=store(storage);
  assert.equal(resumed.all().length,2);assert.ok(resumed.get(second.id));
  const response=resumed.get(first.id).responses[0];assert.equal(response.chosen,true);assert.equal(response.fit,'accept');
});

test('overlapping tab writes serialize and an ACK cannot acknowledge different content', async () => {
  const data=new Map();let intersect=null,nested;
  const storage={setItem:(k,v)=>data.set(k,v),getItem:k=>{const value=data.get(k)??null;if(intersect){const once=intersect;intersect=null;once();}return value;}};
  const sent=[],send=async p=>{sent.push(p);return {ok:true,id:p.id,revision:p.revision};};
  const a=store(storage,send),first=await a.observe('d1',state,result),b=store(storage,send);
  intersect=()=>{nested=b.update(first.id,'1',{type:'choose',value:true});};
  await a.update(first.id,'1',{type:'fit',value:'accept'});await nested;
  await a.flush();await b.flush();
  const latest=sent.at(-1).responses[0];
  assert.equal(latest.fit,'accept');assert.equal(latest.chosen,true);
  assert.equal(b.status(first.id),'sent');
});

test('the transaction is authoritative even when each tab has a stale localStorage cache', async () => {
  let durable=null,tail=Promise.resolve();
  const transaction=fn=>{const work=tail.then(()=>fn({getItem:()=>durable,setItem:(_,v)=>{durable=v;}}));tail=work.catch(()=>{});return work;};
  const send=async p=>({ok:true,id:p.id,revision:p.revision});
  const a=createFeedbackStore({storage:memory(),transaction,send}),b=createFeedbackStore({storage:memory(),transaction,send});
  const r=await a.observe('d1',state,result);
  await Promise.all([a.update(r.id,'1',{type:'fit',value:'accept'}),b.update(r.id,'1',{type:'choose',value:true})]);
  await Promise.all([a.flush(),b.flush()]);await a.refresh();await b.refresh();
  assert.deepEqual(a.get(r.id),b.get(r.id));assert.equal(a.get(r.id).revision,2);
  assert.equal(a.get(r.id).responses[0].chosen,true);assert.equal(a.get(r.id).responses[0].fit,'accept');
  assert.equal(a.status(r.id),'sent');
});

test('a failed durable store keeps this visit usable and does not claim persistent storage', async () => {
  const s=createFeedbackStore({storage:memory(),transaction:async()=>{throw Error('storage unavailable');},send:async p=>({ok:true,id:p.id,revision:p.revision})});
  const r=await s.observe('d1',state,result);await s.update(r.id,'1',{type:'fit',value:'accept'});await s.flush();
  assert.equal(s.persistent,false);assert.equal(s.get(r.id).responses[0].fit,'accept');assert.equal(s.status(r.id),'sent');
});
