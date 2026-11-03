import test from 'node:test';
import assert from 'node:assert/strict';
import {initialConversation,initialConversationSnapshot} from '../src/server/public/shared/conversation-entry.js';
import {createConversationClient} from '../src/server/public/shared/conversation-client.js';
import {newConversation,conversationScreen,answerConversation} from '../src/core/conversation.js';
import {newMediaConversation,mediaConversationScreen,normalizeMediaConversation} from '../src/core/media-conversation.js';
import {questionDraftKey} from '../src/server/public/pick/game/question-drafts.js';
import {conversationStorageKey} from '../src/server/public/shared/conversation-client.js';

test('instant entry is the same state and question accepted by every server adapter',()=>{
 for(const domain of ['game','film','series','cartoon']){
  const local=initialConversationSnapshot({domain,id:'entry',mode:'free'});
  const server=domain==='game'?newConversation({id:'entry',mode:'free'}):newMediaConversation({domain,id:'entry',mode:'free'});
  assert.deepEqual(local.state,server);
  assert.deepEqual(local.screen,domain==='game'?conversationScreen(server):mediaConversationScreen(server));
  if(domain!=='game')assert.doesNotThrow(()=>normalizeMediaConversation(local.state,domain));
 }
});
test('new entry and its draft reload need no server; first answer sends the accepted identity',async()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};let calls=0,body;
 const fetch=async(_,options)=>{calls++;body=JSON.parse(options.body);return {ok:true,json:async()=>({state:answerConversation(body.state,body.action),screen:{type:'question'}})};};
 const first=createConversationClient({localStart:true,storage,fetch});
 assert.equal(first.screen.question.id,'direction');await first.start();assert.equal(calls,0);
 first.saveDraft('custom',{text:'Мой ответ'});
 const restored=createConversationClient({localStart:true,storage,fetch});await restored.start();
 assert.equal(calls,0);assert.equal(restored.draft('custom').text,'Мой ответ');
 await restored.send({type:'answer',questionId:'direction',selected:['mood_relax'],kind:'answer',text:''});
 assert.equal(calls,1);assert.equal(body.state.id,first.state.id);assert.equal(restored.state.phase,'platform');
});
test('quick restrictions remain negative evidence instead of becoming wishes',()=>{
 const state=answerConversation(initialConversation({id:'quick'}),{type:'answer',questionId:'direction',selected:['mood_relax','avoid_stress'],kind:'answer'});
 assert.ok(state.facts.some(f=>f.stance==='avoid'&&f.quote==='Не хочу напрягаться'));
 assert.ok(state.turns[0].answer.includes('Расслабиться и отвлечься'));
});

for(const domain of ['game','film','series','cartoon'])test(`${domain}: upgrading a pristine saved question preserves the old v3 draft, also after restoring a previous entry`,async()=>{
 const old=initialConversationSnapshot({domain,id:`old-${domain}`}),option=domain==='game'?'rpg':'comedy';
 const question={...old.state.question,options:old.state.question.options.filter(o=>!o.id.startsWith('mood_')&&!o.id.startsWith('avoid_'))};
 old.state.question=question;old.screen.question=question;
 const from=questionDraftKey(old.state,question),draft={kind:'answer',text:'Мой сохранённый запрос',selected:[option]};
 const saved={version:1,snapshot:old,drafts:{[from]:draft,__questionDraftV3:{text:old.state.id}},previous:null};
 const map=new Map([[conversationStorageKey(domain),JSON.stringify(saved)]]),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 let calls=0;const fetch=async(_,options)=>{calls++;const {state}=JSON.parse(options.body);return {ok:true,json:async()=>({state,screen:{...old.screen,question:state.question}})};};
 const client=createConversationClient({domain,localStart:true,storage,fetch});await client.start();
 assert.equal(calls,0);const to=questionDraftKey(client.state,client.screen.question);assert.notEqual(to,from);
 assert.deepEqual(client.draft(to),draft);assert.deepEqual(client.draft(from),draft);
 const replacement=initialConversationSnapshot({domain,id:`new-${domain}`});
 map.set(conversationStorageKey(domain),JSON.stringify({version:1,snapshot:replacement,drafts:{},previous:{snapshot:old,drafts:{[from]:draft}}}));
 const afterRestart=createConversationClient({domain,localStart:true,storage,fetch});await afterRestart.restorePrevious();
 assert.deepEqual(afterRestart.draft(from),draft);
 const reloaded=createConversationClient({domain,localStart:true,storage,fetch});await reloaded.start();
 assert.deepEqual(reloaded.draft(questionDraftKey(reloaded.state,reloaded.screen.question)),draft);
});
