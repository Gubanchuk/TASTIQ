import test from 'node:test';
import assert from 'node:assert/strict';
import {createMediaHistory} from '../src/server/public/shared/media-history.js';
const storage=()=>{const data=new Map();return {get length(){return data.size;},key:i=>[...data.keys()][i],getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};

test('media familiarity is scoped by domain and explicit blocking is separate from watching',()=>{
 const saved=storage(),film=createMediaHistory('film',{storage:saved}),cartoon=createMediaHistory('cartoon',{storage:saved});
 film.remember({id:'tt1',ru:'Название',poster:'https://example.com/cover.jpg',year:2020});
 assert.equal(film.all()[0].exposure,'seen');assert.deepEqual(film.blockedIds(),[]);assert.deepEqual(cartoon.all(),[]);
 film.setBlocked('tt1',true);assert.deepEqual(film.blockedIds(),['tt1']);film.setBlocked('tt1',false);assert.deepEqual(film.blockedIds(),[]);
 assert.equal(createMediaHistory('film',{storage:saved}).all()[0].poster,'https://example.com/cover.jpg');
});

test('fresh writes preserve another instance and forgetting affects only one title/domain',()=>{
 const saved=storage(),one=createMediaHistory('series',{storage:saved}),two=createMediaHistory('series',{storage:saved});
 one.remember({id:'tt1',name:'Один'});two.remember({id:'tt2',name:'Два'});assert.equal(one.all().length,2);
 one.forget('tt1');assert.deepEqual(two.all().map(r=>r.id),['tt2']);assert.throws(()=>createMediaHistory('game',{storage:saved}));
});

test('unavailable storage still remembers in this visit without pretending persistence',()=>{
 const saved={get length(){throw Error();},setItem(){throw Error();}},history=createMediaHistory('film',{storage:saved});
 history.remember({id:'tt1',name:'Фильм'});assert.equal(history.persistent,false);assert.equal(history.all().length,1);
});
