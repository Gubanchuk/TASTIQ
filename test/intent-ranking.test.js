import { test } from 'node:test';
import assert from 'node:assert/strict';
import { game, screenFixture } from './fixture.js';
import { makeCatalog } from '../src/core/catalog.js';
import { computeIdf } from '../src/core/idf.js';
import { initialState, reduce, sessionOf, profileOf, screen } from '../src/core/dialogue.js';
import { candidatesOf } from '../src/ai/pick.js';
import { describePerson } from '../src/ai/prompt.js';
import { rankQuestions } from '../src/core/ask.js';
import { rankAll } from '../src/core/recommend.js';

const items = [game(1, 'Знакомая история', { 'story.central': 1 }),
  game(2, 'Тихая история', { 'story.central': 1, 'tension.low': 1 }),
  game(3, 'Напряжённая история', { 'story.central': 1, 'tension.high': 1 })];
const catalog = makeCatalog({ items, ...computeIdf(items), stats: {} }, 'game');
const base = { ...initialState(), domain: 'game', step: 'anchors', answers: { 1: { reaction: 'love', reasons: ['story.central'] } } };
const evening = (feature, opposite) => {
  const note = `${feature} сегодня, ${opposite} не хочется`;
  return reduce({ ...base, situation: { ...base.situation, note } }, { type: 'confirm_intent', intent: { sourceText: note,
    wants: [{ f: feature, evidence: `${feature} сегодня` }], avoids: [{ f: opposite, evidence: `${opposite} не хочется` }], time: null,
  } }, { game: catalog });
};

test('the same taste, opposite evenings: retrieval changes before AI without rewriting taste', () => {
  const calm = evening('tension.low', 'tension.high'), thrill = evening('tension.high', 'tension.low');
  assert.deepEqual(profileOf(calm), profileOf(thrill));
  assert.equal(candidatesOf(catalog, calm, 1).rows[0].game.id, '2');
  assert.equal(candidatesOf(catalog, thrill, 1).rows[0].game.id, '3');
  assert.equal(rankAll(catalog, profileOf(calm), sessionOf(calm)).ranked.length, 2, 'a soft avoid is not a hard stop');
  assert.match(describePerson(calm, catalog), /Подтверждено на сегодня/);
});

test('adaptive questions do not repeat a pair already resolved by confirmed words', () => {
  const before = rankQuestions(catalog, profileOf(base), sessionOf(base), {}, { M: 1 });
  assert.ok(before.questions.some((q) => q.id.includes('tension.high|tension.low')));
  const calm = evening('tension.low', 'tension.high');
  const after = rankQuestions(catalog, profileOf(calm), sessionOf(calm), {}, { M: 1 });
  assert.ok(!after.questions.some((q) => q.options.some((o) => ['tension.high', 'tension.low'].includes(o.value))));
});

test('explicit film minutes constrain known runtime and keep unknown distinct', () => {
  const film = screenFixture('film'), note = 'Сегодня есть 100 минут';
  const state = reduce({ ...initialState(), domain: 'film', step: 'anchors', situation: { note } }, { type: 'confirm_intent', intent: {
    sourceText: note, wants: [], avoids: [], time: { minutes: 100, evidence: '100 минут' },
  } }, { film });
  const ids = candidatesOf(film, state).ranked.map((r) => r.game.id);
  assert.ok(ids.includes('t1')); assert.ok(ids.includes('t3')); assert.ok(!ids.includes('t2'));
});

test('rejecting every proposal reaches AI and does not claim the raw note was handled by the engine', () => {
  const state = reduce({ ...base, situation: { ...base.situation, note: 'Я устал' } }, { type: 'confirm_intent', intent: {
    sourceText: 'Я устал', wants: [], avoids: [], time: null,
  } }, { game: catalog });
  assert.match(describePerson(state, catalog), /не подтвердил ни одного/);
  assert.match(describePerson(state, catalog), /не восстанавливай/i);
  assert.ok(screen({ ...state, step: 'result' }, { game: catalog }).result.uncheckedContext.includes('пожелание на вечер'));
});
