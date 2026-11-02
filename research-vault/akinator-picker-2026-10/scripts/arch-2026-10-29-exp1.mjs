// Architect experiments 2026-10-29 (read-only on the project; imports engine modules, no edits).
// 1. Where the shown four sit by score; targets within top-4/top-8 by score that MMR did not show.
// 2. Result phase replayed with variants of what «Уже смотрел» without a rating means to the engine.
// 3. Adaptive-question limit 5 instead of 3.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const ROOT = 'E:/project/TASTIQ';
const mod = (p) => import(pathToFileURL(resolve(ROOT, p)).href);
const { loadCatalogs } = await mod('src/core/catalog.js');
const { play, loadPersonas } = await mod('src/stand/personas.js');
const { profileOf, sessionOf } = await mod('src/core/dialogue.js');
const { rankAll, recommend, choose, whyNot } = await mod('src/core/recommend.js');
const { ASK } = await mod('src/core/ask.js');
const { fillPicks, removedIds } = await mod('src/server/public/shared/fill-picks.js');

const catalogs = loadCatalogs();
const personas = loadPersonas();

// ---- local copy of recommend.js diversify with parameters ----
function vector(item) {
  const v = new Map();
  for (const [f, x] of Object.entries(item.features)) if (!f.startsWith('social.')) v.set(f, x.r * x.c);
  return v;
}
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const [f, x] of a) { na += x * x; if (b.has(f)) dot += x * b.get(f); }
  for (const x of b.values()) nb += x * x;
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}
function diversifyWith(ranked, k, lambda, margin) {
  if (!ranked.length) return [];
  const maxScore = Math.max(...ranked.map((r) => r.score));
  const minScore = Math.min(...ranked.map((r) => r.score));
  const norm = (s) => (maxScore > minScore ? (s - minScore) / (maxScore - minScore) : 1);
  const pool = ranked.slice(0, 60).map((r) => ({ ...r, vec: vector(r.game) }));
  const selected = [pool.shift()];
  const tie = selected[0].score - margin * Math.abs(selected[0].score);
  while (selected.length < k + 1 && pool.length) {
    const ties = pool.filter((c) => c.score >= tie);
    let best = null, bestValue = -Infinity;
    for (const cand of ties.length ? ties : pool) {
      const sim = Math.max(...selected.map((s) => cosine(cand.vec, s.vec)));
      const value = lambda * norm(cand.score) - (1 - lambda) * sim;
      if (value > bestValue) { bestValue = value; best = cand; }
    }
    selected.push(pool.splice(pool.indexOf(best), 1)[0]);
  }
  return selected.map(({ vec, ...rest }) => rest);
}

const pad = (s, n) => String(s).padEnd(n);
const targetsOf = (P) => new Set(P.targets.map((t) => t.id));
const preTap = (state) => ({ ...state, corrections: state.corrections.filter((c) => c.kind !== 'played'), session: { ...state.session, notNow: [] } });

// ---- run all personas ----
const runs = [];
for (const P of personas) for (const mode of ['careful', 'lazy']) runs.push(play(P, mode, catalogs));

console.log('\n=== 1. Shown four by score rank (first result, before taps); targets by rank ===');
const variants = { 'mmr 0.7/0.1 (как есть)': [0.7, 0.1], 'mmr 0.7/0.2': [0.7, 0.2], 'mmr 0.85/0.1': [0.85, 0.1], 'по счёту (λ=1)': [1.0, 0.1] };
const tally = Object.fromEntries(Object.keys(variants).map((k) => [k, 0]));
let inTop4 = 0, inTop8 = 0, inTop4NotShown = 0;
for (const run of runs) {
  const P = run.persona, cat = catalogs[P.domain], T = targetsOf(P);
  const st = preTap(run.finalState);
  const { ranked } = rankAll(cat, profileOf(st), sessionOf(st));
  const { pool } = choose(ranked);
  const rankOf = new Map(ranked.map((r, i) => [r.game.id, i + 1]));
  const first = [run.results[0].top, ...run.results[0].alternatives].map((c) => c.id);
  const shownRanks = first.map((id) => rankOf.get(id) ?? '-');
  const tRanks = P.targets.map((t) => `${t.name} ${rankOf.get(t.id) ?? 'sieved'}`);
  const t4 = P.targets.filter((t) => (rankOf.get(t.id) ?? 1e9) <= 4).length;
  const t8 = P.targets.filter((t) => (rankOf.get(t.id) ?? 1e9) <= 8).length;
  inTop4 += t4; inTop8 += t8;
  inTop4NotShown += P.targets.filter((t) => (rankOf.get(t.id) ?? 1e9) <= 4 && !first.includes(t.id)).length;
  const line = [];
  for (const [name, [l, m]] of Object.entries(variants)) {
    const picked = diversifyWith(pool, 3, l, m).map((r) => r.game.id);
    const n = picked.filter((id) => T.has(id)).length;
    tally[name] += n;
    line.push(`${name}: ${n}`);
  }
  console.log(`${pad(P.id + ' ' + run.mode, 20)} shown ranks [${shownRanks.join(', ')}] | targets: ${tRanks.join('; ')} | ${line.join(' | ')}`);
}
console.log(`targets within top-4 by score: ${inTop4}; within top-8: ${inTop8}; in top-4 but not shown: ${inTop4NotShown}`);
console.log('targets in first four by variant:', tally);

