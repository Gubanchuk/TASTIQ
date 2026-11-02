// Offline: verify that saved requests match today's code; never calls OpenAI.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { loadCatalogs } from '../../../src/core/catalog.js';
import { aiPick } from '../../../src/ai/pick.js';
import { shortlistOf } from '../../../src/ai/pick.js';
import { loadPersonas } from '../../../src/stand/personas.js';
import { hiddenKnownIds, median } from '../../../src/stand/metrics.js';

const dir=resolve('research-vault/akinator-picker-2026-10/eval');
const read=name=>JSON.parse(readFileSync(resolve(dir,name),'utf8'));
const batches={
  focused:read('2026-10-31-ai-quality-final.json'),
  cinema:read('2026-10-31-ai-film-quality-cinema.json'),
  series:read('2026-10-31-ai-series-quality-series.json'),
};
const selected=[...batches.focused.records.filter(r=>['game','cartoon'].includes(r.domain)),...batches.cinema.records,...batches.series.records];
assert.equal(selected.length,12);
assert.equal(new Set(selected.map(r=>r.persona+':'+r.mode)).size,12);
const catalogs=loadCatalogs(), personas=loadPersonas(), frozen=read('2026-10-31-frozen-states.json');
const rows=[];
for (const r of selected) {
  assert.deepEqual(r.state,frozen.find(f=>f.persona===r.persona&&f.mode===r.mode).state);
  let request;
  await aiPick(catalogs,r.state,{api:async body=>{request=body;return {status:'failed'};}});
  assert.deepEqual(request,r.request,`Changed request for ${r.persona} ${r.mode}`);
  assert.ok(!r.ai.error);
  const p=personas.find(p=>p.id===r.persona), targets=new Set(p.targets.map(t=>t.id));
  const ids=[...r.ai.picks.map(p=>p.id),...(r.ai.filled??[])].slice(0,4);
  const known=hiddenKnownIds(p,r.state), hits=ids=>ids.filter(id=>targets.has(id)).length;
  rows.push({persona:r.persona,mode:r.mode,domain:r.domain,engine:hits(r.engine),ai:hits(ids),engineTop:Number(targets.has(r.engine[0])),aiTop:Number(targets.has(ids[0])),inShortlist:shortlistOf(catalogs[r.domain],r.state).filter(row=>targets.has(row.game.id)).length,engineSeen:r.engine.filter(id=>known.has(id)).length,aiSeen:ids.filter(id=>known.has(id)).length,ms:r.ai.ms,usd:r.estimatedUsd,ids});
}
const sum=key=>rows.reduce((s,r)=>s+r[key],0);
const summary=Object.fromEntries(['engine','ai','engineTop','aiTop','inShortlist','engineSeen','aiSeen','usd'].map(k=>[k,sum(k)]));
summary.medianMs=median(rows.map(r=>r.ms));
const paidFiles=['quality-replay','quality-final','film-quality-cinema','danya-party-context','dima-family-context','series-quality-series'].map(tag=>`2026-10-31-ai-${tag}.json`);
const paid=paidFiles.map(file=>({file,usd:read(file).summary.usd,calls:read(file).attempted}));
// Baseline has only a four-decimal MD estimate. Use its upper rounding boundary.
const budget={baselineUpperUsd:0.19295,newUsd:paid.reduce((s,p)=>s+p.usd,0),calls:12+paid.reduce((s,p)=>s+p.calls,0)};
budget.totalUpperUsd=budget.baselineUpperUsd+budget.newUsd;
budget.remainingLowerUsd=1-budget.totalUpperUsd;
const result={note:'12 unique frozen inputs assembled from fixed domain batches, not a new run or best-of selection. All complete requests verified offline against current code.',summary,rows,paid,budget};
writeFileSync(resolve(dir,'2026-10-31-quality-evidence.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
