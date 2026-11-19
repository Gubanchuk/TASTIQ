import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { DATA } from '../src/lib/fsx.js';
import { catalogBuildOptions, catalogSnapshot, mergeCatalogBuild } from '../src/pipeline/catalog-build.js';

test('a rebuild preserves released cards and only applies explicitly selected source changes', () => {
  const release = [
    { id:'a', name:'Approved', year:2001, editorial:{ source:'publisher' } },
    { id:'b', name:'Accepted expansion' },
    { id:'old', name:'Retired release' },
  ];
  const raw = [{ id:'a', name:'Old title', year:2002 }, { id:'new', name:'New' }, { id:'denied' }];
  const preview = mergeCatalogBuild(release,raw);
  assert.deepEqual(preview.items,release);
  assert.deepEqual(preview.report.updates,{a:['name','year']});
  assert.deepEqual(preview.report.availableAdditions,['new','denied']);
  assert.deepEqual(preview.report.releaseOnly,['b','old']);

  const decisions = { add:['new'], update:{a:['year']}, remove:['old'] };
  const result = mergeCatalogBuild(release,raw,decisions);
  assert.deepEqual(result.items,[{...release[0],year:2002},release[1],raw[1]]);
  assert.deepEqual(mergeCatalogBuild(release,raw,decisions),result);
  assert.deepEqual(release[0].editorial,{source:'publisher'});
  assert.throws(()=>mergeCatalogBuild(release,raw,{update:{a:['editorial']}}));
  assert.throws(()=>mergeCatalogBuild(release,raw,{remove:['absent']}));
  assert.throws(()=>mergeCatalogBuild(release,raw,{add:['a']}));
  assert.throws(()=>mergeCatalogBuild(release,raw,{allowAll:true}));
  assert.throws(()=>mergeCatalogBuild(release,[...raw,raw[0]]));
});

test('a normal rebuild cannot target its runtime directory or overwrite the supplied baseline', t => {
  const stage = mkdtempSync(join(tmpdir(),'tastiq-build-stage-'));
  t.after(()=>rmSync(stage,{recursive:true,force:true}));
  writeFileSync(join(stage,'catalog.json'),'{}');
  assert.throws(()=>catalogBuildOptions('catalog.json',['--out-dir',DATA]),/staging directory/);
  assert.throws(()=>catalogBuildOptions('catalog.json',[
    '--baseline',join(stage,'catalog.json'),'--out-dir',stage,
  ]),/staging directory/);
});

test('identical content keeps its release timestamp and all additional metadata', () => {
  const release = { builtAt:'2026-11-19T00:00:00.000Z', sourceNote:'checked', items:[{id:'kept'}], stats:{titles:1} };
  assert.equal(catalogSnapshot(release,{items:[{id:'kept'}],stats:{titles:1}}),release);
  const next = catalogSnapshot(release,{items:[],stats:{titles:0}});
  assert.deepEqual(next.items,[]);
  assert.equal(next.stats.titles,0);
  assert.equal(next.sourceNote,release.sourceNote);
});
