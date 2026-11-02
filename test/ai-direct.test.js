import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureCatalog } from './fixture.js';
import { initialState } from '../src/core/dialogue.js';
import { directPick } from '../src/stand/ai-direct.js';
const catalog = fixtureCatalog();
const state = { ...initialState(), domain: 'game', platform: 'windows', answers: { '1': { reaction: 'love', reasons: ['story.central'] } }, stops: ['difficulty.hard'] };
const stub = (picks) => async () => ({ status: 'completed', model: 'stub', usage: {}, output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ understood: 'История', picks: picks.map((title) => ({ title, year: 2020, reason: 'reason', caveat: '', id: '', likelySeen: false })) }) }] }] });

test('direct baseline resolves four own titles without production two-own cap', async () => {
  const result = await directPick(catalog, state, { api: stub(['Stardew Valley', 'Portal 2', 'Skyrim', 'It Takes Two']) });
  assert.equal(result.picks.length, 4); assert.equal(result.filled.length, 0);
});

test('direct baseline enforces the same sieves and reports unavailable/duplicate titles separately', async () => {
  const result = await directPick(catalog, state, { api: stub(['The Witcher 3', 'Dark Souls', 'Not in the catalog', 'Portal 2', 'Portal 2']) });
  assert.deepEqual(result.picks.map((x) => x.id), ['12']);
  assert.deepEqual(result.rejected.map((x) => x.reason), ['ineligible', 'ineligible', 'not-in-catalog', 'duplicate']);
  assert.equal(result.filled.length, 3);
  assert.ok(!result.filled.includes('1') && !result.filled.includes('5'));
});
