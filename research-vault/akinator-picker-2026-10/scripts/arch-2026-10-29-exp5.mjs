// (a) TASTE.seenInfer sweep on the result phase (the lead added the parameter to src/core/profile.js on 29.10).
// (b) Length-from-hours thresholds 10/40 vs 12/30 against the LLM tags, story-like games only.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const ROOT = 'E:/project/TASTIQ';
const mod = (p) => import(pathToFileURL(resolve(ROOT, p)).href);
const { loadCatalogs } = await mod('src/core/catalog.js');
const { play, loadPersonas } = await mod('src/stand/personas.js');
const { profileOf, sessionOf } = await mod('src/core/dialogue.js');
const { recommend, whyNot } = await mod('src/core/recommend.js');
const { TASTE } = await mod('src/core/profile.js');
const { fillPicks, removedIds } = await mod('src/server/public/shared/fill-picks.js');

const catalogs = loadCatalogs();
const personas = loadPersonas();
const pad = (s, n) => String(s).padEnd(n);
const med = (xs) => { const v = [...xs].sort((a, b) => a - b); return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2; };
const preTap = (state) => ({ ...state, corrections: state.corrections.filter((c) => c.kind !== 'played'), session: { ...state.session, notNow: [] } });

const runs = [];
for (const P of personas) for (const mode of ['careful', 'lazy']) runs.push(play(P, mode, catalogs));

function replayResult(run) {
  const P = run.persona, cat = catalogs[P.domain], M = P.modes[run.mode];
  const lovedById = new Map(P.loved.map((x) => [x.id, x]));
  const dislikedById = new Map(P.disliked.map((x) => [x.id, x]));
  const seenAll = new Set([...lovedById.keys(), ...dislikedById.keys(), ...(P.alsoSeen ?? []).map((x) => x.id)]);
  const state = structuredClone(preTap(run.finalState));
  let shown = recommend(cat, profileOf(state), sessionOf(state));
  const cards = (r) => [r.top, ...r.alternatives].filter(Boolean);
  const seenOn = (r) => cards(r).filter((c) => seenAll.has(c.id));
  const all = new Map(cards(shown).map((c) => [c.id, c]));
  let taps = 0, wall = 0, dislikedTaps = 0;
  for (let n = 0; n < 12; n++) {
    const c = seenOn(shown)[0];
    if (!c) break;
    state.corrections = state.corrections.filter((x) => !(x.kind === 'played' && x.id === c.id));
    const reaction = !M.result?.rate ? null : dislikedById.has(c.id) ? 'dislike' : lovedById.has(c.id) ? 'like' : null;
    if (!reaction && dislikedById.has(c.id)) dislikedTaps++;
    state.corrections.push({ id: c.id, kind: 'played', ...(reaction ? { reaction } : {}) });
    taps++;
    const engine = recommend(cat, profileOf(state), sessionOf(state));
    const before = new Set(cards(shown).map((x) => x.id));
    shown = fillPicks(shown, engine, removedIds(state));
    for (const x of cards(shown)) if (!before.has(x.id)) { all.set(x.id, x); if (seenAll.has(x.id)) wall++; }
  }
  const T = new Set(P.targets.map((t) => t.id));
  const ranks = P.targets.map((t) => whyNot(cat, t.id, profileOf(state), sessionOf(state))).map((w) => w.rank ?? Infinity);
  return { taps, wall, dislikedTaps, shownT: [...all.keys()].filter((id) => T.has(id)).length, best: Math.min(...ranks), ranks };
}

console.log('=== (a) seenInfer sweep (result phase replayed; «как есть» before 29.10 = 0) ===');
for (const w of [0, 0.05, 0.125, 0.25, 0.5]) {
  TASTE.seenInfer = w;
  const rows = runs.map((run) => ({ run, ...replayResult(run) }));
  const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
  console.log(`seenInfer ${w}: targets shown ${sum('shownT')}/36, taps ${sum('taps')} (on disliked without rating ${sum('dislikedTaps')}), wall ${sum('wall')}, median best ${med(rows.map((r) => r.best))} | ` +
    rows.filter((r) => r.taps).map((r) => `${r.run.persona.id}-${r.run.mode[0]} best ${r.best} [${r.ranks.join(',')}] wall ${r.wall}`).join('; '));
}
TASTE.seenInfer = 0.25;

console.log('\n=== (b) length from hours: thresholds against LLM tags, story-like only ===');
const games = catalogs.game;
const present = (v) => v && v.r >= 0.5 && v.c >= 0.5;
const has = (g, f) => present(g.features[f]);
const hours = (g) => (g.medianHoursAtReview != null && g.medianHoursAtReview > 0 ? g.medianHoursAtReview : null);
const story = (g) => has(g, 'story.central') || (has(g, 'social.solo') && !has(g, 'social.pvp') && !has(g, 'length.endless'));
const above = games.items.filter((g) => g.released && g.quality >= games.domain.qualityFloor);
const head = [...above].sort((a, b) => b.popularity - a.popularity).slice(0, 500);
const noTag = (g) => !has(g, 'length.short') && !has(g, 'length.long') && !has(g, 'length.endless');
for (const [lo, hi] of [[10, 40], [12, 30], [12, 40], [15, 30]]) {
  const rule = (h) => (h == null ? null : h <= lo ? 'short' : h >= hi ? 'long' : null);
  let agree = 0, disagree = 0, between = 0;
  const wrong = [];
  for (const g of above.filter((g) => story(g) && hours(g) != null && (has(g, 'length.short') || has(g, 'length.long')))) {
    const r = rule(hours(g)), t = has(g, 'length.short') ? 'short' : 'long';
    if (!r) between++; else if (r === t) agree++; else { disagree++; wrong.push(`${g.name} ${hours(g)}ч/${t}`); }
  }
  const gain = head.filter((g) => noTag(g) && story(g) && rule(hours(g)));
  const headTagged = head.filter((g) => !noTag(g)).length;
  console.log(`≤${lo}/≥${hi}: agree ${agree}, disagree ${disagree} (${wrong.join('; ')}), between ${between} | head-500 tagged ${headTagged} → ${headTagged + gain.length} (+${gain.filter((g) => rule(hours(g)) === 'short').length} short, +${gain.filter((g) => rule(hours(g)) === 'long').length} long)`);
}
