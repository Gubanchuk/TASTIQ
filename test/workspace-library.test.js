import {animeStyleLabel,inLibraryDomain,mediaLibraryDomain} from '../src/server/public/shared/anime-pilot.js';
import {selectionModeTitle} from '../src/server/public/shared/selection-mode.js';
import test from 'node:test';
import {createMemoryView} from '../src/server/public/library/memory-view.js';
import {createTasteMemory,TASTE_MEMORY_PREFIX} from '../src/server/public/shared/taste-memory.js';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createLibraryStore,LIBRARY_KEY,safeLibraryUrl} from '../src/server/public/shared/library-store.js';
import {createSavedSource,readSavedSource,savedSourceChanged,savedSourceLibraryUrl,matchesLibraryQuery,savedPickerDomains} from '../src/server/public/shared/saved-source.js';
import {artworkImageHtml,retryArtworkImage} from '../src/server/public/shared/card-artwork.js';
import {animeEncyclopediaCreditHtml} from '../src/server/public/shared/card-metadata.js';
import {collectionRecords} from '../src/server/public/shared/library-collection.js';
import {createGameHistory,GAME_HISTORY_PREFIX} from '../src/server/public/shared/game-history.js';
import {createMediaHistory,MEDIA_HISTORY_PREFIX} from '../src/server/public/shared/media-history.js';
import {createFeedbackStore,FEEDBACK_KEY,FIT,OUTCOMES,REASONS} from '../src/server/public/shared/evening-feedback.js';
import {eveningControls,feedbackStatus} from '../src/server/public/shared/evening-view.js';
import {qaStorage,qaFeedbackOptions} from '../src/server/public/shared/qa-session.js';
import {createFeedbackDrafts,FEEDBACK_DRAFTS_KEY} from '../src/server/public/shared/feedback-drafts.js';
import {createSelectionArchive,SELECTION_ARCHIVE_KEY,selectionUrl} from '../src/server/public/shared/selection-archive.js';

