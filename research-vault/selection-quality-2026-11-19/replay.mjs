import assert from 'node:assert/strict';
import {loadCatalogs} from '../../src/core/catalog.js';
import {newConversation} from '../../src/core/conversation.js';
import {profileOf, sessionOf} from '../../src/core/dialogue.js';
import {recommend} from '../../src/core/recommend.js';
import {createConversationService} from '../../src/server/conversation-service.js';
import {aiPick, candidatesOf, candidateLimit, lookUp} from '../../src/ai/pick.js';

const catalogs = loadCatalogs();
const catalog = catalogs.game;
const offline = () => { throw Error('Network disabled for this replay'); };
globalThis.fetch = offline;

// These are paraphrases for a replay. The two original records have different evidential value.
const cases = [
  {
    id: 'story', direction: 'rpg',
    base: [
      ['Хочется сюжетную RPG', 'story.central', 'want'],
      ['с решениями игрока', 'story.choices', 'want'],
      ['без однообразного фарма', 'progression.grind', 'avoid']
    ],
    extra: [['Интересны разные билды', 'progression.builds', 'want'], ['и живой мир', 'world.living', 'want']],
    question: 'Что ещё должно выделять игру?',
    branches: ['Билды дадут больше вариантов развития героя.', 'Живой мир выдвинет вперёд исследование окружения.'],
    targets: ['steam:1771300', 'steam:1091500']
  },
  {
    id: 'shooter', direction: 'shooter',
    base: [['Хочется много стрелять', 'loop.shooting', 'want'], ['открытый мир обязателен', 'freedom.open_world', 'require']],
    extra: [['Хочется расслабиться', 'tension.low', 'want'], ['и побеждать без частых поражений', 'difficulty.forgiving', 'want']],
    question: 'Какую сложность хочется сегодня?',
    branches: ['Лёгкая победа выдвинет игры с мягкой сложностью.', 'Высокий вызов выдвинет требовательные бои.'],
    targets: ['steam:552520', 'steam:225540', 'steam:377160', 'steam:460930']
  }
];
const quoteText = parts => parts.map(([phrase]) => phrase).join(', ');
function stubPlan(fixture, state, upfront) {
  const asked = state.turns.find(turn => turn.question.id === 'detail');
  const facts = state.facts.filter(fact => fact.key.startsWith('direction:'));
  for (const [turn, parts] of [[state.turns[0], fixture.base], ...(upfront ? [[state.turns[0], fixture.extra]] : asked ? [[asked, fixture.extra]] : [])]) {
    for (const [quote, feature, stance] of parts) {
      if (!facts.some(f => f.feature === feature && f.stance === stance)) {
        facts.push({key:feature, text:quote, stance, scope:'today', sourceId:turn.id, quote, feature, gameId:null, exposure:null});
      }
    }
  }
  const enough = asked || upfront;
  return {proposal:{
    summary:[quoteText(fixture.base), ...(asked || upfront ? [quoteText(fixture.extra)] : [])].join('. '),
    facts, uncertainties:[], action:enough ? 'review' : 'question', sessionTime:null,
    question:enough ? null : {id:'detail', title:fixture.question, why:'Уточнение приоритета для ранжирования.', options:[], multiple:true},
    decision:{version:1, reason:enough ? 'sufficient' : 'refinement', gapKey:enough ? null : 'detail',
      sourceIds:[state.turns[0].id], selectionImpact:enough ? null : fixture.branches.join(' '),
      branches:enough ? [] : fixture.branches, remainingGap:null}
  }};
}

