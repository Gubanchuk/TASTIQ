// Stand people (src/stand/people.js): tastes come from a fixed feature pool, so the same people meet any version of
// the data; the live pool follows the current tags.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixtureCatalog } from './fixture.js';
import { createPeople, frozenPool, livePool } from '../src/stand/people.js';

const catalog = fixtureCatalog();

test('a given pool decides the tastes, and features the dictionary lacks are left out', () => {
  const pool = { likeable: ['world.fantasy', 'tone.dark', 'no.such_feature'], dislikeable: ['difficulty.hard'] };
  const { makePerson, pool: used } = createPeople(catalog, { pool });
  assert.deepEqual(used.likeable, ['world.fantasy', 'tone.dark']);
  for (let i = 0; i < 20; i++) {
    const p = makePerson();
    assert.deepEqual([...p.likes].sort(), ['tone.dark', 'world.fantasy']);
    assert.equal(p.dislike, 'difficulty.hard');
  }
});

test('the same pool and seed give the same people whatever the tags', () => {
  const pool = { likeable: ['world.fantasy', 'tone.dark', 'world.living'], dislikeable: ['difficulty.hard', 'tone.cozy'] };
  const a = createPeople(catalog, { pool });
  const b = createPeople(fixtureCatalog(), { pool });
  for (let i = 0; i < 10; i++) assert.deepEqual(a.makePerson().likes, b.makePerson().likes);
});

test('the live pool is what the current tags make, and the series pool is frozen at 20 features', () => {
  const live = livePool(catalog);
  assert.ok(Array.isArray(live.likeable) && Array.isArray(live.dislikeable));
  assert.equal(frozenPool('series').likeable.length, 20);
  assert.equal(frozenPool('no-such-domain'), null);
});
