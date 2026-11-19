import test from 'node:test';
import assert from 'node:assert/strict';
import {watchSession} from '../src/server/public/pick/watch/saved-session.js';
import {createSavedSource,savedSourceChanged,savedSourceLibraryUrl} from '../src/server/public/shared/saved-source.js';
import {createConversationClient,conversationStorageKey} from '../src/server/public/shared/conversation-client.js';
import {createSelectionArchive} from '../src/server/public/shared/selection-archive.js';

function memory(){
 const items=new Map();
 return {getItem:key=>items.get(key)??null,setItem:(key,value)=>items.set(key,value),removeItem:key=>items.delete(key)};
}
test('saved and unrestricted film drafts can restart, reload and open from the archive independently',async()=>{
 const storage=memory(),session=memory(),domain='film';
 const route=url=>watchSession({params:new URL(url,'http://local').searchParams,domain,storage,session});
 const options={domain,localStart:true,storage};
 const ordinary=createConversationClient(options);
 ordinary.chooseDepth('deep');ordinary.saveDraft('wish',{text:'Обычный черновик'});
 const items=[{domain,id:'tt1',saved:true,title:'Один фильм'}];
 const url=createSavedSource(session,domain,items,'фильм',items),entry=route(url);
 const expected={version:1,domain,ids:['tt1']};
 const calls=[];
 const load=entry=>createConversationClient({...options,storage:entry.draftStorage,storageKey:entry.key,
  savedSource:entry.savedSource,savedListView:entry.savedListView,selectionId:entry.selection,archiveStorage:storage,fetch:async(_,init)=>{
   const body=JSON.parse(init.body);calls.push(body);
   const result={top:{id:'tt1'},alternatives:[]};
   const state={...body.state,result,phase:'result',revision:body.state.revision+1};
   return {ok:true,json:async()=>({state,screen:{type:'result',result}})};
  }});
 const client=load(entry);
 client.chooseDepth('standard');await client.start();assert.deepEqual(client.state.savedSource,expected);
 assert.equal(calls.length,0);
 await client.send({type:'confirm'});assert.deepEqual(calls[0].state.savedSource,expected);
 assert.ok(!JSON.stringify(calls[0]).includes('"query"'));
 assert.equal(load(route(url)).state.result.top.id,'tt1');
 client.chooseDepth('deep',{restart:true});assert.deepEqual(client.state.savedSource,expected);
 const archived=createSelectionArchive({storage}).all()[0];
 const reopened=route('/pick/watch/?domain=film&selection='+archived.id);
 assert.equal(reopened.savedListView.query,'фильм');
 assert.equal(new URL(savedSourceLibraryUrl(session,null,domain,reopened.savedListView),'http://local').searchParams.get('saved.q'),'фильм');
 assert.equal(savedSourceChanged(session,null,domain,items,reopened.savedListView),false);
 assert.equal(savedSourceChanged(session,null,domain,[],reopened.savedListView),true);
 assert.deepEqual(load(reopened).state.result.top,{id:'tt1'});
 assert.equal(reopened.draftStorage,session);
 assert.equal(route('/pick/watch/?domain=film&saved=missing').missing,true);
 assert.equal(createConversationClient(options).draft('wish').text,'Обычный черновик');
 assert.equal(route('/pick/watch/?domain=film').key,conversationStorageKey(domain));
});

test('a response which loses or broadens the saved source keeps the previous draft',async()=>{
 const domain='film',savedSource={version:1,domain,ids:['tt1']};
 for(const returned of [null,{...savedSource,ids:['tt1','tt2']}]){
  const client=createConversationClient({domain,savedSource,storage:memory(),localStart:true,
   fetch:async(_,init)=>({ok:true,json:async()=>({state:{...JSON.parse(init.body).state,savedSource:returned},screen:{type:'review'}})})});
  await client.send({type:'review'});
  assert.deepEqual(client.state.savedSource,savedSource);
  assert.ok(client.error);
 }
});

test('an obsolete screen cannot show a card outside the canonical list',async()=>{
 const domain='film',savedSource={version:1,domain,ids:['tt1']};
 const client=createConversationClient({domain,savedSource,storage:memory(),localStart:true,
  fetch:async(_,init)=>({ok:true,json:async()=>({state:JSON.parse(init.body).state,screen:{type:'result',result:{top:{id:'tt2'}}}})})});
 await client.send({type:'confirm'});
 assert.equal(client.screen.type,'question');
 assert.match(client.error,/списком/);
});

