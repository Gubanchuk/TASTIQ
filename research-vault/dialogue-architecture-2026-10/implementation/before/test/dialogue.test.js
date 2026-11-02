// The dialogue asks one thing per screen: facts about tonight first, then titles the person knows, then
// «за что» and «что не так» about a few of them, then hard stops (plan step 3), then up to three questions
// chosen by what splits the leaders (plan step 4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixtureCatalog, game, screenFixture } from './fixture.js';
import { initialState, profileOf, reduce, screen, sessionOf, MAX_WHY, MAX_WHY_NOT } from '../src/core/dialogue.js';
import { ASK } from '../src/core/ask.js';

const catalogs = { game: fixtureCatalog(), film: screenFixture('film'), series: screenFixture('series') };
const go = (state, action, cats = catalogs) => reduce(state, action, cats);
const marks = (pairs) => pairs.map(([id, reaction]) => ({ id, reaction }));
// Marks on the anchors screen; with fewer than two known titles the extra page is passed with nothing more marked.
const react = (state, action, cats = catalogs) => {
  if (state.step === 'context') state=go(state,{type:'skip'},cats);
  const s = go(state, action, cats);
  return s.step === 'anchors' ? go(s, { type: 'react', marks: [] }, cats) : s;
};
// After the stops the picker may ask; «всё равно» on every question leads to the result.
const toResult = (s, cats = catalogs) => {
  while (screen(s, cats).step === 'ask') s = go(s, { type: 'skip' }, cats);
  return s;
};
const resultOf = (s, cats = catalogs) => screen(toResult(s, cats), cats).result;
const toAnchors = (cats = catalogs) => {
  let s = go(initialState(), { type: 'choose', value: 'game' }, cats);
  s = go(s, { type: 'choose', value: 'windows' }, cats);
  return go(s, { type: 'choose', value: 'solo' }, cats);
};

test('a full pass for a game: domain → platform → company → anchors → why ×2 → why not → stops → result', () => {
  let s = initialState();
  const steps = [screen(s, catalogs).step];
  const next = (action) => {
    s = go(s, action);
    steps.push(screen(s, catalogs).step);
    return screen(s, catalogs);
  };
  next({ type: 'choose', value: 'game' });
  const company = next({ type: 'choose', value: 'windows' });
  assert.deepEqual(company.options.map((o) => o.value), ['solo', 'friend', 'group']);

  const anchors = next({ type: 'choose', value: 'solo' });
  assert.ok(anchors.items.length > 0 && anchors.items.length <= 8, 'a short list, not everything at once');
  assert.deepEqual(anchors.reactions.map((r) => r.value), ['love', 'like', 'dislike', 'unknown']);

  const why1 = next({ type: 'react', marks: marks([['4', 'like'], ['1', 'love'], ['7', 'like'], ['5', 'dislike'], ['12', 'unknown']]) });
  assert.equal(why1.step, 'why');
  assert.match(why1.title, /Ведьмак/, 'a loved title is asked about first');
  assert.equal(why1.pair.length, 2, '«за что» starts as a choice between two');
  assert.notEqual(why1.pair[0].value, why1.pair[1].value);
  assert.ok(why1.pair.every((p) => why1.options.some((o) => o.value === p.value)), '«ещё…» opens the rest of the chips');

  const why2 = next({ type: 'reasons', values: [why1.pair[0].value] });
  assert.equal(s.answers['1'].reaction, 'love', '«обожаю» from the card stays');
  assert.deepEqual(s.answers['1'].reasons, [why1.pair[0].value]);
  assert.equal(why2.step, 'why');
  assert.match(why2.title, /Stardew/);

  const whyNot = next({ type: 'skip' });
  assert.equal(whyNot.step, 'why_not');
  assert.ok(whyNot.options.some((o) => o.value === 'difficulty.hard'), 'dislike asks for complaints');
  assert.ok(!whyNot.options.some((o) => o.value === 'world.living'), 'never "не понравилось из-за живого мира"');

  const stops = next({ type: 'issues', issues: [{ f: 'difficulty.hard', hard: true }] });
  assert.equal(stops.step, 'stops');
  assert.ok(stops.options.some((o) => o.value === 'social.pvp'));

  let result = next({ type: 'stops', values: ['social.pvp'] });
  while (result.step === 'ask') result = next({ type: 'skip' });
  assert.ok(result.result.top);
  assert.ok(!['1', '4', '5', '7'].includes(result.result.top.id), 'nothing already answered');
  assert.deepEqual(steps.slice(0, 8), ['domain', 'platform', 'company', 'anchors', 'why', 'why', 'why_not', 'stops']);
  assert.ok(steps.length - 9 <= ASK.max && steps.slice(8, -1).every((x) => x === 'ask') && steps.at(-1) === 'result');
  assert.equal(s.answers['12'].reaction, 'unknown', '«не играл» is kept, so the title is not asked again');
});

