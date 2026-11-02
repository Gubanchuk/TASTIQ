// One scenario per pilot error (research raw/04, sections 8.1 and 10).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixtureCatalog, game, screenFixture } from './fixture.js';
import { searchItems } from '../src/core/catalog.js';
import { buildTaste, TASTE } from '../src/core/profile.js';
import { recommend, rankAll, whyNot, confidenceLabel, diversify } from '../src/core/recommend.js';
import { complaintChips, FIRST_PAGE, forkQuestion, likeChips, QUESTION_BUDGET, seedItems } from '../src/core/questions.js';
import { COMPLAINT_BY_FEATURE, FEATURE_BY_ID } from '../src/aspects/games.js';
import { GAMES_DICT } from '../src/aspects/index.js';
import { buildFacts, renderExplanation, validateExplanation } from '../src/core/explain.js';
import { parseFreeText } from '../src/core/parse-text.js';

const catalog = fixtureCatalog();
const shown = (res) => [res.top, ...res.alternatives].filter(Boolean).map((g) => g.id);

test('error 4: a played game and its other editions never come back', () => {
  const profile = { answers: { 1: { reaction: 'love', reasons: ['world.living'] } } };
  const first = recommend(catalog, profile);
  assert.ok(!shown(first).includes('1'));
  assert.ok(!shown(first).includes('2'), 'remastered edition of a played game is removed too');

  const topId = first.top.id;
  const after = recommend(catalog, { ...profile, corrections: [{ id: topId, kind: 'played' }] });
  assert.ok(!shown(after).includes(topId));
  assert.equal(whyNot(catalog, topId, { ...profile, corrections: [{ id: topId, kind: 'played' }] }).removedBy.sieve, 2);
});

test('«Уже смотрел» without a rating is a weak like: features are inferred, nothing is confirmed, no contrast, no era', () => {
  const seen = buildTaste(catalog, { corrections: [{ id: '7', kind: 'played' }] }); // Red Dead Redemption 2
  assert.ok(seen.weights.get('world.living')?.w > 0, 'a seen title says what the person tends to choose');
  assert.ok(![...seen.weights.values()].some((x) => x.confirmed));
  const okay = buildTaste(catalog, { answers: { 7: { reaction: 'like' } } });
  assert.equal(seen.weights.get('world.living').w, okay.weights.get('world.living').w * TASTE.seenInfer / TASTE.okayInfer);
  // A complaint stays a complaint: a title merely seen is not a liked title that tolerates the feature.
  const complaint = { answers: { 5: { reaction: 'dislike', issues: [{ f: 'difficulty.hard' }] } } };
  const withSeen = buildTaste(catalog, { ...complaint, corrections: [{ id: '3', kind: 'played' }] }); // Kingdom Come is hard too
  assert.ok(withSeen.dislike.has('difficulty.hard'));
  assert.equal(buildTaste(catalog, { corrections: [{ id: '7', kind: 'played' }] }).oldestLiked, null);
  const rated = buildTaste(catalog, { corrections: [{ id: '7', kind: 'played', reaction: 'dislike' }] });
  assert.ok(!rated.weights.has('world.living'), '«не зашло» infers nothing');
});

test('error 2: one answer is capped and does not collapse the list into one aspect', () => {
  const profile = { answers: { 1: { reaction: 'love', reasons: ['world.living'] } } };
  const taste = buildTaste(catalog, profile);
  assert.ok(taste.weights.get('world.living').w <= TASTE.perAnswerCap);
  const res = recommend(catalog, profile);
  const aspects = new Set([res.top, ...res.alternatives].map((g) => g.mainAspect));
  assert.ok(aspects.size >= 2, `shown games share one main aspect: ${[...aspects]}`);
});

test('error 3: soft "not needed" penalizes, only an explicit hard stop filters', () => {
  const soft = { answers: { 3: { reaction: 'dislike', issues: [{ f: 'world.realistic', hard: false }] } } };
  const { ranked } = rankAll(catalog, soft);
  const rdr = ranked.find((r) => r.game.id === '7');
  assert.ok(rdr, 'realistic game stays among candidates');
  assert.ok(rdr.parts.penalty > 0);

  const hard = { answers: { 3: { reaction: 'dislike', issues: [{ f: 'world.realistic', hard: true }] } } };
  assert.equal(whyNot(catalog, '7', hard).removedBy.sieve, 4);
});

