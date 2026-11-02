// What to ask. Titles to rate: popular ones that fit tonight (family titles with kids), picked to cover different
// features (Rashid et al. 2002: popular titles are the cheapest to answer), with a little randomness
// against winner-takes-all. Later: one fork question only when its answer can swap top-1 and top-2
// (research raw/04, 3.2).
import { PLATFORMS } from './sieves.js';

export const QUESTION_BUDGET = 2;
const SEED_POOL = 90;
// The first page of known titles is chosen among this many best known works for tonight. Night 29.10: with 8 (the
// plain top) the six personas know 19 titles on it, with 20 only 13 and with 50 12, while the page exists for a
// person who marks what they recognise; the stand of 200 people prefers 20 (first hits 51/38/69 % against 44/36/65 %
// for games/films/series) because its people know the top 150 evenly and it pays only for coverage.
export const FIRST_PAGE = { pool: 8 };

const present = (v) => v && v.r >= 0.5 && v.c >= 0.5;

/** Small deterministic PRNG so a seed screen can be reproduced from its seed. */
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

// Everyday genre words for the coarse first question about films, series and cartoons (IMDb genres).
const SCREEN_GENRES_RU = {
  Comedy: 'комедии', Drama: 'драмы', Action: 'боевики', Thriller: 'триллеры', Horror: 'ужасы', 'Sci-Fi': 'фантастика',
  Fantasy: 'фэнтези', Crime: 'криминал', Mystery: 'детективы', Romance: 'мелодрамы', Adventure: 'приключения',
  Animation: 'мультфильмы', Family: 'семейное', History: 'историческое', War: 'военное', Biography: 'биографии',
  Documentary: 'документальное', Music: 'музыка', Musical: 'мюзиклы', Sport: 'спорт', Western: 'вестерны', 'Film-Noir': 'нуар',
};

/**
 * Coarse "what do you usually play/watch" options. Films and series: everyday genre words (IMDb genres);
 * games: the most common kinds of game from the dictionary. Only used to choose which titles to ask about.
 */
export function genreOptions(catalog, limit = 16) {
  const counts = new Map();
  const screenDomain = catalog.domain.id !== 'game';
  for (const item of catalog.items) {
    if (screenDomain) {
      for (const g of item.genres ?? []) if (SCREEN_GENRES_RU[g]) counts.set(`genre:${g}`, (counts.get(`genre:${g}`) ?? 0) + 1);
      continue;
    }
    for (const [f, v] of Object.entries(item.features)) {
      const feature = catalog.dict.featureById.get(f);
      if (feature?.category && present(v)) counts.set(f, (counts.get(f) ?? 0) + 1);
    }
  }
  return [...counts]
    .filter(([, n]) => n >= Math.max(2, catalog.items.length * 0.004))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([f, n]) => ({ f, label: f.startsWith('genre:') ? SCREEN_GENRES_RU[f.slice(6)] : catalog.dict.featureById.get(f).label, n }));
}

/**
 * Titles to ask about. genres: features tonight calls for (family titles with kids, co-op with friends);
 * when given, most of the pool comes from them. strict: no other titles while the fitting ones fill the page
 * (a parent watching with kids is not asked about «Пацаны»).
 */
