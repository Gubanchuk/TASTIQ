// Step 10: the journal is summed per question so live answers can replace the stand's guesses
// (share of «всё равно», «не видел» on cards, questions before the result, reactions to the result).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeJournal } from '../src/stand/journal-summary.js';

const ev = (event, data) => ({ at: '2026-10-25T00:00:00.000Z', event, data });

test('the journal sums skips per question, unseen cards, questions before the result and result reactions', () => {
  const lines = [
    ev('react', { from: 'anchors', step: 'why', domain: 'series', asked: 0, action: { type: 'react', shownIds: [1, 2, 3, 4], marks: [{ id: 1, reaction: 'love' }, { id: 2, reaction: 'unknown' }] } }),
    ev('answer', { from: 'ask', qid: 'fact:era', step: 'ask', domain: 'series', asked: 1, action: { type: 'answer', qid: 'fact:era', value: 'new' } }),
    ev('skip', { from: 'ask', qid: 'lean:calm|tense', step: 'result', domain: 'series', asked: 2, action: { type: 'skip' } }),
    ev('played', { from: 'result', step: 'result', domain: 'series', asked: 2, action: { type: 'played', id: 7 } }),
    ev('rate_played', { from: 'result', step: 'result', domain: 'series', asked: 2, action: { type: 'rate_played', id: 7, reaction: 'like' } }),
    ev('played', { from: 'result', step: 'result', domain: 'series', asked: 2, action: { type: 'played', id: 9 } }),
    ev('unplayed', { from: 'result', step: 'result', domain: 'series', asked: 2, action: { type: 'unplayed', id: 9 } }),
    ev('not_mine', { from: 'result', step: 'result', domain: 'series', asked: 2, action: { type: 'not_mine', id: 8 } }),
    ev('restart', { from: 'result', step: 'domain', asked: 0, action: { type: 'restart' } }),
    ev('skip', { from: 'ask', qid: 'fact:era', step: 'result', domain: 'series', asked: 1, action: { type: 'skip' } }),
    // Lines written before the journal had «from» say nothing about questions.
    ev('skip', { step: 'ask', action: { type: 'skip' } }),
  ];
  const s = summarizeJournal(lines);
  assert.deepEqual(s.questions['fact:era'], { kind: 'fact', shown: 2, dontCare: 1 });
  assert.deepEqual(s.questions['lean:calm|tense'], { kind: 'lean', shown: 1, dontCare: 1 });
  assert.deepEqual(s.cards, { shown: 4, marked: 2, unknown: 1, untouched: 2 });
  assert.deepEqual(s.results, { reached: 2, askedBefore: [2, 1], played: 2, rated: 1, unplayed: 1, notMine: 1 });
  assert.equal(s.skippedOld, 1);
});
