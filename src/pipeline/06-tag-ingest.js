// Step 6: validate tagger outputs against their inputs and merge runs.
// The tagger is not trusted: a feature survives only with evidence that exists in the input and a
// quote that is really in that text. Confidence is computed here from evidence and run agreement,
// never taken from the model.
//
// Usage: node src/pipeline/06-tag-ingest.js [games|screen]
//   games: run folders run1, run2, …  → llm-tags.json, report.json
//   screen: run folders screen-run1, … → llm-tags-screen.json, report-screen.json
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { GAMES_DICT, SCREEN_DICT } from '../aspects/index.js';
import { DATA, readJson, writeJson } from '../lib/fsx.js';
import { normalizeForMatch } from '../lib/text.js';

const TAG_DIR = resolve(DATA, 'tagging');
const KIND = process.argv[2] ?? 'games';
const FEATURE_BY_ID = (KIND === 'screen' ? SCREEN_DICT : GAMES_DICT).featureById;
const isRun = (name) => (KIND === 'screen' ? name.startsWith('screen-run') : /^run\d+$/.test(name));
const SUFFIX = KIND === 'screen' ? '-screen' : '';
const MAX_QUOTE_WORDS = 30;
const MAX_EVIDENCE = 4;

const looseNormalize = (s) => normalizeForMatch(s).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function sourceTexts(input) {
  const texts = new Map([['d', input.d ?? ''], ['a', input.a ?? ''], ['s', input.s ?? '']]);
  for (const r of input.reviews ?? []) texts.set(r.id, r.text);
  for (const p of input.paragraphs ?? []) texts.set(p.id, p.text);
  return texts;
}

function quoteIsVerbatim(quote, text) {
  if (!quote || !text) return false;
  if (normalizeForMatch(text).includes(normalizeForMatch(quote))) return true;
  return looseNormalize(text).includes(looseNormalize(quote));
}

function validateRun(run) {
  const dir = resolve(TAG_DIR, run);
  const stats = { run, games: 0, features: 0, kept: 0, unknownFeature: 0, badRelevance: 0, noValidEvidence: 0, evidence: 0, badEvidenceId: 0, notVerbatim: 0, tooLong: 0, riskCapped: 0, appidMismatch: 0, unreadable: 0 };
  const validated = {};
  const outDir = resolve(dir, 'out');
  if (!existsSync(outDir)) return { stats, validated };

  for (const file of readdirSync(outDir).filter((f) => f.endsWith('.json'))) {
    const key = file.replace('.json', '');
    const inputPath = resolve(dir, 'in', file);
    if (!existsSync(inputPath)) continue;
    let output;
    try {
      output = readJson(resolve(outDir, file));
    } catch {
      stats.unreadable++;
      continue;
    }
    if (String(output.appid ?? output.id) !== key) stats.appidMismatch++;
    const texts = sourceTexts(readJson(inputPath));
    stats.games++;

    const features = {};
    for (const item of output.features ?? []) {
      stats.features++;
      const feature = FEATURE_BY_ID.get(item.f);
      if (!feature) { stats.unknownFeature++; continue; }
      const r = Number(item.r);
      if (![1, 2, 3].includes(r)) { stats.badRelevance++; continue; }

      const evidence = [];
      for (const ev of item.ev ?? []) {
        stats.evidence++;
        const text = texts.get(ev.id);
        if (text === undefined) { stats.badEvidenceId++; continue; }
        if ((ev.q ?? '').split(/\s+/).length > MAX_QUOTE_WORDS) { stats.tooLong++; continue; }
        if (!quoteIsVerbatim(ev.q, text)) { stats.notVerbatim++; continue; }
        if (!evidence.some((e) => e.id === ev.id)) evidence.push({ id: ev.id, q: ev.q.trim() });
      }
      if (!evidence.length) { stats.noValidEvidence++; continue; }

      const prev = features[item.f];
      const merged = prev
        ? { r: Math.max(prev.r, r), ev: [...prev.ev, ...evidence.filter((e) => !prev.ev.some((p) => p.id === e.id))] }
        : { r, ev: evidence };
      // A flaw needs at least two independent texts before it counts as more than a minor risk.
      if (feature.risk && merged.ev.length < 2 && merged.r > 1) {
        merged.r = 1;
        stats.riskCapped++;
      }
      merged.ev = merged.ev.slice(0, MAX_EVIDENCE);
      features[item.f] = merged;
    }
    stats.kept += Object.keys(features).length;
    validated[key] = features;
  }
  writeJson(resolve(dir, 'validated.json'), validated);
  return { stats, validated };
}

