import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixtureCatalog } from './fixture.js';
import { initialState } from '../src/core/dialogue.js';
import { diagnoseTargets } from '../src/stand/diagnose.js';

const catalog = fixtureCatalog();
const state = { ...initialState(), domain: 'game', step: 'result', answers: {
  1: { reaction: 'love', reasons: ['world.living'], issues: [] },
  5: { reaction: 'dislike', issues: [{ f: 'difficulty.hard', hard: true }] },
} };

test('target diagnostics distinguish absence, sieves, shortlist and final engine choice', () => {
  const rows = diagnoseTargets(catalog, state, ['missing', '1', '5', '7', '13', '6'].map((id) => ({ id, name: id })), { shortlistSize: 5 });
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  assert.equal(byId.missing.stage, 'missing');
  assert.equal(byId['1'].stage, 'filtered');
  assert.equal(byId['1'].sieve, 2);
  assert.equal(byId['5'].stage, 'filtered');
  assert.match(byId['5'].reason, /не моё|играл/);
  assert.equal(byId['7'].stage, 'shown');
  assert.equal(byId['7'].rank, 1);
  assert.equal(byId['13'].stage, 'shortlist');
  assert.equal(byId['13'].rank, 4);
  assert.equal(byId['6'].stage, 'ranked');
  assert.ok(byId['6'].penalties.length > 0);
});

test('diagnostics use the state supplied and do not mutate it or turn played into an AI failure', () => {
  const before = structuredClone(state);
  const [initial] = diagnoseTargets(catalog, state, [{ id: '7', name: 'RDR2' }]);
  const [after] = diagnoseTargets(catalog, { ...state, corrections: [{ id: '7', kind: 'played' }] }, [{ id: '7', name: 'RDR2' }]);
  assert.equal(initial.stage, 'shown');
  assert.equal(after.stage, 'filtered');
  assert.equal(after.sieve, 2);
  assert.deepEqual(state, before);
});
