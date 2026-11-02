import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GENOME_TAG_FEATURES, IMDB_GENRE_FEATURES, TVMAZE_GENRE_FEATURES } from '../src/aspects/genome-tags.js';

// MovieLens "family" is a theme (The Godfather 0.70), "children" means a film about children (City of God 0.74).
// Neither says a film is fine to watch with kids, and «с детьми» requires content.family in sieve 5.
test('genome "family" and "children" never mark a film as fine for kids', () => {
  const kidsSafe = (tag) => (GENOME_TAG_FEATURES[tag] ?? []).some(([f]) => f === 'content.family' || f === 'audience.kids');
  assert.ok(!kidsSafe('family'));
  assert.ok(!kidsSafe('children'));
  assert.ok((GENOME_TAG_FEATURES.family ?? []).some(([f]) => f === 'characters.family'), '"family" is about family relationships');
  assert.ok(kidsSafe('kids and family'));
});

// TVmaze "Family" is a theme as well (Succession has it); TVmaze "Children" and IMDb "Family" mean watching with kids.
test('TVmaze "Family" is about families; TVmaze "Children" and IMDb "Family" are for kids', () => {
  const kidsSafe = (map, genre) => (map[genre] ?? []).some(([f]) => f === 'content.family');
  assert.ok(!kidsSafe(TVMAZE_GENRE_FEATURES, 'Family'));
  assert.ok(kidsSafe(TVMAZE_GENRE_FEATURES, 'Children'));
  assert.ok(kidsSafe(IMDB_GENRE_FEATURES, 'Family'));
});
