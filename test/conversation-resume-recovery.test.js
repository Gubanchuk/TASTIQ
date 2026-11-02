import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createConversationClient,CONVERSATION_KEY} from '../src/server/public/shared/conversation-client.js';
import {createConversationService} from '../src/server/conversation-service.js';
import {newConversation,answerConversation,conversationScreen} from '../src/core/conversation.js';
import {fixtureCatalog} from './fixture.js';

function setup({retryable=true}={}) {
 const catalog=fixtureCatalog(),requests=[];let plans=0;
 const service=createConversationService({catalogs:{game:catalog},plan:async(_,state)=>{
  plans++;if(plans===1)return {error:retryable?'Не удалось проверить разбор. Ответ сохранён.':'Расход не подтверждён. Повторы заблокированы.',retryable};
  return {proposal:{summary:'Сегодня гонки',facts:[],uncertainties:[],action:'review',question:null,sessionTime:null}};
 }});
 let state=newConversation({id:'resume-correction'});
 for(const id of ['rpg','windows','solo'])state=answerConversation(state,{type:'answer',questionId:state.question.id,selected:[id]});
 state={...state,phase:'result',needsPlan:false,result:{top:{id:'1',name:'Old RPG'},alternatives:[]},summary:'Прежнее желание'};
 const map=new Map([[CONVERSATION_KEY,JSON.stringify({version:1,snapshot:{state,screen:conversationScreen(state)},drafts:{}})]]);
 const storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};
 const fetch=async(_,options)=>{const body=JSON.parse(options.body);requests.push(body);return {ok:true,json:async()=>service(body)};};
 return {storage,fetch,requests,plans:()=>plans};
}

test('reload keeps accepted correction failure visible and only explicit retry plans again without duplicating the correction',async()=>{
 const fixture=setup(),first=createConversationClient(fixture);await first.start();
 first.saveDraft('__correction',{text:'Хочу гонки, прежняя RPG сегодня не нужна'});
 await first.send({type:'correct',text:first.draft('__correction').text});
 const committed=first.state,failedMessage=first.error;
 assert.equal(committed.result,null);assert.equal(fixture.plans(),1);
 const reloaded=createConversationClient(fixture);
 assert.equal(reloaded.error,failedMessage);
 await reloaded.start();
 assert.equal(fixture.requests.at(-1).action,undefined);assert.equal(fixture.plans(),1);
 assert.equal(reloaded.error,failedMessage);assert.equal(reloaded.snapshot.retryable,true);
 assert.equal(reloaded.draft('__correction').text,'Хочу гонки, прежняя RPG сегодня не нужна');
 await reloaded.retry();
 assert.deepEqual(fixture.requests.at(-1).action,{type:'retry'});
 assert.equal(fixture.plans(),2);assert.equal(reloaded.state.turns.length,committed.turns.length);
 assert.equal(reloaded.state.turns.at(-1).text,committed.turns.at(-1).text);
 assert.equal(reloaded.error,null);assert.equal(reloaded.state.phase,'review');
});

test('a saved nonretryable budget failure remains blocked after free resume and cannot dispatch a retry',async()=>{
 const fixture=setup({retryable:false}),first=createConversationClient(fixture);await first.start();
 await first.send({type:'correct',text:'Хочу гонки'});
 const reload=createConversationClient(fixture);await reload.start();
 assert.equal(reload.error,first.error);assert.equal(reload.snapshot.retryable,false);assert.equal(fixture.plans(),1);
 const count=fixture.requests.length;await reload.retry();
 assert.equal(fixture.requests.length,count);assert.equal(fixture.plans(),1);
});

test('restart clears old recovery while restoring the prior failed conversation restores its explicit recovery too',async()=>{
 const fixture=setup(),client=createConversationClient(fixture);await client.start();
 await client.send({type:'correct',text:'Хочу гонки'});const failedMessage=client.error;
 await client.send({type:'restart'});assert.equal(client.error,null);assert.equal(client.canRestorePrevious,true);
 await client.restorePrevious();
 assert.equal(fixture.requests.at(-1).action,undefined);assert.equal(fixture.plans(),1);
 assert.equal(client.error,failedMessage);assert.equal(client.snapshot.retryable,true);assert.equal(client.canRestorePrevious,false);
 client.saveDraft('__correction',{text:'Новая ещё не отправленная поправка'});
 await client.retry();assert.equal(client.draft('__correction').text,'Новая ещё не отправленная поправка');assert.equal(client.error,null);
});
