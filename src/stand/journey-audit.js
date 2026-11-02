// Read captured browser inputs; never generate or inject questionnaire answers.
// --direct is explicitly paid and uses the existing ledger and the SAME $0.75 batch.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadCatalogs } from '../core/catalog.js';
import { profileOf, sessionOf } from '../core/dialogue.js';
import { whyNot } from '../core/recommend.js';
import { aiPick, candidatesOf } from '../ai/pick.js';
import { directPick } from './ai-direct.js';
import { PaidBudget } from './paid-budget.js';
import { budgetTransport } from '../ai/budget-transport.js';

const dir = resolve('research-vault/taste-quality-strategy-2026-10/eval/journey-v1');
const read = name => JSON.parse(readFileSync(resolve(dir, name), 'utf8'));
const cases = read('cases.frozen.json').cases;
const catalog = loadCatalogs().game;
const reselect = process.argv.includes('--reselect');
const paid = process.argv.includes('--direct') || reselect;
const ledger = paid ? new PaidBudget(resolve(dir, '../quality-round-2')) : null;
const api = ledger ? budgetTransport({ ledger, batchId: 'journey-v1', cap: 0.75 }) : null;
const rows = [];
try {
  for (const c of cases) {
    const captured = read(`${c.id}.live.json`), state = captured.state;
    const engine = captured.events.filter(e => e.path === '/api/dialogue' && e.output.screen.result).at(-1).output.screen.result;
    const live = captured.events.filter(e => e.path === '/api/ai/pick').at(-1).output.result;
    const ids = r => [r.top, ...r.alternatives].map(x => x.id);
    const { rows: shortlist } = candidatesOf(catalog, state);
    const targets = c.targets.map(t => ({ ...t, inShortlist: shortlist.some(r => r.game.id === t.id), engine: ids(engine).includes(t.id), hybrid: ids(live).includes(t.id), why: whyNot(catalog, t.id, profileOf(state), sessionOf(state)) }));
    const row = { id: c.id, targets, engine: ids(engine), hybrid: ids(live), humanFit: null };
    if (paid) {
      if (reselect) row.reselect = await aiPick({ game: catalog }, state, { api });
      else row.direct = await directPick(catalog, state, { api });
      writeFileSync(resolve(dir, `${c.id}.${reselect ? 'reselect-v2' : 'direct'}.json`), JSON.stringify(row.reselect ?? row.direct, null, 2) + '\n');
    }
    rows.push(row);
    console.log(JSON.stringify({ id: c.id, targets: targets.map(t => ({ name: t.name, rank: t.why.rank, removed: t.why.removedBy, shortlist: t.inShortlist, hit: t.hybrid })), direct: row.direct && { picks: row.direct.picks?.map(p => p.title), filled: row.direct.filled, rejected: row.direct.rejected }, reselect: row.reselect && { picks: row.reselect.picks?.map(p => ({ name: catalog.byId.get(p.id)?.name, hit: c.targets.some(t => t.id === p.id) })), filled: row.reselect.filled, error: row.reselect.error } }));
  }
  const budget = ledger?.snapshot();
  writeFileSync(resolve(dir, reselect ? 'comparison-v2.json' : paid ? 'comparison.json' : 'target-audit.json'), JSON.stringify({ at: new Date().toISOString(), rows, budget: budget && { cumulativeUpper: budget.cumulativeUpper, remainingLower: budget.remainingLower, successfulCalls: budget.successfulCalls, batchUsd: budget.calls.filter(r => r.id.startsWith('journey-v1:')).reduce((s,r) => s + (r.costUsd ?? r.reserveUsd), 0) } }, null, 2) + '\n');
} finally { ledger?.close(); }
