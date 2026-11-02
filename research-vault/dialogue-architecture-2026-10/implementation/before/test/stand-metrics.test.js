import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hiddenKnownIds, median } from '../src/stand/metrics.js';

test('hidden seen includes unreported loved and disliked titles, not only alsoSeen', () => {
  const persona = { loved:[{id:'l1'},{id:'l2'}],disliked:[{id:'d1'}],alsoSeen:[{id:'s1'}] };
  const hidden = hiddenKnownIds(persona,{answers:{l1:{reaction:'love'},s1:{reaction:'unknown'}}});
  assert.deepEqual([...hidden].sort(),['d1','l2','s1']);
});
test('latency median averages the two middle values and never mutates input', () => {
  const input=[9,2,8,1];
  assert.equal(median(input),5);
  assert.deepEqual(input,[9,2,8,1]);
  assert.equal(median([5,3,1]),3);
  assert.equal(median([]),null);
});