test('error 5: "tried a little" gives no negative weight by itself', () => {
  const taste = buildTaste(catalog, { answers: { 5: { reaction: 'tried' } } });
  assert.equal(taste.dislike.size, 0);
  assert.equal(taste.hardNo.size, 0);
  assert.ok(taste.consumed.has('5'));
  assert.ok(taste.lowExposure.has('5'));
});

test('error 7: platform and release filters run before scoring', () => {
  const res = recommend(catalog, {}, { platform: 'mac' });
  for (const id of shown(res)) assert.ok(catalog.byId.get(id).platforms.mac, `${id} is not on Mac`);
  const all = rankAll(catalog, {}, {}).ranked.map((r) => r.game.appid);
  assert.ok(!all.includes('8'), 'unreleased game is never a candidate');
});

test('error 8: one confirmed aspect is never a "strong hit"', () => {
  const profile = { answers: { 1: { reaction: 'love', reasons: ['world.living'] } } };
  const res = recommend(catalog, profile);
  assert.notEqual(res.top.label, 'strong');
  const two = recommend(catalog, { answers: { 1: { reaction: 'love', reasons: ['world.living', 'characters.memorable'] } } });
  assert.equal(two.top.id, '7');
  assert.ok(['strong', 'likely'].includes(two.top.label));
});

test('error 1: features of a loved game are weak unless confirmed; contrast cancels shared ones', () => {
  const profile = { answers: { 1: { reaction: 'love' }, 5: { reaction: 'dislike' } } };
  const taste = buildTaste(catalog, profile);
  for (const [, v] of taste.weights) assert.ok(v.w <= TASTE.inferredCap);
  assert.ok(!taste.weights.has('tone.dark'), 'dark tone is shared with a disliked game, so it explains nothing');
  assert.ok(!taste.weights.has('world.fantasy'));
  assert.ok(taste.weights.has('story.central'));
});

test('error 1: many unconfirmed likes never outweigh one confirmed reason', () => {
  const answers = Object.fromEntries([1, 3, 7, 9, 10].map((id) => [id, { reaction: 'love' }]));
  answers[12] = { reaction: 'love', reasons: ['loop.puzzles'] };
  const taste = buildTaste(catalog, { answers });
  assert.ok(taste.weights.get('freedom.open_world').w < taste.weights.get('loop.puzzles').w);
});

test('error 6: fork questions stop at the budget', () => {
  const { ranked, taste } = rankAll(catalog, { answers: { 1: { reaction: 'like' } } });
  assert.equal(forkQuestion(ranked[0], ranked[1], taste, catalog, QUESTION_BUDGET), null);
});

test('mood is session-only and never reaches the profile', () => {
  const profile = { answers: { 1: { reaction: 'love', reasons: ['world.living'] } } };
  const a = buildTaste(catalog, profile);
  const relaxed = recommend(catalog, profile, { moods: ['relax'] });
  const b = buildTaste(catalog, profile);
  assert.deepEqual([...a.weights.keys()], [...b.weights.keys()]);
  assert.equal(recommend(catalog, {}, { moods: ['relax'] }).top.id, '4');
  assert.ok(relaxed.taste.confirmed.every((x) => x.f === 'world.living'));
});

test('playing with a friend requires co-op (sieve 5, session only)', () => {
  const res = recommend(catalog, {}, { moods: ['friend'] });
  for (const id of shown(res)) assert.ok(catalog.byId.get(id).features['social.coop']);
});

test('quality floor removes badly made games (sieve 3)', () => {
  assert.equal(whyNot(catalog, '9', {}).removedBy.sieve, 3);
});

