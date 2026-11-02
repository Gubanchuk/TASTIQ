// Poster images for the most popular films, series and cartoons, for the prototype pages:
// the thumbnail of the title's English Wikipedia article (usually the infobox poster).
// Posters belong to their rights holders; a public launch needs a source licensed for display.
//
// Env: FILMS (default 4000), SERIES (default 1500), CARTOONS (default 600).
import { resolve } from 'node:path';
import { DATA, readJson, writeJson } from '../../lib/fsx.js';
import { getJson, mapPool, RateLimiter } from '../../lib/http.js';

const N = { film: Number(process.env.FILMS ?? 4000), series: Number(process.env.SERIES ?? 1500), cartoon: Number(process.env.CARTOONS ?? 600) };
const sparql = new RateLimiter(1_500);
const rest = new RateLimiter(120);

const catalog = readJson(resolve(DATA, 'catalog-screen.json'));
const byVotes = (a, b) => b.reviews.total - a.reviews.total;
const targets = Object.entries(N).flatMap(([domain, n]) => catalog.items.filter((x) => x.domain === domain).sort(byVotes).slice(0, n));
const out = readJson(resolve(DATA, 'posters.json'), {});
// Earlier runs asked for a non-standard 400px width, which Wikimedia refuses: redo those.
const todo = targets.filter((t) => !(t.id in out) || out[t.id]?.includes('/400px-'));
console.log(`Targets: ${targets.length}, to fetch: ${todo.length}`);

const articles = new Map();
for (let i = 0; i < todo.length; i += 150) {
  const ids = todo.slice(i, i + 150).map((t) => `"${t.id}"`).join(' ');
  const q = `SELECT ?imdb ?article WHERE { VALUES ?imdb { ${ids} } ?item wdt:P345 ?imdb . ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> . }`;
  const body = await getJson(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(q)}`, { limiter: sparql, headers: { Accept: 'application/sparql-results+json' } }).catch(() => null);
  for (const b of body?.results?.bindings ?? []) articles.set(b.imdb.value, b.article.value.split('/wiki/')[1]);
  if ((i / 150) % 10 === 0) console.log(`  wikidata ${Math.min(i + 150, todo.length)}/${todo.length}`);
}

let found = 0;
await mapPool(todo, 6, async (t, i) => {
  const title = articles.get(t.id);
  if (!title) { out[t.id] = null; return; }
  const body = await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`, { limiter: rest }).catch(() => null);
  const src = body?.thumbnail?.source ?? null;
  // Wikimedia serves only standard thumbnail widths (330, 500, 960…) and refuses upscales. Ask for 500px
  // when the original is wider; otherwise take the original, which is then small (non-free posters ~300px).
  const wide = (body?.originalimage?.width ?? 0) > 500;
  out[t.id] = src ? (wide ? src.replace(/\/(\d+)px-([^/]+)$/, '/500px-$2') : body.originalimage?.source ?? src) : null;
  if (src) found++;
  if (i % 500 === 0) { console.log(`  posters ${i}/${todo.length}, found ${found}`); writeJson(resolve(DATA, 'posters.json'), out, false); }
});

writeJson(resolve(DATA, 'posters.json'), out, false);
console.log(`Posters: ${Object.values(out).filter(Boolean).length} of ${Object.keys(out).length}`);
