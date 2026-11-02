// Removing one card («Уже смотрел», «Не сейчас») keeps the others where they were and puts the engine's next pick in
// its place, so nothing the person did not touch moves, and the AI is not asked again.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fillPicks, removedIds, changesTaste } from '../src/server/public/shared/fill-picks.js';

const result = (ids, extra = {}) => ({ top: { id: ids[0] }, alternatives: ids.slice(1).map((id) => ({ id })), ...extra });
const ids = (r) => [r.top, ...r.alternatives].map((p) => p.id);

test('a new evaluation invalidates old AI choices; a plain seen mark keeps economical replacement', () => {
  const state = { corrections: [{ id: 'a', kind: 'played' }] };
  assert.equal(changesTaste({ type: 'rate_played', id: 'a', reaction: 'dislike' }, state), true);
  assert.equal(changesTaste({ type: 'rate_played', id: 'a', reaction: 'like' }, state), true);
  assert.equal(changesTaste({ type: 'played', id: 'b' }, state), false);
  assert.equal(changesTaste({ type: 'not_now', id: 'b' }, state), false);
  assert.equal(changesTaste({ type: 'rate_played', id: 'a', reaction: 'dislike' }, { corrections: [{ id: 'a', kind: 'played', reaction: 'dislike' }] }), false);
  assert.equal(changesTaste({ type: 'not_mine', id: 'a', issues: [{ f: 'tone.dark' }] }, state), true);
});

test('nothing removed: the same cards, but what was understood follows the latest answers', () => {
  const out = fillPicks(result(['a', 'b', 'c', 'd'], { ai: { understood: 'x' }, taste: 'old' }), result(['e', 'a', 'f', 'g'], { taste: 'new' }), new Set());
  assert.deepEqual(ids(out), ['a', 'b', 'c', 'd']);
  assert.equal(out.ai.understood, 'x');
  assert.equal(out.taste, 'new');
});

test('the engine\'s first new pick takes the removed card\'s place, the others do not move', () => {
  const engine = result(['a', 'e', 'c', 'f'], { taste: 'new', considered: 9 });
  const out = fillPicks(result(['a', 'b', 'c', 'd'], { ai: { understood: 'x' }, taste: 'old' }), engine, new Set(['b']));
  assert.deepEqual(ids(out), ['a', 'e', 'c', 'd']);
  assert.equal(out.ai.understood, 'x', 'what the model understood stays');
  assert.equal(out.taste, 'new', 'what was understood about the person follows the latest answers');
  assert.equal(out.considered, 9);
});

test('a removed leader is replaced in place too, and a removed title never comes back from the engine', () => {
  const out = fillPicks(result(['a', 'b', 'c']), result(['x', 'b', 'y', 'c']), new Set(['a', 'x']));
  assert.deepEqual(ids(out), ['y', 'b', 'c']);
});

test('no spare pick: the place is dropped; nothing left: the engine\'s result', () => {
  assert.deepEqual(ids(fillPicks(result(['a', 'b']), result(['b']), new Set(['a']))), ['b']);
  const engine = result(['z']);
  assert.equal(fillPicks(result(['a']), { top: null, alternatives: [] }, new Set(['a'])).top, null);
  assert.equal(fillPicks(result(['a']), engine, new Set(['a'])).top.id, 'z');
});

test('the model\'s spare picks fill the place before the engine\'s, in their order, and are used up', () => {
  const shown = result(['a', 'b', 'c', 'd'], { spares: [{ id: 's1' }, { id: 's2' }] });
  let out = fillPicks(shown, result(['e', 'f']), new Set(['b']));
  assert.deepEqual(ids(out), ['a', 's1', 'c', 'd']);
  assert.deepEqual(out.spares.map((p) => p.id), ['s2']);
  out = fillPicks(out, result(['e', 'f']), new Set(['b', 'a', 'c']));
  assert.deepEqual(ids(out), ['s2', 's1', 'e', 'd'], 'spares run out, then the engine');
  assert.deepEqual(out.spares, []);
});

test('«Уже смотрел» takes the rest of that series off the screen; «Не сейчас» does not', () => {
  const witcher = (id) => ({ id, series: ['The Witcher'] });
  const shown = { top: witcher('w3'), alternatives: [{ id: 'b' }, witcher('w2'), { id: 'd' }] };
  const engine = result(['b', 'x', 'y', 'd']);
  assert.deepEqual(ids(fillPicks(shown, engine, new Set(['w3']), new Set(['w3']))), ['x', 'b', 'y', 'd']);
  assert.deepEqual(ids(fillPicks(shown, engine, new Set(['w3']))), ['x', 'b', 'w2', 'd']);
  const spareOfSeries = { ...shown, spares: [witcher('w1'), { id: 's' }] };
  assert.deepEqual(ids(fillPicks(spareOfSeries, engine, new Set(['w3']), new Set(['w3']))), ['s', 'b', 'x', 'd'], 'a spare of the series is skipped too');
});

test('removed: «Уже смотрел» marks and «Не сейчас», not other corrections', () => {
  const state = { corrections: [{ id: 'a', kind: 'played' }, { id: 'b', kind: 'not_mine' }], session: { notNow: ['c'] } };
  assert.deepEqual([...removedIds(state)].sort(), ['a', 'c']);
});
