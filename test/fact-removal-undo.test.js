import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newConversation,answerConversation,applyConversationProposal,conversationScreen,normalizeConversation} from '../src/core/conversation.js';
import {createConversationService} from '../src/server/conversation-service.js';
import {fixtureCatalog} from './fixture.js';
const catalog=fixtureCatalog();
function current(phase='result') {
 let s=newConversation({id:'fact-undo'});
 for(const id of ['rpg','windows','solo'])s=answerConversation(s,{type:'answer',questionId:s.question.id,selected:[id]});
 s=answerConversation(s,{type:'correct',text:'Хочу историю и исследование'});
 const sourceId=s.turns.at(-1).id,base={sourceId,scope:'today',stance:'want',gameId:null,exposure:null,gameIntent:null};
 s=applyConversationProposal(s,{summary:'Сегодня история и исследование',uncertainties:[],action:'review',question:null,sessionTime:null,
  facts:[{...base,key:'story',text:'Нужна история',quote:'историю',feature:'story.central'},{...base,key:'explore',text:'Хочется исследование',quote:'исследование',feature:'loop.exploration'}]},catalog.dict).state;
 if(phase==='result')return {...s,phase,result:{top:{id:'1',name:'One',ai:{reason:'Исходное объяснение'}},alternatives:[{id:'3',name:'Three'}]},familiar:{...s.familiar,marked:['3']}};
 return {...s,phase:'talk',question:{id:'next-desire',title:'Что ещё хочется?',options:[],multiple:true}};
}

test('one free undo of a removed fact restores the prior result, understanding, marks and retractions after reload',async()=>{
 let calls=0;const service=createConversationService({catalogs:{game:catalog},plan:async()=>{calls++;throw Error('No paid planning');},pick:async()=>{calls++;throw Error('No paid picking');}});
 const original=current(),removed=await service({state:original,action:{type:'remove_fact',key:'story'}});
 assert.equal(removed.screen.canUndoFactRemoval,true);assert.equal(removed.state.result,null);
 const resumed=await service({state:removed.state});
 const restored=await service({state:resumed.state,action:{type:'undo_fact_removal'}});
 assert.equal(calls,0);assert.equal(restored.state.phase,'result');
 assert.deepEqual(restored.state.result,original.result);assert.deepEqual(restored.state.facts,original.facts);
 assert.deepEqual(restored.state.familiar.marked,['3']);assert.deepEqual(restored.state.retractions,[]);
 assert.equal(restored.state.summary,original.summary);assert.equal(restored.screen.canUndoFactRemoval,false);
 assert.ok(restored.state.revision>removed.state.revision);
});

test('removing a fact while answering preserves the active question and undo cannot retain a recursive full state',()=>{
 const original=current('talk'),removed=answerConversation(original,{type:'remove_fact',key:'story'});
 assert.equal(removed.phase,'talk');assert.equal(removed.question.id,'next-desire');
 const restored=normalizeConversation({...removed,factRemovalUndo:{...removed.factRemovalUndo,turns:['not allowed'],factRemovalUndo:{nested:true}}});
 assert.equal(restored.factRemovalUndo.turns,undefined);assert.equal(restored.factRemovalUndo.factRemovalUndo,undefined);
 assert.equal(answerConversation(restored,{type:'undo_fact_removal'}).question.id,'next-desire');
});

test('new meaning or list actions invalidate old fact undo and multiple removals retain only the latest one',()=>{
 const original=current();
 for(const action of [{type:'correct',text:'Теперь хочу гонки'},{type:'context',company:'friend'},{type:'back'},{type:'continue'},{type:'confirm'},{type:'restart'}]) {
  const removed=answerConversation(original,{type:'remove_fact',key:'story'}),changed=answerConversation(removed,action);
  assert.equal(conversationScreen(changed).canUndoFactRemoval,false,action.type);
 }
 let s=answerConversation(original,{type:'remove_fact',key:'story'});
 s=answerConversation(s,{type:'remove_fact',key:'explore'});
 s=answerConversation(s,{type:'undo_fact_removal'});
 assert.deepEqual(s.facts.map(f=>f.key),['explore']);assert.equal(s.factRemovalUndo,null);
});

test('removing an initial direction fact preserves the required platform question and remains freely undoable',async()=>{
 let calls=0;const service=createConversationService({catalogs:{game:catalog},plan:async()=>{calls++;throw Error('No planning');},pick:async()=>{calls++;throw Error('No picking');}});
 let original=newConversation({id:'initial-fact-remove'});
 original=answerConversation(original,{type:'answer',questionId:'direction',selected:['rpg']});
 const removed=await service({state:original,action:{type:'remove_fact',key:'direction:rpg'}});
 assert.equal(removed.screen.type,'question');assert.equal(removed.screen.question.id,'platform');
 assert.equal(removed.state.context.platform,null);assert.equal(calls,0);
 const restored=await service({state:removed.state,action:{type:'undo_fact_removal'}});
 assert.equal(restored.screen.question.id,'platform');assert.equal(restored.state.facts[0].key,'direction:rpg');assert.equal(calls,0);
 const answered=await service({state:removed.state,action:{type:'answer',questionId:'platform',selected:['windows']}});
 assert.equal(answered.screen.question.id,'company');assert.equal(calls,0);
});
