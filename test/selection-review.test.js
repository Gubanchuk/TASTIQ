import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSelectionReview,historicalFeedback,createSelectionReviewDrafts,selectionReviewHtml} from '../src/server/public/shared/selection-review.js';
import {createFeedbackStore,publicFeedback,normalizeFeedback} from '../src/server/public/shared/evening-feedback.js';
import {canReviewSnapshot,createSelectionReviewController} from '../src/server/public/shared/selection-review-controller.js';
const review={verdict:'reject',issue:'understanding',note:'Хотел спокойное, получил напряжённое',requestSummary:'Хочется спокойного',transcript:'TASTIQ — подбор игры\nТекущая выдача',learn:true};
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};};
const locks={request:async(_,fn)=>fn()};
const state={domain:'game',platform:'windows',situation:{company:'solo',note:'PRIVATE'},answers:{},stops:[]};
const result={top:{id:'1',name:'One'},alternatives:[{id:'2',name:'Two'}]};
const store=(storage,send=async r=>({ok:true,id:r.id,revision:r.revision}))=>createFeedbackStore({storage,send,locks,id:()=>crypto.randomUUID()});

test('selection review validates bounded explicit fields; old feedback keeps its privacy contract',()=>{
 assert.deepEqual(normalizeSelectionReview({...review,library:['PRIVATE'],draft:'SECRET'}),review);
 for(const patch of [{verdict:'invented'},{issue:'invented'},{note:'a'.repeat(601)},{transcript:'x'.repeat(48001)},{learn:'yes'}])assert.equal(normalizeSelectionReview({...review,...patch}),null);
 const old={version:1,id:'r',dialogueId:'d',domain:'game',revision:0,at:new Date().toISOString(),updatedAt:new Date().toISOString(),context:{note:'PRIVATE'},cards:[{id:'1',title:'One',origin:'engine',reason:'PRIVATE'}],responses:[]};
 assert.ok(!Object.hasOwn(normalizeFeedback(old),'selectionReview'));
 assert.ok(!JSON.stringify(publicFeedback(old)).includes('PRIVATE'));
 const next=normalizeFeedback({...old,selectionReview:review});assert.deepEqual(next.selectionReview,review);
 assert.equal(normalizeFeedback({...old,selectionReview:{...review,verdict:'invalid'}}),null);
});

test('review submit is explicit and late ACK/reload retain the newer pending revision',async()=>{
 const storage=memory();let finish,fail=false;
 const f=store(storage,async r=>{if(fail)throw Error('offline');return new Promise(resolve=>finish=()=>resolve({ok:true,id:r.id,revision:r.revision}));});
 const run=await f.observe('dialogue',state,result);assert.equal(publicFeedback(f.get(run.id)).selectionReview,undefined);
 assert.equal(await f.review(run.id,review),true);const sending=f.flush();await new Promise(setImmediate);
 await f.review(run.id,{...review,note:'Новый комментарий'});fail=true;finish();await sending;
 assert.equal(f.status(run.id),'pending');const restored=store(storage);assert.equal(restored.get(run.id).selectionReview.note,'Новый комментарий');
 await restored.flush();assert.equal(restored.status(run.id),'sent');
 assert.equal(await restored.review(run.id,{...review,verdict:'bad'}),false);
 assert.deepEqual(restored.learning('film'),[]);assert.equal(restored.learning('game')[0].note,'Новый комментарий');
});

test('different visible lists keep their own review; undo reuses it without carrying it to a new list',async()=>{
 const f=store(memory()),first=await f.observe('d',state,result);await f.review(first.id,review);
 const next=await f.observe('d',state,{top:{id:'3',name:'Three'},alternatives:[]},{inheritFrom:first.id});
 assert.equal(f.get(next.id).selectionReview,undefined);
 const undo=await f.observe('d',state,result);assert.equal(undo.id,first.id);assert.deepEqual(f.get(undo.id).selectionReview,review);
});