function memory(){const map=new Map();return {get length(){return map.size;},key:i=>[...map.keys()][i]??null,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
async function page(storage,{search='',handoffStorage=memory(),fetcher}={}){
 const handlers=new Map(),app={innerHTML:'',setAttribute(){}},notice={};
 class Element{constructor(dataset={},value='',id=''){Object.assign(this,{dataset,value,id,checked:false});}closest(s){return s==='button[data-act]'?this:null;}matches(){return false;}focus(){document.activeElement=this;}}
 const findId=id=>app.innerHTML.includes(`id="${id}"`)?new Element({},'',id):null;
 const document={activeElement:null,querySelector:s=>s==='#library-app'?app:s==='#library-notice'?notice:s.startsWith('#')?findId(s.slice(1)):s.startsWith('[data-focus=')&&app.innerHTML.includes(s.slice(1,-1))?new Element({focus:s.match(/data-focus="([^"]+)"/)[1]}):null,querySelectorAll:selector=>selector==='.board-card[data-card]'?ids(app.innerHTML).map(card=>new Element({card})):[],getElementById:findId,addEventListener:(t,h)=>handlers.set(t,h)};
 const urls=[],location={search,pathname:'/library/',assign:url=>urls.push(url)};
 const updateUrl=url=>{location.search=url.includes('?')?'?'+url.split('?')[1]:'';urls.push(url);};
 const context=vm.createContext({animeStyleLabel,inLibraryDomain,mediaLibraryDomain,selectionModeTitle,URLSearchParams,location,history:{pushState:(_s,_t,url)=>updateUrl(url),replaceState:(_s,_t,url)=>updateUrl(url)},document,localStorage:storage,Element,HTMLInputElement:class extends Element{},HTMLImageElement:class extends Element{},CSS:{escape:v=>v},structuredClone,matchMedia:()=>({matches:false,addEventListener(){}}),collectionRecords,createSelectionArchive,SELECTION_ARCHIVE_KEY,selectionUrl,createLibraryStore,LIBRARY_KEY,safeLibraryUrl,createGameHistory,GAME_HISTORY_PREFIX,createMediaHistory,MEDIA_HISTORY_PREFIX,createFeedbackStore:o=>createFeedbackStore({...o,locks:{request:async(_,fn)=>fn()}}),FEEDBACK_KEY,eveningControls,feedbackStatus,qaStorage,qaFeedbackOptions,createFeedbackDrafts,FEEDBACK_DRAFTS_KEY,initCustomSelects(){},focusCustomSelect(){},fetch:async()=>({ok:true,json:async()=>[]}),setTimeout:()=>1,clearTimeout(){},addEventListener:(type,handler)=>handlers.set(`window:${type}`,handler)});
 Object.assign(context,{FIT,OUTCOMES,REASONS,artworkImageHtml,retryArtworkImage,animeEncyclopediaCreditHtml,createSavedSource,matchesLibraryQuery,savedPickerDomains,createTasteMemory,TASTE_MEMORY_PREFIX,createMemoryView,sessionStorage:handoffStorage});
 if(fetcher)context.fetch=fetcher;
 vm.runInContext((await readFile(new URL('../src/server/public/library/app.js',import.meta.url),'utf8')).replace(/^import .+;\r?$/gm,''),context);
 await new Promise(r=>setImmediate(r));
 return {get html(){return app.innerHTML;},get search(){return location.search;},get urls(){return urls;},back:search=>{location.search=search;handlers.get('window:popstate')();},get focus(){return document.activeElement?.dataset.focus??document.activeElement?.id;},click:dataset=>{const target=new Element(dataset);target.focus();handlers.get('click')({target});},change:(id,value,dataset={})=>handlers.get('change')({target:new Element(dataset,value,id)}),input:value=>handlers.get('input')({target:new Element({},value,'find-title')})};
}
const ids=html=>[...html.matchAll(/data-card="([^"]+)"/g)].map(m=>m[1]);
test('launch from saved freezes every matching title in one screen section including subsequent pages',async()=>{
 const storage=memory(),library=createLibraryStore({storage});
 for(let i=0;i<28;i++)library.setSaved({id:'film-'+i,domain:'film',title:'Совпадение '+i},true);
 const outside={id:'other-film',domain:'film',title:'Другое'};
 library.setSaved(outside,true);library.setSaved({id:'show',domain:'series',title:'Совпадение'},true);
 const handoff=memory(),p=await page(storage,{handoffStorage:handoff});p.input('Совпадение');assert.match(p.html,/aria-label="Фильмы, сохранено 28"[^>]*><span>Фильмы<\/span><span class="source-count">28<\/span>/);
 p.click({act:'saved-source-domain',domain:'film'});await new Promise(r=>setImmediate(r));assert.equal(ids(p.html).length,24);
 assert.match(p.html,/Поиск «Совпадение» · В подборе: 28/);
 const before=storage.getItem(LIBRARY_KEY);p.click({act:'saved-source-start'});
 const url=new URL(p.urls.at(-1),'http://localhost'),token=url.searchParams.get('saved');
 assert.equal(url.pathname,'/pick/watch/');assert.equal(url.searchParams.get('domain'),'film');
 const snapshot=readSavedSource(handoff,token,'film');assert.equal(snapshot.ids.length,28);assert.equal(readSavedSource(storage,token,'film'),null);
 assert.ok(snapshot.ids.includes('film-27'));assert.ok(!snapshot.ids.includes('other-film'));assert.ok(!snapshot.ids.includes('show'));
 assert.equal(storage.getItem(LIBRARY_KEY),before);assert.equal(readSavedSource(handoff,token,'series'),null);
 assert.equal(savedSourceChanged(handoff,token,'film',library.all()),false);
 library.setSaved(outside,false);assert.equal(savedSourceChanged(handoff,token,'film',library.all()),false);
 library.setSaved({id:'new-film',domain:'film',title:'Прежний заголовок',aliases:['Совпадение новое']},true);
 assert.equal(savedSourceChanged(handoff,token,'film',library.all()),true);
 assert.deepEqual(readSavedSource(handoff,token,'film'),snapshot);
 const nextPageUrl=new URL(savedSourceLibraryUrl(handoff,token,'film'),'http://localhost');
 const newer=await page(storage,{search:nextPageUrl.search,handoffStorage:handoff});newer.click({act:'saved-source-start'});
 const newerToken=new URL(newer.urls.at(-1),'http://localhost').searchParams.get('saved');
 assert.notEqual(newerToken,token);assert.equal(readSavedSource(handoff,newerToken,'film').ids.length,29);
});
test('all five saved shelves are available and a game launch preserves independent ratings and plans',async()=>{
 const storage=memory(),tab=memory(),library=createLibraryStore({storage});
 for(const domain of ['game','film','series','cartoon','anime']){
  library.setSaved({id:domain+'-1',domain,title:domain+' выбран'},true);
 }
 library.setSaved({id:'unmatched',domain:'game',title:'Другое'},true);
 library.save({id:'known',title:'Уже выбран'},{domain:'game',lane:'known'});
 library.rate('game','known','liked');
 const p=await page(storage,{handoffStorage:tab});p.input('выбран');
 for(const domain of ['game','film','series','cartoon','anime'])assert.ok(p.html.includes('data-act="saved-source-domain" data-domain="'+domain+'"'),domain);
 const before=storage.getItem(LIBRARY_KEY);
 p.click({act:'saved-source-domain',domain:'game'});await new Promise(r=>setImmediate(r));
 p.click({act:'saved-source-start',domain:'game'});
 const url=new URL(p.urls.at(-1),'http://localhost');assert.equal(url.pathname,'/pick/game/');assert.equal(url.searchParams.has('domain'),false);
 assert.deepEqual(readSavedSource(tab,url.searchParams.get('saved'),'game'),{version:1,domain:'game',ids:['game-1']});
 assert.equal(storage.getItem(LIBRARY_KEY),before);
});
test('a launch waits for outstanding alternate titles before freezing a filtered source',async()=>{
 const storage=memory(),handoff=memory(),library=createLibraryStore({storage});
 for(const [id,title] of [['tt1','River'],['tt2','Река']])library.setSaved({id,title,poster:'https://example.com/poster'},true,{domain:'film'});
 let release;
 const delayed=new Promise(resolve=>{release=resolve;});
 const p=await page(storage,{search:'?view=saved&saved.domain=film',handoffStorage:handoff,
  fetcher:async()=>{await delayed;return {ok:true,json:async()=>[{id:'tt2',aliases:['River']}]};}});
 p.input('River');assert.match(p.html,/Проверяем названия/);
 p.click({act:'saved-source-start'});assert.equal(p.urls.some(url=>url.startsWith('/pick/')),false);
 release();await new Promise(r=>setImmediate(r));
 assert.match(p.html,/В подборе: 2/);p.click({act:'saved-source-start'});
 const token=new URL(p.urls.at(-1),'http://localhost').searchParams.get('saved');
 assert.deepEqual(readSavedSource(handoff,token,'film').ids,['tt1','tt2']);
});
test('shared anime titles, legacy alias matches and unavailable handoff storage keep their boundaries',async()=>{
 const storage=memory(),library=createLibraryStore({storage});
 library.setSaved({id:'tt0417299',domain:'cartoon',title:'Аватар'},true);
 const local=library.all(),enriched=local.map(row=>({...row,aliases:['Avatar']}));
 const url=createSavedSource(storage,'anime',enriched,'Avatar',local),token=new URL(url,'http://localhost').searchParams.get('saved');
 assert.deepEqual(readSavedSource(storage,token,'anime'),{version:1,domain:'anime',ids:['tt0417299']});
 assert.equal(savedSourceChanged(storage,token,'anime',local),false);
 assert.equal(savedSourceChanged(storage,token,'anime',local.map(row=>({...row,aliases:['Changed alias']}))),true);
 assert.equal(createSavedSource(storage,'series',enriched,'Avatar',local),null);
 const handoff=memory(),p=await page(storage,{search:'?view=saved&saved.domain=cartoon',handoffStorage:handoff});
 handoff.setItem=()=>{throw Error('Storage full');};p.click({act:'saved-source-start'});
 assert.equal(p.urls.length,0);
});
test('many launches only retain recent handoffs in their own tab and retry a smaller cache on quota',()=>{
 const tab=memory(),otherTab=memory(),row={id:'word',domain:'film',title:'Название',saved:true};
 const launch=store=>new URL(createSavedSource(store,'film',[row],'',[row]),'http://localhost').searchParams.get('saved');
 const other=launch(otherTab),tokens=[];
 for(let i=0;i<12;i++)tokens.push(launch(tab));
 assert.equal(tab.length,1);assert.equal(tokens.filter(token=>readSavedSource(tab,token,'film')).length,6);
 assert.ok(readSavedSource(otherTab,other,'film'));
 const write=tab.setItem;
 tab.setItem=(key,value)=>{
  if(JSON.parse(value).length>1)throw Object.assign(Error('Full'),{name:'QuotaExceededError'});
  write(key,value);
 };
 assert.ok(readSavedSource(tab,launch(tab),'film'));assert.ok(readSavedSource(otherTab,other,'film'));
});
test('saved and liked are independent complete lists, bookmarking never clears the rating',async()=>{
 const storage=memory(),store=createLibraryStore({storage});
 for(const [id,lane] of [['a','want'],['b','tonight'],['c','known']]){store.save({id,title:id},{domain:'film',lane});store.rate('film',id,'liked');}
 const p=await page(storage);assert.equal(ids(p.html).length,2);assert.doesNotMatch(p.html,/data-act="lane"/);
 p.click({act:'view',view:'liked'});assert.equal(ids(p.html).length,3);
 p.click({act:'saved',domain:'film',id:'a'});assert.equal(ids(p.html).length,3);assert.equal(store.all().find(x=>x.id==='a').saved,false);assert.equal(store.all().find(x=>x.id==='a').status,'liked');
 p.click({act:'view',view:'saved'});assert.deepEqual(ids(p.html),['film:b']);p.click({act:'undo'});assert.equal(ids(p.html).length,2);
});
test('URL restores independent collection filters and browser navigation without writing collection data',async()=>{
 const {storage,store}=seed(12);store.rate('game','item-0','liked');const before=storage.getItem(LIBRARY_KEY),p=await page(storage);
 p.change('domain-filter','film');p.input('005');const savedUrl=p.search;
 p.click({act:'view',view:'liked'});p.input('000');const likedUrl=p.search;
 const restored=await page(storage,{search:likedUrl});assert.deepEqual(ids(restored.html),['game:item-0']);assert.match(restored.html,/value="000"/);
 restored.click({act:'view',view:'saved'});assert.deepEqual(ids(restored.html),['film:item-5']);assert.match(restored.html,/value="005"/);
 p.back(savedUrl);assert.deepEqual(ids(p.html),['film:item-5']);p.back(likedUrl);assert.deepEqual(ids(p.html),['game:item-0']);assert.equal(storage.getItem(LIBRARY_KEY),before);
});
test('modern results appear in saved selections with all alternatives and a free reopen link, independently of plans',async()=>{
 const storage=memory(),archive=createSelectionArchive({storage});
 for(const domain of ['game','film','series','cartoon']){
  const result={top:{id:'one',ru:'Первый <вариант>'},alternatives:[{id:'two',ru:'Второй'}]},state={version:1,id:`archive-${domain}`,domain,phase:'result',result};
  archive.capture({state,screen:{type:'result',result,summary:'Хочу историю'}});
 }
 const p=await page(storage);p.click({act:'view',view:'history'});
 assert.match(p.html.replace(/<[^>]+>/g,''),/Подборы 4/);assert.equal((p.html.match(/Открыть подбор/g)??[]).length,4);assert.match(p.html,/Первый &lt;вариант&gt;/);assert.match(p.html,/Второй/);assert.match(p.html,/\/pick\/game\/\?selection=/);assert.match(p.html,/domain=cartoon&selection=/);assert.equal(createLibraryStore({storage}).all().length,0);
});
test('a saved title without artwork can use the exact work image from a restored selection',async()=>{
 const storage=memory(),store=createLibraryStore({storage}),archive=createSelectionArchive({storage});
 const card={id:'tt0002130',title:'Dante’s Inferno'},poster='https://image.tmdb.org/t/p/w342/sample.jpg';
 store.setSaved(card,true,{domain:'film'});
 const result={top:{...card,poster},alternatives:[]};
 const state={version:1,id:'artwork-resume',domain:'film',phase:'result',result};
 archive.capture({state,screen:{type:'result',result}});
 const before=storage.getItem(LIBRARY_KEY),p=await page(storage);
 assert.match(p.html,/src="https:\/\/image\.tmdb\.org\/t\/p\/w342\/sample\.jpg"/);
 assert.equal(storage.getItem(LIBRARY_KEY),before);
});
function seed(count=126){const storage=memory(),store=createLibraryStore({storage});for(let i=0;i<count;i++)store.save({id:`item-${i}`,title:`Название ${String(i).padStart(3,'0')}`,year:2020+i%6},{domain:['game','film','series','cartoon'][i%4],lane:i<100?'want':i<114?'tonight':'known'});return {storage,store};}

test('poster walls collapse search and filters together and keep the visible summary on reload and back',async()=>{
 const {storage}=seed(8),p=await page(storage);
 const closed=html=>assert.match(html,/<div id="library-filter-panel" class="shelf-filter-fields"[^>]* hidden>/);
 closed(p.html);assert.match(p.html,/aria-label="Поиск и фильтры" aria-expanded="false" aria-controls="library-filter-panel"/);
 p.click({act:'filters',focus:'filters-toggle'});assert.doesNotMatch(p.html,/class="shelf-filter-fields"[^>]* hidden>/);
 p.change('domain-filter','film');p.change('sort','title');p.input('005');p.click({act:'filters',focus:'filters-toggle'});
 const url=p.search,restored=await page(storage,{search:url});
 closed(restored.html);assert.match(restored.html,/«005» · Фильмы · По названию/);assert.deepEqual(ids(restored.html),['film:item-5']);
 p.click({act:'view',view:'liked'});p.back(url);closed(p.html);assert.deepEqual(ids(p.html),['film:item-5']);
 p.click({act:'filters'});assert.match(p.html,/value="005"/);assert.match(p.html,/<option value="film" selected>/);
 const larger=await page(seed(9).storage);closed(larger.html);assert.match(larger.html,/class="library-card-list wall-grid"/);
});

test('a title search matching a single section launches directly from a mixed shelf',async()=>{
 const storage=memory(),handoff=memory(),store=createLibraryStore({storage});
 store.setSaved({id:'saved-film',title:'Фильм',domain:'film'},true);
 store.setSaved({id:'steam:1',title:'Игра',domain:'game'},true);
 const p=await page(storage,{handoffStorage:handoff});
 p.input('Фильм');await new Promise(r=>setImmediate(r));
 assert.match(p.html,/Фильмы · Поиск «Фильм» · В подборе: 1/);
 assert.match(p.html,/data-act="saved-source-start" data-domain="film"[^>]*aria-label="Выбрать из сохранённого"/);
 p.click({act:'saved-source-start',domain:'film'});
 const url=new URL(p.urls.at(-1),'http://localhost');
 assert.deepEqual(readSavedSource(handoff,url.searchParams.get('saved'),'film').ids,['saved-film']);
});

test('large library renders one active list in chunks and load more preserves all stored records',async()=>{
 const {storage,store}=seed(),before=storage.getItem(LIBRARY_KEY),p=await page(storage);
 assert.equal(ids(p.html).length,24);assert.ok(!p.html.includes('data-active="false"'));assert.match(p.html,/data-act="more"/);
 p.click({act:'more'});assert.equal(ids(p.html).length,48);
 p.click({act:'view',view:'liked'});assert.equal(ids(p.html).length,0);assert.ok(!p.html.includes('data-act="more"'));
 p.click({act:'view',view:'saved'});assert.equal(ids(p.html).length,24);assert.match(p.html.replace(/<[^>]+>/g,''),/Сохранённое 114/);
 assert.equal(storage.getItem(LIBRARY_KEY),before);assert.equal(store.all().length,126);
});
test('search filters within the active list, reset also restores ordering and chunk size',async()=>{
 const {storage}=seed(),p=await page(storage);p.click({act:'more'});p.change('sort','title');p.change('domain-filter','film');
 assert.equal(ids(p.html).length,24);p.input('Название 005');assert.deepEqual(ids(p.html),['film:item-5']);
 p.input('такого нет');assert.equal(ids(p.html).length,0);assert.match(p.html,/data-act="clear"/);
 p.click({act:'clear'});assert.equal(ids(p.html).length,24);assert.ok(p.html.includes('<option value="added" selected>'));
});
test('removing a bookmark and undo keep explicit taste and familiarity',async()=>{
 const {storage,store}=seed(1);store.rate('game','item-0','liked');const familiar=createGameHistory({storage});familiar.remember({id:'item-0',title:'Название 000'},{blocked:true});
 const p=await page(storage);p.click({act:'saved',domain:'game',id:'item-0'});
 assert.deepEqual(ids(p.html),[]);assert.equal(store.all()[0].status,'liked');assert.deepEqual(familiar.blockedIds(),['item-0']);
 store.rate('game','item-0','disliked');p.click({act:'undo'});assert.equal(store.all()[0].saved,true);assert.equal(store.all()[0].status,'disliked');
});
test('secondary filter disclosure keeps chosen values, content, reset and toggle focus through rerenders',async()=>{
 const {storage}=seed(),p=await page(storage);p.click({act:'view',view:'all'});
 const expanded=()=>p.html.match(/data-act="filters"[^>]*aria-expanded="([^"]+)"/)?.[1];
 assert.equal(expanded(),'false');assert.match(p.html,/aria-controls="library-filter-panel"/);assert.match(p.html,/class="shelf-filter-fields"[^>]* hidden>/);
 const initial=ids(p.html);p.click({act:'filters',focus:'filters-toggle'});assert.equal(expanded(),'true');assert.equal(p.focus,'filters-toggle');assert.deepEqual(ids(p.html),initial);
 p.change('domain-filter','film');p.change('reaction-filter','unrated');p.change('sort','title');p.input('Название');
 assert.equal(expanded(),'true');assert.match(p.html,/<option value="film" selected>/);assert.match(p.html,/<option value="unrated" selected>/);assert.match(p.html,/<option value="title" selected>/);
 const filtered=ids(p.html);p.click({act:'filters',focus:'filters-toggle'});assert.equal(expanded(),'false');assert.equal(p.focus,'filters-toggle');assert.deepEqual(ids(p.html),filtered);
 p.click({act:'view',view:'history'});p.click({act:'view',view:'all'});assert.equal(expanded(),'false');assert.deepEqual(ids(p.html),filtered);
 p.click({act:'clear',focus:'filters-reset'});assert.equal(expanded(),'false');assert.match(p.html,/<option value="added" selected>/);assert.equal(ids(p.html).length,24);assert.equal(p.focus,'filters-toggle');
});
