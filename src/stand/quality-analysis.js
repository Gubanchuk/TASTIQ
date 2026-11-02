// Reproducible counts and drop diagnoses, no model or human quality labels.
import { readFileSync, writeFileSync } from 'node:fs';
import { loadCatalogs } from '../core/catalog.js';
import { profileOf, sessionOf } from '../core/dialogue.js';
import { buildTaste } from '../core/profile.js';
import { checkSieves } from '../core/sieves.js';
import { lookUp } from '../ai/pick.js';
import { makeReviewContext, buildReviewQueue, summarizeReviews } from './review-queue.js';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { comparisonDetail } from './quality-results.js';

export function analyzeComparisons(details, ledger, replay, catalogs) {
const median = (values) => { const a = [...values].sort((a,b) => a-b), m = a.length >> 1; return !a.length ? null : a.length % 2 ? a[m] : (a[m-1]+a[m])/2; };
const systems = Object.fromEntries(['hybrid', 'direct'].map((system) => {
  const rows = details.filter((x) => x.system === system), receipts = ledger.calls.filter((x) => x.id.startsWith(`compare-v1-${system}-`));
  const cards = rows.flatMap((x) => x.cards);
  return [system, { lists: rows.length, failedLists: rows.filter((x) => x.result.error).length,
    model: cards.filter((x) => x.origin === 'model').length, fill: cards.filter((x) => x.origin === 'fill').length, engine: cards.filter((x) => x.origin === 'engine').length,
    dropped: rows.reduce((s,x) => s+(x.result.dropped ?? 0),0), modelOutsideShortlist: rows.reduce((s,x) => s+x.modelOutsideShortlist.length,0),
    latencyMedianMs: median(rows.map((x) => x.result.ms)), costUsd: Number(receipts.reduce((s,x) => s+x.costUsd,0).toFixed(10)) }];
}));
const unresolved = [], responseErrors = [];
for (const row of details) {
  const catalog = catalogs[row.state.domain], all = catalog.items.map((game) => ({game})), taste = buildTaste(catalog, profileOf(row.state)), session = sessionOf(row.state);
  const receipt = ledger.calls.find((x) => x.id === `compare-v1-${row.system}-${row.caseId}`);
  if (row.result.error) { responseErrors.push({caseId:row.caseId,system:row.system,error:row.result.error}); continue; }
  let raw;
  try { raw = JSON.parse((receipt?.response?.output ?? []).filter((x) => x.type === 'message').flatMap((x) => x.content ?? []).filter((x) => x.type === 'output_text').map((x) => x.text).join('')); }
  catch { responseErrors.push({caseId:row.caseId,system:row.system,error:'Recorded response has no valid JSON'}); continue; }
  if (!Array.isArray(raw?.picks)) { responseErrors.push({caseId:row.caseId,system:row.system,error:'Recorded response has no picks'}); continue; }
  for (const p of raw.picks.filter((x) => !x.id)) {
    const id = lookUp(all, p.title, p.year), byName = lookUp(all, p.title, 0), item = catalog.byId.get(id);
    const filter = item ? checkSieves(item, taste, session, catalog) : null;
    if (!id || filter) unresolved.push({ caseId: row.caseId, system: row.system, title: p.title, year: p.year,
      diagnosis: filter ? 'filtered' : byName ? 'identity-year-unresolved' : 'no-exact-title-match', matchedId: id ?? byName, filter });
  }
}
const runs = [...new Set(details.map((x) => x.caseId))].map((caseId) => {
  const d = details.filter((x) => x.caseId === caseId), catalog = catalogs[d[0].state.domain];
  return { caseId, domain: d[0].state.domain, context: makeReviewContext(d[0].state, catalog), systems: d.map((row) => {
    const result = replay.changes.find((x) => x.caseId === caseId && x.system === row.system).result;
    const current = comparisonDetail(caseId, row.system, row.state, result, catalog);
    return { name: row.system, error: result.error ?? null, cards: current.cards };
  }) };
});
const bundle = buildReviewQueue(runs, 'quality-round-2-current');
const result = { paidCalls: 0, systems, unresolved, responseErrors, blindedCurrentCards: bundle.queue.length, humanLabels: 0,
  budget: { ceiling: ledger.ceiling, newCalls: ledger.calls.length, newUsd: ledger.settledNewUsd, cumulativeUpper: ledger.cumulativeUpper, remainingLower: ledger.remainingLower } };
return { result, bundle, humanSummary: summarizeReviews(bundle.queue, bundle.key) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
const dir = 'research-vault/taste-quality-strategy-2026-10/eval/quality-round-2';
const read = (name) => JSON.parse(readFileSync(`${dir}/${name}`, 'utf8'));
const save = (name, data) => writeFileSync(`${dir}/${name}`, JSON.stringify(data, null, 2) + '\n');
const { result, bundle, humanSummary } = analyzeComparisons(read('comparison-details.json'), read('budget.json'), read('resolver-replay.json'), loadCatalogs());
save('review-current-queue.json', bundle.queue); save('review-current-key.private.json', bundle.key);
save('human-current-summary.json', humanSummary); save('analysis.json', result);
console.log(JSON.stringify(result, null, 2));
}
