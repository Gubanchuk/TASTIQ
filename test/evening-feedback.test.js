import test from 'node:test';
import assert from 'node:assert/strict';
import { createFeedbackStore, publicFeedback, normalizeFeedback } from '../src/server/public/shared/evening-feedback.js';
import {collectionRecords} from '../src/server/public/shared/library-collection.js';
import {feedbackTransactions,FEEDBACK_KEY,OUTCOME_ARCHIVE_KEY} from '../src/server/public/shared/evening-storage.js';
const state = { domain:'game',seed:1,platform:'windows',situation:{note:'Только мои исходные слова',company:'solo'},answers:{},stops:[] };
const result = {ai:{model:'stub'},top:{id:'1',name:'One',ai:{reason:'my quoted reason'}},alternatives:[{id:'2',name:'Two'}]};
function memory() { const data = new Map(); return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}; }
let lockTail=Promise.resolve();
const locks={request:(_,fn)=>{const work=lockTail.then(fn);lockTail=work.catch(()=>{});return work;}};
function store(storage=memory(), send=async(p)=>({ok:true,id:p.id,revision:p.revision})) { let seq=0; return createFeedbackStore({storage,send,locks,id:()=>`run-${++seq}`,now:()=> '2026-10-31T12:00:00.000Z'}); }

test('a rejected revision remains local while later feedback is delivered; retry and edit survive reload', async () => {
  const storage=memory(), sent=[], codes=new Map();
  const send=async run=>{
    sent.push([run.id,run.revision]);
    const status=codes.get(run.id);
    return status?{ok:false,status}:{ok:true,id:run.id,revision:run.revision};
  };
  const s=store(storage,send);
  const a=await s.observe('a',state,result), b=await s.observe('b',state,result), c=await s.observe('c',state,result);
  codes.set(a.id,409);codes.set(b.id,400);await s.flush();
  assert.equal(s.status(a.id),'conflict');assert.equal(s.status(b.id),'rejected');assert.equal(s.status(c.id),'sent');
  const restored=store(storage,send);await restored.flush();assert.equal(sent.length,3);
  codes.clear();await restored.retry(a.id);
  assert.equal(restored.get(a.id).revision,1);assert.equal(restored.status(a.id),'sent');
  await restored.update(b.id,'1',{type:'fit',value:'accept'});await restored.flush();
  assert.equal(restored.status(b.id),'sent');assert.equal(restored.get(b.id).responses[0].fit,'accept');
});

test('a temporary server failure keeps the queue pending for a later flush', async () => {
  const storage=memory(),s=store(storage,async()=>({ok:false,status:503}));
  const a=await s.observe('a',state,result);await s.flush();
  assert.equal(s.status(a.id),'pending');
  const restored=store(storage);await restored.flush();assert.equal(restored.status(a.id),'sent');
});

test('a late conflict on an older version cannot reject a newer card edit',async()=>{
  const sent=[];let finish,signal;
  const dispatched=new Promise(resolve=>signal=resolve);
  const s=store(memory(),async run=>{
    sent.push(run.revision);
    if(run.revision===0){signal();return new Promise(resolve=>{finish=()=>resolve({ok:false,status:409});});}
    return {ok:true,id:run.id,revision:run.revision};
  });
  const run=await s.observe('a',state,result),delivery=s.flush();await dispatched;
  await s.update(run.id,'1',{type:'fit',value:'accept'});finish();await delivery;
  assert.deepEqual(sent,[0,1]);assert.equal(s.status(run.id),'sent');
});

