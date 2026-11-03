import test from 'node:test';
import assert from 'node:assert/strict';
import {createLibraryStore,LIBRARY_KEY} from '../src/server/public/shared/library-store.js';
import * as library from '../src/server/public/shared/library-store.js';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createGameHistory,GAME_HISTORY_PREFIX} from '../src/server/public/shared/game-history.js';
import {createMediaHistory,MEDIA_HISTORY_PREFIX} from '../src/server/public/shared/media-history.js';
import {createFeedbackStore,FEEDBACK_KEY} from '../src/server/public/shared/evening-feedback.js';
import {eveningControls,feedbackStatus} from '../src/server/public/shared/evening-view.js';
import {qaStorage,qaFeedbackOptions} from '../src/server/public/shared/qa-session.js';
import {initCustomSelects,focusCustomSelect} from '../src/server/public/shared/custom-select.js';
import {createFeedbackDrafts,FEEDBACK_DRAFTS_KEY} from '../src/server/public/shared/feedback-drafts.js';

function memory(initial) {
 const map=new Map(initial?[[LIBRARY_KEY,JSON.stringify(initial)]]:[]);
 return {get length(){return map.size;},key:i=>[...map.keys()][i]??null,getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};
}
const stamp='2026-11-02T12:00:00.000Z';
const game={id:'steam:10',name:'Real game',image:'https://example.com/game.jpg'};
const legacy={version:1,items:[{id:game.id,domain:'game',title:game.name,status:'liked',answer:{reaction:'love',why:['story']},addedAt:'2026-10-31T12:00:00Z',custom:{keep:true}}],history:[{domain:'game',topId:'steam:20',title:'Earlier pick',at:'2026-10-31'}],customRoot:'preserve'};

test('moving and resaving plans preserves legacy taste, answers, history and extra fields',()=>{
 const storage=memory(legacy),store=createLibraryStore({storage,now:()=>stamp});
 assert.equal(store.all()[0].lane,'known');
 store.move('game',game.id,'tonight');
 store.save(game,{domain:'game',lane:'want'});
 const [row]=store.all();
 assert.equal(row.status,'liked');assert.deepEqual(row.answer,legacy.items[0].answer);
 assert.deepEqual(row.custom,{keep:true});assert.equal(row.addedAt,legacy.items[0].addedAt);
 assert.equal(row.lane,'want');assert.equal(row.updatedAt,stamp);
 const raw=JSON.parse(storage.getItem(LIBRARY_KEY));
 assert.deepEqual(raw.history,legacy.history);assert.equal(raw.customRoot,'preserve');
 assert.deepEqual(store.history(),legacy.history);
 row.answer.reaction='dislike';assert.equal(store.all()[0].answer.reaction,'love');
});

test('fresh read-modify-write preserves changes from independent stores and legacy writers',()=>{
 const storage=memory(legacy),a=createLibraryStore({storage}),b=createLibraryStore({storage});
 a.save(game,{domain:'game'});b.save({id:'tt20',title:'Film'},{domain:'film'});
 const snapshot=JSON.parse(storage.getItem(LIBRARY_KEY));snapshot.history.push({title:'Fresh history'});storage.setItem(LIBRARY_KEY,JSON.stringify(snapshot));
 a.move('game',game.id,'tonight');
 assert.equal(b.all().length,2);assert.equal(b.all().find(x=>x.domain==='game').lane,'tonight');
 assert.equal(b.history().at(-1).title,'Fresh history');
 b.remove('film','tt20');assert.equal(a.all().length,1);
});

test('identity includes domain and new familiarity never manufactures a taste rating',()=>{
 const store=createLibraryStore({storage:memory(),now:()=>stamp});
 store.save({id:'same',title:'A game'},{domain:'game',lane:'known'});
 store.save({id:'same',title:'A film'},{domain:'film'});
 assert.equal(store.all().length,2);
 assert.equal(store.all().find(x=>x.domain==='game').status,'known');
 assert.equal(store.all().find(x=>x.domain==='film').status,'want');
 store.move('game','same','want');assert.equal(store.all().find(x=>x.domain==='game').status,'known');
 assert.equal(store.save({id:'bad<script>',title:'Bad'},{domain:'game'}),null);
 assert.equal(store.save(game,{domain:'unknown'}),null);
 assert.equal(store.move('film','same','bad'),null);assert.equal(store.all().length,2);
});

