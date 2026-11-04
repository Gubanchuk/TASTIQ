import test from 'node:test';
import assert from 'node:assert/strict';
import {createSelectionArchive,SELECTION_ARCHIVE_KEY,selectionUrl} from '../src/server/public/shared/selection-archive.js';
import {createConversationClient,conversationStorageKey} from '../src/server/public/shared/conversation-client.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
const snapshot=(domain='film',id='evening',top='one')=>({state:{version:1,id,domain,revision:3,phase:'result',turns:[],result:{top:{id:top,ru:'Первый'},alternatives:[{id:'two',ru:'Второй'}]}},screen:{type:'result',summary:'Сегодня хочется истории',result:{top:{id:top,ru:'Первый'},alternatives:[{id:'two',ru:'Второй'}]}}});
test('every result batch survives a new store and repeats update the same batch without duplicating it',()=>{
 const storage=memory(),archive=createSelectionArchive({storage});
 archive.capture(snapshot());archive.capture(snapshot());archive.capture(snapshot('film','evening','three'));archive.capture(snapshot('game','other'));
 const reopened=createSelectionArchive({storage});assert.equal(reopened.all().length,3);
 const row=reopened.all().find(x=>x.domain==='film'&&x.snapshot.state.result.top.id==='one');assert.equal(reopened.get(row.id,'film').screen.summary,'Сегодня хочется истории');assert.equal(reopened.get(row.id,'game'),null);
 assert.match(selectionUrl(row),/^\/pick\/watch\/\?domain=film&selection=/);assert.ok(storage.getItem(SELECTION_ARCHIVE_KEY));
});
test('existing modern saved results are recovered without altering their current conversation or legacy history',()=>{
 const storage=memory(),saved=JSON.stringify({version:1,snapshot:snapshot('series')});storage.setItem(conversationStorageKey('series'),saved);
 const archive=createSelectionArchive({storage});assert.equal(archive.all().length,1);assert.equal(storage.getItem(conversationStorageKey('series')),saved);
 archive.capture({...snapshot(),screen:{type:'question'}});assert.equal(archive.all().length,1);
});
test('the client archives before restart and can reopen a chosen batch with a free resume and preserve the current draft',async()=>{
 const storage=memory();let value=snapshot();const calls=[];
 const fetch=async(_,init)=>{const body=JSON.parse(init.body);calls.push(body);return {ok:true,json:async()=>body.action?.type==='restart'?{state:{version:1,id:'new',domain:'film',revision:0},screen:{type:'question'}}:body.state?{...value,state:body.state}:value};};
 const client=createConversationClient({domain:'film',storage,fetch});await client.start();await client.send({type:'restart'});client.saveDraft('draft',{text:'Новый ответ'});
 const entry=createSelectionArchive({storage}).all()[0];assert.ok(entry);
 const reopened=createConversationClient({domain:'film',storage,fetch,selectionId:entry.id});await reopened.start();
 assert.equal(reopened.state.id,'evening');assert.equal(calls.at(-1).action,undefined);assert.equal(reopened.canRestorePrevious,true);
 await reopened.restorePrevious();assert.equal(reopened.state.id,'new');assert.equal(reopened.draft('draft').text,'Новый ответ');
});
test('unavailable storage reports memory-only, malformed entries are ignored, and bounded archive keeps newest batches',()=>{
 const archive=createSelectionArchive({storage:{getItem:()=>null,setItem:()=>{throw Error('quota');}}});archive.capture(snapshot());assert.equal(archive.persistent,false);assert.equal(archive.all().length,1);
 const storage=memory();storage.setItem(SELECTION_ARCHIVE_KEY,'{bad');const clean=createSelectionArchive({storage});for(let i=0;i<35;i++)clean.capture(snapshot('film',`run-${i}`));assert.ok(clean.all().length<=30);assert.equal(clean.all()[0].snapshot.state.id,'run-34');
});