test('evicted outcomes remain visible after reload, with conflicts and explicit overrides, without obsolete review links',async()=>{
  const storage=memory(),s=store(storage);
  for(const [dialogue,outcome] of [['a','liked'],['b','disliked']]){
    const r=await s.observe(dialogue,state,result);
    await s.update(r.id,'1',{type:'choose',value:true});await s.update(r.id,'1',{type:'outcome',value:outcome});
    if(dialogue==='a'){await s.update(r.id,'2',{type:'choose',value:true});await s.update(r.id,'2',{type:'outcome',value:'liked'});}
  }
  await s.flush();
  // Older installations stored only the recent runs. Start eviction from that envelope.
  const old=JSON.parse(storage.getItem('tastiq.site.evenings'));delete old.archivedOutcomes;
  for(const entry of old.entries)delete entry.rejected;
  storage.setItem('tastiq.site.evenings',JSON.stringify(old));
  let seq=0;
  const migrated=createFeedbackStore({storage,locks,id:()=>`new-run-${++seq}`});
  const later={top:{id:'3',name:'Three'}};
  for(let i=0;i<60;i++)await migrated.observe('subsequent-'+i,state,later);
  const resumed=store(storage);assert.equal(resumed.all().length,60);
  // An older open tab replaces only its own snapshot, knowing nothing about the archive.
  const feedbackKey='tastiq.site.evenings';
  storage.setItem(feedbackKey,JSON.stringify({version:1,entries:JSON.parse(storage.getItem(feedbackKey)).entries}));
  await resumed.refresh();
  assert.equal(store(storage).archivedOutcomes().length,2);
  const input={runs:resumed.all(),archivedOutcomes:resumed.archivedOutcomes()};
  const rows=collectionRecords(input);
  assert.equal(rows.find(r=>r.id==='1').ratingConflict,true);
  const liked=rows.find(r=>r.id==='2');assert.equal(liked.rating,'liked');assert.equal(liked.ratingSource,'experience');
  assert.deepEqual(liked.reviews,[]);assert.equal(liked.saved,false);
  const cleared=collectionRecords({...input,items:[{id:'2',domain:'game',status:'known',saved:false,ratingOverride:true}]});
  assert.equal(cleared.find(r=>r.id==='2').rating,null);
});

test('opening an intermediate snapshot migrates its outcomes without modifying or delivering the old queue',async()=>{
  const storage=memory(),key='tastiq.site.evenings',at='2026-11-19T14:00:00Z';
  const row={id:'1',domain:'game',title:'One',at,outcomes:['liked']};
  const envelope=JSON.stringify({version:1,entries:[],archivedOutcomes:[row]});
  storage.setItem(key,envelope);const opened=store(storage);
  assert.deepEqual(opened.archivedOutcomes(),[row]);await opened.refresh();
  assert.equal(storage.getItem(key),envelope);
  storage.setItem(key,JSON.stringify({version:1,entries:[]}));
  assert.deepEqual(store(storage).archivedOutcomes(),[row]);
});

test('the IndexedDB adapter commits both keys together and imports a local archive independently from an old queue',async()=>{
  const records=new Map(),commits=[],cache=memory();
  const db={transaction(){
    const changes=new Map(),reads=[];
    const tx={objectStore:()=>({
      get(key){const request={result:records.get(key)};reads.push(request);return request;},
      put(value,key){changes.set(key,value);},
    }),abort(){tx.aborted=true;}};
    setImmediate(()=>{
      for(const request of reads)request.onsuccess();
      if(tx.aborted){tx.onabort();return;}
      for(const [key,value] of changes)records.set(key,value);
      commits.push([...changes.keys()]);tx.oncomplete();
    });
    return tx;
  }};
  const factory={open(name,version){
    assert.equal(name,'tastiq-qa-archive');assert.equal(version,1);
    const request={result:db};setImmediate(()=>request.onsuccess());return request;
  }};
  const transaction=feedbackTransactions(cache,factory,'tastiq-qa-archive');
  const row={id:'1',domain:'game',title:'One',at:'2026-11-19T14:00:00Z',outcomes:['liked']};
  cache.setItem(FEEDBACK_KEY,JSON.stringify({version:1,entries:[],archivedOutcomes:[row]}));
  const s=createFeedbackStore({storage:cache,transaction,id:()=> 'first'});
  await s.observe('dialogue',state,result);
  assert.deepEqual(new Set(commits.at(-1)),new Set([FEEDBACK_KEY,OUTCOME_ARCHIVE_KEY]));
  const old=JSON.stringify({version:1,entries:[]});
  records.set(FEEDBACK_KEY,old);cache.setItem(FEEDBACK_KEY,old);
  const fresh=createFeedbackStore({storage:memory(),transaction});
  await fresh.refresh();assert.deepEqual(fresh.archivedOutcomes(),[row]);assert.equal(fresh.all().length,0);
  assert.deepEqual(commits.at(-1),[]);assert.deepEqual(JSON.parse(cache.getItem(OUTCOME_ARCHIVE_KEY)).outcomes,[row]);
  records.delete(OUTCOME_ARCHIVE_KEY);
  await fresh.refresh();assert.deepEqual(commits.at(-1),[OUTCOME_ARCHIVE_KEY]);
  assert.deepEqual(fresh.archivedOutcomes(),[row]);
});

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

