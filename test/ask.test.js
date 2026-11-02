// Adaptive questions after the fixed screens (plan step 4): asked only when the answer splits the leaders,
// never on a feature too few candidates have, never past the limit, and not at all when the leader is clear.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixtureCatalog, game } from './fixture.js';
import { ASK, nextQuestion, rankQuestions } from '../src/core/ask.js';
import { belief } from '../src/core/belief.js';
import { confidenceLabel, rankAll } from '../src/core/recommend.js';
import { priorOf } from '../src/core/score.js';
import { checkSieves } from '../src/core/sieves.js';
import { screenFixture } from './fixture.js';

// Popular open-world games that differ only in how tense they are: after «за живой мир» they lead as near ties.
const open = { 'freedom.open_world': 1, 'world.living': 1 };
const tense = (id, name) => game(id, name, { ...open, 'tension.high': 1 }, { popularity: 6.5 });
const calm = (id, name) => game(id, name, { ...open, 'tension.low': 1 }, { popularity: 6.5 });
// A loved title with nothing but these two features, so nothing else is inferred from it.
const seed = game(19, 'Open Seed', open, { popularity: 3 });
const catalog = fixtureCatalog([seed, tense(20, 'Tense A'), tense(21, 'Tense B'), tense(22, 'Tense C'), calm(23, 'Calm A'), calm(24, 'Calm B'), calm(25, 'Calm C')]);
const profile = { answers: { 19: { reaction: 'love', reasons: ['world.living', 'freedom.open_world'] } } };
const none = { asked: [], shown: [] };

test('a question about tonight is asked when its answer splits the near-tied leaders', () => {
  const q = nextQuestion(catalog, profile, {}, none, { M: 3 });
  assert.equal(q.kind, 'lean');
  assert.equal(q.id, 'lean:tension.high|tension.low');
  assert.deepEqual(q.options.map((o) => o.value), ['tension.high', 'tension.low']);
  assert.ok(q.gain > 0);
});

test('a feature fewer than M leaders have is never asked about', () => {
  const q = nextQuestion(catalog, profile, {}, none, { M: 5 }); // tension.low is in 4 leaders (Calm A–C, Stardew)
  assert.notEqual(q?.id, 'lean:tension.high|tension.low');
});

test('a question already asked is not asked again, and the limit holds', () => {
  const again = nextQuestion(catalog, profile, {}, { asked: ['lean:tension.high|tension.low'], shown: [] }, { M: 3 });
  assert.notEqual(again?.id, 'lean:tension.high|tension.low');
  const asked = Array.from({ length: ASK.max }, (_, i) => `x:${i}`);
  assert.equal(nextQuestion(catalog, profile, {}, { asked, shown: [] }, { M: 3 }), null);
});

test('a clear leader is shown without questions', () => {
  const clear = fixtureCatalog([game(30, 'Only One', { 'loop.puzzles': 1, 'humor.funny': 1, 'tone.cozy': 1, 'aesthetic.stylized': 1 }, { popularity: 3 })]);
  const p = { answers: { 12: { reaction: 'love', reasons: ['loop.puzzles', 'humor.funny'] }, 4: { reaction: 'love', reasons: ['tone.cozy'] }, 6: { reaction: 'love', reasons: ['aesthetic.stylized'] } } };
  const { ranked } = rankAll(clear, p);
  assert.equal(ranked[0].game.id, '30');
  assert.ok(belief(ranked.map((r) => r.score))[0] >= ASK.pStop, 'the belief is on the leader');
  assert.equal(nextQuestion(clear, p, {}, none, { M: 1 }), null);
});

test('when about to show a leader as popular as what the person knows, ask if they have seen it', () => {
  const p = { answers: { 1: { reaction: 'love', reasons: ['world.living', 'freedom.open_world'] }, 4: { reaction: 'like' }, 13: { reaction: 'like' } } };
  const q = nextQuestion(fixtureCatalog(), p, {}, none, { M: 99 });
  assert.equal(q.kind, 'guess');
  const leader = rankAll(fixtureCatalog(), p).ranked[0].game.id;
  assert.equal(q.id, `guess:${leader}`);
  assert.deepEqual(q.options.map((o) => o.value), ['no', 'like', 'dislike']);
  assert.equal(nextQuestion(fixtureCatalog(), p, {}, { asked: [q.id], shown: [] }, { M: 99 }), null, 'asked once');
});

test('«чего ещё не видел» moves less popular titles up; «о чём все говорят» the popular ones', () => {
  const popular = catalog.byId.get('1');
  const quiet = catalog.byId.get('11');
  const gap = (session) => priorOf(popular, catalog, session) - priorOf(quiet, catalog, session);
  assert.ok(gap({ popularity: 'niche' }) < gap({}));
  assert.ok(gap({ popularity: 'mainstream' }) > gap({}));
});

test('«только законченные» removes running series, unknown status stays', () => {
  const series = screenFixture('series');
  const taste = { consumed: new Set(), rejected: new Set(), hardNo: new Map(), playedSeries: new Set() };
  const item = (status) => ({ ...series.byId.get('t1'), status });
  assert.equal(checkSieves(item('Running'), taste, { onlyEnded: true }, series)?.sieve, 5);
  assert.equal(checkSieves(item('Ended'), taste, { onlyEnded: true }, series), null);
  assert.equal(checkSieves(item(null), taste, { onlyEnded: true }, series), null);
});

