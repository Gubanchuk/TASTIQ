import { test } from 'node:test';
import assert from 'node:assert/strict';
import { game, title, fixtureCatalog } from './fixture.js';
import { makeCatalog } from '../src/core/catalog.js';
import { rankQuestions, nextQuestion } from '../src/core/ask.js';
import { rankAll } from '../src/core/recommend.js';

const catalogOf = (items, domain = 'game') => makeCatalog({ items, df: {}, idf: {}, stats: {} }, domain);
const settledFacts = { popularity: 'mainstream', era: 'any' };

test('unrelated mechanics and art style do not become a forced taste choice', () => {
  const cat = catalogOf([
    ...[1, 2, 3].map(id => game(id, `Melee ${id}`, { 'loop.melee': 1 })),
    ...[4, 5, 6].map(id => game(id, `Pixel ${id}`, { 'aesthetic.pixel': 1 })),
  ]);
  assert.equal(rankQuestions(cat, {}, settledFacts, {}, { M: 3 }).questions.length, 0);
  assert.equal(nextQuestion(cat, {}, settledFacts, {}, { M: 3 }), null);
});

test('missing tension tags are not evidence of a relaxing alternative', () => {
  const cat = catalogOf([
    game(1, 'Tense A', { 'tension.high': 1 }), game(2, 'Tense B', { 'tension.high': 1 }),
    game(3, 'Unknown A', {}), game(4, 'Unknown B', {}),
  ]);
  assert.ok(!rankQuestions(cat, {}, settledFacts, {}, { M: 2 }).questions.some(q => q.id === 'lean:tension.high|tension.low'));
});

test('a saturated mood does not promise a leader change that the real ranking cannot make', () => {
  const cat = catalogOf([
    game(1, 'Tense leader', { 'world.fantasy': 1, 'tension.high': 1 }, { quality: 1, popularity: 10 }),
    game(2, 'Calm alternative', { 'world.fantasy': 1, 'tension.low': 1 }, { quality: 0.7, popularity: 0 }),
  ]);
  const session = { ...settledFacts, intent: { source: 'confirmed', wants: [{ f: 'world.fantasy', evidence: 'фэнтези' }] } };
  assert.equal(rankAll(cat, {}, session).ranked[0].game.id, '1');
  for (const [f, against] of [['tension.high', 'tension.low'], ['tension.low', 'tension.high']]) {
    assert.equal(rankAll(cat, {}, { ...session, leans: [{ f, against }] }).ranked[0].game.id, '1');
  }
  const q = rankQuestions(cat, {}, session, {}, { M: 1 }).questions.find(q => q.id === 'lean:tension.high|tension.low');
  assert.equal(q.changes, false);
  assert.equal(nextQuestion(cat, {}, session, {}, { M: 1 }), null);
});

test('known time avoids another session-duration question, without assuming total game length', () => {
  const cat = catalogOf([
    game(1, 'Short A', { 'session.short': 1, 'length.short': 1 }),
    game(2, 'Short B', { 'session.short': 1, 'length.short': 1 }),
    game(3, 'Long A', { 'session.long': 1, 'length.long': 1 }),
    game(4, 'Long B', { 'session.long': 1, 'length.long': 1 }),
  ]);
  const ids = session => rankQuestions(cat, {}, session, {}, { M: 2 }).questions.map(q => q.id);
  assert.ok(ids(settledFacts).includes('lean:session.short|session.long'));
  assert.ok(!ids({ ...settledFacts, minutes: 60 }).includes('lean:session.short|session.long'));
  assert.ok(ids({ ...settledFacts, minutes: 60 }).includes('lean:length.short|length.long'));
});

test('a title explicitly marked not played is not immediately asked about again', () => {
  const cat = fixtureCatalog();
  const profile = { answers: { 1: { reaction: 'love', reasons: ['world.living', 'freedom.open_world'] }, 4: { reaction: 'like' }, 13: { reaction: 'like' } } };
  const first = nextQuestion(cat, profile, {}, {}, { M: 99 });
  assert.equal(first.kind, 'guess');
  profile.answers[first.id.slice('guess:'.length)] = { reaction: 'unknown' };
  assert.equal(nextQuestion(cat, profile, {}, {}, { M: 99 }), null);
});

test('episode question predicts removal of a 37-minute leader by either length choice', () => {
  const cat = catalogOf([
    { ...title('leader', 'Between lengths', 'series', {}, { runtime: 37 }), quality: 1, popularity: 10 },
    title('short', 'Short episodes', 'series', {}, { runtime: 25 }),
    title('long', 'Long episodes', 'series', {}, { runtime: 60 }),
  ], 'series');
  assert.equal(rankAll(cat, {}, settledFacts).ranked[0].game.id, 'leader');
  assert.equal(rankAll(cat, {}, { ...settledFacts, episodeLength: 'short' }).ranked[0].game.id, 'short');
  assert.equal(rankAll(cat, {}, { ...settledFacts, episodeLength: 'long' }).ranked[0].game.id, 'long');
  const q = rankQuestions(cat, {}, settledFacts, {}, { M: 1 }).questions.find(q => q.id === 'fact:episode');
  assert.equal(q.changes, true);
});
