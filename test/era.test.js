import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priorOf, WEIGHTS } from '../src/core/score.js';

const catalog = { domain: { qualityFloor: 0.5 }, popRange: [0, 1] };
const title = (year) => ({ quality: 0.8, popularity: 0.5, year });
const loss = (year, oldestLiked, session = {}) => priorOf(title(year), catalog, session) - priorOf(title(year), catalog, session, { oldestLiked });

test('a title 30+ years older than the oldest liked loses the full β of prior', () => {
  assert.ok(Math.abs(loss(1960, 1994) - WEIGHTS.beta) < 1e-9);
});

test('within ten years of the oldest liked nothing changes, a liked classic keeps the old ones', () => {
  assert.equal(loss(1985, 1994), 0);
  assert.equal(loss(1975, 1979), 0);
});

test('«можно и старое» and an unknown year turn the era off', () => {
  assert.equal(loss(1960, 1994, { era: 'any' }), 0);
  assert.equal(loss(null, 1994), 0);
});
