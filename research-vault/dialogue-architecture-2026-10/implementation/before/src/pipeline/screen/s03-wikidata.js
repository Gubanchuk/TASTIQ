// Wikidata (CC0) for screen titles: country of origin of animated titles (Japanese animation goes to the
// anime domain, which this version skips), Russian names for titles IMDb has none for, and whether the title
// is an animated work at all: IMDb puts Animation on live-action films with animated parts ("Enchanted").
import { resolve } from 'node:path';
import { RAW, readJson, writeJson } from '../../lib/fsx.js';
import { getJson, RateLimiter } from '../../lib/http.js';

const sparql = new RateLimiter(1_500);
const base = readJson(resolve(RAW, 'screen-base.json'));
const wanted = base.filter((t) => t.genres.includes('Animation') || !t.ru).map((t) => t.imdb);

// Instance of animated film, animated series or anime, including subclasses.
const ANIMATED_ROOTS = 'wd:Q202866 wd:Q581714 wd:Q1107';
// Genre "live-action/animated film". It is a subclass of animated film, so it is asked separately.
const LIVE_ACTION_ANIMATED = 'wd:Q25110269';

function query(ids) {
  return `
SELECT ?imdb (SAMPLE(?ru) AS ?ruLabel) (GROUP_CONCAT(DISTINCT ?countryCode; separator="|") AS ?countries)
       (MAX(?isAnimated) AS ?animated) (MAX(?isHybrid) AS ?hybrid) WHERE {
  VALUES ?imdb { ${ids.map((id) => `"${id}"`).join(' ')} }
  ?item wdt:P345 ?imdb .
  OPTIONAL { ?item rdfs:label ?ru FILTER(LANG(?ru) = "ru") }
  OPTIONAL { ?item wdt:P495 ?country . ?country wdt:P297 ?countryCode }
  BIND(EXISTS { VALUES ?root { ${ANIMATED_ROOTS} } ?item wdt:P31/wdt:P279* ?root } AS ?isAnimated)
  BIND(EXISTS { ?item wdt:P136 ${LIVE_ACTION_ANIMATED} } AS ?isHybrid)
} GROUP BY ?imdb`;
}

const out = {};
for (let i = 0; i < wanted.length; i += 150) {
  const ids = wanted.slice(i, i + 150);
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query(ids))}`;
  const body = await getJson(url, { limiter: sparql, headers: { Accept: 'application/sparql-results+json' } }).catch((e) => {
    console.warn(`  batch ${i}: ${e.message}`);
    return null;
  });
  for (const b of body?.results?.bindings ?? []) {
    out[b.imdb.value] = {
      ru: b.ruLabel?.value ?? null,
      countries: b.countries?.value ? b.countries.value.split('|') : [],
      animated: b.animated?.value === 'true',
      hybrid: b.hybrid?.value === 'true',
    };
  }
  if ((i / 150) % 10 === 0) console.log(`  wikidata ${Math.min(i + 150, wanted.length)}/${wanted.length}`);
}

writeJson(resolve(RAW, 'screen-wikidata.json'), out, false);
console.log(`Wikidata rows for ${Object.keys(out).length} of ${wanted.length} titles`);
