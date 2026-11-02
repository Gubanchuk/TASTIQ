import test from 'node:test';
import assert from 'node:assert/strict';
import {createConversationClient,CONVERSATION_KEY} from '../src/server/public/shared/conversation-client.js';

const storage=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),data};};
const result=(domain='film',revision=0,id='one')=>({state:{version:1,domain,id,revision},screen:{type:'question',question:{id:'direction'}}});
const ok=data=>({ok:true,json:async()=>data});

test('media transport keeps every request and persisted draft in its domain without writing game state',async()=>{
 const saved=storage(),requests=[];
 const film=createConversationClient({domain:'film',storage:saved,fetch:async(url,options)=>{const body=JSON.parse(options.body);requests.push({url,body});return ok(result('film',requests.length));}});
 await film.start();film.saveDraft('wish',{text:'Добрый фильм'});await film.send({type:'review'});
 assert.equal(requests[0].url,'/api/media-conversation');assert.ok(requests.every(r=>r.body.domain==='film'));
 assert.equal(saved.getItem(CONVERSATION_KEY),null);
 const series=createConversationClient({domain:'series',storage:saved,fetch:async()=>ok(result('series'))});
 assert.equal(series.state,null);assert.equal(series.draft('wish').text,'');
 const reloaded=createConversationClient({domain:'film',storage:saved,fetch:async()=>ok(result('film'))});
 assert.equal(reloaded.draft('wish').text,'Добрый фильм');assert.equal(reloaded.state.domain,'film');
});

test('foreign media response cannot replace accepted state or drafts',async()=>{
 let next=result('film');const client=createConversationClient({domain:'film',storage:storage(),fetch:async()=>ok(next)});
 await client.start();client.saveDraft('wish',{text:'Не потерять'});next=result('cartoon',1);await client.send({type:'review'});
 assert.equal(client.state.domain,'film');assert.equal(client.state.revision,0);assert.ok(client.error);assert.equal(client.draft('wish').text,'Не потерять');
});

test('media reload is free resume and network retry repeats the same scoped accepted input',async()=>{
 const saved=storage(),bodies=[];let fail=false;
 const request=async(_,options)=>{const body=JSON.parse(options.body);bodies.push(body);if(fail){fail=false;throw TypeError();}return ok(result('cartoon',bodies.length));};
 const first=createConversationClient({domain:'cartoon',storage:saved,fetch:request});await first.start();fail=true;await first.send({type:'answer',text:'Для взрослых'});await first.retry();assert.deepEqual(bodies[1],bodies[2]);
 const reload=createConversationClient({domain:'cartoon',storage:saved,fetch:request});await reload.start();assert.equal(bodies.at(-1).domain,'cartoon');assert.equal(bodies.at(-1).action,undefined);
});

test('unknown domains and reusing the game storage key are rejected before transport',()=>{
 assert.throws(()=>createConversationClient({domain:'other',storage:storage()}));
 assert.throws(()=>createConversationClient({domain:'film',storageKey:CONVERSATION_KEY,storage:storage()}));
});