test('explanations cite only existing facts and always show risks', () => {
  const profile = { answers: { 1: { reaction: 'love', reasons: ['world.living', 'story.central'] } } };
  const res = recommend(catalog, profile);
  for (const g of [res.top, ...res.alternatives]) {
    assert.ok(validateExplanation(g.explanation, g.facts).ok);
    assert.ok(g.explanation.reasons.length > 0);
  }
  const kcd = whyNot(catalog, '3', profile);
  assert.ok(kcd.rank, 'Kingdom Come is a candidate');

  const fake = { reasons: [{ text: 'made up', factIds: ['match:invented'] }], risks: [], info: [] };
  assert.equal(validateExplanation(fake, [{ id: 'risk:flaw:combat.clunky', type: 'risk_flaw' }]).ok, false);
});

test('flaws found in reviews show up as risks', () => {
  const { ranked, taste } = rankAll(catalog, { answers: { 7: { reaction: 'love', reasons: ['world.realistic'] } } });
  const kcd = ranked.find((r) => r.game.id === '3');
  const text = renderExplanation(buildFacts(kcd.game, kcd, taste, catalog), catalog);
  assert.ok(text.risks.some((r) => r.factIds.includes('risk:flaw:combat.clunky')));
});

test('confidence label rules', () => {
  const detail = (matches, penalties = []) => ({ matches, penalties });
  const m = (f, r = 0.9) => ({ f, r, c: 0.8, confirmed: true });
  assert.equal(confidenceLabel(detail([m('a'), m('b')]), 0.9), 'strong');
  assert.equal(confidenceLabel(detail([m('a'), m('b')]), 0.2), 'likely', 'the belief is not on the leader');
  assert.equal(confidenceLabel(detail([m('a'), m('b')], [{ r: 0.6 }]), 0.9), 'likely', 'hits a dislike');
  assert.equal(confidenceLabel(detail([{ f: 'a', r: 0.9, c: 0.8, confirmed: false }]), 0.5), 'try');
});

test('seed screen covers different features and skips answered games', () => {
  const seeds = seedItems(catalog, { answered: ['1'], n: 6, seed: 42 });
  assert.equal(seeds.length, 6);
  assert.ok(!seeds.some((g) => g.work === 'witcher 3'));
});

test('the first seed page: among the best known titles, by coverage, the same for every seed, best known first', () => {
  const page = seedItems(catalog, { n: 4, seed: 1, first: true });
  assert.deepEqual(seedItems(catalog, { n: 4, seed: 99, first: true }).map((g) => g.id), page.map((g) => g.id), 'no randomness');
  assert.equal(new Set(page.map((g) => g.work ?? g.id)).size, page.length, 'one per work');
  assert.deepEqual(page.map((g) => g.popularity), [...page].map((g) => g.popularity).sort((a, b) => b - a), 'best known first');
  const before = FIRST_PAGE.pool;
  try {
    FIRST_PAGE.pool = 3; // a small pool: the page comes only from the three best known titles
    const top3 = catalog.items.filter((g) => g.released && g.quality >= catalog.domain.qualityFloor).sort((a, b) => b.popularity - a.popularity).slice(0, 3).map((g) => g.id);
    assert.ok(seedItems(catalog, { n: 4, first: true }).every((g) => top3.includes(g.id)));
  } finally {
    FIRST_PAGE.pool = before;
  }
  const coop = seedItems(catalog, { genres: ['social.coop'], n: 2, first: true });
  assert.ok(coop.some((g) => g.features['social.coop']?.r >= 0.5), 'tonight\'s titles are on it');
});

test('title search understands Russian names', () => {
  assert.equal(searchItems(catalog, 'ведьмак 3')[0].id, '1');
  assert.equal(searchItems(catalog, 'portal')[0].id, '12');
});

test('free text becomes candidate chips with polarity and strength', () => {
  const a = parseFreeText('люблю живой мир, но ненавижу гринд', GAMES_DICT);
  assert.deepEqual(a.positive.map((x) => x.f), ['world.living']);
  assert.deepEqual(a.negative.map((x) => x.f), ['progression.grind']);
  assert.ok(parseFreeText('хочу без стресса', GAMES_DICT).positive.some((x) => x.f === 'tension.low'));
  const hard = parseFreeText('не хочу хорроров в любом виде', GAMES_DICT);
  assert.ok(hard.negative.some((x) => x.f === 'tone.creepy' && x.hard));
  assert.ok(!parseFreeText('просто красивая картинка', GAMES_DICT).positive.some((x) => x.f === 'loop.cards'));
});

