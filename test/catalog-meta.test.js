import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogMeta } from '../src/core/catalog.js';
import { fixtureCatalog, screenFixture } from './fixture.js';
test('server metadata supplies domain-specific labels for restored answers and context',()=>{
  const meta=catalogMeta({game:fixtureCatalog(),film:screenFixture('film')});
  assert.equal(meta.domains.game.labels['world.living'],'живой мир');
  assert.equal(meta.domains.game.labels['humor.funny'],'много юмора');
  assert.equal(meta.domains.film.labels['humor.funny'],'смешно');
  assert.equal(meta.domains.film.labels['company:kids'],'с детьми');
  assert.equal(meta.domains.film.labels['time:two'],'часа два');
});
