import {animeStyleLabel,inLibraryDomain,mediaLibraryDomain} from '../src/server/public/shared/anime-pilot.js';
import {selectionModeTitle} from '../src/server/public/shared/selection-mode.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createLibraryStore,LIBRARY_KEY,safeLibraryUrl} from '../src/server/public/shared/library-store.js';
import {collectionRecords} from '../src/server/public/shared/library-collection.js';
import {createGameHistory,GAME_HISTORY_PREFIX} from '../src/server/public/shared/game-history.js';
import {createMediaHistory,MEDIA_HISTORY_PREFIX} from '../src/server/public/shared/media-history.js';
import {createFeedbackStore,FEEDBACK_KEY} from '../src/server/public/shared/evening-feedback.js';
import {eveningControls,feedbackStatus} from '../src/server/public/shared/evening-view.js';
import {qaStorage,qaFeedbackOptions} from '../src/server/public/shared/qa-session.js';
import {createFeedbackDrafts,FEEDBACK_DRAFTS_KEY} from '../src/server/public/shared/feedback-drafts.js';
import {createSelectionArchive,SELECTION_ARCHIVE_KEY,selectionUrl} from '../src/server/public/shared/selection-archive.js';

function memory(){const map=new Map();return {get length(){return map.size;},key:i=>[...map.keys()][i]??null,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
async function page(storage,{search=''}={}){
 const handlers=new Map(),app={innerHTML:'',setAttribute(){}},notice={};
 class Element{constructor(dataset={},value='',id=''){Object.assign(this,{dataset,value,id,checked:false});}closest(s){return s==='button[data-act]'?this:null;}matches(){return false;}focus(){document.activeElement=this;}}
 const findId=id=>app.innerHTML.includes(`id="${id}"`)?new Element({},'',id):null;
 const document={activeElement:null,querySelector:s=>s==='#library-app'?app:s==='#library-notice'?notice:s.startsWith('#')?findId(s.slice(1)):s.startsWith('[data-focus=')&&app.innerHTML.includes(s.slice(1,-1))?new Element({focus:s.match(/data-focus="([^"]+)"/)[1]}):null,querySelectorAll:()=>[],getElementById:findId,addEventListener:(t,h)=>handlers.set(t,h)};
 const location={search,pathname:'/library/'},urls=[];
 const updateUrl=url=>{location.search=url.includes('?')?'?'+url.split('?')[1]:'';urls.push(url);};
 const context=vm.createContext({animeStyleLabel,inLibraryDomain,mediaLibraryDomain,selectionModeTitle,URLSearchParams,location,history:{pushState:(_s,_t,url)=>updateUrl(url),replaceState:(_s,_t,url)=>updateUrl(url)},document,localStorage:storage,Element,HTMLInputElement:class extends Element{},HTMLImageElement:class extends Element{},CSS:{escape:v=>v},structuredClone,matchMedia:()=>({matches:false,addEventListener(){}}),collectionRecords,createSelectionArchive,SELECTION_ARCHIVE_KEY,selectionUrl,createLibraryStore,LIBRARY_KEY,safeLibraryUrl,createGameHistory,GAME_HISTORY_PREFIX,createMediaHistory,MEDIA_HISTORY_PREFIX,createFeedbackStore:o=>createFeedbackStore({...o,locks:{request:async(_,fn)=>fn()}}),FEEDBACK_KEY,eveningControls,feedbackStatus,qaStorage,qaFeedbackOptions,createFeedbackDrafts,FEEDBACK_DRAFTS_KEY,initCustomSelects(){},focusCustomSelect(){},fetch:async()=>({ok:true,json:async()=>[]}),setTimeout:()=>1,clearTimeout(){},addEventListener:(type,handler)=>handlers.set(`window:${type}`,handler)});
 vm.runInContext((await readFile(new URL('../src/server/public/library/app.js',import.meta.url),'utf8')).replace(/^import .+;\r?$/gm,''),context);
 await new Promise(r=>setImmediate(r));
 return {get html(){return app.innerHTML;},get search(){return location.search;},get urls(){return urls;},back:search=>{location.search=search;handlers.get('window:popstate')();},get focus(){return document.activeElement?.dataset.focus??document.activeElement?.id;},click:dataset=>{const target=new Element(dataset);target.focus();handlers.get('click')({target});},change:(id,value,dataset={})=>handlers.get('change')({target:new Element(dataset,value,id)}),input:value=>handlers.get('input')({target:new Element({},value,'find-title')})};
}
const ids=html=>[...html.matchAll(/data-card="([^"]+)"/g)].map(m=>m[1]);
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
 assert.match(p.html,/Подборы<span>4/);assert.equal((p.html.match(/Открыть подбор/g)??[]).length,4);assert.match(p.html,/Первый &lt;вариант&gt;/);assert.match(p.html,/Второй/);assert.match(p.html,/\/pick\/game\/\?selection=/);assert.match(p.html,/domain=cartoon&selection=/);assert.equal(createLibraryStore({storage}).all().length,0);
});
function seed(count=126){const storage=memory(),store=createLibraryStore({storage});for(let i=0;i<count;i++)store.save({id:`item-${i}`,title:`Название ${String(i).padStart(3,'0')}`,year:2020+i%6},{domain:['game','film','series','cartoon'][i%4],lane:i<100?'want':i<114?'tonight':'known'});return {storage,store};}

test('large library renders one active list in chunks and load more preserves all stored records',async()=>{
 const {storage,store}=seed(),before=storage.getItem(LIBRARY_KEY),p=await page(storage);
 assert.equal(ids(p.html).length,24);assert.ok(!p.html.includes('data-active="false"'));assert.match(p.html,/data-act="more"/);
 p.click({act:'more'});assert.equal(ids(p.html).length,48);
 p.click({act:'view',view:'liked'});assert.equal(ids(p.html).length,0);assert.ok(!p.html.includes('data-act="more"'));
 p.click({act:'view',view:'saved'});assert.equal(ids(p.html).length,24);assert.match(p.html,/Сохранённое<span>114/);
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
 assert.equal(expanded(),'false');assert.match(p.html,/aria-controls="library-filter-options"/);assert.match(p.html,/data-filter-open="false"/);
 const initial=ids(p.html);p.click({act:'filters',focus:'filters-toggle'});assert.equal(expanded(),'true');assert.equal(p.focus,'filters-toggle');assert.deepEqual(ids(p.html),initial);
 p.change('domain-filter','film');p.change('reaction-filter','unrated');p.change('sort','title');p.input('Название');
 assert.equal(expanded(),'true');assert.match(p.html,/<option value="film" selected>/);assert.match(p.html,/<option value="unrated" selected>/);assert.match(p.html,/<option value="title" selected>/);
 const filtered=ids(p.html);p.click({act:'filters',focus:'filters-toggle'});assert.equal(expanded(),'false');assert.equal(p.focus,'filters-toggle');assert.deepEqual(ids(p.html),filtered);
 p.click({act:'view',view:'history'});p.click({act:'view',view:'all'});assert.equal(expanded(),'false');assert.deepEqual(ids(p.html),filtered);
 p.click({act:'clear',focus:'filters-reset'});assert.equal(expanded(),'false');assert.match(p.html,/<option value="added" selected>/);assert.equal(ids(p.html).length,24);assert.equal(p.focus,'find-title');
});
