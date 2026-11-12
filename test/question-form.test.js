import test from 'node:test';
import assert from 'node:assert/strict';
import {canSubmitQuestion,questionFormHtml} from '../src/server/public/shared/question-form.js';
import {initialConversation,initialDirectionQuestion} from '../src/server/public/shared/conversation-entry.js';
import {answerConversation,applyConversationProposal,conversationScreen} from '../src/core/conversation.js';
import {answerMediaConversation,applyMediaConversationProposal,mediaConversationScreen,normalizeMediaConversation} from '../src/core/media-conversation.js';
const draft={kind:'answer',selected:[],text:''};
test('required direction choices and optional details precede the submit button',()=>{
 const html=questionFormHtml(initialDirectionQuestion(),draft);
 assert.ok(html.indexOf('data-id="mood_relax"')<html.indexOf('id="answer-text"'));
 assert.match(html,/Выбрать жанр/);assert.match(html,/Чего хочется избежать/);
 assert.match(html,/Обязательно/);assert.match(html,/Необязательно/);
 assert.ok(html.indexOf('data-first-next')>html.indexOf('id="answer-text"'));
 assert.match(html,/data-first-next disabled/);assert.doesNotMatch(html,/data-act="review"/);
 assert.match(html,/<details class="game-answer-extra" data-disclosure="answer-own">/);
 assert.match(questionFormHtml(initialDirectionQuestion(),{...draft,text:'мой ответ'}),/data-disclosure="answer-own" open/);
});
test('new modern dialogues require a mood or genre and keep additional words',()=>{
 for(const domain of ['game','film','series','cartoon']){
  const state=initialConversation({domain,id:'entry-required',requireDirection:true});
  const answer=domain==='game'?answerConversation:answerMediaConversation;
  const action={type:'answer',questionId:'direction',text:'Хочется неспешного приключения',kind:'answer'};
  for(const invalid of [{...action,kind:'unknown'},{...action,selected:['avoid_stress']},action,{type:'review'}]){
   assert.throws(()=>answer(state,invalid),/Выбери хотя бы одно/);
  }
  assert.equal(canSubmitQuestion(state.question,{...draft,text:action.text}),false);
  assert.equal(canSubmitQuestion(state.question,{...draft,selected:['avoid_stress']}),false);
  assert.equal(canSubmitQuestion(state.question,{...draft,selected:['mood_relax']}),true);
  const accepted=answer(state,{...action,selected:['mood_relax']});
  assert.equal(accepted.turns[0].text,action.text);
  assert.equal(answer(accepted,{type:'restart'}).requireDirection,true);
 }
});
test('changing an optional question retains the accepted answers and never records a neutral response',()=>{
 for(const domain of ['game','film','series','cartoon']){
  const answer=domain==='game'?answerConversation:answerMediaConversation;
  const screen=domain==='game'?conversationScreen:mediaConversationScreen;
  const initial=initialConversation({domain,id:'replace-question',requireDirection:true});
  const state=answer(initial,{type:'answer',questionId:'direction',selected:['mood_relax']});
  const pending={...state,phase:'talk',summary:'Сегодня хочется отдохнуть',question:{id:'experience',title:'Что хочется от истории?',why:'',multiple:true,options:[],controls:[]}};
  assert.equal(screen(pending).canChangeQuestion,true);
  const changed=answer(pending,{type:'another_question',questionId:'experience'});
  assert.notEqual(changed.question.id,'experience');
  assert.equal(changed.revision,pending.revision+1);
  assert.deepEqual(changed.turns,pending.turns);
  assert.deepEqual(changed.facts,pending.facts);
  assert.equal(changed.summary,pending.summary);
  assert.deepEqual(changed.skippedQuestions,['experience']);
  assert.throws(()=>answer(changed,{type:'another_question',questionId:'experience'}),/уже изменился/);
 }
});
test('a planner that returns the dismissed question after a replacement answer keeps the answer and its facts',()=>{
 for(const domain of ['game','film','series','cartoon']){
  const game=domain==='game',answer=game?answerConversation:answerMediaConversation;
  const apply=game?applyConversationProposal:applyMediaConversationProposal;
  const question={id:'experience',title:'Какое впечатление хочется?',why:'Уточним настроение.',options:[],multiple:true,controls:['unknown','indifferent','none']};
  const initial=initialConversation({domain,id:'repeat-dismissed',requireDirection:true});
  const directed=answer(initial,{type:'answer',questionId:'direction',selected:['mood_relax']});
  const pending={...directed,phase:'talk',question};
  const changed=answer(pending,{type:'another_question',questionId:question.id});
  const quote='Хочу спокойную историю';
  const submitted=answer(changed,{type:'answer',questionId:changed.question.id,text:quote});
  const fact={key:'calm',text:quote,quote,sourceId:submitted.turns.at(-1).id,scope:'today',stance:'want',feature:null,exposure:null,
   ...(game?{gameId:null,gameIntent:null}:{titleId:null,titleIntent:null})};
  const proposal={summary:quote,facts:[fact],uncertainties:[],action:'question',question,sessionTime:null,
   ...(!game?{context:{company:null,childAge:null,timeMode:null,commitment:null,onlyEnded:null,format:null}}:{})};
  const result=apply(submitted,proposal,{featureById:new Map()});
  assert.equal(result.error,undefined,domain);
  assert.equal(result.state.phase,'review',domain);
  assert.equal(result.state.question,null);
  assert.equal(result.state.needsPlan,false);
  assert.equal(result.state.turns.at(-1).text,quote);
  assert.deepEqual(result.state.facts,[fact]);
  assert.ok(apply(submitted,{...proposal,facts:[{...fact,quote:'Нет в ответе'}]},{featureById:new Map()}).error);
 }
});
test('none is absent from a text-only question, own words are escaped and remain available',()=>{
 const html=questionFormHtml({id:'extra',title:'Детали',options:[],controls:['unknown','indifferent','none']},{...draft,text:'<script>bad</script>'});
 assert.doesNotMatch(html,/data-kind="none"/);assert.match(html,/&lt;script&gt;/);assert.match(html,/id="answer-text"/);
});
test('media accepts and restores more than six explicit quick choices without weakening dynamic question limits',()=>{
 const state=initialConversation({domain:'film',id:'multi'}),selected=state.question.options.slice(0,8).map(o=>o.id);
 const next=answerMediaConversation(state,{type:'answer',questionId:'direction',selected,kind:'answer'});
 assert.equal(next.turns[0].selected.length,8);assert.doesNotThrow(()=>normalizeMediaConversation(next,'film'));
});
