import test from 'node:test';
import assert from 'node:assert/strict';
import {questionFormHtml} from '../src/server/public/shared/question-form.js';
import {initialDirectionQuestion} from '../src/server/public/shared/conversation-entry.js';
import {answerMediaConversation,normalizeMediaConversation} from '../src/core/media-conversation.js';
import {initialConversation} from '../src/server/public/shared/conversation-entry.js';
const draft={kind:'answer',selected:[],text:''};
test('quick wishes precede optional text; genres and restrictions are named and neutral controls follow choices',()=>{
 const html=questionFormHtml(initialDirectionQuestion(),draft);
 assert.ok(html.indexOf('data-id="mood_relax"')<html.indexOf('id="answer-text"'));
 assert.match(html,/Выбрать жанр/);assert.match(html,/Что сегодня не подойдёт/);
 assert.ok(html.indexOf('game-neutral-options')>html.indexOf('id="answer-text"'));
 assert.match(html,/Ни один вариант не подходит/);assert.doesNotMatch(html,/Ничего из этого/);
 assert.match(html,/<details class="game-answer-extra" data-disclosure="answer-own">/);
 assert.match(questionFormHtml(initialDirectionQuestion(),{...draft,text:'мой ответ'}),/data-disclosure="answer-own" open/);
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
