import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameHistory,GAME_HISTORY_PREFIX} from '../src/server/public/shared/game-history.js';

function storage(){const map=new Map();return {get length(){return map.size;},key:i=>[...map.keys()][i]??null,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
const card={id:'steam:1091500',name:'Cyberpunk 2077'};
test('remembered familiarity is not a rating or automatic future exclusion',()=>{
 const store=storage(),history=createGameHistory({storage:store});
 history.remember(card);
 assert.deepEqual(history.blockedIds(),[]);
 const [known]=history.all();assert.equal(known.exposure,'played');assert.equal(known.title,card.name);assert.equal(known.blocked,false);
 assert.equal(Object.hasOwn(known,'rating'),false);
 const reload=createGameHistory({storage:store});assert.equal(reload.all()[0].id,card.id);
 reload.setBlocked(card.id,true);assert.deepEqual(reload.blockedIds(),[card.id]);
 reload.remember(card,{exposure:'started'});assert.equal(reload.all()[0].exposure,'started');assert.deepEqual(reload.blockedIds(),[card.id]);
 reload.setBlocked(card.id,false);assert.deepEqual(reload.blockedIds(),[]);
});
test('independent tabs do not overwrite unrelated game entries',()=>{
 const store=storage(),a=createGameHistory({storage:store}),b=createGameHistory({storage:store});
 a.remember(card,{blocked:true});b.remember({id:'steam:264710',name:'Subnautica'});
 assert.equal(a.all().length,2);b.setBlocked(card.id,false);assert.deepEqual(a.blockedIds(),[]);
 a.forget(card.id);assert.deepEqual(b.all().map(x=>x.id),['steam:264710']);
});
test('malformed and unrelated stored data cannot inject IDs or future exclusions',()=>{
 const store=storage();store.setItem('tastiq.site.library',JSON.stringify({secret:'legacy'}));
 store.setItem(GAME_HISTORY_PREFIX+'bad','{broken');
 store.setItem(GAME_HISTORY_PREFIX+'safe',JSON.stringify({version:1,id:'other',title:'Wrong identity',blocked:true,exposure:'played',updatedAt:new Date().toISOString()}));
 const history=createGameHistory({storage:store});assert.deepEqual(history.all(),[]);
 assert.equal(history.remember({id:'<script>',name:'unsafe'}),null);
 assert.deepEqual(history.blockedIds(),[]);assert.ok(store.getItem('tastiq.site.library'));
});
test('blocked storage falls back to this window without losing in-memory edits',()=>{
 const store={get length(){throw Error('unavailable');},setItem(){throw Error('unavailable');},removeItem(){throw Error('unavailable');}};
 const history=createGameHistory({storage:store});history.remember(card,{blocked:true});
 assert.equal(history.persistent,false);assert.deepEqual(history.blockedIds(),[card.id]);history.forget(card.id);assert.deepEqual(history.all(),[]);
});
