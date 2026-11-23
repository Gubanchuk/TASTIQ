import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFacts, renderExplanation } from '../src/core/explain.js';

test('titles without confirmed audience votes describe runtime and omit audience rating', () => {
  const catalog = {
    domain: { id: 'film', qualityWarn: 0.68 },
    dict: { featureById: new Map(), complaintByFeature: new Map() },
  };
  const item = { features: {}, kind: 'film', runtime: 98, quality: 0.66,
    reviews: { total: 0, ratio: null, desc: 'TMDB' } };
  const detail = { matches: [], moodHits: [], penalties: [] };
  const { info, risks } = renderExplanation(buildFacts(item, detail, {}, catalog), catalog);
  assert.deepEqual(info.map(row => row.text), ['98 мин']);
  assert.deepEqual(risks, []);
});