test('«сильное попадание» needs the belief on the leader, not only two reasons', () => {
  const detail = { matches: [{ f: 'a', confirmed: true, r: 1, c: 1 }, { f: 'b', confirmed: true, r: 1, c: 1 }], penalties: [] };
  assert.equal(confidenceLabel(detail, 0.9), 'strong');
  assert.equal(confidenceLabel(detail, 0.2), 'likely');
});

test('a lean is tonight only: it boosts the chosen side for this session and never reaches the profile', () => {
  const lean = { leans: [{ f: 'tension.high', against: 'tension.low', label: 'адреналин' }] };
  const { ranked } = rankAll(catalog, profile, lean);
  assert.match(ranked[0].game.name, /Tense/);
  const hit = ranked[0].moodHits.find((h) => h.f === 'tension.high');
  assert.deepEqual(hit.why, ['адреналин']);
  assert.ok(!rankAll(catalog, profile, {}).taste.weights.has('tension.high'));
});

test('today questions come from authored choices, not arbitrary feature combinations', () => {
  const { questions } = rankQuestions(catalog, profile, {}, none, { M: 1 });
  assert.ok(questions.some(q => q.kind === 'lean'));
  assert.ok(!questions.some(q => q.kind === 'pair'));
  for (const q of questions.filter((x) => x.kind === 'lean')) {
    assert.ok(catalog.dict.pairs.some(x => q.id === `lean:${x.a}|${x.b}`), q.id);
  }
});

test('series: «серии по 20–30 минут или по часу» cuts by episode length; unknown length stays', () => {
  const series = screenFixture('series');
  const taste = { consumed: new Set(), rejected: new Set(), hardNo: new Map(), playedSeries: new Set() };
  const item = (runtime) => ({ ...series.byId.get('t1'), runtime });
  assert.equal(checkSieves(item(60), taste, { episodeLength: 'short' }, series)?.sieve, 5);
  assert.equal(checkSieves(item(22), taste, { episodeLength: 'short' }, series), null);
  assert.equal(checkSieves(item(22), taste, { episodeLength: 'long' }, series)?.sieve, 5);
  assert.equal(checkSieves(item(null), taste, { episodeLength: 'long' }, series), null);
});

test('after «всё равно» on a pair its features are not asked again in another pair', () => {
  const first = nextQuestion(catalog, profile, {}, none, { M: 1 });
  const sides = first.id.slice(first.id.indexOf(':') + 1).split('|');
  const { questions } = rankQuestions(catalog, profile, {}, { asked: [first.id], shown: [] }, { M: 1 });
  for (const q of questions.filter((x) => x.kind === 'pair' || x.kind === 'lean')) {
    assert.ok(!sides.some((f) => q.id.split(/[:|]/).includes(f)), `${q.id} repeats ${first.id}`);
  }
});

test('a ranking computed once can be reused: the same question comes out', () => {
  const rank = rankAll(catalog, profile, {});
  assert.deepEqual(nextQuestion(catalog, profile, {}, { ...none, rank }, { M: 3 }), nextQuestion(catalog, profile, {}, none, { M: 3 }));
  const other = rankAll(catalog, { answers: {} }, {});
  assert.notDeepEqual(nextQuestion(catalog, profile, {}, { ...none, rank: other }, { M: 3 }), nextQuestion(catalog, profile, {}, none, { M: 3 }), 'the passed ranking is what is used');
});

test('tonight is checked against the leader: asked when the leader carries one side, even when the taste is clear', () => {
  const tenseLeader = fixtureCatalog([seed, tense(20, 'Tense A'), tense(21, 'Tense B'), tense(22, 'Tense C'), tense(23, 'Tense D'), tense(24, 'Tense E'),
    game(30, 'Quiet One', { ...open, 'tension.low': 1, 'tone.cozy': 1 }, { popularity: 3 }), ...[31, 32, 33, 34].map((id) => game(id, `Calm ${id}`, { ...open, 'tension.low': 1 }, { popularity: 3 }))]);
  const q = nextQuestion(tenseLeader, profile, {}, none, { M: 5, pStop: 0 });
  assert.equal(q?.id, 'lean:tension.high|tension.low', 'pStop 0: the taste is «clear», tonight still is not');
  const calmLeader = fixtureCatalog([seed, ...[20, 21, 22, 23, 24].map((id) => game(id, `Plain ${id}`, open, { popularity: 6.5 })),
    ...[30, 31, 32, 33, 34].map((id) => tense(id, `Tense ${id}`)).map((g) => ({ ...g, popularity: 3 })), ...[40, 41, 42, 43, 44].map((id) => calm(id, `Calm ${id}`)).map((g) => ({ ...g, popularity: 3 }))]);
  const r = nextQuestion(calmLeader, profile, {}, none, { M: 5, pStop: 0 });
  assert.notEqual(r?.id, 'lean:tension.high|tension.low', 'with a clear leader and no known pole, there is no supported mood risk to check');
});

test('games get «свежее или можно старое» once years are known; an unknown year is not «old»', () => {
  const old = [40, 41, 42].map((id) => ({ ...game(id, `Old ${id}`, open, { popularity: 6.5 }), year: 2005 }));
  const unknown = [43, 44, 45].map((id) => ({ ...game(id, `Unknown ${id}`, open, { popularity: 6.5 }), year: null }));
  const ids = (cat) => rankQuestions(cat, profile, {}, none, { M: 3 }).questions.map((q) => q.id);
  assert.ok(ids(fixtureCatalog([seed, ...old])).includes('fact:era'));
  assert.ok(!ids(fixtureCatalog([seed, ...unknown])).includes('fact:era'), 'three games without a year are not three old games');
});