test('"не моё" asks what went wrong, not the same questions as "обожаю"', () => {
  for (const game of catalog.items) {
    const like = likeChips(game, catalog);
    const { complaints, categories } = complaintChips(game, catalog, 'dislike');
    // Every dislike answer is a complaint or a kind of game; "не понравилось из-за живого мира" is impossible.
    for (const c of complaints) assert.ok(COMPLAINT_BY_FEATURE.has(c.f), `${c.f} is not a complaint`);
    for (const c of categories) assert.ok(FEATURE_BY_ID.get(c.f).category, `${c.f} is not a category`);
    assert.ok(!complaints.some((c) => c.f === 'world.living' || c.f === 'characters.memorable'));
    // Complaints are worded as complaints, never with the like label.
    for (const c of complaints) assert.ok(!like.some((l) => l.label === c.label));
    assert.ok(complaints.length >= 4, 'general complaints fit any game');
  }
  const souls = catalog.byId.get('5');
  assert.ok(complaintChips(souls, catalog).complaints.some((c) => c.f === 'difficulty.hard'));
  assert.ok(!complaintChips(catalog.byId.get('4'), catalog).complaints.some((c) => c.f === 'difficulty.hard'), 'no "too hard" for a cozy farm game');
});

test('"мало попробовал" asks why the game was dropped; "не было времени" changes nothing', () => {
  const { complaints } = complaintChips(catalog.byId.get('11'), catalog, 'tried');
  assert.ok(complaints.every((c) => COMPLAINT_BY_FEATURE.get(c.f).tried));
  const taste = buildTaste(catalog, { answers: { 11: { reaction: 'tried', notes: ['no_time'] } } });
  assert.equal(taste.dislike.size, 0);
});

test('"никогда" filters games where the feature is defining and penalizes where it is minor', () => {
  const hard = { answers: { 3: { reaction: 'dislike', issues: [{ f: 'difficulty.hard', hard: true }] } } };
  assert.equal(whyNot(catalog, '5', hard).removedBy.sieve, 4, 'difficulty is defining in Dark Souls (r 1.0)');
  const hades = rankAll(catalog, hard).ranked.find((r) => r.game.id === '6');
  assert.ok(hades, 'Hades (difficulty r 0.6) stays');
  assert.ok(hades.penalties.some((p) => p.f === 'difficulty.hard' && p.hard));
});

// Plan step 1 (research-vault/akinator-picker-2026-10/SUMMARY.md, section 6): engine fixes for the misses
// found by the persona runs (raw/persona-*.md).

test('a soft complaint does not count against a feature a liked title also has', () => {
  // Cinephile: "затянуто" about Transformers, while Stalker itself is draggy (r 0.34) and the target is too.
  const profile = { answers: { 1: { reaction: 'love' }, 5: { reaction: 'dislike', issues: [{ f: 'tone.dark', hard: false }] } } };
  assert.ok(!buildTaste(catalog, profile).dislike.has('tone.dark'), 'Witcher 3 (loved) is dark too: the complaint is about Dark Souls only');
  const elsewhere = { answers: { 12: { reaction: 'love' }, 5: { reaction: 'dislike', issues: [{ f: 'tone.dark', hard: false }] } } };
  assert.ok(buildTaste(catalog, elsewhere).dislike.has('tone.dark'), 'nothing the person likes is dark: the complaint stands');
});

test('a reason named for a liked title survives a complaint about the same feature elsewhere', () => {
  // Couple: "спецэффекты" is a reason for Inception and a complaint about Transformers.
  const taste = buildTaste(catalog, { answers: { 6: { reaction: 'love', reasons: ['difficulty.hard'] }, 5: { reaction: 'dislike', issues: [{ f: 'difficulty.hard', hard: false }] } } });
  assert.ok(taste.weights.get('difficulty.hard')?.confirmed);
});

