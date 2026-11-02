// Synthetic players / viewers for the stands (research raw/04, section 8.1 item 3). Each one has a hidden taste:
// two liked features and one disliked, and answers honestly by that taste. A shown title is a hit if it has a liked
// feature and not the disliked one; a strong hit has both liked features.
//
// Truth is defined by the catalog's own tags, so the stands check the logic (does asking help, how many answers
// are needed), not whether the tags describe the titles correctly.
//
// The features a taste is drawn from come from pools.json (frozen by freeze-pools.js), not from the current tags:
// the live pool keeps only features on at least 1 % of titles, so new tags change it and with it every person
// (series re-tagging on 2026-10-26 grew the likeable pool from 20 to 39 features). With a frozen pool the same people
// meet both versions of the data. livePool() gives the pool the current tags would make.
import { existsSync, readFileSync } from 'node:fs';
import { complaintChips, likeChips } from '../core/questions.js';

const KNOWS_TOP = 150; // a person may know a title from the 150 most popular ones
const KNOW_PROB = 0.55;
export const POOLS_FILE = new URL('./pools.json', import.meta.url);

const has = (g, f) => (g.features[f]?.r ?? 0) >= 0.5 && (g.features[f]?.c ?? 0) >= 0.5;

/** The feature pools the catalog's current tags make: features on at least 1 % of titles (15 at least). */
export function livePool(catalog) {
  const { featureById } = catalog.dict;
  const dfCount = new Map();
  for (const g of catalog.items) for (const f of Object.keys(g.features)) if (has(g, f)) dfCount.set(f, (dfCount.get(f) ?? 0) + 1);
  const minDf = Math.max(15, catalog.items.length * 0.01);
  return {
    likeable: [...featureById.values()].filter((f) => f.like && f.infer && !f.risk && (dfCount.get(f.id) ?? 0) >= minDf).map((f) => f.id),
    dislikeable: [...featureById.values()].filter((f) => (f.risk || f.category) && (dfCount.get(f.id) ?? 0) >= minDf).map((f) => f.id),
  };
}

/** The frozen pool of a domain from pools.json, or null when the domain has none. */
export function frozenPool(domain) {
  if (!existsSync(POOLS_FILE)) return null;
  const pools = JSON.parse(readFileSync(POOLS_FILE, 'utf8'));
  return pools.domains?.[domain] ?? null;
}

/** pool: 'frozen' (pools.json, the live pool where a domain has none), 'live', or { likeable, dislikeable }. */
export function createPeople(catalog, { seed = 12345, pool = 'frozen' } = {}) {
  const { featureById } = catalog.dict;
  let state = seed;
  const rand = () => ((state = (state * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const chosen = typeof pool === 'object' ? pool : (pool === 'frozen' && frozenPool(catalog.domain.id)) || livePool(catalog);
  // A frozen feature the dictionary no longer has cannot be asked about or shown; it is left out.
  const likeable = chosen.likeable.filter((f) => featureById.has(f));
  const dislikeable = chosen.dislikeable.filter((f) => featureById.has(f));
  const popular = [...catalog.items].filter((g) => g.quality >= catalog.domain.qualityFloor).sort((a, b) => b.popularity - a.popularity).slice(0, KNOWS_TOP).map((g) => g.id);

  function makePerson() {
    const likes = new Set();
    while (likes.size < 2) likes.add(pick(likeable));
    let dislike;
    do dislike = pick(dislikeable); while (likes.has(dislike));
    return { likes: [...likes], dislike, known: new Set(popular.filter(() => rand() < KNOW_PROB)) };
  }

  /** How the person answers one title. withReasons=false models a system that never asks "за что". */
  function answer(person, g, withReasons) {
    if (!person.known.has(g.id)) return { reaction: 'unknown' };
    const liked = person.likes.filter((f) => has(g, f));
    const bad = has(g, person.dislike);
    if (liked.length && !bad) {
      const offered = new Set(likeChips(g, catalog).map((c) => c.f));
      return { reaction: liked.length === 2 ? 'love' : 'like', reasons: withReasons ? liked.filter((f) => offered.has(f)) : [] };
    }
    if (bad) {
      const { complaints, categories } = complaintChips(g, catalog, 'dislike');
      const offered = new Set([...complaints, ...categories].map((c) => c.f));
      return { reaction: 'dislike', issues: withReasons && offered.has(person.dislike) ? [{ f: person.dislike, hard: false }] : [] };
    }
    return { reaction: rand() < 0.5 ? 'like' : 'dislike' }; // a title outside the hidden taste: noise
  }

  const hit = (p, g) => p.likes.some((f) => has(g, f)) && !has(g, p.dislike);
  const strong = (p, g) => p.likes.every((f) => has(g, f)) && !has(g, p.dislike);

  return { makePerson, answer, hit, strong, has, rand, pool: { likeable, dislikeable } };
}