test('«за что» is asked about at most MAX_WHY titles, loved ones first; «что не так» about MAX_WHY_NOT', () => {
  assert.equal(MAX_WHY, 2);
  assert.equal(MAX_WHY_NOT, 1);
  let s = go(toAnchors(), { type: 'react', marks: marks([['3', 'like'], ['6', 'like'], ['1', 'love'], ['4', 'like'], ['5', 'dislike'], ['11', 'dislike']]) });
  const asked = [];
  while (screen(s, catalogs).step === 'why') { asked.push(s.liked[s.whyIndex]); s = go(s, { type: 'skip' }); }
  assert.deepEqual(asked, ['1', '3']);
  assert.equal(s.answers['6'].reaction, 'like', 'the rest are recorded as liked');
  let whyNot = 0;
  while (screen(s, catalogs).step === 'why_not') { whyNot++; s = go(s, { type: 'skip' }); }
  assert.equal(whyNot, 1);
  assert.equal(screen(s, catalogs).step, 'stops');
});

test('nothing marked still goes on, straight to the stops', () => {
  const s = react(toAnchors(), { type: 'react', marks: [] });
  assert.equal(screen(s, catalogs).step, 'stops');
});

test('fewer than two known titles: one more page, then the marks of both pages count', () => {
  const first = screen(toAnchors(), catalogs);
  let s = go(toAnchors(), { type: 'react', marks: marks([['1', 'love'], ['12', 'unknown']]), shownIds: first.items.map((x) => x.id) });
  const extra = screen(s, catalogs);
  assert.equal(extra.step, 'anchors');
  assert.ok(extra.extra && extra.title !== first.title, 'the extra page says why it is shown');
  assert.ok(!extra.items.some((x) => first.items.some((y) => y.id === x.id)), 'other titles than on the first page');
  s = go(s, { type: 'react', marks: marks([['5', 'dislike']]) }); // the stand sends only the new marks
  assert.deepEqual([s.liked, s.disliked, s.step], [['1'], ['5'], 'why']);
  assert.equal(s.answers['12'].reaction, 'unknown');
  // Two known titles on the first page: no extra page.
  assert.equal(go(toAnchors(), { type: 'react', marks: marks([['1', 'love'], ['3', 'like']]) }).step, 'why');
  // The site sends all marks again on the extra page: nothing is doubled.
  s = go(go(toAnchors(), { type: 'react', marks: marks([['1', 'love']]) }), { type: 'react', marks: marks([['1', 'love'], ['3', 'like']]) });
  assert.deepEqual(s.liked, ['1', '3']);
});

test('answers kept from an earlier dialogue are reused, and only the rest is asked', () => {
  let s = go(toAnchors(), {
    type: 'react',
    marks: marks([['6', 'like'], ['1', 'love'], ['3', 'like'], ['5', 'dislike'], ['2', 'dislike']]),
    known: { 1: { reaction: 'love', reasons: ['world.living'] }, 3: { reaction: 'like', reasons: [] }, 5: { reaction: 'dislike', issues: [{ f: 'difficulty.hard', hard: true }, 'junk'] } },
  });
  assert.deepEqual(s.answers['1'], { reaction: 'love', reasons: ['world.living'], issues: [] }, 'a known answer is taken as is');
  assert.deepEqual(s.answers['5'], { reaction: 'dislike', issues: [{ f: 'difficulty.hard', hard: true }], badQuality: false });
  assert.deepEqual(s.liked, ['6', '3'], 'an empty known answer is asked again; the known one is not');
  assert.deepEqual(s.disliked, ['2']);
});

test('a full UI snapshot can clear all marks on the extra page, including after reload', () => {
  const first = go(toAnchors(), { type: 'react', marksMode: 'snapshot', marks: marks([['1', 'love'], ['12', 'unknown']]) });
  assert.equal(first.step, 'anchors');
  const restored = JSON.parse(JSON.stringify(first));
  const empty = go(restored, { type: 'react', marksMode: 'snapshot', marks: [] });
  assert.equal(empty.step, 'stops');
  assert.deepEqual(empty.answers, {});
  assert.deepEqual(empty.liked, []);
  assert.deepEqual(empty.disliked, []);
  assert.equal(first.answers['1'].reaction, 'love', 'the prior history snapshot is not mutated');
});

test('a replacement UI snapshot keeps only the current reactions, while stand delta mode remains additive', () => {
  const first = go(toAnchors(), { type: 'react', marksMode: 'snapshot', marks: marks([['1', 'love'], ['12', 'unknown']]) });
  const replaced = go(first, { type: 'react', marksMode: 'snapshot', marks: marks([['5', 'dislike']]) });
  assert.equal(replaced.step, 'why_not');
  assert.deepEqual(Object.keys(replaced.answers), ['5']);
  assert.deepEqual(replaced.disliked, ['5']);
  const appended = go(first, { type: 'react', marks: marks([['5', 'dislike']]) });
  assert.equal(appended.step, 'why');
  assert.deepEqual(Object.keys(appended.answers).sort(), ['1', '12', '5']);
});