test('history is bounded own same-domain context, not draft text or a permanent ban',()=>{
 const runs=Array.from({length:10},(_,i)=>({id:String(i),domain:i===9?'film':'game',updatedAt:new Date(2026,0,i+1).toISOString(),cards:[{id:String(i),title:'Title '+i}],selectionReview:{...review,learn:i!==8,note:'x'.repeat(500)}}));
 const history=historicalFeedback(runs,'game');assert.equal(history.length,6);assert.equal(history[0].cards[0].id,'7');assert.equal(history[0].note.length,300);
 assert.ok(history.every(r=>r.domain==='game'&&!Object.hasOwn(r,'transcript')&&!Object.hasOwn(r,'stops')));
});

test('drafts survive reload separately from submitted review and all user copy is escaped',()=>{
 const storage=memory(),a=createSelectionReviewDrafts({storage});a.set('one',{verdict:'partial',note:'<script>bad</script>'});
 const b=createSelectionReviewDrafts({storage});assert.equal(b.get('one').note,'<script>bad</script>');assert.equal(b.get('two').verdict,null);
 const html=selectionReviewHtml({id:'one',responses:[]},{draft:b.get('one'),status:'pending'});
 assert.ok(html.includes('Как тебе подбор?'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(html.includes('Отправить отзыв'));assert.ok(!html.includes('Отзыв сохранён в базе'));
});

test('submission is bound to the displayed domain, dialogue and ordered cards; draft spaces survive',()=>{
 const run={domain:'game',dialogueId:'d',cards:[{id:'1'},{id:'2'}]},snapshot={state:{domain:'game',id:'d',result},screen:{type:'result'}};
 assert.equal(canReviewSnapshot(run,snapshot),true);
 assert.equal(canReviewSnapshot(run,{...snapshot,state:{id:'d',result}}),true);
 assert.equal(canReviewSnapshot(run,{...snapshot,state:{...snapshot.state,domain:'film'}}),false);
 assert.equal(canReviewSnapshot(run,{...snapshot,screen:{type:'result',result:{top:result.alternatives[0],alternatives:[result.top]}}}),false);
 const drafts=createSelectionReviewDrafts({storage:memory()});drafts.set('d',{note:'Хочу '});assert.equal(drafts.get('d').note,'Хочу ');
});

test('feedback form remains usable when browser storage is unavailable or rejects writes',()=>{
 for(const storage of [undefined,{getItem:()=>null,setItem:()=>{throw Error('Storage disabled');}}]){
  const drafts=createSelectionReviewDrafts({storage});drafts.set('one',{verdict:'reject',note:'Memory-only answer'});
  assert.equal(drafts.get('one').verdict,'reject');assert.equal(drafts.get('one').note,'Memory-only answer');assert.equal(drafts.has('one'),true);
  drafts.delete('one');assert.equal(drafts.has('one'),false);
 }
});

test('a newer draft typed during delayed submit survives the old local transaction acknowledgement',async()=>{
 const storage=memory(),drafts=createSelectionReviewDrafts({storage});drafts.set('r',{verdict:'reject',note:'BEFORE'});
 const run={id:'r',domain:'game',dialogueId:'d',cards:[{id:'1'},{id:'2'}]},snapshot={state:{id:'d',summary:'Current wish',result},screen:{type:'result'}};
 const handlers=new Map(),status={textContent:''},form={dataset:{form:'selection-review',run:'r'},elements:{issue:{value:''},note:{value:'BEFORE'},learn:{checked:true}}};
 const root={addEventListener:(type,fn)=>handlers.set(type,fn),querySelector:selector=>selector==='[data-selection-review-status]'?status:null};
 let finish;
 const feedback={persistent:true,get:()=>run,status:()=> 'sent',review:async(_,value)=>{await new Promise(resolve=>finish=resolve);run.selectionReview=value;return true;},flush:async()=>{}};
 createSelectionReviewController({storage,feedback,getSnapshot:()=>snapshot,getRunId:()=>run.id,isBusy:()=>false,onChange:()=>{},root});
 handlers.get('submit')({target:form,preventDefault:()=>{}});
 form.elements.note.value='NEWER UNSENT TEXT';handlers.get('input')({target:{closest:()=>form}});
 finish();await new Promise(setImmediate);
 assert.equal(run.selectionReview.note,'BEFORE');assert.equal(drafts.has('r'),true);assert.equal(drafts.get('r').note,'NEWER UNSENT TEXT');
 assert.ok(status.textContent.includes('ещё не отправлены'));
});
