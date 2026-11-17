import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('choosing a title in a restored legacy selection does not create a bookmark',async()=>{
 const source=await readFile(new URL('../src/server/public/pick/app.js',import.meta.url),'utf8');
 const saved=[],changes=[];
 const context={feedback:{update:async(...args)=>{changes.push(args);return true;},flush:()=>{}},feedbackDrafts:new Map(),resultPick:()=>({id:'title'}),planStore:{save:(...args)=>saved.push(args)},state:{domain:'film'},loadLibrary:()=>({}),view:'dialogue',render:()=>{},focusFk:()=>{}};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('async function updateEvening('),source.indexOf('function onScreen(')),context);
 await context.updateEvening({dataset:{run:'run',id:'title',fk:'choose'}},{type:'choose',value:true});
 assert.equal(changes.length,1);assert.equal(saved.length,0);
});
