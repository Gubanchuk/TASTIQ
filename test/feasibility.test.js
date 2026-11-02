import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixtureCatalog, game } from './fixture.js';
import { initialState, sessionOf } from '../src/core/dialogue.js';
import { recommendIds, whyNot } from '../src/core/recommend.js';
const coop = (id, name) => game(id, name, { 'humor.funny': 1 }, { facts: ['social.coop'] });
const catalog = fixtureCatalog([coop(1426210, 'It Takes Two'), coop(2881650, 'Content Warning'), coop(3241660, 'R.E.P.O.'), coop(594650, 'Hunt: Showdown')]);
const session = (size) => sessionOf({ ...initialState(), domain: 'game', situation: { company: 'group', partySize: size } });

test('a verified two-player game cannot be recommended to four; a tag is not capacity evidence', () => {
  assert.equal(whyNot(catalog, '1426210', {}, session('4')).removedBy?.sieve, 5);
  assert.equal(recommendIds(catalog, {}, session('4'), ['1426210']), null);
  const unknown = recommendIds(catalog, {}, session('4'), ['13']);
  assert.equal(unknown.top.feasibility.find((f) => f.key === 'players').status, 'unknown');
});

test('production Steam IDs resolve the same verified fact as appid', () => {
  const real = fixtureCatalog([{ ...coop(1426210, 'It Takes Two'), id: 'steam:1426210' }]);
  assert.equal(recommendIds(real, {}, session('4'), ['steam:1426210']), null);
});

test('exact known capacity passes; 5+ is conditional rather than a guarantee for any party', () => {
  const four = recommendIds(catalog, {}, session('4'), ['2881650']);
  const fact = four.top.feasibility.find((f) => f.key === 'players');
  assert.equal(fact.status, 'yes'); assert.match(fact.source, /^https:/); assert.equal(fact.checkedAt, '2026-10-31');
  assert.equal(recommendIds(catalog, {}, session('5+'), ['2881650']), null);
  assert.equal(recommendIds(catalog, {}, session('5+'), ['3241660']).top.feasibility[0].status, 'conditional');
});

test('evidence for one mode does not claim to describe every possible mode', () => {
  const result = recommendIds(catalog, {}, session('4'), ['594650']);
  assert.equal(result.top.feasibility[0].status, 'unknown');
  assert.match(result.top.feasibility[0].text, /Bounty Hunt/);
});

test('unknown game session time is disclosed, never inferred from Steam review hours', () => {
  const result = recommendIds(catalog, {}, { minutes: 45 }, ['7']);
  assert.equal(result.top.feasibility.find((f) => f.key === 'minutes').status, 'unknown');
  assert.match(result.top.feasibility.find((f) => f.key === 'minutes').text, /45/);
});
