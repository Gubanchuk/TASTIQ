import test from 'node:test';
import assert from 'node:assert/strict';
import { lookUp, checkPicks } from '../src/ai/pick.js';
import { game } from './fixture.js';
const heavyRain = { ...game(960910, 'Heavy Rain', {}, {}), id: 'steam:960910', year: 2020 };

test('a verified original release resolves to its Steam port without changing the catalog year', () => {
  assert.equal(lookUp([{ game: heavyRain }], 'Heavy Rain', 2010), heavyRain.id);
  assert.equal(heavyRain.year, 2020);
  assert.equal(lookUp([{ game: heavyRain }], 'Heavy Rain', 2020), heavyRain.id);
});

test('release evidence cannot cross a different title, app, domain or a sieve', () => {
  assert.equal(lookUp([{ game: { ...heavyRain, name: 'Different game' } }], 'Different game', 2010), null);
  assert.equal(lookUp([{ game: { ...heavyRain, appid: 999, id: 'steam:999' } }], 'Heavy Rain', 2010), null);
  assert.equal(lookUp([{ game: { ...heavyRain, domain: 'film', kind: 'film' } }], 'Heavy Rain', 2010), null);
  assert.equal(checkPicks({ picks: [{ title: 'Heavy Rain', year: 2010 }] }, [], 4, []).picks.length, 0);
});

test('unverified years are still rejected, including a same-name remake', () => {
  const prey = { ...game(480490, 'Prey', {}), year: 2017 };
  assert.equal(lookUp([{ game: prey }], 'Prey', 2006), null);
  assert.equal(lookUp([{ game: heavyRain }], 'Heavy Rain', 1998), null);
});
