// No network: replay the exact recorded model responses through the current resolver.
import { readFileSync, writeFileSync } from 'node:fs';
import { loadCatalogs } from '../core/catalog.js';
import { aiPick } from '../ai/pick.js';
import { directPick } from './ai-direct.js';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { comparisonDetail } from './quality-results.js';

export async function replayComparisons(before, budget, catalogs) {
const changes = [];
for (const row of before) {
  const receipt = budget.calls.find((x) => x.id === `compare-v1-${row.system}-${row.caseId}`);
  if (receipt?.status !== 'settled') throw new Error('Missing response receipt');
  let calls = 0;
  const api = async (body) => {
    calls++;
    if (JSON.stringify(body) !== JSON.stringify(receipt.request)) throw new Error('Request changed; no longer a resolver-only replay');
    return structuredClone(receipt.response);
  };
  const result = row.system === 'hybrid' ? await aiPick(catalogs, row.state, { api }) : await directPick(catalogs[row.state.domain], row.state, { api });
  if (calls !== 1) throw new Error('Unexpected call path');
  const oldPicks = (row.result.picks ?? []).map((p) => p.id), newPicks = (result.picks ?? []).map((p) => p.id);
  const current = comparisonDetail(row.caseId, row.system, row.state, result, catalogs[row.state.domain]);
  changes.push({ caseId: row.caseId, system: row.system, changed: JSON.stringify(oldPicks) !== JSON.stringify(newPicks), before: oldPicks, after: newPicks,
    fillsBefore: row.result.filled?.length ?? 0, fillsAfter: result.filled?.length ?? 0,
    errorBefore: row.result.error ?? null, errorAfter: result.error ?? null, cards: current.cards, result });
}
return { paidCalls: 0, changes };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
const dir = 'research-vault/taste-quality-strategy-2026-10/eval/quality-round-2';
const budget = JSON.parse(readFileSync(`${dir}/budget.json`, 'utf8'));
const before = JSON.parse(readFileSync(`${dir}/comparison-details.json`, 'utf8'));
const { changes } = await replayComparisons(before, budget, loadCatalogs());
writeFileSync(`${dir}/resolver-replay.json`, JSON.stringify({ paidCalls: 0, changes }, null, 2) + '\n');
console.log(JSON.stringify({ paidCalls: 0, comparisons: changes.length, changed: changes.filter((x) => x.changed).map((x) => ({caseId:x.caseId,system:x.system,before:x.before,after:x.after,fillsBefore:x.fillsBefore,fillsAfter:x.fillsAfter})) }, null, 2));
}