test('a known answer of the other kind is ignored', () => {
  const s = react(toAnchors(), { type: 'react', marks: marks([['1', 'like']]), known: { 1: { reaction: 'dislike', issues: [{ f: 'difficulty.hard', hard: false }] } } });
  assert.equal(screen(s, catalogs).step, 'why');
  assert.equal(s.answers['1'].reaction, 'like');
});

test('«бросил» on «что не так» counts as tried, and the title is not offered again', () => {
  let s = react(toAnchors(), { type: 'react', marks: marks([['6', 'dislike']]) });
  assert.ok(screen(s, catalogs).tried, 'the screen offers «бросил»');
  s = go(s, { type: 'issues', issues: [{ f: 'difficulty.hard', hard: false }], tried: true });
  assert.equal(s.answers['6'].reaction, 'tried');
  const r = resultOf(go(s, { type: 'skip' }));
  assert.ok(![r.top, ...r.alternatives].some((x) => x.id === '6'));
});

test('a stop removes titles where it is defining', () => {
  const cats = { game: fixtureCatalog([game(14, 'Scary Witcher', { 'tone.creepy': 1, 'world.living': 1, 'story.central': 1 }, { popularity: 6 })]) };
  let s = react(toAnchors(cats), { type: 'react', marks: marks([['1', 'like']]) }, cats);
  s = go(s, { type: 'reasons', values: ['world.living', 'story.central'] }, cats);
  const free = resultOf(go(s, { type: 'skip' }, cats), cats);
  assert.ok([free.top, ...free.alternatives].some((x) => x.id === '14'), 'without the stop it is offered');
  const stopped = go(s, { type: 'stops', values: ['tone.creepy', 'not.a.stop'] }, cats);
  assert.deepEqual(stopped.stops, ['tone.creepy'], 'only stops the screen offers');
  const r = resultOf(stopped, cats);
  assert.ok(![r.top, ...r.alternatives].some((x) => x.id === '14'));
});

test('playing with friends keeps only games you can play together', () => {
  let s = go(initialState(), { type: 'choose', value: 'game' });
  s = go(go(s, { type: 'choose', value: 'windows' }), { type: 'choose', value: 'group' });
  const r = resultOf(go(react(s, { type: 'react', marks: [] }), { type: 'skip' }));
  for (const x of [r.top, ...r.alternatives]) assert.ok(['4', '13'].includes(x.id), `${x.name} is not for a group`);
});

test('films: time and company are facts about tonight, they go to the session', () => {
  let s = go(initialState(), { type: 'choose', value: 'film' });
  const time = screen(s, catalogs);
  assert.equal(time.step, 'time');
  assert.deepEqual(time.options.map((o) => o.value), ['short', 'two', 'any']);
  s = go(s, { type: 'choose', value: 'short' });
  const company = screen(s, catalogs);
  assert.equal(company.step, 'company');
  assert.deepEqual(company.options.map((o) => o.value), ['solo', 'pair', 'kids', 'group']);
  s = go(s, { type: 'choose', value: 'kids' });
  assert.equal(screen(s, catalogs).step, 'context');
  s=go(s,{type:'skip'});
  assert.equal(screen(s, catalogs).step, 'anchors');
  const session = sessionOf(s);
  assert.equal(session.maxRuntime, 95);
  assert.deepEqual(session.moods, ['family'], '«с детьми» requires family content in sieve 5');

  let solo = go(go(go(initialState(), { type: 'choose', value: 'film' }), { type: 'choose', value: 'short' }), { type: 'choose', value: 'solo' });
  const r = resultOf(go(react(solo, { type: 'react', marks: [] }), { type: 'skip' }));
  const ids = [r.top, ...r.alternatives].map((x) => x.id);
  assert.ok(!ids.includes('t2'), 'a 150-minute film is out when there are 95 minutes');
  assert.ok(ids.includes('t3'), 'unknown length is not a reason to drop a title');
});