test('replacement inherits the retained game response without assigning any opinion to a new game', async () => {
  const s=store(), original=await s.observe('d1',state,result);
  await s.update(original.id,'1',{type:'fit',value:'reject'});
  await s.update(original.id,'2',{type:'fit',value:'conditional'});
  await s.update(original.id,'2',{type:'explain',reason:'time',note:'Буду играть недолго'});
  await s.update(original.id,'2',{type:'choose',value:true});
  await s.update(original.id,'2',{type:'outcome',value:'liked'});
  const replacement={...result,top:{id:'3',name:'Three',ai:{reason:'new private explanation'}}};
  const next=await s.observe('d1',state,replacement,{inheritFrom:original.id});
  assert.deepEqual(next.responses,[{cardId:'2',fit:'conditional',reason:'time',note:'Буду играть недолго',chosen:true,started:true,outcome:'liked'}]);
  assert.equal(s.get(original.id).responses.length,2);
  await s.update(next.id,'2',{type:'fit',value:'accept'});
  assert.equal(s.get(original.id).responses.find(r=>r.cardId==='2').fit,'conditional');
  const publicRun=publicFeedback(next);
  assert.equal(publicRun.context.note,undefined);
  assert.ok(!JSON.stringify(publicRun).includes('new private explanation'));
});

test('replacement inheritance requires the same dialogue, domain and complete current context', async () => {
  const s=store(), original=await s.observe('d1',state,result);
  await s.update(original.id,'2',{type:'choose',value:true});
  const replacement={...result,top:{id:'3',name:'Three'}};
  const cases=[
    ['different-dialogue',state,original.id],
    ['d1',{...state,domain:'film'},original.id],
    ['d1',{...state,platform:'deck'},original.id],
    ['d1',{...state,situation:{...state.situation,company:'friend'}},original.id],
    ['d1',{...state,situation:{...state.situation,note:'Сегодня хочу совсем другое'}},original.id],
    ['d1',state,'missing-run'],
  ];
  for(const [dialogue,current,inheritFrom] of cases) {
    const next=await s.observe(dialogue,current,replacement,{inheritFrom});
    assert.deepEqual(next.responses,[]);
  }
});

test('repeated replacement observation and undo return stored opinions without replaying inheritance', async () => {
  const storage=memory(),s=store(storage),original=await s.observe('d1',state,result);
  await s.update(original.id,'2',{type:'choose',value:true});
  const replacement={...result,top:{id:'3',name:'Three'}};
  const next=await s.observe('d1',state,replacement,{inheritFrom:original.id});
  await s.update(next.id,'2',{type:'choose',value:false});
  await s.update(next.id,'3',{type:'fit',value:'accept'});
  const resumed=store(storage);
  const repeat=await resumed.observe('d1',state,replacement,{inheritFrom:original.id});
  assert.equal(repeat.id,next.id);
  assert.equal(repeat.responses.find(r=>r.cardId==='2').chosen,false);
  assert.equal(repeat.responses.find(r=>r.cardId==='3').fit,'accept');
  const undo=await resumed.observe('d1',state,result,{inheritFrom:next.id});
  assert.equal(undo.id,original.id);
  assert.equal(undo.responses.find(r=>r.cardId==='2').chosen,true);
  assert.equal(undo.responses.some(r=>r.cardId==='3'),false);
});

