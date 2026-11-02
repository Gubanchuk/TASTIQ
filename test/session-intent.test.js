import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, reduce, profileOf, sessionOf } from '../src/core/dialogue.js';
import { fixtureCatalog } from './fixture.js';
const catalogs = { game: fixtureCatalog() };
const note = 'Сегодня хочу уют, без хоррора. Есть 45 минут';
const proposal = { sourceText: note, wants: [{ f: 'tone.cozy', evidence: 'хочу уют' }], avoids: [{ f: 'tone.creepy', evidence: 'без хоррора' }], time: { minutes: 45, evidence: '45 минут' } };
const state = () => ({ ...initialState(), step: 'anchors', domain: 'game', situation: { ...initialState().situation, note } });

test('confirmed wishes have evidence and affect only this session', () => {
  const before = state();
  const next = reduce(before, { type: 'confirm_intent', intent: proposal }, catalogs);
  assert.deepEqual(profileOf(next), profileOf(before));
  assert.equal(next.situation.intent.source, 'confirmed');
  assert.deepEqual(sessionOf(next).intent.wants, proposal.wants);
  assert.equal(sessionOf(next).minutes, 45);
  assert.equal(sessionOf(next).maxRuntime, undefined, 'a game session is not full completion time');
  assert.equal(sessionOf(before).intent, null, 'model proposals do not silently enter the engine');
});

test('editing the source invalidates the interpretation, including old saved states', () => {
  const next = reduce(state(), { type: 'confirm_intent', intent: proposal }, catalogs);
  const stale = { ...next, situation: { ...next.situation, note: 'Сегодня наоборот страшное' } };
  assert.equal(sessionOf(stale).intent, null);
  const edited = reduce(next, { type: 'more', ids: [], note: 'Сегодня наоборот страшное' }, catalogs);
  assert.equal(edited.situation.intent, null);
  const wrong = reduce(edited, { type: 'confirm_intent', intent: proposal }, catalogs);
  assert.equal(sessionOf(wrong).intent, null, 'a late response for old text is ignored');
});

test('unknown features, missing quotes and conflicting polarities cannot become confirmed wishes', () => {
  const next = reduce(state(), { type: 'confirm_intent', intent: { ...proposal,
    wants: [...proposal.wants, { f: 'magic.fake', evidence: 'уют' }, { f: 'pace.fast', evidence: 'скорость' }],
    avoids: [...proposal.avoids, { f: 'tone.cozy', evidence: 'уют' }],
    time: { minutes: 40, evidence: 'сорок минут' },
  } }, catalogs);
  assert.deepEqual(sessionOf(next).intent.wants, []);
  assert.deepEqual(sessionOf(next).intent.avoids, proposal.avoids);
  assert.equal(sessionOf(next).intent.time, null);
});
