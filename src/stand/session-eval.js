// Free: authored interpretation, real catalog/engine; no call to OpenAI. Import future model runs into review-queue separately.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { performance } from 'node:perf_hooks';
import { loadCatalogs } from '../core/catalog.js';
import { profileOf, sessionOf } from '../core/dialogue.js';
import { recommend } from '../core/recommend.js';
import { rankQuestions } from '../core/ask.js';
import { candidatesOf } from '../ai/pick.js';
import { sessionCases } from './session-cases.js';
import { buildReviewQueue, summarizeReviews, makeReviewContext } from './review-queue.js';

const { values } = parseArgs({ options: { out: { type: 'string', default: 'research-vault/taste-quality-strategy-2026-10/eval/session-v1' }, reviews: { type: 'string' }, key: { type: 'string' } } });
const dir = resolve(values.out); mkdirSync(dir, { recursive: true });
const save = (name, value) => writeFileSync(resolve(dir, name), JSON.stringify(value, null, 2) + '\n');
if (values.reviews) {
  if (!values.key) throw new Error('--reviews requires --key');
  const summary = summarizeReviews(JSON.parse(readFileSync(values.reviews, 'utf8')), JSON.parse(readFileSync(values.key, 'utf8')));
  save('human-summary.json', summary); console.log(JSON.stringify(summary, null, 2));
} else {
  const catalogs = loadCatalogs(), runs = [], mechanisms = [];
  for (const scenario of sessionCases(catalogs)) {
    const catalog = catalogs[scenario.after.domain], systems = [];
    for (const [name, state] of [['without-intent', scenario.before], ['confirmed-intent', scenario.after]]) {
      const started = performance.now(), profile = profileOf(state), session = sessionOf(state);
      const result = recommend(catalog, profile, session);
      const candidates = candidatesOf(catalog, state);
      const questions = rankQuestions(catalog, profile, session).questions;
      const cards = [result.top, ...result.alternatives].filter(Boolean);
      systems.push({ name, cards: cards.map((p) => ({ id: p.id, title: p.ru ?? p.name, year: p.year, origin: 'engine' })) });
      mechanisms.push({ caseId: scenario.caseId, system: name, considered: result.considered, top: cards.map((p) => p.id), shortlist: candidates.rows.map((r) => r.game.id), questions: questions.map((q) => q.id), unknownFacts: cards.map((p) => ({ id: p.id, checks: p.feasibility })), ms: Math.round(performance.now() - started) });
    }
    runs.push({ caseId: scenario.caseId, domain: scenario.after.domain, context: makeReviewContext(scenario.after, catalog), systems });
    console.log(`${scenario.caseId}: ${systems.map((s) => `${s.name} → ${s.cards[0]?.title ?? 'empty'}`).join(' | ')}`);
  }
  const bundle = buildReviewQueue(runs);
  const comparisons = runs.map((run) => ({ caseId: run.caseId,
    leaderChanged: run.systems[0].cards[0]?.id !== run.systems[1].cards[0]?.id,
    shortlistOverlap: mechanisms.find((x) => x.caseId === run.caseId && x.system === 'without-intent').shortlist.filter((id) => mechanisms.find((x) => x.caseId === run.caseId && x.system === 'confirmed-intent').shortlist.includes(id)).length,
  }));
  save('mechanisms.json', { paidCalls: 0, interpretation: 'authored fixtures, not an AI parser evaluation', comparisons, mechanisms });
  save('review-queue.json', bundle.queue); save('review-key.private.json', bundle.key);
  save('human-summary.json', summarizeReviews(bundle.queue, bundle.key));
  console.log(`Paid calls: 0. Scenarios: ${runs.length}; blinded cards: ${bundle.queue.length}; human judgments: 0. ${dir}`);
}