test('remove and restore keep order and never overwrite a newly saved collision',()=>{
 const storage=memory(),a=createLibraryStore({storage}),b=createLibraryStore({storage});
 a.save(game,{domain:'game'});a.save({id:'steam:20',name:'Second'},{domain:'game'});
 const removed=a.remove('game',game.id);assert.equal(removed.index,1);
 b.save({id:game.id,name:'New copy'},{domain:'game',lane:'tonight'});
 assert.equal(a.restore(removed),null);assert.equal(a.all().find(x=>x.id===game.id).title,'New copy');
 const fresh=a.remove('game',game.id);assert.ok(a.restore(fresh));
 assert.equal(a.all()[fresh.index].title,'New copy');
 assert.equal(a.remove('film',game.id),null);
});

test('unavailable storage keeps in-memory changes and readable snapshot after write failure',()=>{
 let fail=false;
 const storage=memory(legacy),set=storage.setItem;
 storage.setItem=(...args)=>{if(fail)throw Error('full');set(...args);};
 const store=createLibraryStore({storage});fail=true;
 store.save({id:'tt30',title:'Saved this visit'},{domain:'film'});
 assert.equal(store.persistent,false);assert.equal(store.all().length,2);
 store.move('film','tt30','tonight');assert.equal(store.all()[0].lane,'tonight');
 const inaccessible=createLibraryStore({storage:{getItem(){throw Error('blocked');}}});
 inaccessible.save(game,{domain:'game'});assert.equal(inaccessible.persistent,false);assert.equal(inaccessible.all().length,1);
});

test('explicit taste edits are separate from lane changes and keep a matching answer',()=>{
 const store=createLibraryStore({storage:memory(legacy)});
 store.rate('game',game.id,'liked');assert.deepEqual(store.all()[0].answer,legacy.items[0].answer);
 store.rate('game',game.id,'disliked');assert.equal(store.all()[0].status,'disliked');assert.equal(store.all()[0].answer,undefined);
 assert.equal(store.all()[0].lane,'known');
 store.move('game',game.id,'tonight');assert.equal(store.all()[0].status,'disliked');
 store.rate('game',game.id,null);assert.equal(store.all()[0].status,'known');assert.equal(store.all()[0].lane,'tonight');
});

test('untrusted stored URLs cannot become executable links or image sources',()=>{
 for(const value of ['javascript:alert(1)','data:text/html,<script>','//evil.example/image','/\\evil.example/a','file:///C:/secret','https://user:password@example.com/a'])assert.equal(library.safeLibraryUrl(value),null);
 assert.equal(library.safeLibraryUrl('https://example.com/poster.jpg'),'https://example.com/poster.jpg');
 assert.equal(library.safeLibraryUrl('/assets/image.jpg'),'/assets/image.jpg');
});