test('ordinary observations do not inherit matching game responses without an explicit source', async () => {
  const s=store(),original=await s.observe('d1',state,result);
  await s.update(original.id,'2',{type:'choose',value:true});
  const next=await s.observe('d1',state,{...result,top:{id:'3',name:'Three'}});
  assert.deepEqual(next.responses,[]);
});

test('replacement reads the latest source response inside its transaction and persists it for reload', async () => {
  let durable=null,tail=Promise.resolve();
  const transaction=fn=>{const work=tail.then(()=>fn({getItem:()=>durable,setItem:(_,v)=>{durable=v;}}));tail=work.catch(()=>{});return work;};
  const a=createFeedbackStore({storage:memory(),transaction}),b=createFeedbackStore({storage:memory(),transaction});
  const original=await a.observe('d1',state,result);
  await b.update(original.id,'2',{type:'choose',value:true});
  const replacement={...result,top:{id:'3',name:'Three'}};
  const next=await a.observe('d1',state,replacement,{inheritFrom:original.id});
  assert.equal(next.responses[0]?.chosen,true);
  const resumed=createFeedbackStore({storage:memory(),transaction});
  const restored=await resumed.observe('d1',state,replacement,{inheritFrom:original.id});
  assert.equal(restored.id,next.id);
  assert.equal(restored.responses[0]?.chosen,true);
});

test('explicit undo carries the latest retained opinion into an existing snapshot only once across reload', async () => {
  const storage=memory(),s=store(storage),original=await s.observe('d1',state,result);
  await s.update(original.id,'1',{type:'fit',value:'accept'});
  await s.update(original.id,'2',{type:'choose',value:true});
  const next=await s.observe('d1',state,{...result,top:{id:'3',name:'Three'}},{inheritFrom:original.id});
  await s.update(next.id,'2',{type:'choose',value:false});
  await s.update(next.id,'2',{type:'fit',value:'reject'});
  await s.update(next.id,'3',{type:'choose',value:true});
  await s.flush();
  const carry={inheritFrom:next.id,carryIntoExisting:true,retainedIds:['2','3']};
  const undo=await s.observe('d1',state,result,carry);
  assert.equal(undo.id,original.id);
  assert.equal(undo.revision,original.revision+3);
  assert.equal(s.status(undo.id),'pending');
  assert.deepEqual(undo.responses,[
    {cardId:'1',fit:'accept',reason:null,note:'',chosen:false,started:false,outcome:null},
    {cardId:'2',fit:'reject',reason:null,note:'',chosen:false,started:false,outcome:null},
  ]);
  await s.update(undo.id,'2',{type:'fit',value:'accept'});
  const resumed=store(storage),repeat=await resumed.observe('d1',state,result,carry);
  assert.equal(repeat.revision,undo.revision+1);
  assert.equal(repeat.responses.find(r=>r.cardId==='2').fit,'accept');
  assert.equal(repeat.responses.some(r=>r.cardId==='3'),false);
});

test('explicit carry uses retained IDs and refuses a different source context for an existing target', async () => {
  const s=store(),original=await s.observe('d1',state,result);
  await s.update(original.id,'2',{type:'choose',value:true});
  const replacement={...result,top:{id:'3',name:'Three'}};
  const next=await s.observe('d1',state,replacement,{inheritFrom:original.id,retainedIds:[]});
  assert.deepEqual(next.responses,[]);
  await s.update(next.id,'2',{type:'choose',value:false});
  const excluded=await s.observe('d1',state,result,{inheritFrom:next.id,carryIntoExisting:true,retainedIds:[]});
  assert.equal(excluded.responses[0].chosen,true);
  const other=await s.observe('d1',{...state,situation:{...state.situation,note:'Совсем другая цель'}},replacement);
  await s.update(other.id,'2',{type:'choose',value:false});
  const mismatch=await s.observe('d1',state,result,{inheritFrom:other.id,carryIntoExisting:true,retainedIds:['2']});
  assert.equal(mismatch.responses[0].chosen,true);
  assert.equal(mismatch.revision,excluded.revision);
});
