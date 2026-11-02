// Architect experiment 2026-10-29, part 3: what a lazy person finds on the «Что знаешь» pages.
// For every persona: how many of its known titles (loved + disliked + alsoSeen) are on pages 1, 2, 3 of the anchors
// screen as seeded today (coverage gain + 2·popularity, random among the top 3), against a popularity-first page.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const ROOT = 'E:/project/TASTIQ';
const mod = (p) => import(pathToFileURL(resolve(ROOT, p)).href);
const { loadCatalogs } = await mod('src/core/catalog.js');
const { loadPersonas } = await mod('src/stand/personas.js');
const { seedItems } = await mod('src/core/questions.js');
const { initialState, reduce, screen } = await mod('src/core/dialogue.js');

const catalogs = loadCatalogs();
const personas = loadPersonas();
const PAGE = 8;

// Popularity-first page: the most popular titles that fit tonight, one per work, skipping what was shown.
function popularPage(catalog, { shown, genres, strict, platform, n }) {
  const skip = new Set(shown);
  const works = new Set(shown.map((id) => catalog.byId.get(id)?.work));
  const present = (v) => v && v.r >= 0.5 && v.c >= 0.5;
  const fits = (g) => !genres.length || genres.some((f) => present(g.features[f]));
  const test = catalog.domain.id === 'game' ? (g) => g.platforms?.[platform ?? 'windows'] : () => true;
  const out = [];
  const pool = catalog.items.filter((g) => g.released && test(g) && g.quality >= catalog.domain.qualityFloor && !skip.has(g.id)).sort((a, b) => b.popularity - a.popularity);
  for (const g of [...pool.filter(fits), ...(strict ? [] : pool.filter((g) => !fits(g)))]) {
    if (works.has(g.work)) continue;
    out.push(g); works.add(g.work);
    if (out.length >= n) break;
  }
  return out;
}

const focus = (P) => {
  const c = P.situation?.company;
  if (c === 'kids') return ['content.family'];
  if (P.domain === 'game' && c === 'friend') return ['social.coop'];
  if (P.domain === 'game' && c === 'group') return ['social.coop', 'social.pvp'];
  return [];
};

let totCur = [0, 0, 0], totPop = [0, 0, 0];
for (const P of personas) {
  const catalog = catalogs[P.domain];
  const known = new Set([...P.loved, ...P.disliked, ...(P.alsoSeen ?? [])].map((x) => x.id));
  const seed = P.modes.lazy.seed;
  // current pages, as the dialogue would seed them for this persona (same seed, same situation)
  let state = { ...initialState(), seed };
  state = reduce(state, { type: 'choose', value: P.domain }, catalogs);
  if (P.domain === 'game') state = reduce(state, { type: 'choose', value: P.platform ?? 'windows' }, catalogs);
  if (state.step === 'time') state = reduce(state, P.situation?.time ? { type: 'choose', value: P.situation.time } : { type: 'skip' }, catalogs);
  state = reduce(state, P.situation?.company ? { type: 'choose', value: P.situation.company } : { type: 'skip' }, catalogs);
  const cur = [], pop = [];
  let shownPop = [];
  for (let page = 0; page < 3; page++) {
    const scr = screen(state, catalogs);
    const ids = scr.items.map((x) => x.id);
    cur.push(ids.filter((id) => known.has(id)).length);
    state = reduce(state, { type: 'more', ids }, catalogs);
    const pp = popularPage(catalog, { shown: shownPop, genres: focus(P), strict: P.situation?.company === 'kids', platform: P.platform, n: PAGE });
    pop.push(pp.filter((g) => known.has(g.id)).length);
    shownPop.push(...pp.map((g) => g.id));
  }
  cur.forEach((x, i) => (totCur[i] += x)); pop.forEach((x, i) => (totPop[i] += x));
  console.log(`${P.id.padEnd(10)} known ${known.size}: current pages [${cur.join(', ')}] | popularity-first [${pop.join(', ')}]`);
}
console.log(`totals over 6 personas: current [${totCur.join(', ')}] | popularity-first [${totPop.join(', ')}]`);