// Run the real controller against storage and the production stores. Only the DOM boundary
// and catalog/network transport are replaced; the browser integration is checked separately.
async function controller(storage,{catalog=[],transport,mobile=false,localTransaction}={}) {
 const handlers=new Map(),requests=[],app={innerHTML:'',setAttribute(){}},notice={hidden:true,textContent:''};
 class Element {
  constructor({dataset={},id='',value='',checked=false}={}){Object.assign(this,{dataset,id,value,checked,isConnected:false});}
  closest(selector){return selector==='button[data-act]'?this:null;}
  matches(){return false;}
 }
 const document={activeElement:null,hidden:false,querySelector:selector=>selector==='#library-app'?app:selector==='#library-notice'?notice:null,querySelectorAll:()=>[],getElementById:()=>null,
  addEventListener:(type,handler)=>handlers.set(type,handler)};
 const context=vm.createContext({document,localStorage:storage,Element,HTMLInputElement:class extends Element{},HTMLImageElement:class extends Element{},CSS:{escape:value=>value},structuredClone,matchMedia:()=>({matches:mobile,addEventListener(){}}),
  createLibraryStore,LIBRARY_KEY,safeLibraryUrl:library.safeLibraryUrl,createGameHistory,GAME_HISTORY_PREFIX,createMediaHistory,MEDIA_HISTORY_PREFIX,FEEDBACK_KEY,eveningControls,feedbackStatus,qaStorage,qaFeedbackOptions,initCustomSelects,focusCustomSelect,createFeedbackDrafts,FEEDBACK_DRAFTS_KEY,
  createFeedbackStore:options=>createFeedbackStore({...options,locks:{request:async(_,fn)=>fn()},...(localTransaction?{transaction:localTransaction}:{})}),
  fetch:async(url,options)=>{requests.push({url,options});return transport?transport(url,options):{ok:true,json:async()=>catalog};},
  setTimeout:()=>1,clearTimeout(){},addEventListener:(type,handler)=>handlers.set(`window:${type}`,handler)});
 const source=(await readFile(new URL('../src/server/public/library/app.js',import.meta.url),'utf8')).replace(/^import .+;\r?$/gm,'');
 vm.runInContext(source,context);
 await new Promise(resolve=>setImmediate(resolve));
 const noteForm=(run,id,note,reason='')=>{const form=new Element({dataset:{run,id}});form.elements={note:{value:note},reason:{value:reason}};form.matches=selector=>selector==='[data-form="evening-reason"]';form.querySelector=()=>new Element({dataset:{fk:`evening-reason:${run}:${id}`}});return form;};
 return {app,requests,click:dataset=>handlers.get('click')({target:new Element({dataset})}),change:(id,value,dataset={})=>handlers.get('change')({target:new Element({id,value,dataset,checked:value===true})}),input:value=>handlers.get('input')({target:new Element({id:'find-title',value})}),
  submitNote:(run,id,note,reason='')=>handlers.get('submit')({target:noteForm(run,id,note,reason),preventDefault(){}}),
  draftNote:(run,id,note,reason='')=>{const input=new Element();input.closest=()=>noteForm(run,id,note,reason);handlers.get('input')({target:input});},
  toggleFilters:open=>{const target=new Element({dataset:{filterPanel:'true'}});target.open=open;handlers.get('toggle')({target});},tick:()=>new Promise(resolve=>setImmediate(resolve))};
}
const evening={version:1,id:'evening-one',dialogueId:'dialogue-one',domain:'game',revision:1,at:stamp,updatedAt:stamp,
 context:{note:'Private wish'},cards:[{id:game.id,title:game.name,origin:'model',reason:'A reason',caveat:''}],
 responses:[{cardId:game.id,fit:'accept',reason:null,note:'A review',chosen:true,started:false,outcome:null}]};

test('opening library, prior picks and evenings never sends feedback or edits saved history',async()=>{
 const storage=memory(legacy),history=createGameHistory({storage,now:()=>stamp});history.remember({id:'steam:30',title:'Known game'},{blocked:true});
 storage.setItem(FEEDBACK_KEY,JSON.stringify({version:1,entries:[{key:'old-key',run:evening,ack:-1}]}));
 const beforeLibrary=storage.getItem(LIBRARY_KEY),beforeEvening=storage.getItem(FEEDBACK_KEY),beforeFamiliar=storage.getItem(GAME_HISTORY_PREFIX+'steam:30');
 const page=await controller(storage,{catalog:[{id:'steam:wrong',name:'Known game',image:'https://example.com/wrong-cover.jpg'}]});
 page.click({act:'view',view:'history'});page.click({act:'view',view:'evenings'});await page.tick();
 assert.equal(storage.getItem(LIBRARY_KEY),beforeLibrary);assert.equal(storage.getItem(FEEDBACK_KEY),beforeEvening);assert.equal(storage.getItem(GAME_HISTORY_PREFIX+'steam:30'),beforeFamiliar);
 assert.ok(page.app.innerHTML.includes('A review'));assert.ok(page.app.innerHTML.includes('Private wish'));
 assert.equal(page.requests.filter(request=>request.options?.method==='POST').length,0);
 page.click({act:'view',view:'board'});assert.ok(!page.app.innerHTML.includes('wrong-cover.jpg'));
});