async function replay(fixture, depth, delivery) {
  const upfront = delivery === 'upfront';
  const answerDetail = delivery === 'answer';
  const hasExtra = answerDetail || upfront;
  let planning = true;
  const service = createConversationService({catalogs,
    plan:async (_catalog, state) => stubPlan(fixture, state, upfront), pick:offline, api:offline, access:() => ({allowed:planning})});
  let state = newConversation({id:fixture.id, depth, requireDirection:true});
  async function advance(action) {
    const out = await service({state, action});
    assert.equal(out.error, undefined);
    state = out.state;
    return out;
  }
  const answer = (selected, text = '') => advance({type:'answer', questionId:state.question.id, selected, text});
  await answer([fixture.direction], quoteText(fixture.base.concat(upfront ? fixture.extra : [])));
  await answer(['windows']);
  await answer(['solo']);
  assert.equal(state.phase, depth === 'standard' ? 'review' : 'talk');
  if (depth === 'deep') {
    if (answerDetail) await answer([], quoteText(fixture.extra));
    else await advance({type:'review'});
  }
  assert.equal(state.phase, 'review');
  planning = false;
  const {feedbackState:legacy} = await advance({type:'confirm'});
  assert.equal(state.phase, 'result');
  assert.equal(state.provisional, true);
  const limit = candidateLimit('game', true);
  const {rows, ranked} = candidatesOf(catalog, legacy, limit);
  let prompt;
  await aiPick(catalogs, legacy, {wish:state.summary, api:async request => { prompt = request; return {status:'incomplete'}; }});
  assert.ok(prompt?.input);
  const parts = fixture.base.concat(hasExtra ? fixture.extra : []);
  for (const [quote, feature, stance] of parts) {
    assert.ok(prompt.input.includes(quote));
    const key = {want:'goalWants', avoid:'goalAvoids', require:'goalRequires'}[stance];
    assert.ok(legacy.session[key].some(signal => signal.f === feature));
  }
  const names = result => [result.top, ...result.alternatives].map(card => catalog.byId.get(card.id).name);
  const shown = names(state.result);
  const positions = fixture.targets.map(id => {
    const game = catalog.byId.get(id);
    const rank = ranked.findIndex(row => row.game.id === id) + 1;
    const shortlistPosition = rows.findIndex(row => row.game.id === id) + 1;
    return {name:game?.name ?? id, inCatalog:Boolean(game), eligible:rank > 0,
      rank:rank || null, shortlistPosition:shortlistPosition || null, shown:shown.includes(game?.name),
      own:Boolean(game && lookUp(ranked, game.name, game.year) === id)};
  });
  const diagnostics = [];
  const usualCards = recommend(catalog, profileOf(legacy), sessionOf(legacy));
  const withoutMechanicPreference = names(usualCards);
  if (fixture.id === 'shooter' && hasExtra) {
    for (const id of ['steam:270880', 'steam:312660', 'steam:552520']) {
      const position = ranked.findIndex(row => row.game.id === id);
      const {game, score, moodHits, parts:scoreParts} = ranked[position];
      const hits = Object.fromEntries(moodHits.map(hit => [hit.f, Number(hit.contribution.toFixed(3))]));
      diagnostics.push({name:game.name, rank:position + 1, score:Number(score.toFixed(3)),
        prior:Number(scoreParts.prior.toFixed(3)), hits, shootingInCatalog:Boolean(game.features['loop.shooting'])});
    }
  }
  return {case:fixture.id, depth, delivery, features:parts.map(part => part[1]), candidates:ranked.length,
    shortlist:rows.length, shown, withoutMechanicPreference, positions, diagnostics};
}

const result = [];
for (const fixture of cases) {
  const quick = await replay(fixture, 'standard', 'base');
  const matched = await replay(fixture, 'deep', 'base');
  const extended = await replay(fixture, 'deep', 'answer');
  assert.deepEqual(quick.shown, matched.shown);
  assert.deepEqual(quick.positions, matched.positions);
  const upfront = await replay(fixture, 'standard', 'upfront');
  assert.deepEqual(extended.shown, upfront.shown);
  assert.deepEqual(extended.positions, upfront.positions);
  result.push(quick, matched, extended, upfront);
}
console.log(JSON.stringify(result, null, 2));
