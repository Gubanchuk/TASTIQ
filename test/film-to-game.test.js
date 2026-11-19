import test from 'node:test';
import assert from 'node:assert/strict';
import {saveGameWish, selectedFilmMoods, takeGameWish} from '../src/server/public/shared/film-to-game.js';

test('cross-format handoff transfers only the confirmed wish, once in the originating tab', () => {
 const rows = new Map();
 const storage = {setItem:(key,val)=>rows.set(key,val),getItem:key=>rows.get(key)??null,removeItem:key=>rows.delete(key)};
 const turns = [{question:{id:'direction'},selected:[{id:'mood_relax',label:'Расслабиться'},{id:'avoid_long',label:'До двух часов'}],text:'Фильм до 120 минут'}];
 assert.equal(selectedFilmMoods(turns),'Расслабиться');
 assert.equal(saveGameWish(storage,'  Самому искать улики  ','this-tab',1),true);
 assert.equal(takeGameWish(storage,'another',2),'');
 assert.equal(takeGameWish(storage,'this-tab',3),'Самому искать улики');
 assert.equal(takeGameWish(storage,'this-tab',4),'');
 saveGameWish(storage,'Неспешное приключение','old',1);
 assert.equal(takeGameWish(storage,'old',31*60*1000),'');
 assert.equal(saveGameWish(undefined,'пожелание','blocked'),false);
});