export function seedItems(catalog, { answered = [], platform = 'windows', genres = [], strict = false, n = 10, seed = Date.now(), first = false } = {}) {
  const test = catalog.domain.id === 'game' ? (PLATFORMS[platform] ?? PLATFORMS.windows).test : () => true;
  const skip = new Set(answered);
  const usedWorks = new Set(answered.map((id) => catalog.byId.get(id)?.work));
  const matches = (g, f) => (f.startsWith('genre:') ? (g.genres ?? []).includes(f.slice(6)) : present(g.features[f]));
  const inGenres = (g) => !genres.length || genres.some((f) => matches(g, f));
  const candidates = catalog.items
    .filter((g) => g.released && test(g) && !skip.has(g.id) && g.quality >= catalog.domain.qualityFloor)
    .sort((a, b) => b.popularity - a.popularity);
  const inside = candidates.filter(inGenres).slice(0, SEED_POOL);
  const others = !genres.length || (strict && inside.length >= n) ? 0 : 10;
  const pool = [...inside, ...candidates.filter((g) => !inGenres(g)).slice(0, others)];

  // The first page is the same for everyone with the same tonight and has no randomness: it picks by coverage, like
  // later pages, but only among the best known titles, so a person who looks at one page finds titles they know there
  // (personas: 18 known instead of 11 on a page of the top 8) and the marks still say different things about taste.
  if (first) {
    const works = new Set(usedWorks);
    const best = pool.filter((g) => !works.has(g.work) && works.add(g.work)).slice(0, FIRST_PAGE.pool);
    pool.splice(0, pool.length, ...best);
  }

  const covered = new Set();
  for (const id of skip) {
    const g = catalog.byId.get(id);
    if (g) for (const [f, v] of Object.entries(g.features)) if (present(v)) covered.add(f);
  }

  const random = rng(seed);
  const picked = [];
  while (picked.length < n && pool.length) {
    const ranked = pool
      .filter((g) => !usedWorks.has(g.work))
      .map((g) => {
        let gain = 0;
        for (const [f, v] of Object.entries(g.features)) {
          // Length taken from playtime says nothing about taste; counting it filled the pages with titles that cover
          // it (game stand: first hits 57 → 48 % on such pages, night 29.10).
          if (present(v) && !covered.has(f) && !catalog.dict.featureById.get(f)?.risk && !v.src?.includes('hours')) gain += catalog.idf[f] ?? 1;
        }
        return { g, gain: gain + 2 * g.popularity + (inGenres(g) ? 3 : 0) };
      })
      .sort((a, b) => b.gain - a.gain);
    if (!ranked.length) break;
    const choice = ranked[first ? 0 : Math.floor(random() * Math.min(3, ranked.length))].g;
    picked.push(choice);
    usedWorks.add(choice.work);
    pool.splice(pool.indexOf(choice), 1);
    for (const [f, v] of Object.entries(choice.features)) if (present(v)) covered.add(f);
  }
  // On the first page the best known titles come first: a person who marks the first familiar ones and moves on
  // marks the titles most people know.
  return first ? picked.sort((a, b) => b.popularity - a.popularity) : picked;
}

