// One recommendation pass: sieves → scoring → diversity → confidence label → explanation.
// Pure function of (catalog, profile, session); the server keeps no state between calls.
import { BELIEF, belief } from './belief.js';
import { buildFacts, renderExplanation, validateExplanation } from './explain.js';
import { buildTaste } from './profile.js';
import { scoreGame, sessionMoodWeights } from './score.js';
import { applySieves, checkSieves, SIEVES } from './sieves.js';
import { feasibilityOf } from './feasibility.js';

export const ALTERNATIVES = 3;
const MMR_LAMBDA = 0.7;
const STRONG_MARGIN = 0.1; // a title within 10% of the leader is as good a guess as the leader (diversity ties)

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

/** Maximal marginal relevance: alternatives that are good but not copies of the leader. */
export function diversify(ranked, k) {
  if (!ranked.length) return [];
  const maxScore = Math.max(...ranked.map((r) => r.score));
  const minScore = Math.min(...ranked.map((r) => r.score));
  const norm = (s) => (maxScore > minScore ? (s - minScore) / (maxScore - minScore) : 1);
  const pool = ranked.slice(0, 60).map((r) => ({ ...r, vec: vector(r.game) }));
  const selected = [pool.shift()];
  // A title almost tied with the leader is as good a guess as the leader: diversity may choose among such
  // titles, but never trades one for a weaker title that is merely different.
  const tie = selected[0].score - STRONG_MARGIN * Math.abs(selected[0].score);
  while (selected.length < k + 1 && pool.length) {
    const ties = pool.filter((c) => c.score >= tie);
    let best = null;
    let bestValue = -Infinity;
    for (const cand of ties.length ? ties : pool) {
      const sim = Math.max(...selected.map((s) => cosine(cand.vec, s.vec)));
      const value = MMR_LAMBDA * norm(cand.score) - (1 - MMR_LAMBDA) * sim;
      if (value > bestValue) { bestValue = value; best = cand; }
    }
    selected.push(pool.splice(pool.indexOf(best), 1)[0]);
  }
  return selected.map(({ vec, ...rest }) => rest);
}

/**
 * Confidence label is computed by code, never written by a model (pilot error 8). «Сильное попадание» needs two
 * reasons named about titles, no hit on a dislike and the belief on the leader (plan, 3.5).
 */
export function confidenceLabel(detail, p1) {
  const strong = new Set(detail.matches.filter((m) => m.confirmed && m.r >= 0.67 && m.c >= 0.5).map((m) => m.f));
  const dislikeHit = detail.penalties.some((p) => p.r >= 0.5);
  if (strong.size >= 2 && !dislikeHit && p1 >= BELIEF.pStop) return 'strong';
  if (detail.matches.some((m) => m.confirmed && m.r >= 0.5)) return 'likely';
  return 'try';
}

export const LABELS = { strong: 'Сильное попадание', likely: 'Вероятно подойдёт', try: 'Попробуй: мало данных о твоём вкусе' };

// Steam prices come in the currency of the region they were collected from (THB, JPY): only «бесплатно» is shown.
function priceOf(item) {
  return item.isFree ? 'бесплатно' : null;
}

function present(item, detail, taste, label, catalog, session) {
  const feasibility = feasibilityOf(item, session);
  if (label === 'strong' && feasibility.some((f) => f.status !== 'yes')) label = 'likely';
  const facts = buildFacts(item, detail, taste, catalog);
  const explanation = renderExplanation(facts, catalog);
  const check = validateExplanation(explanation, facts);
  if (!check.ok) throw new Error(`Explanation for ${item.id} failed validation: ${check.errors.join('; ')}`);
  return {
    id: item.id,
    domain: catalog.domain.id,
    name: item.name,
    ru: item.ru,
    year: item.year,
    image: item.image ?? null,
    poster: item.poster ?? null,
    kind: item.kind,
    series: item.series ?? [],
    genres: (item.genres ?? []).slice(0, 3),
    runtime: item.runtime ?? null,
    seasons: item.seasons ?? null,
    episodes: item.episodes ?? null,
    status: item.status ?? null,
    rating: item.reviews?.desc ?? null,
    link: item.link,
    price: priceOf(item),
    label,
    labelText: LABELS[label],
    score: Number(detail.score.toFixed(3)),
    parts: Object.fromEntries(Object.entries(detail.parts).map(([k, v]) => [k, Number(v.toFixed(3))])),
    mainAspect: detail.mainAspect,
    explanation,
    facts,
    feasibility,
  };
}

