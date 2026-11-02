// Step 3: Russian and English names, aliases and the "edition of" link from Wikidata (CC0).
// Names power title search ("ведьмак 3"); the edition link lets "already played Skyrim"
// also remove Skyrim Special Edition.
import { resolve } from 'node:path';
import { RAW, readJson, writeJson } from '../lib/fsx.js';
import { getJson, RateLimiter } from '../lib/http.js';

const sparql = new RateLimiter(2_000);
const games = [...readJson(resolve(RAW, 'games-raw.json')), ...readJson(resolve(RAW, 'games-tail.json'), [])];

function query(appids) {
  const values = appids.map((id) => `"${id}"`).join(' ');
  return `
SELECT ?item ?appid ?work
  (SAMPLE(?ru) AS ?ruLabel) (SAMPLE(?en) AS ?enLabel)
  (GROUP_CONCAT(DISTINCT ?alias; separator="|") AS ?aliases)
  (GROUP_CONCAT(DISTINCT ?seriesLabel; separator="|") AS ?series)
WHERE {
  VALUES ?appid { ${values} }
  ?item wdt:P1733 ?appid .
  OPTIONAL { ?item rdfs:label ?ru FILTER(LANG(?ru) = "ru") }
  OPTIONAL { ?item rdfs:label ?en FILTER(LANG(?en) = "en") }
  OPTIONAL { ?item skos:altLabel ?alias FILTER(LANG(?alias) IN ("ru", "en")) }
  OPTIONAL { ?item wdt:P629 ?work }
  OPTIONAL { ?item wdt:P179 ?s . ?s rdfs:label ?seriesLabel FILTER(LANG(?seriesLabel) = "en") }
}
GROUP BY ?item ?appid ?work`;
}

const byApp = {};
const ids = games.map((g) => String(g.appid));
for (let i = 0; i < ids.length; i += 100) {
  const chunk = ids.slice(i, i + 100);
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query(chunk))}`;
  const body = await getJson(url, { limiter: sparql, headers: { Accept: 'application/sparql-results+json' } });
  for (const b of body.results.bindings) {
    const appid = Number(b.appid.value);
    const row = {
      qid: b.item.value.split('/').pop(),
      work: b.work?.value.split('/').pop() ?? null,
      ru: b.ruLabel?.value ?? null,
      en: b.enLabel?.value ?? null,
      aliases: b.aliases?.value ? b.aliases.value.split('|') : [],
      series: b.series?.value ? b.series.value.split('|') : [],
    };
    // Several items can share one Steam ID (game and its edition); keep the one with names.
    const prev = byApp[appid];
    if (!prev || (!prev.ru && row.ru)) byApp[appid] = { ...row, aliases: [...new Set([...(prev?.aliases ?? []), ...row.aliases])] };
  }
  console.log(`  wikidata ${Math.min(i + 100, ids.length)}/${ids.length}`);
}

writeJson(resolve(RAW, 'wikidata.json'), byApp);
console.log(`Wikidata rows for ${Object.keys(byApp).length} of ${ids.length} games`);
