// Bounded offline experiment. No production API/browser traffic. Explicit --paid required.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { loadCatalogs } from '../core/catalog.js';
import { aiIntent, INTENT_VERSION } from '../ai/intent.js';
import { requestResponse } from '../ai/openai.js';
import { PaidBudget } from './paid-budget.js';
import { INTENT_CASES, assessIntent } from './intent-cases.js';
import { SCOPE_CASES } from './intent-scope-cases.js';
import { aiPick } from '../ai/pick.js';
import { comparisonDetail } from './quality-results.js';
import { directPick } from './ai-direct.js';
import { sessionCases } from './session-cases.js';
import { makeReviewContext, buildReviewQueue, summarizeReviews } from './review-queue.js';

const { values } = parseArgs({ options: { paid: { type: 'boolean', default: false }, phase: { type: 'string', default: 'intent-dev' } } });
if (!values.paid) throw new Error('Explicit --paid required; see the protocol before spending');
if (!['intent-dev', 'intent-holdout', 'scope-dev', 'scope-holdout', 'compare'].includes(values.phase)) throw new Error('Unknown phase');
const dir = resolve('research-vault/taste-quality-strategy-2026-10/eval/quality-round-2'); mkdirSync(dir, { recursive: true });
const budget = new PaidBudget(dir);
const save = (name, data) => writeFileSync(resolve(dir, name), JSON.stringify(data, null, 2) + '\n');
const catalogs = loadCatalogs();
try {
  // Published measurements are immutable. Receipts can be replayed offline under a new output name.
  // A partial batch also needs inspection before recovery; never silently overwrite its timings/results.
  const reportName = values.phase === 'compare' ? 'comparison-details.json'
    : `${values.phase.startsWith('scope-') ? 'scope' : 'intent'}-v${INTENT_VERSION}-${values.phase.endsWith('-dev') ? 'dev' : 'holdout'}.json`;
  if (existsSync(resolve(dir, reportName))) throw new Error(`Existing report ${reportName}; use an offline replay, never overwrite paid evidence`);
  if (values.phase === 'compare') {
    const scenarios = sessionCases(catalogs), frozenPath = resolve(dir, 'comparison-cases.frozen.json');
    if (existsSync(frozenPath)) {
      if (JSON.stringify(JSON.parse(readFileSync(frozenPath, 'utf8'))) !== JSON.stringify(scenarios)) throw new Error('Frozen comparison inputs changed');
    } else save('comparison-cases.frozen.json', scenarios);
    const runs = [], details = [];
    for (const [index, scenario] of scenarios.entries()) {
      const state = scenario.after, catalog = catalogs[state.domain], systems = [];
      // Counterbalance order; these are different approaches, not a prompt-only ablation.
      for (const name of (index % 2 ? ['direct', 'hybrid'] : ['hybrid', 'direct'])) {
        const api = budget.api(`compare-v1-${name}-${scenario.caseId}`, requestResponse);
        const result = name === 'hybrid' ? await aiPick(catalogs, state, { api }) : await directPick(catalog, state, { api });
        const detail = comparisonDetail(scenario.caseId, name, state, result, catalog), cards = detail.cards;
        systems.push({ name, error: result.error ?? null, cards });
        details.push(detail);
        save('comparison-details.json', details);
        console.log(JSON.stringify({ caseId: scenario.caseId, system: name, titles: cards.map((x) => x.original), dropped: result.dropped ?? 0, fills: cards.filter((x) => x.origin === 'fill').length, error: result.error ?? null, newUsd: budget.snapshot().settledNewUsd }));
        if (budget.snapshot().uncertainReserve) throw new Error('Unknown spend: stop');
      }
      runs.push({ caseId: scenario.caseId, domain: state.domain, context: makeReviewContext(state, catalog), systems });
    }
    const bundle = buildReviewQueue(runs, 'quality-round-2');
    save('review-queue.json', bundle.queue); save('review-key.private.json', bundle.key);
    save('human-summary.json', summarizeReviews(bundle.queue, bundle.key));
  } else {
  const scope = values.phase.startsWith('scope-'), cases = scope ? SCOPE_CASES : INTENT_CASES;
  const frozenName = scope ? 'intent-scope-cases.frozen.json' : 'intent-cases.frozen.json', frozen = resolve(dir, frozenName);
  if (existsSync(frozen)) {
    if (JSON.stringify(JSON.parse(readFileSync(frozen, 'utf8'))) !== JSON.stringify(cases)) throw new Error('Frozen criteria changed');
  } else save(frozenName, cases);
  const split = values.phase.endsWith('-dev') ? 'dev' : 'holdout', results = [];
  for (const scenario of cases.filter((x) => x.split === split)) {
    const result = await aiIntent(catalogs[scenario.domain], scenario.text, { api: budget.api(`intent-v${INTENT_VERSION}-${scenario.id}`, requestResponse) });
    const assessment = assessIntent(scenario, result);
    results.push({ ...scenario, result, assessment });
    save(`${scope ? 'scope' : 'intent'}-v${INTENT_VERSION}-${split}.json`, results);
    console.log(JSON.stringify({ id: scenario.id, pass: assessment.pass, failures: assessment.failures, wants: result.proposal?.wants.map((x) => x.f), avoids: result.proposal?.avoids.map((x) => x.f), clarification: result.clarification, newUsd: budget.snapshot().settledNewUsd }));
    if (budget.snapshot().uncertainReserve) throw new Error('Unknown spend: stop');
  }
  if (results.some((x) => !x.assessment.pass)) process.exitCode = 1;
  }
} finally { budget.close(); }