/** Chips for "за что понравилось": the title's own strong features, no flaws. */
export function likeChips(item, catalog, limit = 10) {
  const { featureById } = catalog.dict;
  // Mostly how strong the feature is in this title; rarity only nudges ("живой мир" must not lose to
  // a rare but minor feature).
  return Object.entries(item.features)
    .filter(([f, v]) => v.r >= 0.4 && v.c >= 0.4 && featureById.has(f))
    .filter(([f]) => !featureById.get(f).risk && featureById.get(f).like && f !== 'social.solo')
    .map(([f, v]) => ({ f, label: featureById.get(f).label, weight: v.r * v.c * (catalog.idf[f] ?? 1) ** 0.3 }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .map(({ f, label }) => ({ f, label }));
}

// Features most popular titles have («красивая картинка» on 64 % of popular films) tell nothing about a person.
const UBIQUITOUS_SHARE = 0.5;
const UBIQUITOUS_POOL = 1000;
const ubiquitousCache = new WeakMap();

function ubiquitous(catalog) {
  if (ubiquitousCache.has(catalog)) return ubiquitousCache.get(catalog);
  const popular = catalog.items
    .filter((g) => g.released && g.quality >= catalog.domain.qualityFloor)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, UBIQUITOUS_POOL);
  const counts = new Map();
  for (const g of popular) for (const [f, v] of Object.entries(g.features)) if (present(v)) counts.set(f, (counts.get(f) ?? 0) + 1);
  const out = new Set([...counts].filter(([, n]) => n > popular.length * UBIQUITOUS_SHARE).map(([f]) => f));
  ubiquitousCache.set(catalog, out);
  return out;
}

const FUNNY = 'humor.funny';
const FUNNY_MIN = 0.8; // r·c of «смешно» that keeps it in the pair

/**
 * «За что» as a choice between two: the two features that set this title apart (r·c·idf), no flaws, no
 * categories, nothing most popular titles have. Falls back to the top chips when the title has fewer.
 */
export function pairFor(item, catalog) {
  const { featureById } = catalog.dict;
  const common = ubiquitous(catalog);
  const pair = Object.entries(item.features)
    .filter(([f, v]) => present(v) && featureById.has(f) && !common.has(f))
    .filter(([f]) => { const x = featureById.get(f); return !x.risk && x.like && !x.category && f !== 'social.solo'; })
    .map(([f, v]) => ({ f, label: featureById.get(f).label, weight: v.r * v.c * (catalog.idf[f] ?? 1) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map(({ f, label }) => ({ f, label }));
  // Laughter is why people love a comedy, yet «смешно» is too common to win on rarity (36 % of popular series,
  // 64 % of cartoons): Friends got «ансамбль | дружба». A strongly funny title keeps it in the pair.
  for (const c of likeChips(item, catalog)) if (pair.length < 2 && !pair.some((p) => p.f === c.f)) pair.push(c);
  const funny = item.features[FUNNY];
  // Films and series only: in games «много юмора» is not that common and the distinctive pair already finds it
  // (Portal 2), while Disco Elysium would lose «разговоры и решения» to it.
  if (catalog.domain.id !== 'game' && pair.length === 2 && funny && funny.r * funny.c >= FUNNY_MIN && featureById.has(FUNNY) && !pair.some((p) => p.f.startsWith('humor.'))) {
    pair[1] = { f: FUNNY, label: featureById.get(FUNNY).label };
  }
  return pair;
}

/**
 * Chips for "что не понравилось" (mode 'dislike') and "почему бросил" (mode 'tried'). Two groups:
 * complaints ("скучно", "слишком сложно") that fit this title, and categories of the title the person
 * may dislike in general ("стрельба", "фэнтези"). Complaints the reviews also make come first.
 */
export function complaintChips(item, catalog, mode = 'dislike', limit = 8) {
  const { featureById, complaints: all } = catalog.dict;
  const isSeries = item.kind === 'series';
  const strength = (f) => {
    const v = item.features[f];
    // Flaws come from complaints in reviews and are tagged weaker (one complaint = r 0.33).
    const min = featureById.get(f).risk ? 0.3 : 0.4;
    return v && v.r >= min ? v.r * v.c : 0;
  };
  const fitting = all.filter((c) => (mode === 'tried' ? c.tried : true) && (!c.series || isSeries));
  // Complaints this title actually invites come first, strongest first; a few general ones fill in.
  const specific = fitting.filter((c) => strength(c.f) > 0).sort((a, b) => strength(b.f) - strength(a.f)).slice(0, limit - 2);
  const general = fitting.filter((c) => c.shown === 'always' && !specific.includes(c));
  const complaints = [...specific, ...general].slice(0, limit).map((c) => ({ f: c.f, label: c.label }));
  const shown = new Set(complaints.map((c) => c.f));
  const defining = new Set(catalog.domain.defining ?? []);
  const categories = Object.entries(item.features)
    .filter(([f, v]) => featureById.get(f)?.category && v.r >= 0.5 && v.c >= 0.4 && !shown.has(f) && !defining.has(f))
    .sort((a, b) => b[1].r * b[1].c - a[1].r * a[1].c)
    .slice(0, 6)
    .map(([f]) => ({ f, label: featureById.get(f).label }));
  return { complaints, categories };
}

/**
 * A question "what matters more to you: A or B" where A is typical of top-1 and B of top-2,
 * asked only if one of the answers would put top-2 first.
 * score(title | +preference f) is estimated from the title's r·c·idf on f.
 */
export function forkQuestion(top1, top2, taste, catalog, asked = 0) {
  if (!top1 || !top2 || asked >= QUESTION_BUDGET) return null;
  const { featureById } = catalog.dict;
  const known = (f) => taste.weights.get(f)?.confirmed || taste.weights.get(f)?.preferred || taste.dislike.has(f) || taste.hardNo.has(f);
  const value = (g, f) => {
    const v = g.game.features[f];
    return v ? v.r * v.c * (catalog.idf[f] ?? 1) : 0;
  };
  const candidates = new Set([...Object.keys(top1.game.features), ...Object.keys(top2.game.features)]);
  let best1 = null;
  let best2 = null;
  for (const f of candidates) {
    const feature = featureById.get(f);
    // Only taste features worth asking about: no flaws, no content intensity, no play mode.
    if (!feature || feature.risk || !feature.like || !feature.infer || known(f)) continue;
    const diff = value(top1, f) - value(top2, f);
    if (diff > 0.25 && (!best1 || diff > best1.diff)) best1 = { f, diff };
    if (-diff > 0.25 && (!best2 || -diff > best2.diff)) best2 = { f, diff: -diff };
  }
  if (!best1 || !best2) return null;

  const weight = 0.7; // TASTE.preference
  const margin = top1.score - top2.score;
  const marginIfB = margin + weight * (value(top1, best2.f) - value(top2, best2.f));
  if (marginIfB >= 0) return null; // no answer would change the leader: do not spend a question

  return {
    id: `fork:${best1.f}|${best2.f}`,
    text: catalog.domain.id === 'game' ? 'Что тебе в играх важнее?' : 'Что тебе важнее?',
    options: [
      { f: best1.f, label: featureById.get(best1.f).label, favours: top1.game.id },
      { f: best2.f, label: featureById.get(best2.f).label, favours: top2.game.id },
    ],
    margin,
  };
}