console.log('\n=== 2. Result phase: what «Уже смотрел» without a rating tells the engine ===');
// variant: (profile, state, taps) → { profile, session }
const seenAs = (reaction) => (profile, state) => ({
  ...profile,
  corrections: profile.corrections.map((c) => (c.kind === 'played' && !c.reaction ? { ...c, reaction } : c)),
});
const nicheAfter = (n) => (profile, state, session) => {
  const taps = profile.corrections.filter((c) => c.kind === 'played').length;
  return taps >= n && !session.popularity ? { ...session, popularity: 'niche' } : session;
};
const combine = (fp, fs) => ({ fp, fs });
const V = {
  'как есть': combine(null, null),
  'seen→like': combine(seenAs('like'), null),
  'seen→love': combine(seenAs('love'), null),
  'niche после 2 тапов': combine(null, nicheAfter(2)),
  'seen→like + niche/2': combine(seenAs('like'), nicheAfter(2)),
};
const SEEN_TAPS = 12;
function replayResult(run, v) {
  const P = run.persona, cat = catalogs[P.domain], M = P.modes[run.mode];
  const lovedById = new Map(P.loved.map((x) => [x.id, x]));
  const dislikedById = new Map(P.disliked.map((x) => [x.id, x]));
  const seenAll = new Set([...lovedById.keys(), ...dislikedById.keys(), ...(P.alsoSeen ?? []).map((x) => x.id)]);
  const state = structuredClone(preTap(run.finalState));
  const prof = () => (v.fp ? v.fp(profileOf(state), state) : profileOf(state));
  const sess = () => (v.fs ? v.fs(prof(), state, sessionOf(state)) : sessionOf(state));
  let shown = recommend(cat, prof(), sess());
  const cards = (r) => [r.top, ...r.alternatives].filter(Boolean);
  const seenOn = (r) => cards(r).filter((c) => seenAll.has(c.id));
  const all = new Map(cards(shown).map((c) => [c.id, c]));
  let taps = 0, wall = 0;
  for (let n = 0; n < SEEN_TAPS; n++) {
    const c = seenOn(shown)[0];
    if (!c) break;
    state.corrections = state.corrections.filter((x) => !(x.kind === 'played' && x.id === c.id));
    const reaction = !M.result?.rate ? null : dislikedById.has(c.id) ? 'dislike' : lovedById.has(c.id) ? 'like' : null;
    state.corrections.push({ id: c.id, kind: 'played', ...(reaction ? { reaction } : {}) });
    taps++;
    const engine = recommend(cat, prof(), sess());
    const before = new Set(cards(shown).map((x) => x.id));
    shown = fillPicks(shown, engine, removedIds(state));
    for (const x of cards(shown)) if (!before.has(x.id)) { all.set(x.id, x); if (seenAll.has(x.id)) wall++; }
  }
  const T = targetsOf(P);
  const shownT = [...all.keys()].filter((id) => T.has(id)).length;
  const finalT = cards(shown).filter((c) => T.has(c.id)).length;
  const ranks = P.targets.map((t) => whyNot(cat, t.id, prof(), sess())).map((w) => w.rank ?? Infinity);
  return { taps, wall, shownT, finalT, best: Math.min(...ranks), ranks };
}
const med = (xs) => { const v = [...xs].sort((a, b) => a - b); return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2; };
for (const [name, v] of Object.entries(V)) {
  const rows = runs.map((run) => ({ run, ...replayResult(run, v) }));
  const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
  console.log(`\n-- ${name}: targets shown ${sum('shownT')}/36 (on screen at the end ${sum('finalT')}), taps ${sum('taps')}, replacements that were seen (wall) ${sum('wall')}, median best rank ${med(rows.map((r) => r.best))}`);
  for (const r of rows) console.log(`   ${pad(r.run.persona.id + ' ' + r.run.mode, 20)} taps ${r.taps} wall ${r.wall} targets shown ${r.shownT} best ${r.best} ranks [${r.ranks.join(', ')}]`);
}

console.log('\n=== 3. Limit of adaptive questions 5 instead of 3 (whole dialogue replayed) ===');
ASK.max = 5;
const runs5 = [];
for (const P of personas) for (const mode of ['careful', 'lazy']) runs5.push(play(P, mode, catalogs));
ASK.max = 3;
for (let i = 0; i < runs.length; i++) {
  const a = runs[i], b = runs5[i];
  const shown = (r) => r.targets.filter((t) => t.shown).length;
  const asksText = (r) => r.log.filter((l) => l.step === 'ask').map((l) => `${l.question.title.slice(0, 28)}→${l.action.type === 'skip' ? 'всё равно' : l.action.value}`).join('; ');
  console.log(`${pad(a.persona.id + ' ' + a.mode, 20)} asks ${a.asks}→${b.asks} | targets shown ${shown(a)}→${shown(b)} | best ${a.best?.why.rank}→${b.best?.why.rank} | extra: ${asksText(b).split('; ').slice(a.asks).join('; ')}`);
}
const tot = (rs) => rs.reduce((n, r) => n + r.targets.filter((t) => t.shown).length, 0);
console.log(`total targets shown: ${tot(runs)} → ${tot(runs5)}; median best ${med(runs.map((r) => r.best.why.rank))} → ${med(runs5.map((r) => r.best.why.rank))}`);
