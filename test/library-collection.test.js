import test from 'node:test';
import assert from 'node:assert/strict';
import {collectionRecords} from '../src/server/public/shared/library-collection.js';
import {createLibraryStore,LIBRARY_KEY} from '../src/server/public/shared/library-store.js';

const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
const card={id:'one',domain:'film',title:'Фильм'};
const run=(outcome,{id='run-one',domain='film',fit=null}={})=>({id,domain,at:'2026-11-17T08:00:00Z',cards:[card],responses:[{cardId:'one',outcome,fit}]});

test('unsaving and restoring keep rating, original answer and independent changes',()=>{
 const storage=memory(),store=createLibraryStore({storage});
 store.save(card);store.rate('film','one','liked');
 const raw=JSON.parse(storage.getItem(LIBRARY_KEY));raw.items[0].answer={why:['story']};raw.items[0].custom='keep';storage.setItem(LIBRARY_KEY,JSON.stringify(raw));
 store.setSaved(card,false);assert.equal(store.all()[0].saved,false);assert.equal(store.all()[0].status,'liked');assert.deepEqual(store.all()[0].answer,{why:['story']});
 store.setSaved(card,true);assert.equal(store.all()[0].saved,true);assert.equal(store.all()[0].custom,'keep');
});
test('all liked works are found independently of old plan lanes and reading is pure',()=>{
 const items=['want','tonight','known'].map((lane,i)=>({...card,id:String(i),lane,status:'liked'})),before=structuredClone(items);
 const rows=collectionRecords({items});assert.equal(rows.filter(r=>r.rating==='liked').length,3);assert.deepEqual(items,before);
 assert.equal(rows.filter(r=>r.saved).length,2);
});
test('positive experience joins liked without manufacturing a permanent taste or a save',()=>{
 const runs=[run('liked')],before=structuredClone(runs),rows=collectionRecords({runs});
 assert.equal(rows.length,1);assert.equal(rows[0].rating,'liked');assert.equal(rows[0].saved,false);assert.equal(rows[0].ratingSource,'experience');assert.deepEqual(runs,before);
});
test('a suitable recommendation is not a liked work and identities remain domain scoped',()=>{
 const rows=collectionRecords({runs:[run(null,{fit:'accept'}),run('liked',{domain:'game',id:'game-run'})]});
 assert.equal(rows.filter(r=>r.rating==='liked').length,1);assert.equal(rows.find(r=>r.domain==='film').rating,null);
});
test('conflicting experiences stay visible without guessing which is the current taste',()=>{
 const rows=collectionRecords({runs:[run('liked'),run('disliked',{id:'run-two'})]});
 assert.equal(rows[0].rating,null);assert.equal(rows[0].ratingConflict,true);assert.equal(rows[0].reviews.length,2);
});
test('explicit rating and explicit clearing override historical experience without rewriting it',()=>{
 const storage=memory(),store=createLibraryStore({storage});store.save(card);store.rate('film','one','disliked');
 assert.equal(collectionRecords({items:store.all(),runs:[run('liked')]}).at(0).rating,'disliked');
 store.rate('film','one',null);assert.equal(collectionRecords({items:store.all(),runs:[run('liked')]}).at(0).rating,null);
});
test('unsaved unannotated rows disappear while familiarity and opinions stay findable',()=>{
 const items=[{...card,lane:'want',status:'want',saved:false}];
 assert.equal(collectionRecords({items}).length,0);
 assert.equal(collectionRecords({items,familiar:[{...card,exposure:'seen'}]}).length,1);
});
test('legacy known status remains findable after moving to a plan and unsaving',()=>{
 const store=createLibraryStore();store.save(card,{lane:'known'});store.move('film','one','want');store.setSaved(card,false);
 const rows=collectionRecords({items:store.all()});
 assert.equal(rows.length,1);assert.equal(rows[0].saved,false);assert.equal(rows[0].status,'known');
});
