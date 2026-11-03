import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {answerMediaConversation,applyMediaConversationProposal,mediaConversationScreen} from '../src/core/media-conversation.js';
import {requestOverviewHtml} from '../src/server/public/shared/request-overview.js';
import {screenFixture} from './fixture.js';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/cartoon-family-time-2026-11-03.json',import.meta.url),'utf8'));
const family=()=>applyMediaConversationProposal(answerMediaConversation(fixture.state,fixture.action),fixture.proposal,screenFixture('cartoon').dict).state;
const html=state=>requestOverviewHtml({state,screen:mediaConversationScreen(state),timeHtml:state.sessionTime?'<span>На сегодня: 90 мин</span>':''});

test('the real family request shows one canonical format and no repeated raw context quotes',()=>{
 const state=family(),before=JSON.stringify(state),view=html(state);
 assert.equal((view.match(/>Полнометражный мультфильм<\/span>/g)??[]).length,1);
 assert.match(view,/data-key="context:format"/);assert.doesNotMatch(view,/data-key="format.movie"|data-key="context:commitment"|data-key="context:timeMode"|data-key="context:childAge"/);
 assert.match(view,/С ребёнком 7 лет/);assert.match(view,/На сегодня: 90 мин/);
 assert.match(view,/Хочется добрый мультфильм/);assert.match(view,/Страшные сцены исключены/);
 assert.equal(JSON.stringify(state),before,'presentation never mutates accepted facts or sources');
});

test('one format removal clears its duplicate binding, preserves other conditions, and undo restores the display',()=>{
 const state=family(),removed=answerMediaConversation(state,{type:'remove_fact',key:'context:format'}),view=html(removed);
 assert.doesNotMatch(view,/data-key="context:format"|data-key="format.movie"/);assert.equal(removed.context.format,null);
 assert.match(view,/С ребёнком 7 лет/);assert.match(view,/Страшные сцены исключены/);assert.match(view,/На сегодня: 90 мин/);
 assert.equal(html(answerMediaConversation(removed,{type:'undo_fact_removal'})),html(state));
});

test('a shared quote alone does not hide a distinct goal, a conditional preference or historical experience',()=>{
 const state=family(),base=state.facts[0];state.facts.push({...base,key:'same-quote-goal',text:'Другая важная деталь',feature:'tone.feelgood'}, {...base,key:'past-format',text:'Раньше смотрел фильмы',scope:'history',stance:'history'}, {...base,key:'conditional-format',text:'Если будет настроение — один фильм',stance:'conditional'});
 const view=html(state);for(const key of ['same-quote-goal','past-format','conditional-format'])assert.match(view,new RegExp(`data-key="${key}"`));
});

test('the age condition uses the correct Russian form for a one-year-old child',()=>{
 const state=family();state.context.childAge=1;
 assert.match(html(state),/С ребёнком 1 года/);
});

test('a compound fact bound to format keeps its additional meaning visible',()=>{
 const before=answerMediaConversation(fixture.state,fixture.action),proposal=structuredClone(fixture.proposal);
 const quote=fixture.action.text.match(/Нужен.*?Не сериал\./u)[0];
 proposal.context.format.quote=quote;proposal.facts[0].quote=quote;proposal.facts[0].text='Добрый и смешной полнометражный мультфильм без страшных сцен';
 const out=applyMediaConversationProposal(before,proposal,screenFixture('cartoon').dict);assert.equal(out.error,undefined);
 assert.match(html(out.state),/data-key="format.movie"/);assert.match(html(out.state),/Добрый и смешной полнометражный мультфильм без страшных сцен/);
 assert.doesNotMatch(html(out.state),/data-key="context:format"/,'a format-only label must not delete a compound goal');
});

test('an animation preference stays visible when the film format label alone does not express it',()=>{
 const state=family();state.domain='film';state.facts[0].text='Хочу анимационный фильм';
 assert.match(html(state),/data-key="format.movie"/);assert.match(html(state),/Хочу анимационный фильм/);
});