test('library filters render real matching records and moving familiarity keeps exclusion and taste separate',async()=>{
 const storage=memory(legacy),history=createGameHistory({storage,now:()=>stamp});history.remember({id:'steam:30',title:'Known game'},{blocked:true});
 const store=createLibraryStore({storage});store.save({id:'film-one',title:'A film'},{domain:'film'});
 const page=await controller(storage);
 const ids=()=>[...page.app.innerHTML.matchAll(/data-card="([^"]+)"/g)].map(match=>match[1]);
 assert.deepEqual(ids(),['film:film-one']);
 page.click({act:'lane',lane:'known'});page.change('reaction-filter','liked');assert.deepEqual(ids(),['game:steam:10']);
 page.change('reaction-filter','unrated');assert.deepEqual(ids(),['game:steam:30']);
 page.change('domain-filter','film');assert.deepEqual(ids(),[]);page.click({act:'lane',lane:'want'});assert.deepEqual(ids(),['film:film-one']);
 page.click({act:'clear'});page.change('', 'tonight',{act:'move',domain:'game',id:'steam:30'});
 assert.equal(store.all().find(row=>row.id==='steam:30').lane,'tonight');assert.equal(store.all().find(row=>row.id==='steam:30').status,'want');
 assert.deepEqual(history.blockedIds(),['steam:30']);assert.equal(store.all().find(row=>row.id===game.id).status,'liked');
 page.click({act:'remove',domain:'game',id:'steam:30'});assert.deepEqual(history.blockedIds(),['steam:30']);
 page.click({act:'undo'});assert.equal(store.all().find(row=>row.id==='steam:30').lane,'tonight');
 assert.equal(page.requests.filter(request=>request.options?.method==='POST').length,0);
});

test('a slow explicit feedback send does not drop the next local evening edit',async()=>{
 const storage=memory(legacy);storage.setItem(FEEDBACK_KEY,JSON.stringify({version:1,entries:[{key:'old-key',run:evening,ack:-1}]}));
 let release,posts=0;
 const page=await controller(storage,{transport:async(_,options)=>{
  const run=JSON.parse(options.body).run;
  if(++posts===1)await new Promise(resolve=>{release=resolve;});
  return {ok:true,json:async()=>({ok:true,id:run.id,revision:run.revision})};
 }});
 page.click({act:'view',view:'evenings'});
 page.click({act:'evening-start',run:evening.id,id:game.id,v:'on'});await page.tick();
 page.click({act:'evening-fit',run:evening.id,id:game.id,v:'reject'});await page.tick();
 const after=JSON.parse(storage.getItem(FEEDBACK_KEY)).entries[0].run;
 release();await page.tick();
 assert.equal(after.responses[0].started,true);assert.equal(after.responses[0].fit,'reject');assert.equal(after.revision,3);
});

test('queued explicit evening edits survive a delayed local transaction before any network send',async()=>{
 const storage=memory(legacy);storage.setItem(FEEDBACK_KEY,JSON.stringify({version:1,entries:[{key:'old-key',run:evening,ack:-1}]}));
 let pause=false,release,notifyWaiting,serial=Promise.resolve();
 const waiting=new Promise(resolve=>{notifyWaiting=resolve;});
 const localTransaction=fn=>{
  const work=serial.then(async()=>{
   if(pause){pause=false;await new Promise(resolve=>{release=resolve;notifyWaiting();});}
   return fn(storage);
  });
  serial=work.catch(()=>{});return work;
 };
 const page=await controller(storage,{localTransaction,transport:async(_,options)=>{
  const run=JSON.parse(options.body).run;return {ok:true,json:async()=>({ok:true,id:run.id,revision:run.revision})};
 }});
 page.click({act:'view',view:'evenings'});pause=true;
 page.click({act:'evening-start',run:evening.id,id:game.id,v:'on'});await waiting;
 page.click({act:'evening-fit',run:evening.id,id:game.id,v:'reject'});
 assert.equal(page.requests.length,0);
 release();await page.tick();await page.tick();
 const after=JSON.parse(storage.getItem(FEEDBACK_KEY)).entries[0].run;
 assert.equal(after.responses[0].started,true);assert.equal(after.responses[0].fit,'reject');assert.equal(after.responses[0].note,'A review');assert.equal(after.revision,3);
 assert.equal(page.requests.length,1);const sent=JSON.parse(page.requests[0].options.body).run;
 assert.equal(sent.revision,3);assert.equal(sent.responses[0].fit,'reject');assert.equal(sent.responses[0].started,true);
 assert.deepEqual(JSON.parse(storage.getItem(LIBRARY_KEY)),legacy);
});

