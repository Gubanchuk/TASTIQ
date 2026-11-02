import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCREEN_FEATURES } from '../src/aspects/screen.js';
import { makeCatalog } from '../src/core/catalog.js';
import { computeIdf } from '../src/core/idf.js';
import { pairFor } from '../src/core/questions.js';
import { title } from './fixture.js';

// Five sitcoms and a drama: «смешно» is on most of them, so it never wins the pair on rarity.
function sitcoms() {
  const items = [
    title('s1', 'Friends', 'series', { 'humor.funny': 1, 'characters.ensemble': 1, 'characters.friendship': 1 }),
    title('s2', 'Office', 'series', { 'humor.funny': 1, 'characters.ensemble': 0.9 }),
    title('s3', 'Brooklyn', 'series', { 'humor.funny': 1, 'tone.feelgood': 0.8 }),
    title('s4', 'Parks', 'series', { 'humor.funny': 1, 'tone.feelgood': 0.9 }),
    title('s5', 'Drama', 'series', { 'tone.dark': 1, 'characters.ensemble': 0.8 }),
    title('s6', 'Mild', 'series', { 'humor.funny': 0.5, 'characters.ensemble': 1, 'characters.friendship': 1 }),
  ];
  const { df, idf } = computeIdf(items, SCREEN_FEATURES);
  return makeCatalog({ items, df, idf, stats: {} }, 'series');
}

test('a strongly funny title keeps «смешно» in the «за что» pair', () => {
  const catalog = sitcoms();
  const pair = pairFor(catalog.byId.get('s1'), catalog).map((p) => p.f);
  assert.equal(pair.length, 2);
  assert.ok(pair.includes('humor.funny'), pair.join(', '));
});

test('a mildly funny title keeps its two most distinctive reasons', () => {
  const catalog = sitcoms();
  const pair = pairFor(catalog.byId.get('s6'), catalog).map((p) => p.f);
  assert.ok(!pair.includes('humor.funny'), pair.join(', '));
});
