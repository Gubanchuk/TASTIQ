import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReviewQueue, summarizeReviews, makeReviewContext } from '../src/stand/review-queue.js';
import { fixtureCatalog, screenFixture } from './fixture.js';
import { initialState } from '../src/core/dialogue.js';
const runs = [{ caseId: 'evening-1', domain: 'game', context: { note: 'Спокойная история' }, systems: [
  { name: 'old', cards: [{ id: 'a', title: 'A', origin: 'engine' }, { id: 'b', title: 'B', origin: 'engine' }] },
  { name: 'new', cards: [{ id: 'b', title: 'B', origin: 'model' }, { id: 'c', title: 'C', origin: 'fill' }] },
] }];

test('review queue is blinded and deduplicates the same title within a scenario', () => {
  const { queue, key } = buildReviewQueue(runs, 'fixed');
  assert.equal(queue.length, 3);
  assert.equal(key.lists.length, 2);
  for (const row of queue) {
    assert.equal(row.system, undefined); assert.equal(row.rank, undefined); assert.equal(row.origin, undefined);
    assert.equal(row.judgment, null); assert.deepEqual(row.context, runs[0].context);
  }
  assert.deepEqual(buildReviewQueue(runs, 'fixed').queue, queue);
});

test('unknown and unreviewed are not rejections; fills are counted in their own origin', () => {
  const { queue, key } = buildReviewQueue(runs, 'fixed');
  for (const row of queue) row.judgment = { A: 'accept', B: 'unknown', C: 'conditional' }[row.title];
  const out = summarizeReviews(queue, key);
  assert.equal(out.old.accept, 1); assert.equal(out.old.unknown, 1); assert.equal(out.old.decidable, 1);
  assert.equal(out.old.strictAcceptance, 1); assert.equal(out.old.fullyResolvedLists, 0);
  assert.equal(out.new.conditional, 1); assert.equal(out.new.fill, 1); assert.equal(out.new.model, 1);
  const fresh = buildReviewQueue(runs, 'fixed');
  assert.equal(summarizeReviews(fresh.queue, fresh.key).new.strictAcceptance, null);
  assert.equal(summarizeReviews(fresh.queue, fresh.key).new.unreviewed, 2);
});

test('invalid labels and duplicate votes fail loudly rather than inflate acceptance', () => {
  const { queue, key } = buildReviewQueue(runs, 'fixed');
  assert.throws(() => summarizeReviews([...queue, queue[0]], key), /duplicate/);
  queue[0].judgment = 'probably good';
  assert.throws(() => summarizeReviews(queue, key), /judgment/);
});

test('the blinded assessor sees explicit prohibitions and practical session constraints', () => {
  const game = fixtureCatalog();
  const state = { ...initialState(), domain: 'game', platform: 'mac', stops: ['progression.grind'], situation: { company: 'group', partySize: '4', note: '45 минут',
    intent: { source:'confirmed', sourceText:'45 минут', wants:[], avoids:[], time:{minutes:45,evidence:'45 минут'} } } };
  const context = makeReviewContext(state, game);
  assert.equal(context.constraints.platform, 'Mac');
  assert.equal(context.constraints.partySize, 'четверо');
  assert.equal(context.constraints.availableMinutes, 45);
  assert.ok(context.constraints.hardStops.some((x) => /гринд/.test(x)));
  const film = makeReviewContext({ ...initialState(), domain: 'cartoon', stops: ['tone.creepy'], situation: { company:'kids', childAge:'preschool', time:'short', era:'new', onlyEnded:true } }, screenFixture('cartoon'));
  assert.equal(film.constraints.childAge, 'до 7 лет');
  assert.equal(film.constraints.onlyEnded, true);
  assert.equal(film.constraints.era, 'с 2015 года');
  assert.ok(film.constraints.hardStops.some((x) => /страш/.test(x)));
  const exported = buildReviewQueue([{ ...runs[0], context }]).queue;
  assert.deepEqual(exported[0].context.constraints, context.constraints);
});
