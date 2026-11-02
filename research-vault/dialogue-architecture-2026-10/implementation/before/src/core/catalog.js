import { resolve } from 'node:path';
import { DOMAINS } from '../aspects/index.js';
import { CONTEXTS } from './context.js';
import { DATA, readJson } from '../lib/fsx.js';
import { normalizeTitle, transliterate, editDistance } from '../lib/text.js';

/**
 * Catalog of one domain in memory: items by id, editions grouped by work, a name index for search.
 * Every item has a string id, a domain, features {f: {r, c, src, ev}}, quality and popularity (0..1, log).
 */
export function makeCatalog(raw, domainId = 'game') {
  const domain = DOMAINS[domainId];
  const items = raw.items;
  const byId = new Map(items.map((g) => [g.id, g]));
  const byWork = new Map();
  for (const g of items) {
    if (!byWork.has(g.work)) byWork.set(g.work, []);
    byWork.get(g.work).push(g.id);
  }
  const names = items.map((g) => ({
    id: g.id,
    keys: [...new Set([g.name, g.ru, g.original, ...(g.aliases ?? [])].filter(Boolean).map(normalizeTitle))],
  }));
  const pops = items.map((g) => g.popularity);
  return {
    ...raw,
    domain,
    dict: domain.dict,
    items,
    byId,
    byWork,
    names,
    popRange: [Math.min(...pops), Math.max(...pops)],
  };
}

/** Loads every domain catalog: games from catalog.json, films, series and cartoons from catalog-screen.json. */
export function loadCatalogs({ gamesPath, screenPath } = {}) {
  const catalogs = {};
  // Russian translations of English evidence quotes (08-translate-quotes.js), shown with the original one tap away.
  const quotesRu = readJson(resolve(DATA, 'quotes-ru.json'), {});
  const translate = (items) => {
    for (const item of items) for (const v of Object.values(item.features)) for (const e of v.ev ?? []) if (e.q && quotesRu[e.q]) e.ru = quotesRu[e.q];
  };
  const games = readJson(gamesPath ?? resolve(DATA, 'catalog.json'), null);
  if (games) {
    translate(games.items);
    // Steam's portrait library capsule; some games lack it and the page falls back to the header image.
    for (const g of games.items) g.poster ??= `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/library_600x900.jpg`;
    catalogs.game = makeCatalog(games, 'game');
  }
  const screen = readJson(screenPath ?? resolve(DATA, 'catalog-screen.json'), null);
  // Prototype posters (s06-posters.js): Wikipedia thumbnails for popular screen titles.
  const posters = readJson(resolve(DATA, 'posters.json'), {});
  if (screen) {
    translate(screen.items);
    for (const item of screen.items) if (posters[item.id]) item.poster = posters[item.id];
    for (const domain of ['film', 'series', 'cartoon']) {
      catalogs[domain] = makeCatalog({ ...screen, items: screen.items.filter((x) => x.domain === domain) }, domain);
    }
  }
  return catalogs;
}

export function catalogMeta(catalogs) {
  return {domains:Object.fromEntries(Object.entries(catalogs).map(([id,c])=>[id,{
    items:c.items.length,dictionary:c.dict.version,label:c.domain.label,
    labels:Object.fromEntries([
      ...c.dict.features.map(f=>[f.id,f.label]),
      ...(c.domain.time??[]).map(t=>[`time:${t.id}`,t.label]),
      ...c.dict.company.map(x=>[`company:${x.id}`,x.label]),
      ...Object.values(CONTEXTS).flatMap(q=>q.options.map(o=>[`${q.contextKey}:${o.value}`,o.label])),
    ]),
  }]))};
}

/** All editions of the same work: "already played" on one removes the others too. */
export function editionsOf(catalog, id) {
  const item = catalog.byId.get(id);
  return item ? catalog.byWork.get(item.work) ?? [id] : [id];
}

/** Title resolver: "ведьмак 3" → The Witcher 3. Exact, prefix and word-overlap matches, popularity breaks ties. */
// A query word matches a title word it starts, or one slip off its start when the word is long enough to be sure.
// The start is compared at the query's length and one more, so a letter missing in the middle is one slip too.
const wordMatch = (w, k) => k.startsWith(w)
  || (w.length >= 5 && Math.min(editDistance(w, k.slice(0, w.length), 1), editDistance(w, k.slice(0, w.length + 1), 1)) <= 1);

export function searchItems(catalog, query, limit = 8) {
  const typed = normalizeTitle(query);
  if (!typed) return [];
  // A title typed in Russian letters is also tried in Latin ones: «дьябло» finds Diablo, «портал» Portal 2.
  const queries = [...new Set([typed, transliterate(typed)])];
  const scored = [];
  for (const { id, keys } of catalog.names) {
    let best = 0;
    for (const [n, q] of queries.entries()) {
      const qWords = q.split(' ');
      const penalty = n ? 5 : 0; // the name as typed wins over its transliteration
      for (const key of keys) {
        let s = 0;
        if (key === q) s = 100;
        else if (key.startsWith(q)) s = 80;
        else if (key.includes(q)) s = 60;
        else {
          const words = key.split(' ');
          const hits = qWords.filter((w) => words.some((k) => wordMatch(w, k))).length;
          if (hits) s = 50 * (hits / qWords.length);
        }
        best = Math.max(best, s ? s - penalty : 0);
      }
    }
    if (best >= 25) scored.push({ id, s: best + catalog.byId.get(id).popularity });
  }
  return scored
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ id }) => catalog.byId.get(id));
}