test('"затянуто" does not count against slow titles when a liked title is slow', () => {
  // Cinephile: Stalker is slow (pace.slow r 1.0); "затянуто" about Transformers is not about slowness.
  const taste = buildTaste(catalog, { answers: { 7: { reaction: 'love' }, 11: { reaction: 'dislike', issues: [{ f: 'pace.draggy', hard: false }] } } });
  assert.ok(!taste.dislike.has('pace.draggy'));
});

test('one weak mention in a liked title does not cancel a complaint', () => {
  // Andrey: one RDR2 review mentions grind (r 0.33); his "гринд" about Diablo IV is still his taste.
  const withRpg = fixtureCatalog([game(16, 'Long RPG', { 'story.central': 1, 'progression.grind': 0.333 }, { popularity: 5 })]);
  const taste = buildTaste(withRpg, { answers: { 16: { reaction: 'love' }, 10: { reaction: 'dislike', issues: [{ f: 'progression.grind', hard: false }] } } });
  assert.ok(taste.dislike.has('progression.grind'));
});

test('"никогда" stays a hard stop even if a liked title has the feature', () => {
  const taste = buildTaste(catalog, { answers: { 6: { reaction: 'love' }, 5: { reaction: 'dislike', issues: [{ f: 'difficulty.hard', hard: true }] } } });
  assert.ok(taste.hardNo.has('difficulty.hard'));
});

test('fork answers are not reasons: one chip and two fork answers are never a strong hit', () => {
  // Lazy film runs: "Сильное попадание" after one chip and two random forks.
  const profile = { answers: { 1: { reaction: 'love', reasons: ['world.living'] } }, preferences: [{ f: 'characters.memorable' }, { f: 'story.central' }] };
  const res = recommend(catalog, profile);
  assert.notEqual(res.top.label, 'strong');
  assert.ok(res.taste.confirmed.some((x) => x.f === 'characters.memorable' && x.preference), 'the answer still shows in what the picker understood');
});

const rankedRows = (rows) => rows.map(([id, score, features]) => ({ score, game: { id, features: Object.fromEntries(Object.entries(features).map(([f, r]) => [f, { r, c: 1 }])) } }));

test('diversity never pushes out a title almost tied with the leader', () => {
  // Lena: New Girl was third by score, 8.6% below the leader, and lost its place to less similar titles.
  const rows = rankedRows([['A', 10, { x: 1, y: 1 }], ['B', 9.5, { x: 1, y: 1 }], ['C', 8, { z: 1 }], ['D', 0, { w: 1 }]]);
  assert.deepEqual(diversify(rows, 1).map((r) => r.game.id), ['A', 'B']);
});

test('among titles almost tied with the leader, diversity still prefers a different one', () => {
  const rows = rankedRows([['A', 10, { x: 1, y: 1 }], ['B', 9.6, { x: 1, y: 1 }], ['C', 9.5, { z: 1 }], ['D', 0, { w: 1 }]]);
  assert.deepEqual(diversify(rows, 1).map((r) => r.game.id), ['A', 'C']);
});

test('a game from the series of a played game is removed by sieve 2', () => {
  // Danya: Left 4 Dead (2008) offered to a fan of Left 4 Dead 2.
  const withSequel = fixtureCatalog([game(14, 'The Witcher 2', { 'world.living': 0.9, 'story.central': 1, 'world.fantasy': 1 }, { series: ['The Witcher'], popularity: 5 })]);
  const profile = { answers: { 1: { reaction: 'love', reasons: ['world.living'] } } };
  assert.equal(whyNot(withSequel, '14', profile).removedBy?.sieve, 2);
  assert.ok(whyNot(withSequel, '7', profile).rank, 'a game outside the series stays');
});

