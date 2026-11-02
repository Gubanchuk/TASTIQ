// Game length from playtime (src/pipeline/length-from-hours.js): only for story-led or linear games without PvP.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withLengthFromHours } from '../src/pipeline/length-from-hours.js';
import { buildTaste } from '../src/core/profile.js';
import { fixtureCatalog, game } from './fixture.js';

const f = (r = 0.9, c = 0.9) => ({ r, c, src: ['llm'], ev: [] });
const lengthOf = (features) => ['length.short', 'length.long', 'length.endless'].filter((id) => features[id]);

test('story game with long playtime gets length.long, marked as from hours', () => {
  const out = withLengthFromHours({ 'story.central': f() }, 51);
  assert.deepEqual(out['length.long'], { r: 0.8, c: 0.7, src: ['hours'], ev: [] });
  assert.deepEqual(lengthOf(out), ['length.long']);
});

test('linear game with short playtime gets length.short', () => {
  assert.deepEqual(lengthOf(withLengthFromHours({ 'freedom.linear': f() }, 12)), ['length.short']);
  assert.deepEqual(lengthOf(withLengthFromHours({ 'story.central': f() }, 11)), ['length.short'], 'Portal 2, 11 h');
});

test('PvP game gets nothing (Counter-Strike 2)', () => {
  assert.deepEqual(lengthOf(withLengthFromHours({ 'story.central': f(), 'social.pvp': f() }, 612)), []);
});

test('an existing length tag blocks the rule (Hades, Firewatch)', () => {
  const hades = { 'story.central': f(), 'length.endless': f() };
  assert.equal(withLengthFromHours(hades, 19), hades);
  const firewatch = { 'story.central': f(), 'length.short': f() };
  assert.equal(withLengthFromHours(firewatch, 60), firewatch);
});

test('a weak length tag does not block the rule', () => {
  assert.ok(withLengthFromHours({ 'story.central': f(), 'length.short': f(0.3, 0.9) }, 60)['length.long']);
});

test('hours between the thresholds or unknown give nothing (Detroit 14 h, Disco Elysium 37 h, tail)', () => {
  for (const h of [14, 37, null]) assert.deepEqual(lengthOf(withLengthFromHours({ 'story.central': f() }, h)), []);
});

test('no story or linear feature gives nothing', () => {
  assert.deepEqual(lengthOf(withLengthFromHours({ 'story.central': f(0.4, 0.9) }, 60)), []);
});

test('a length taken from hours is not inferred as taste from a loved title', () => {
  const long = game(30, 'Long Story', { 'story.central': 0.9, 'characters.memorable': 0.9 });
  long.features = withLengthFromHours(long.features, 67);
  assert.ok(long.features['length.long']);
  const catalog = fixtureCatalog([long]);
  const taste = buildTaste(catalog, { answers: { 30: { reaction: 'love', reasons: [] } } });
  assert.ok(taste.weights.has('characters.memorable'));
  assert.ok(!taste.weights.has('length.long'));
});

test('the input features are not changed', () => {
  const features = { 'story.central': f() };
  withLengthFromHours(features, 60);
  assert.deepEqual(Object.keys(features), ['story.central']);
});