test('a delayed submitted explanation preserves a newer unsent note draft',async()=>{
 const storage=memory(legacy);storage.setItem(FEEDBACK_KEY,JSON.stringify({version:1,entries:[{key:'old-key',run:evening,ack:-1}]}));
 let pause=false,release,notifyWaiting;
 const waiting=new Promise(resolve=>{notifyWaiting=resolve;});
 const localTransaction=async fn=>{if(pause){pause=false;await new Promise(resolve=>{release=resolve;notifyWaiting();});}return fn(storage);};
 const page=await controller(storage,{localTransaction});page.click({act:'view',view:'evenings'});pause=true;
 page.submitNote(evening.id,game.id,'Submitted note','other');await waiting;
 page.draftNote(evening.id,game.id,'New unsent words','time');
 release();await page.tick();await page.tick();
 const after=JSON.parse(storage.getItem(FEEDBACK_KEY)).entries[0].run;
 assert.equal(after.responses[0].note,'Submitted note');assert.equal(after.responses[0].reason,'other');
 assert.ok(page.app.innerHTML.includes('New unsent words</textarea>'));assert.ok(page.app.innerHTML.includes('<option value="time" selected>'));
 assert.ok(!page.requests.some(request=>request.options?.body?.includes('New unsent words')));
});

test('a restored draft-only evening is visible in the library before any rating was submitted',async()=>{
 const storage=memory(legacy),draftOnly={...evening,revision:0,responses:[]};storage.setItem(FEEDBACK_KEY,JSON.stringify({version:1,entries:[{key:'draft-only',run:draftOnly,ack:-1}]}));
 createFeedbackDrafts({storage}).set(`${evening.id}:${game.id}`,{reason:'mood',note:'Черновик после перезагрузки'});
 const page=await controller(storage);page.click({act:'view',view:'evenings'});
 assert.ok(page.app.innerHTML.includes('Черновик после перезагрузки</textarea>'));assert.ok(page.app.innerHTML.includes('Продолжить отзыв'));assert.ok(page.app.innerHTML.includes('data-view="evenings" data-focus="view:evenings" aria-pressed="true">Вечера<span>1</span>'));
 assert.equal(page.requests.filter(request=>request.options?.method==='POST').length,0);
});

test('mobile filter controls preserve selections while search rerenders and views change',async()=>{
 const page=await controller(memory(legacy),{mobile:true});
 const panel=()=>page.app.innerHTML.match(/<div\b[^>]*id="library-filter-panel"[^>]*>/)?.[0]??'';
 assert.ok(panel(),'The secondary filter region remains available');
 page.change('domain-filter','game');page.change('reaction-filter','liked');page.input('Real');assert.ok(panel());
 assert.ok(page.app.innerHTML.includes('data-active-count="2"'));assert.ok(page.app.innerHTML.includes('<option value="game" selected>'));
 page.input('Real game');page.click({act:'view',view:'history'});page.click({act:'view',view:'board'});assert.ok(panel());
 const desktop=await controller(memory(legacy));assert.match(desktop.app.innerHTML,/<div\b[^>]*id="library-filter-panel"/);
});


test('media familiarity appears in library and block/forget/undo stay in the selected domain',async()=>{
 const storage=memory(),film=createMediaHistory('film',{storage}),series=createMediaHistory('series',{storage});
 film.remember({id:'tt1',title:'Фильм',poster:'https://example.com/film.jpg'});series.remember({id:'tt1',title:'Сериал'});
 const page=await controller(storage);assert.ok(page.app.innerHTML.includes('data-card="film:tt1"'));assert.ok(page.app.innerHTML.includes('data-card="series:tt1"'));
 page.change('',true,{act:'blocked',domain:'film',id:'tt1'});assert.deepEqual(film.blockedIds(),['tt1']);assert.deepEqual(series.blockedIds(),[]);
 page.click({act:'forget',domain:'film',id:'tt1'});assert.equal(film.all().length,0);assert.equal(series.all().length,1);
 page.click({act:'undo'});assert.equal(film.all().length,1);assert.deepEqual(film.blockedIds(),['tt1']);assert.equal(film.all()[0].poster,'https://example.com/film.jpg');
 assert.equal(page.requests.filter(r=>r.options?.method==='POST').length,0);
});