const runs = readdirSync(TAG_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && isRun(d.name) && existsSync(resolve(TAG_DIR, d.name, 'out')))
  .map((d) => d.name)
  .sort();

const results = runs.map(validateRun);
for (const { stats } of results) {
  const quoteFail = stats.evidence ? ((stats.notVerbatim + stats.badEvidenceId + stats.tooLong) / stats.evidence) : 0;
  console.log(
    `${stats.run}: ${stats.games} games, ${stats.kept}/${stats.features} features kept, ` +
      `evidence rejected ${(quoteFail * 100).toFixed(1)}% (not verbatim ${stats.notVerbatim}, bad id ${stats.badEvidenceId}, too long ${stats.tooLong}), ` +
      `unknown features ${stats.unknownFeature}, risk capped ${stats.riskCapped}`,
  );
}

// Merge runs. For a game covered by several runs, a feature found by only one of them is a
// disagreement; confidence for it drops in 07-catalog.js.
const merged = {};
for (const { validated } of results) {
  for (const [appid, features] of Object.entries(validated)) {
    merged[appid] ??= { runs: 0, features: {} };
    merged[appid].runs++;
    for (const [f, v] of Object.entries(features)) {
      const slot = (merged[appid].features[f] ??= { rs: [], ev: [] });
      slot.rs.push(v.r);
      for (const e of v.ev) if (!slot.ev.some((x) => x.id === e.id)) slot.ev.push(e);
    }
  }
}
for (const game of Object.values(merged)) {
  for (const slot of Object.values(game.features)) slot.ev = slot.ev.slice(0, MAX_EVIDENCE);
}

// Agreement between runs on the games they share: presence agreement and relevance distance.
const agreement = { sharedGames: 0, perFeature: {} };
for (const game of Object.values(merged)) {
  if (game.runs < 2) continue;
  agreement.sharedGames++;
  for (const [f, slot] of Object.entries(game.features)) {
    const row = (agreement.perFeature[f] ??= { both: 0, oneOnly: 0, closeWhenBoth: 0 });
    if (slot.rs.length >= 2) {
      row.both++;
      if (Math.abs(slot.rs[0] - slot.rs[1]) <= 1) row.closeWhenBoth++;
    } else row.oneOnly++;
  }
}
let both = 0, oneOnly = 0;
for (const row of Object.values(agreement.perFeature)) {
  both += row.both;
  oneOnly += row.oneOnly;
  row.presenceAgreement = row.both / (row.both + row.oneOnly);
}
agreement.overallPresenceAgreement = both + oneOnly ? both / (both + oneOnly) : null;

writeJson(resolve(TAG_DIR, `llm-tags${SUFFIX}.json`), merged);
writeJson(resolve(TAG_DIR, `report${SUFFIX}.json`), { runs: results.map((r) => r.stats), agreement });
console.log(
  `Merged ${Object.keys(merged).length} games from ${runs.length} run(s); ` +
    `games in 2+ runs: ${agreement.sharedGames}` +
    (agreement.overallPresenceAgreement != null ? `, presence agreement ${(agreement.overallPresenceAgreement * 100).toFixed(1)}%` : ''),
);
