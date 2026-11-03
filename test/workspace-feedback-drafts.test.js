import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeedbackDrafts} from '../src/server/public/shared/feedback-drafts.js';
import {carryFeedbackView} from '../src/server/public/pick/game/feedback-view-state.js';
import {createQaSession} from '../src/server/public/shared/qa-session.js';

function memory(){const data=new Map();return {get length(){return data.size;},key:i=>[...data.keys()][i]??null,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
const key='tastiq.feedback-drafts.v1';
test('an unsent note and reason restore after reload without entering submitted feedback',()=>{
 const storage=memory();storage.setItem('tastiq.site.evenings','untouched');
 const before=createFeedbackDrafts({storage});before.set('run-one:steam:620',{reason:'mood',note:'Черновик: сегодня хочется больше самостоятельного исследования.'});
 const after=createFeedbackDrafts({storage});assert.deepEqual(after.get('run-one:steam:620'),{reason:'mood',note:'Черновик: сегодня хочется больше самостоятельного исследования.'});assert.equal(storage.getItem('tastiq.site.evenings'),'untouched');
});
test('independent instances preserve disjoint run/card drafts and a deletion cannot resurrect on another write',()=>{
 const storage=memory(),a=createFeedbackDrafts({storage}),b=createFeedbackDrafts({storage});
 a.set('run:one',{reason:'time',note:'Первый'});b.set('run:two',{reason:'other',note:'Второй'});a.set('other:one',{reason:'',note:''});
 assert.equal(b.get('run:one').note,'Первый');assert.equal(a.get('run:two').note,'Второй');assert.deepEqual(a.get('other:one'),{reason:'',note:''});
 assert.equal(b.delete('run:one'),true);a.set('run:three',{note:'Третий'});assert.equal(createFeedbackDrafts({storage}).has('run:one'),false);assert.equal(a.delete('missing:one'),false);
});
test('persisted inputs normalize note length and known reason while malformed records remain harmless',()=>{
 const storage=memory();storage.setItem(key,JSON.stringify({version:1,entries:[['run:one',{reason:'invented',note:'я'.repeat(350),secret:'drop'}],['<script>',{reason:'time',note:'bad key'}],['run:bad',null]]}));
 const drafts=createFeedbackDrafts({storage});assert.deepEqual(drafts.get('run:one'),{reason:'',note:'я'.repeat(300)});assert.equal(drafts.size,1);
 drafts.set('run:two',{reason:'company',note:'  точные\nслова  '});assert.deepEqual(createFeedbackDrafts({storage}).get('run:two'),{reason:'company',note:'  точные\nслова  '});
});
test('corrupt storage is safe and failed storage keeps edits and deletion in this window',()=>{
 const storage=memory();storage.setItem(key,'{broken');const drafts=createFeedbackDrafts({storage});assert.equal(drafts.size,0);
 drafts.set('run:one',{note:'До ошибки'});storage.setItem=()=>{throw Error('full');};drafts.set('run:two',{note:'После ошибки'});
 assert.equal(drafts.persistent,false);assert.equal(drafts.get('run:one').note,'До ошибки');assert.equal(drafts.get('run:two').note,'После ошибки');assert.equal(drafts.delete('run:one'),true);assert.equal(drafts.has('run:one'),false);
 const inaccessible=createFeedbackDrafts({storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}});inaccessible.set('run:x',{note:'В памяти'});assert.equal(inaccessible.get('run:x').note,'В памяти');
});
test('Map-like retained-card transfer persists only the retained draft and intentional blanks',()=>{
 const storage=memory(),drafts=createFeedbackDrafts({storage});drafts.set('old:kept',{reason:'time',note:'Сохранить черновик'});drafts.set('old:replaced',{note:'Не переносить'});drafts.set('new:kept',{reason:'',note:''});
 carryFeedbackView({drafts,open:new Map(),disclosures:new Map()},'new','old',['kept'],{overwrite:true});
 const after=createFeedbackDrafts({storage});assert.deepEqual(after.get('old:kept'),{reason:'',note:''});assert.equal(after.has('new:replaced'),false);assert.equal(after.get('old:replaced').note,'Не переносить');assert.equal([...after.keys()].length,3);
});
test('QA storage namespacing separates the shared draft key from user drafts',()=>{
 const storage=memory();storage.setItem(key,'user-owned');const qa=createQaSession({search:'?qa_run=draftscope',session:memory(),indexedDB:undefined});
 createFeedbackDrafts({storage:qa.storage(storage)}).set('qa:card',{note:'QA only'});assert.equal(storage.getItem(key),'user-owned');assert.ok(storage.getItem('tastiq.qa.draftscope:'+key).includes('QA only'));
});