test('a quote from a negative review never confirms a plus', () => {
  // UX walkthrough: "Too many puzzles" with a thumb down under "ты отметил «головоломки»".
  const puzzle = game(15, 'Puzzle Box', { 'loop.puzzles': 1 }, { popularity: 5 });
  puzzle.features['loop.puzzles'].ev = [
    { id: 'r150', q: 'Too many puzzles', kind: 'review', thumb: 'down', hours: 3 },
    { id: 'r151', q: 'Clever puzzles', kind: 'review', thumb: 'up', hours: 12 },
  ];
  const withPuzzle = fixtureCatalog([puzzle]);
  const { ranked, taste } = rankAll(withPuzzle, { answers: { 12: { reaction: 'love', reasons: ['loop.puzzles'] } } });
  const r = ranked.find((x) => x.game.id === '15');
  const match = buildFacts(r.game, r, taste, withPuzzle).find((x) => x.id === 'match:loop.puzzles');
  assert.deepEqual(match.evidence.map((e) => e.id), ['r151']);
});

test('"анимация" is not a complaint about a cartoon, but stays one about a film', () => {
  const cartoons = screenFixture('cartoon');
  const films = screenFixture('film');
  assert.ok(!complaintChips(cartoons.byId.get('t1'), cartoons).categories.some((c) => c.f === 'format.animation'));
  assert.ok(complaintChips(films.byId.get('t1'), films).categories.some((c) => c.f === 'format.animation'));
});

test('time limits are hard: longer films and series are removed, unknown length stays', () => {
  const films = screenFixture('film');
  assert.equal(whyNot(films, 't2', {}, { maxRuntime: 120 }).removedBy?.sieve, 5);
  assert.ok(whyNot(films, 't1', {}, { maxRuntime: 120 }).rank);
  assert.ok(whyNot(films, 't3', {}, { maxRuntime: 120 }).rank, 'runtime unknown: not removed');
  const series = screenFixture('series');
  assert.equal(whyNot(series, 't2', {}, { maxEpisodes: 20 }).removedBy?.sieve, 5);
  assert.ok(whyNot(series, 't1', {}, { maxEpisodes: 20 }).rank);
});

test('«нормально» says less about taste than «обожаю»: what an okay title has is inferred weaker', () => {
  const loved = buildTaste(catalog, { answers: { 7: { reaction: 'love', reasons: [] } } }).weights.get('world.realistic').w;
  const okay = buildTaste(catalog, { answers: { 7: { reaction: 'like', reasons: [] } } }).weights.get('world.realistic').w;
  assert.ok(okay < loved / 2, `okay ${okay} vs loved ${loved}`);
  const named = buildTaste(catalog, { answers: { 7: { reaction: 'like', reasons: ['world.realistic'] } } }).weights.get('world.realistic');
  assert.ok(named.confirmed && named.w > loved, 'a reason named about an okay title still counts in full');
});

test('a strict focus (watching with kids) seeds only titles that fit it while there are enough of them', () => {
  const strict = seedItems(catalog, { genres: ['social.coop'], strict: true, n: 2, seed: 1 });
  assert.deepEqual(strict.map((g) => g.id).sort(), ['13', '4']);
  const loose = seedItems(catalog, { genres: ['social.coop'], strict: true, n: 4, seed: 1 });
  assert.equal(loose.length, 4, 'too few fitting titles: the page is filled with others');
});

test('a title typed in Russian letters finds the Latin name, one slip allowed', () => {
  const cat = fixtureCatalog([game(30, 'Diablo IV', { 'loop.looting': 1 }, { popularity: 5 }), game(31, 'Interstellar Odyssey', { 'world.space': 1 }, { popularity: 4 })]);
  assert.ok(searchItems(cat, 'портал 2').some((g) => g.id === '12'), '«портал 2» → Portal 2');
  assert.ok(searchItems(cat, 'дьябло').some((g) => g.id === '30'), '«дьябло» → Diablo IV');
  assert.equal(searchItems(cat, 'ведьмак 3')[0].id, '1', 'Russian names still come first');
  assert.ok(!searchItems(cat, 'дьябло').some((g) => g.id === '12'), 'no loose matches');
  assert.ok(searchItems(cat, 'интерстелар').some((g) => g.id === '31'), 'a letter missing in the middle is one slip too');
});
