import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '../src/server/public/shared/dialogue-client.js';
import { initialState, reduce, screen } from '../src/core/dialogue.js';
import { fixtureCatalog } from './fixture.js';
test('evening note survives reload, Back and forward without another API call per keystroke',async()=>{
 const oldFetch=globalThis.fetch,oldStorage=globalThis.localStorage;
 const data=new Map(),cats={game:fixtureCatalog()};
 const company={...initialState(),domain:'game',step:'company'};
 const anchors=reduce(company,{type:'choose',value:'solo'},cats);
 data.set('test.note',JSON.stringify(anchors));data.set('test.note.history',JSON.stringify([company]));
 globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 let calls=0;
 globalThis.fetch=async(path,init)=>{
  if(path==='/api/log')return new Response('{"ok":true}');
  calls++;const body=JSON.parse(init.body);const state=body.action?reduce(body.state,body.action,cats):body.state;
  return new Response(JSON.stringify({state,screen:screen(state,cats)}));
 };
 const create=()=>createClient({storageKey:'test.note',onScreen:()=>{},onError:e=>{throw e;}});
 try{
  let client=create();await client.start();
  client.updateNote('  история на час перед сном  ');
  assert.equal(calls,1,'saving a draft must be offline');
  await client.confirmIntent({sourceText:client.state.situation.note,wants:[{f:'story.central',evidence:'история'}],avoids:[],time:{minutes:60,evidence:'час'}});
  assert.equal(client.state.situation.intent.wants[0].f,'story.central');
  await client.send({type:'react',marks:[{id:'1',reaction:'love'},{id:'4',reaction:'love'}],note:client.state.situation.note});
  client=create();await client.start();await client.back();
  assert.equal(client.state.step,'anchors');assert.equal(client.state.situation.note,'история на час перед сном');
  assert.equal(client.state.situation.intent.time.minutes,60);
  client.updateNote('другое пожелание');await client.back();
  assert.equal(client.state.situation.intent,null);
  assert.equal(client.state.step,'company');await client.send({type:'choose',value:'solo'});
  assert.equal(client.state.situation.note,'другое пожелание');
 }finally{globalThis.fetch=oldFetch;if(oldStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldStorage;}
});
test('a dialogue ID survives reload and back, and only a successful restart rotates it', async () => {
  const oldStorage=globalThis.localStorage,oldFetch=globalThis.fetch;
  const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
  let fail=false;
  globalThis.fetch=async(path,options)=>{
    if(path==='/api/log')return{ok:true,json:async()=>({ok:true})};
    if(fail)return{ok:false,json:async()=>({error:'offline'})};
    const {state,action}=JSON.parse(options.body);
    return{ok:true,json:async()=>({state:action?.type==='restart'?{step:'domain'}:state??{step:'domain'},screen:{step:'domain'}})};
  };
  try {
    const a=createClient({storageKey:'ids',onScreen:()=>{},onError:()=>{}});await a.start();const first=a.dialogueId;
    assert.ok(first);
    const b=createClient({storageKey:'ids',onScreen:()=>{},onError:()=>{}});await b.start();assert.equal(b.dialogueId,first);
    fail=true;await b.restart();assert.equal(b.dialogueId,first);
    fail=false;await b.restart();assert.notEqual(b.dialogueId,first);
    await b.back();assert.notEqual(b.dialogueId,first);
  } finally {globalThis.localStorage=oldStorage;globalThis.fetch=oldFetch;}
});