test('series: «на сколько влезть» limits episodes or seasons; «не знаю» limits nothing', () => {
  const after = (value) => sessionOf(go(go(initialState(), { type: 'choose', value: 'series' }), value ? { type: 'choose', value } : { type: 'skip' }));
  assert.deepEqual(screen(go(initialState(), { type: 'choose', value: 'series' }), catalogs).options.map((o) => o.value), ['mini', 'season', 'long']);
  assert.equal(after('mini').maxEpisodes, 10);
  assert.equal(after('season').maxSeasons, 2);
  assert.deepEqual(after('long').moods, ['binge']);
  const none = after(null);
  assert.equal(none.maxEpisodes ?? none.maxSeasons ?? null, null);
  assert.deepEqual(none.moods, []);

  let s = go(go(go(initialState(), { type: 'choose', value: 'series' }), { type: 'choose', value: 'season' }), { type: 'choose', value: 'solo' });
  const r = resultOf(go(react(s, { type: 'react', marks: [] }), { type: 'skip' }));
  assert.ok(![r.top, ...r.alternatives].some((x) => x.id === 't2'), 'nine seasons are more than «сезон-другой»');
});

test('result actions recompute, and the profile can be corrected on the result', () => {
  let s = react(toAnchors(), { type: 'react', marks: marks([['1', 'love']]) });
  s = toResult(go(go(s, { type: 'reasons', values: ['world.living', 'characters.memorable'] }), { type: 'skip' }));
  const res = screen(s, catalogs).result;
  assert.ok(res.taste.confirmed.some((x) => x.f === 'world.living'), 'the result carries what was understood');
  const top = res.top.id;
  s = go(s, { type: 'played', id: top, reaction: 'like' });
  assert.notEqual(screen(s, catalogs).result.top.id, top);
  s = go(s, { type: 'remove', kind: 'reason', f: 'world.living' });
  assert.equal(screen(s, catalogs).step, 'result');
  assert.ok(!screen(s, catalogs).result.taste.confirmed.some((x) => x.f === 'world.living'));
});

test('«Уже смотрел» removes the card in one tap; the reaction after it replaces the mark, «Вернуть» takes it back', () => {
  let s = react(toAnchors(), { type: 'react', marks: marks([['1', 'love']]) });
  s = toResult(go(go(s, { type: 'reasons', values: ['world.living', 'characters.memorable'] }), { type: 'skip' }));
  const top = screen(s, catalogs).result.top.id;
  s = go(s, { type: 'played', id: top });
  assert.notEqual(screen(s, catalogs).result.top.id, top);
  s = go(s, { type: 'rate_played', id: top, reaction: 'like' });
  assert.deepEqual(s.corrections, [{ id: top, kind: 'played', reaction: 'like' }], 'one mark per title');
  assert.ok(profileOf(s).corrections.some((c) => c.id === top && c.reaction === 'like'));
  s = go(s, { type: 'unplayed', id: top });
  assert.deepEqual(s.corrections, []);
  assert.equal(screen(s, catalogs).result.top.id, top, 'the title comes back');
});

// Popular open-world games that differ only in how tense they are: after «за живой мир» they lead as near ties.
const open = { 'freedom.open_world': 1, 'world.living': 1 };
const moody = fixtureCatalog([game(19, 'Open Seed', open, { popularity: 3 })].concat([20, 21, 22, 23, 24].map((id) => game(id, `Tense ${id}`, { ...open, 'tension.high': 1 }, { popularity: 6.5 }))
  .concat([25, 26, 27, 28, 29].map((id) => game(id, `Calm ${id}`, { ...open, 'tension.low': 1 }, { popularity: 6.5 })))));
const toAsk = () => {
  const cats = { game: moody };
  let s = react(toAnchors(cats), { type: 'react', marks: marks([['19', 'love']]) }, cats);
  s = go(s, { type: 'reasons', values: ['world.living', 'freedom.open_world'] }, cats);
  return go(s, { type: 'skip' }, cats);
};

test('after the stops the picker asks what splits the leaders, one question per screen', () => {
  const cats = { game: moody };
  let s = toAsk();
  const q = screen(s, cats);
  assert.equal(q.step, 'ask');
  assert.equal(q.qid, 'lean:tension.high|tension.low');
  assert.deepEqual(q.options.map((o) => o.value), ['tension.high', 'tension.low']);
  s = go(s, { type: 'answer', qid: q.qid, value: 'tension.high' }, cats);
  assert.deepEqual(s.preferences, [], 'tonight is not taste: nothing goes to the profile');
  assert.deepEqual(sessionOf(s).leans, [{ f: 'tension.high', against: 'tension.low', label: 'адреналин' }]);
  assert.deepEqual(s.asked, [q.qid]);
  const r = resultOf(s, cats);
  assert.match(r.top.name, /Tense/);
});

test('«всё равно» changes nothing but marks the question asked', () => {
  const cats = { game: moody };
  const s = toAsk();
  const q = screen(s, cats);
  const after = go(s, { type: 'skip' }, cats);
  assert.deepEqual(profileOf(after), profileOf(s));
  assert.deepEqual(sessionOf(after), sessionOf(s));
  assert.deepEqual(after.asked, [q.qid]);
  assert.ok(after.step === 'result' || screen(after, cats).qid !== q.qid);
});
