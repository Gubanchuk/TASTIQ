import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createLibraryStore,LIBRARY_KEY,safeLibraryUrl} from '../src/server/public/shared/library-store.js';
import {createGameHistory,GAME_HISTORY_PREFIX} from '../src/server/public/shared/game-history.js';
import {createMediaHistory,MEDIA_HISTORY_PREFIX} from '../src/server/public/shared/media-history.js';
import {createFeedbackStore,FEEDBACK_KEY} from '../src/server/public/shared/evening-feedback.js';
import {eveningControls,feedbackStatus} from '../src/server/public/shared/evening-view.js';
import {qaStorage,qaFeedbackOptions} from '../src/server/public/shared/qa-session.js';
import {createFeedbackDrafts,FEEDBACK_DRAFTS_KEY} from '../src/server/public/shared/feedback-drafts.js';

function memory(){const map=new Map();return {get length(){return map.size;},key:i=>[...map.keys()][i]??null,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
async function page(storage){
 const handlers=new Map(),app={innerHTML:'',setAttribute(){}},notice={};
 class Element{constructor(dataset={},value='',id=''){Object.assign(this,{dataset,value,id,checked:false});}closest(s){return s==='button[data-act]'?this:null;}matches(){return false;}focus(){document.activeElement=this;}}
 const findId=id=>app.innerHTML.includes(`id="${id}"`)?new Element({},'',id):null;
 const document={activeElement:null,querySelector:s=>s==='#library-app'?app:s==='#library-notice'?notice:s.startsWith('#')?findId(s.slice(1)):s.startsWith('[data-focus=')&&app.innerHTML.includes(s.slice(1,-1))?new Element({focus:s.match(/data-focus="([^"]+)"/)[1]}):null,querySelectorAll:()=>[],getElementById:findId,addEventListener:(t,h)=>handlers.set(t,h)};
 const context=vm.createContext({document,localStorage:storage,Element,HTMLInputElement:class extends Element{},HTMLImageElement:class extends Element{},CSS:{escape:v=>v},structuredClone,matchMedia:()=>({matches:false,addEventListener(){}}),createLibraryStore,LIBRARY_KEY,safeLibraryUrl,createGameHistory,GAME_HISTORY_PREFIX,createMediaHistory,MEDIA_HISTORY_PREFIX,createFeedbackStore:o=>createFeedbackStore({...o,locks:{request:async(_,fn)=>fn()}}),FEEDBACK_KEY,eveningControls,feedbackStatus,qaStorage,qaFeedbackOptions,createFeedbackDrafts,FEEDBACK_DRAFTS_KEY,initCustomSelects(){},focusCustomSelect(){},fetch:async()=>({ok:true,json:async()=>[]}),setTimeout:()=>1,clearTimeout(){},addEventListener(){}});
 vm.runInContext((await readFile(new URL('../src/server/public/library/app.js',import.meta.url),'utf8')).replace(/^import .+;\r?$/gm,''),context);
 await new Promise(r=>setImmediate(r));
 return {get html(){return app.innerHTML;},get focus(){return document.activeElement?.dataset.focus??document.activeElement?.id;},click:dataset=>{const target=new Element(dataset);target.focus();handlers.get('click')({target});},change:(id,value,dataset={})=>handlers.get('change')({target:new Element(dataset,value,id)}),input:value=>handlers.get('input')({target:new Element({},value,'find-title')})};
}
const ids=html=>[...html.matchAll(/data-card="([^"]+)"/g)].map(m=>m[1]);
function seed(count=126){const storage=memory(),store=createLibraryStore({storage});for(let i=0;i<count;i++)store.save({id:`item-${i}`,title:`Название ${String(i).padStart(3,'0')}`,year:2020+i%6},{domain:['game','film','series','cartoon'][i%4],lane:i<100?'want':i<114?'tonight':'known'});return {storage,store};}

test('large library renders one active list in chunks and load more preserves all stored records',async()=>{
 const {storage,store}=seed(),before=storage.getItem(LIBRARY_KEY),p=await page(storage);
 assert.equal(ids(p.html).length,24);assert.ok(!p.html.includes('data-active="false"'));assert.match(p.html,/data-act="more"/);
 p.click({act:'more'});assert.equal(ids(p.html).length,48);
 p.click({act:'lane',lane:'tonight'});assert.equal(ids(p.html).length,14);assert.ok(!p.html.includes('data-act="more"'));
 assert.equal(storage.getItem(LIBRARY_KEY),before);assert.equal(store.all().length,126);
});
test('search filters within the active list, reset also restores ordering and chunk size',async()=>{
 const {storage}=seed(),p=await page(storage);p.click({act:'more'});p.change('sort','title');p.change('domain-filter','film');
 assert.equal(ids(p.html).length,24);p.input('Название 005');assert.deepEqual(ids(p.html),['film:item-5']);
 p.input('такого нет');assert.equal(ids(p.html).length,0);assert.match(p.html,/data-act="clear"/);
 p.click({act:'clear'});assert.equal(ids(p.html).length,24);assert.ok(p.html.includes('<option value="added" selected>'));
});
test('moving a record changes only its plan and keeps explicit taste and familiarity',async()=>{
 const {storage,store}=seed(1);store.rate('game','item-0','liked');const familiar=createGameHistory({storage});familiar.remember({id:'item-0',title:'Название 000'},{blocked:true});
 const p=await page(storage);p.change('','tonight',{act:'move',domain:'game',id:'item-0'});
 assert.deepEqual(ids(p.html),['game:item-0']);assert.equal(store.all()[0].status,'liked');assert.deepEqual(familiar.blockedIds(),['item-0']);
 p.click({act:'remove',domain:'game',id:'item-0'});p.click({act:'undo'});assert.equal(store.all()[0].lane,'tonight');assert.equal(store.all()[0].status,'liked');
});
test('secondary filter disclosure keeps chosen values, content, reset and toggle focus through rerenders',async()=>{
 const {storage}=seed(),p=await page(storage);
 const expanded=()=>p.html.match(/data-act="filters"[^>]*aria-expanded="([^"]+)"/)?.[1];
 assert.equal(expanded(),'false');assert.match(p.html,/aria-controls="library-filter-options"/);assert.match(p.html,/data-filter-open="false"/);
 const initial=ids(p.html);p.click({act:'filters',focus:'filters-toggle'});assert.equal(expanded(),'true');assert.equal(p.focus,'filters-toggle');assert.deepEqual(ids(p.html),initial);
 p.change('domain-filter','film');p.change('reaction-filter','unrated');p.change('sort','title');p.input('Название');
 assert.equal(expanded(),'true');assert.match(p.html,/<option value="film" selected>/);assert.match(p.html,/<option value="unrated" selected>/);assert.match(p.html,/<option value="title" selected>/);
 const filtered=ids(p.html);p.click({act:'filters',focus:'filters-toggle'});assert.equal(expanded(),'false');assert.equal(p.focus,'filters-toggle');assert.deepEqual(ids(p.html),filtered);
 p.click({act:'view',view:'history'});p.click({act:'view',view:'board'});assert.equal(expanded(),'false');assert.deepEqual(ids(p.html),filtered);
 p.click({act:'clear',focus:'filters-reset'});assert.equal(expanded(),'false');assert.match(p.html,/<option value="added" selected>/);assert.equal(ids(p.html).length,24);assert.equal(p.focus,'find-title');
});
