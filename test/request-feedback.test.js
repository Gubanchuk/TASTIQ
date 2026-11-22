import test from 'node:test';
import assert from 'node:assert/strict';
import {initialConversation} from '../src/server/public/shared/conversation-entry.js';
import {questionFormHtml} from '../src/server/public/shared/question-form.js';
import {answerAction} from '../src/server/public/pick/game/answer-view-state.js';
import {backDraftSeed} from '../src/server/public/pick/game/question-drafts.js';
import {answerConversation,normalizeConversation,conversationToLegacy,applyConversationProposal} from '../src/core/conversation.js';
import {answerMediaConversation,normalizeMediaConversation,mediaConversationToLegacy,applyMediaConversationProposal} from '../src/core/media-conversation.js';
import {criteriaOf} from '../src/ai/pick-constraints.js';
import {pureRatingRequirement} from '../src/core/age-rating.js';
import {originalWishHtml} from '../src/server/public/shared/request-overview.js';

test('a separate avoidance survives submission, normalization and returning to the first form',()=>{
 for(const domain of ['game','film','anime','series','cartoon']){
  const state=initialConversation({id:'feedback',domain,requireDirection:true});
  const draft={text:'Хочу долгую историю',selected:[],kind:'answer',avoidText:'школьной романтики и <филлеров>'};
  const html=questionFormHtml(state.question,draft,{domain});
  assert.match(html,/id="answer-avoid"/);
  assert.match(html,/школьной романтики и &lt;филлеров&gt;/);
  const submitted=answerAction(state.question,draft);
  const accepted=(domain==='game'?answerConversation:answerMediaConversation)(state,submitted);
  const restored=(domain==='game'?normalizeConversation:normalizeMediaConversation)(accepted,domain);
  const turn=restored.turns[0];
  assert.ok(restored.facts.some(f=>f.stance==='exclude'&&f.quote===draft.avoidText));
  assert.equal(turn.text,draft.text);
  assert.match(turn.answer,/Хочу избежать: школьной романтики и <филлеров>/);
  assert.deepEqual(backDraftSeed(state.question,turn),draft);
  const project=domain==='game'?conversationToLegacy:mediaConversationToLegacy;
  assert.match(project(restored,{featureById:new Map()}).conversation.turns[0].answer,/Хочу избежать: школьной романтики и <филлеров>/);
  const reduce=domain==='game'?answerConversation:answerMediaConversation;
  assert.throws(()=>reduce(state,{...submitted,avoidText:'а'.repeat(241)}),/240/);
  const large=reduce(state,{...submitted,selected:state.question.options.map(o=>o.id),text:'ж'.repeat(1600),avoidText:'а'.repeat(240)});
  assert.doesNotThrow(()=>(domain==='game'?normalizeConversation:normalizeMediaConversation)(large,domain));
 }
});

test('clarifications retain the original wish even after a newer answer or a model summary',()=>{
 const text='Хочу завершённый сериал <без мистики>. '.repeat(9).trim();
 const state={id:'feedback',turns:[{id:'first',question:{id:'direction'},text,kind:'answer'},
  {id:'later',question:{id:'experience'},text:'До трёх сезонов',kind:'answer'}]};
 const html=originalWishHtml(state);
 assert.match(html,/Исходный запрос/);
 assert.ok(html.includes(text.replaceAll('<','&lt;').replaceAll('>','&gt;')));
 assert.match(html,/<details/);
 assert.doesNotMatch(html,/До трёх сезонов|<без мистики>/);
 assert.equal(originalWishHtml({turns:[]}), '');
});

test('a model paraphrase does not obstruct opting out of an explicitly quoted 18+ rating',()=>{
 const requirement={quote:'Нужен официальный рейтинг 18+ для этого сериала. Только 18+.',text:'Обязателен именно официальный рейтинг 18+.',feature:null,titleId:null,scope:'today',stance:'require'};
 assert.equal(pureRatingRequirement(requirement),true);
 assert.equal(pureRatingRequirement({...requirement,quote:requirement.quote+' И без школьной романтики.'}),false);
});

test('the explicit exclusion remains a hard, editable condition when the next planner uses a different key or omits it',()=>{
 const avoidText='откровенных сцен',text='Хочу семейную историю о дружбе';
 const dict={featureById:new Map([['content.sexual',{}]])};
 for(const domain of ['game','film']){
  const game=domain==='game';
  const [answer,normalize,apply,project]=game?[answerConversation,normalizeConversation,applyConversationProposal,conversationToLegacy]
    :[answerMediaConversation,normalizeMediaConversation,applyMediaConversationProposal,mediaConversationToLegacy];
  const start=initialConversation({domain,id:'explicit-field',depth:'deep'});
  const first=answer(start,{type:'answer',questionId:'direction',text,avoidText,selected:[]});
  const own=first.facts.find(f=>f.quote===avoidText);
  const proposal=(s,facts)=>{
   const out=apply(s,{facts,summary:text,action:'review',question:null,uncertainties:[],sessionTime:null,
    ...(game?{}:{context:{company:null,childAge:null,timeMode:null,commitment:null,onlyEnded:null,format:null}})},dict);
   assert.equal(out.error,undefined);return normalize(out.state);
  };
  const assertHard=s=>assert.ok(criteriaOf(project(s,dict)).some(c=>c.stance==='exclude'&&c.quote===avoidText));
  let s=proposal(first,[{...own,key:'planner-key',stance:'avoid',feature:'content.sexual'}]);
  assertHard(s);assert.equal(s.facts.find(f=>f.key===own.key).feature,'content.sexual');
  s=answer(s,{type:'correct',text:'Ещё хочется красивую музыку'});
  s=proposal(s,[]);assertHard(s);assert.equal(s.facts.find(f=>f.key===own.key).feature,'content.sexual');
  const otherFacts=Array.from({length:16},(_,i)=>({...own,key:'wish-'+i,text,quote:text,stance:'want'}));
  s=proposal(s,otherFacts);assert.equal(s.facts.length,17);assertHard(s);
  const removed=answer(s,{type:'remove_fact',key:own.key});
  assert.equal(criteriaOf(project(proposal(removed,[]),dict)).some(c=>c.quote===avoidText),false);
  assertHard(normalize(answer(removed,{type:'undo_fact_removal'})));
  const cleared=answer(s,{type:'correct',text:'Убери моё исключение'});
  assert.equal(criteriaOf(project(proposal(cleared,[]),dict)).some(c=>c.quote===avoidText),false);
 }
});
