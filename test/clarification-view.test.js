import test from 'node:test';
import assert from 'node:assert/strict';
import {clarificationHtml,clarificationKey,clarificationAction,shouldClearCorrection} from '../src/server/public/shared/clarification-view.js';
import {createConversationClient} from '../src/server/public/shared/conversation-client.js';
const state={id:'one',revision:3};
test('each uncertainty has a separate persistent own-word editor and escaped context',()=>{
 const a=clarificationKey(state,'Какой сериал?'),b=clarificationKey(state,'Как долго?');assert.notEqual(a,b);
 const html=clarificationHtml({state,uncertainties:['Какой сериал?','<script>'],draft:key=>({text:key===a?'Мой ответ':'',kind:key===a?'none':'answer'})});
 assert.ok(html.includes('Уточнить'));assert.ok(html.includes('Мой ответ'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
 assert.ok(html.includes('data-revision="3"'));assert.ok(html.includes('Отмена'));
});
test('clarification transmits human text only and refuses stale or foreign revision',()=>{
 const form={conversation:'one',revision:'3'};
 assert.deepEqual(clarificationAction(form,state,'  Я имею в виду другое название  '),{type:'correct',text:'Я имею в виду другое название'});
 assert.equal(clarificationAction({...form,revision:'2'},state,'Ответ'),null);
 assert.equal(clarificationAction({...form,conversation:'other'},state,'Ответ'),null);
});
test('correction checkpoint restores result and feedback locally after committed planner failure and reload',async()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};let calls=0;
 const initial={state:{version:1,id:'one',revision:3,result:{top:{id:'t1'}}},screen:{type:'result'},feedbackState:{conversation:{revision:3}}};
 const fetch=async()=>({ok:true,json:async()=>++calls===1?initial:{state:{version:1,id:'one',revision:4,result:null,failedAction:'plan'},screen:{type:'question'},error:'Сбой',retryable:true}});
 const first=createConversationClient({storage,fetch});await first.start();first.saveDraft('answer',{text:'Черновик'});await first.send({type:'correct',text:'Уточняю'});assert.equal(first.canRestoreCorrection,true);
 const reload=createConversationClient({storage,fetch:()=>{throw Error('Must not call API');}});reload.saveDraft('new',{text:'Новый черновик'});assert.equal(reload.restoreCorrection(),true);
 assert.deepEqual(reload.state.result,initial.state.result);assert.deepEqual(reload.snapshot.feedbackState,initial.feedbackState);assert.equal(reload.error,null);assert.equal(reload.draft('answer').text,'Черновик');assert.equal(reload.draft('new').text,'Новый черновик');assert.equal(calls,2);assert.equal(reload.canRestorePrevious,false);
});

test('only the submitted matching general correction draft may be cleared',()=>{
 const action={type:'correct',text:'Мой ответ'};
 assert.equal(shouldClearCorrection(action,'clarification','Мой ответ'),false);
 assert.equal(shouldClearCorrection(action,null,'Другой черновик'),false);
 assert.equal(shouldClearCorrection(action,'correction','Другой черновик'),false);
 assert.equal(shouldClearCorrection(action,'correction','  Мой ответ  '),true);
});
test('a result carrying replacement error still gets a clean local correction checkpoint',async()=>{
 let calls=0;
 const saved={state:{version:1,id:'one',revision:3,result:{top:{id:'t1'}},failedAction:'replace'},screen:{type:'result'},error:'Замена не удалась',retryable:true,feedbackState:{conversation:{revision:3}}};
 const fetch=async()=>({ok:true,json:async()=>++calls===1?saved:{state:{version:1,id:'one',revision:4,result:null,failedAction:'plan'},screen:{type:'question'},error:'Сбой',retryable:true}});
 const client=createConversationClient({fetch,storage:{getItem:()=>null,setItem:()=>{}}});await client.start();await client.send({type:'correct',text:'Другое пожелание'});
 assert.equal(client.canRestoreCorrection,true);assert.equal(client.restoreCorrection(),true);assert.deepEqual(client.state.result,saved.state.result);assert.deepEqual(client.snapshot.feedbackState,saved.feedbackState);assert.equal(client.error,null);assert.equal(client.state.failedAction,null);assert.equal(client.snapshot.retryable,undefined);assert.equal(calls,2);
});