test('a later game response cannot restore a discarded ID from the original library handoff',async()=>{
 const domain='game',savedSource={version:1,domain,ids:['10','removed']};let calls=0;
 const client=createConversationClient({domain,savedSource,storage:memory(),localStart:true,fetch:async(_,init)=>{
  const {state}=JSON.parse(init.body);
  const source=calls++===0?{...savedSource,ids:['10']}:savedSource;
  return {ok:true,json:async()=>({state:{...state,savedSource:source,savedSourceKey:'verified',revision:state.revision+1},screen:{type:'review'}})};
 }});
 await client.send({type:'review'});assert.deepEqual(client.state.savedSource.ids,['10']);
 await client.send({type:'confirm'});assert.deepEqual(client.state.savedSource.ids,['10']);assert.match(client.error,/списком/);
});

test('game shelf, ordinary game draft and reopened archive stay independent without a state.domain',async()=>{
 const storage=memory(),tab=memory(),domain='game';
 const route=(url,session=tab)=>watchSession({params:new URL(url,'http://local').searchParams,domain,storage,session});
 const ordinary=createConversationClient({storage,domain,localStart:true});
 ordinary.chooseDepth('deep');ordinary.saveDraft('wish',{text:'Отдельный черновик'});
 const rows=[{id:'10',domain,title:'Моя игра',saved:true},{id:'20',domain,title:'Другая',saved:true}];
 const url=createSavedSource(tab,domain,rows,'игра',rows);
 assert.match(url,/^\/pick\/game\/\?saved=/);
 const calls=[],result={top:{id:'10'},alternatives:[]};
 const load=(entry,fetch=async(endpoint,init)=>{
  assert.equal(endpoint,'/api/conversation');
  const {state}=JSON.parse(init.body);calls.push(state);
  return {ok:true,json:async()=>({state:{...state,revision:1,phase:'result',result,savedSourceKey:'verified'},screen:{type:'result',result}})};
 })=>createConversationClient({localStart:true,domain,fetch,storage:entry.draftStorage,storageKey:entry.key,archiveStorage:storage,
  savedSource:entry.savedSource,savedListView:entry.savedListView,selectionId:entry.selection});
 const client=load(route(url));client.chooseDepth('standard');await client.start();
 assert.equal(calls.length,0);assert.equal(client.state.domain,undefined);
 await client.send({type:'confirm'});assert.deepEqual(calls[0].savedSource,{version:1,domain,ids:['10']});
 assert.equal(load(route(url)).state.savedSourceKey,'verified');
 const archived=createSelectionArchive({storage}).all()[0],otherTab=memory();
 const entry=route('/pick/game/?selection='+archived.id,otherTab);
 assert.equal(entry.savedListView.query,'игра');
 const restored=load(entry);assert.deepEqual(restored.state.result,result);
 restored.chooseDepth('deep',{restart:true});assert.deepEqual(restored.state.savedSource,calls[0].savedSource);
 assert.equal(restored.state.savedSourceKey,'verified');
 const reload=route('/pick/game/?savedArchive='+archived.id,otherTab);
 assert.equal(reload.selection,null);assert.equal(load(reload).state.depth,'deep');
 assert.ok(savedSourceChanged(otherTab,null,domain,[rows[1]],reload.savedListView));
 const back=new URL(savedSourceLibraryUrl(otherTab,null,domain,reload.savedListView),'http://local');
 assert.equal(back.searchParams.get('saved.q'),'игра');assert.equal(back.searchParams.get('saved.domain'),'game');
 assert.equal(route('/pick/game/?choose=1&fromFilm=wish').key,conversationStorageKey(domain));
 assert.equal(createConversationClient({storage,domain,localStart:true}).draft('wish').text,'Отдельный черновик');
 assert.equal(route(url,otherTab).missing,true);
 assert.equal(route(url+'&domain=film').missing,true);
 assert.equal(route('/pick/game/?savedArchive=missing').missing,true);
 const ordinaryRun=createSelectionArchive({storage}).capture({state:{version:1,id:'legacy-game',phase:'result',turns:[],result},screen:{type:'result',result}});
 const ordinaryEntry=route('/pick/game/?selection='+ordinaryRun.id);
 assert.equal(ordinaryEntry.draftStorage,storage);assert.equal(ordinaryEntry.savedSource,undefined);assert.deepEqual(load(ordinaryEntry).state.result,result);
});