/** What the system believes about the person, with where each belief came from ("вот как я тебя вижу"). */
export function summarizeTaste(taste, catalog) {
  const { featureById, complaintByFeature } = catalog.dict;
  const row = ([f, v], kinds) => {
    const sources = v.sources.filter((s) => !kinds || kinds.includes(s.kind));
    return {
      f,
      label: featureById.get(f)?.label ?? f,
      w: Number((v.w ?? v.d ?? 0).toFixed(2)),
      sources: [...new Set(sources.map((s) => s.name).filter(Boolean))],
      ids: [...new Set(sources.map((s) => s.id).filter(Boolean))],
      preference: sources.some((s) => s.kind === 'preference'),
    };
  };
  const complaintRow = (x) => ({ ...row(x), label: complaintByFeature.get(x[0])?.label ?? row(x).label });
  const weights = [...taste.weights].sort((a, b) => b[1].w - a[1].w);
  return {
    confirmed: weights.filter(([, v]) => v.confirmed || v.preferred).map((x) => row(x, ['confirmed', 'preference'])),
    inferred: weights.filter(([, v]) => !v.confirmed && !v.preferred).slice(0, 8).map((x) => row(x)),
    dislikes: [...taste.dislike].map(complaintRow),
    hardNo: [...taste.hardNo].map(complaintRow),
    consumed: taste.consumed.size,
  };
}

export function rankAll(catalog, profile = {}, session = {}) {
  const taste = buildTaste(catalog, profile);
  const mood = sessionMoodWeights(session, catalog.dict);
  const { passed, removed } = applySieves(catalog, taste, session);
  const ranked = passed
    .map((game) => ({ game, ...scoreGame(game, taste, mood, catalog, session) }))
    .sort((a, b) => b.score - a.score);
  return { taste, mood, ranked, removed };
}

/** The shown titles: the leader and alternatives, each with a reason to be shown when there are enough such titles. */
export function choose(ranked) {
  const hasReason = (r) => r.matches.length > 0 || r.moodHits.some((h) => h.sign > 0);
  const withReason = ranked.filter(hasReason);
  const pool = withReason.length > ALTERNATIVES ? withReason : [...withReason, ...ranked.filter((r) => !hasReason(r))];
  return { pool, picked: diversify(pool, ALTERNATIVES) };
}

export function recommend(catalog, profile = {}, session = {}) {
  const { taste, ranked, removed } = rankAll(catalog, profile, session);
  const sieves = SIEVES.map((s) => ({ ...s, removed: removed[s.id] }));
  if (!ranked.length) return { top: null, alternatives: [], sieves, considered: 0, taste: summarizeTaste(taste, catalog) };

  const { pool, picked } = choose(ranked);
  const p1 = belief(pool.map((r) => r.score))[0];
  const [top, ...alts] = picked.map((r, i) => present(r.game, r, taste, confidenceLabel(r, i === 0 ? p1 : 0), catalog, session));
  return {
    top,
    alternatives: alts,
    belief: Number(p1.toFixed(3)),
    sieves,
    considered: ranked.length,
    taste: summarizeTaste(taste, catalog),
    today: session.intent ?? null,
  };
}

/**
 * The result for titles chosen elsewhere (the AI picker, src/ai/pick.js), in that order, explained and labelled by
 * the engine like its own picks. Ids the sieves removed are skipped; null when none is left.
 */
export function recommendIds(catalog, profile = {}, session = {}, ids = []) {
  const { taste, ranked, removed } = rankAll(catalog, profile, session);
  const byId = new Map(ranked.map((r) => [r.game.id, r]));
  const rows = ids.map((id) => byId.get(id)).filter(Boolean);
  if (!rows.length) return null;
  const { pool } = choose(ranked);
  const p1 = belief(pool.map((r) => r.score))[0];
  const leader = pool[0]?.game.id;
  const [top, ...alts] = rows.map((r, i) => present(r.game, r, taste, confidenceLabel(r, i === 0 && r.game.id === leader ? p1 : 0), catalog, session));
  return {
    top,
    alternatives: alts,
    belief: Number(p1.toFixed(3)),
    sieves: SIEVES.map((s) => ({ ...s, removed: removed[s.id] })),
    considered: ranked.length,
    taste: summarizeTaste(taste, catalog),
    today: session.intent ?? null,
  };
}

/** "Почему не X?": which sieve removed the title, or where it ranks and why. */
export function whyNot(catalog, id, profile = {}, session = {}) {
  const item = catalog.byId.get(id);
  if (!item) return { error: 'нет в каталоге' };
  const { featureById } = catalog.dict;
  const { taste, ranked } = rankAll(catalog, profile, session);
  const removedBy = checkSieves(item, taste, session, catalog);
  if (removedBy) return { id: item.id, name: item.name, removedBy, sieveName: SIEVES.find((s) => s.id === removedBy.sieve).name };
  const index = ranked.findIndex((r) => r.game.id === item.id);
  const r = ranked[index];
  return {
    id: item.id,
    name: item.name,
    rank: index + 1,
    of: ranked.length,
    score: Number(r.score.toFixed(3)),
    parts: r.parts,
    leaderScore: Number(ranked[0].score.toFixed(3)),
    matches: r.matches.slice(0, 6).map((m) => ({ f: m.f, label: featureById.get(m.f).label, contribution: Number(m.contribution.toFixed(3)), confirmed: m.confirmed })),
    penalties: r.penalties.map((p) => ({ f: p.f, label: featureById.get(p.f).label, contribution: Number(p.contribution.toFixed(3)) })),
  };
}
