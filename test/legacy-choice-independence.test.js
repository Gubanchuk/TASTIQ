import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createLibraryStore,LIBRARY_KEY,isLibrarySaved} from '../src/server/public/shared/library-store.js';
import {mediaLibraryDomain} from '../src/server/public/shared/anime-pilot.js';

test('choosing a title in a restored legacy selection does not create a bookmark',async()=>{
 const source=await readFile(new URL('../src/server/public/pick/app.js',import.meta.url),'utf8');
 const saved=[],changes=[];
 const context={feedback:{update:async(...args)=>{changes.push(args);return true;},flush:()=>{}},feedbackDrafts:new Map(),resultPick:()=>({id:'title'}),planStore:{save:(...args)=>saved.push(args)},state:{domain:'film'},loadLibrary:()=>({}),view:'dialogue',render:()=>{},focusFk:()=>{}};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('async function updateEvening('),source.indexOf('function onScreen(')),context);
 await context.updateEvening({dataset:{run:'run',id:'title',fk:'choose'}},{type:'choose',value:true});
 assert.equal(changes.length,1);assert.equal(saved.length,0);
});

test('the legacy save button toggles an explicit bookmark without changing the taste record',async()=>{
 const source=await readFile(new URL('../src/server/public/pick/app.js',import.meta.url),'utf8');
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 const planStore=createLibraryStore({storage}),card={id:'one',name:'One',domain:'film'};
 planStore.save(card);planStore.rate('film',card.id,'liked');planStore.setSaved(card,false);
 const loadLibrary=()=>JSON.parse(storage.getItem(LIBRARY_KEY));
 const context={planStore,isLibrarySaved,mediaLibraryDomain,loadLibrary,library:loadLibrary(),t:{dataset:{id:'one'}},state:{domain:'film'},
  resultPick:()=>card,savedItem:()=>context.library.items[0],client:{log(){}},renderSidebar(){},renderContent(){},renderInspector(){},focusFk(){},announce(){},nameOf:()=>card.name};
 const first=source.indexOf("case 'take':"),last=source.indexOf("case 'seen':",first);
 assert.ok(first>=0&&last>first);
 vm.createContext(context);
 const click=()=>vm.runInContext("(function(){switch('take'){"+source.slice(first,last)+"}})()",context);
 click();assert.equal(planStore.all()[0].saved,true);
 click();assert.equal(planStore.all()[0].saved,false);assert.equal(planStore.all()[0].status,'liked');
});
