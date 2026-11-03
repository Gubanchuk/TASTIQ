import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {answerMediaConversation,applyMediaConversationProposal,normalizeMediaConversation} from '../src/core/media-conversation.js';
import {currentSessionMinutes,validateSessionTime} from '../src/core/session-time.js';
import {screenFixture} from './fixture.js';

const received=JSON.parse(readFileSync(new URL('./fixtures/cartoon-family-time-2026-11-03.json',import.meta.url),'utf8'));
test('real family plan accepts explicitly available viewing time with independent age and format',()=>{
 const state=answerMediaConversation(received.state,received.action),out=applyMediaConversationProposal(state,received.proposal,screenFixture('cartoon').dict);
 assert.equal(out.error,undefined);assert.equal(out.state.context.minutes,90);assert.equal(out.state.context.company,'children');assert.equal(out.state.context.childAge,7);assert.equal(out.state.context.format,'movie');
 assert.equal(normalizeMediaConversation(out.state).sessionTime.quote,'Сегодня на просмотр есть 90 минут.');
 const removed=answerMediaConversation(out.state,{type:'remove_time'});assert.equal(removed.sessionTime,null);assert.equal(removed.context.childAge,7);assert.equal(removed.context.format,'movie');
});
test('viewing purpose does not accept total runtime, historical, uncertain, negated or conditional time',()=>{
 assert.equal(currentSessionMinutes('Сегодня на просмотр есть 90 минут.'),90);
 for(const quote of ['Вчера на просмотр было 90 минут','Сегодня на просмотр нет 90 минут','Сегодня на просмотр есть примерно 90 минут','Если сегодня на просмотр есть 90 минут','Весь просмотр длится 90 минут','Сегодня на просмотр есть 90–120 минут'])assert.equal(currentSessionMinutes(quote),null,quote);
 const quote='Сегодня на просмотр есть 90 минут';
 for(const answer of ['Если '+quote,quote+', если успею',quote+', но сейчас уже нет',quote+'–120 минут']){
  const state={turns:[{id:'source',answer,question:{title:'Какую анимацию хочется сегодня?'}}],retractions:[]};
  assert.ok(validateSessionTime({minutes:90,sourceId:'source',quote},state).error,answer);
 }
});
