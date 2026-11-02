import test from 'node:test';
import assert from 'node:assert/strict';
import {newConversation,answerConversation} from '../src/core/conversation.js';
import {loadingPresentation} from '../src/server/public/pick/game/pending-view.js';

const answer=(state,selected,text='')=>({type:'answer',questionId:state.question.id,selected,text,kind:'answer'});

test('pending prominence follows the real context-to-planner boundary before answers are accepted',()=>{
 for(const company of ['solo','friend','group']){
  let state=newConversation({id:`pending-${company}`});
  for(const selected of [['rpg'],['windows'],[company],...(company==='group'?[['3']]:[])]){
   const action=answer(state,selected),before=structuredClone(state);
   const presentation=loadingPresentation(action,state);
   const accepted=answerConversation(state,action);
   assert.equal(presentation.prominent,accepted.needsPlan,`${state.question.id}: ${selected}`);
   assert.deepEqual(state,before,'the pending view must not accept or mutate the answer');
   state=accepted;
  }
 }
});

test('the submitted company choice takes precedence over previous context',()=>{
 const state={question:{id:'company'},context:{company:'solo'}};
 assert.equal(loadingPresentation({type:'answer',selected:['group']},state).prominent,false);
 state.context.company='group';
 assert.equal(loadingPresentation({type:'answer',selected:['friend']},state).title,'Обдумываю твой ответ');
});

test('a model follow-up and a correction announce thinking rather than game selection',()=>{
 const state={question:{id:'experience'},context:{platform:'windows',company:'solo'}};
 for(const action of [{type:'answer',selected:[],text:'Хочу исследовать мир'},{type:'correct',text:'Сегодня хочу гонки'}]){
  const out=loadingPresentation(action,state);
  assert.equal(out.prominent,true);assert.equal(out.title,'Обдумываю твой ответ');
 }
});

test('selection and familiar replacement explain distinct pending operations',()=>{
 const state={question:null,context:{platform:'windows',company:'solo'}};
 const pick=loadingPresentation({type:'confirm'},state);
 const replace=loadingPresentation({type:'replace_familiar'},state);
 assert.equal(pick.prominent,true);assert.equal(pick.title,'Подбираю игры для тебя');
 assert.equal(replace.prominent,true);assert.equal(replace.title,'Ищу замену знакомым играм');
 assert.match(replace.description,/остальн/iu);
});

test('retry describes the failed operation, without inferring a fresh selection from phase',()=>{
 for(const [failedAction,title] of [['plan','Обдумываю твой ответ'],['pick','Подбираю игры для тебя'],['replace','Ищу замену знакомым играм']]){
  const out=loadingPresentation({type:'retry'},{failedAction,phase:'result'});
  assert.equal(out.prominent,true);assert.equal(out.title,title);
 }
 assert.equal(loadingPresentation({type:'retry'},{phase:'result'}).prominent,false);
});

test('local changes and missing state return complete calm copy without invented timing or progress',()=>{
 for(const [action,state] of [[{type:'back'},{}],[{type:'familiar_mark'},{}],[{type:'undo_replacement'},{}],[null,null],[{type:'answer'},{}]]){
  const out=loadingPresentation(action,state);
  assert.equal(out.prominent,false);
  assert.deepEqual(Object.keys(out).sort(),['description','prominent','title']);
  assert.ok(out.title.trim());assert.ok(out.description.trim());
  assert.doesNotMatch(out.title+' '+out.description,/%|\d+\s*(?:сек|мин)|оплач|платн|бесплат/iu);
 }
});

test('presentation objects are independent values, so a caller cannot alter later status copy',()=>{
 const first=loadingPresentation({type:'confirm'},{});
 first.title='Changed by caller';
 assert.equal(loadingPresentation({type:'confirm'},{}).title,'Подбираю игры для тебя');
});
