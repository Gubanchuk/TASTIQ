// Step 2 done-criteria from SUMMARY.md, checked on the built data/catalog-screen.json.
// Run: node --max-old-space-size=8192 research-vault/akinator-picker-2026-10/scripts/step2-check.mjs
import { readFileSync } from 'node:fs';

const cat = JSON.parse(readFileSync(new URL('../../../data/catalog-screen.json', import.meta.url), 'utf8'));
const byId = new Map(cat.items.map((x) => [x.id, x]));
const cartoons = cat.items.filter((x) => x.domain === 'cartoon');
const fails = [];
const check = (ok, text) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${text}`);
  if (!ok) fails.push(text);
};

const defaultAdult = cartoons.filter((x) => {
  const f = x.features['audience.adult'];
  return f && f.src.every((s) => s === 'genre');
});
check(defaultAdult.length === 0, `audience.adult only from genre on ${defaultAdult.length} of ${cartoons.length} cartoons`);
// The step 2 guard is against audience.adult that does not come from a text: since the cartoon tagging of
// 2026-10-28 an LLM quote may say a Family-genre cartoon is adult (Kaena, No Dogs or Italians Allowed), which is
// listed for a look, not failed.
const familyAdult = cartoons.filter((x) => x.genres.includes('Family') && x.features['audience.adult']);
const untexted = familyAdult.filter((x) => !x.features['audience.adult'].src.includes('llm'));
check(untexted.length === 0, `Family cartoons with audience.adult not from a text: ${untexted.length}`);
for (const x of familyAdult.filter((y) => !untexted.includes(y))) console.log(`     note: ${x.name} (${x.year}) audience.adult from a quote: ${x.features['audience.adult'].ev?.[0]?.q ?? ''}`);

const name = (id) => byId.get(id)?.ru ?? byId.get(id)?.name ?? id;
for (const id of ['tt0461770', 'tt0096438']) check(byId.get(id)?.domain === 'film', `${name(id)} is a film (${byId.get(id)?.domain})`);
for (const id of ['tt0114709', 'tt0110357', 'tt0129167', 'tt7979580', 'tt0096697']) check(byId.get(id)?.domain === 'cartoon', `${name(id)} stays a cartoon (${byId.get(id)?.domain})`);

const NOTE = /\((фильм|мультфильм|телесериал|сериал|мультсериал|аниме|документальный фильм)(\)|,| \d{4})|\(\d{4}\)$/;
const noted = cat.items.filter((x) => NOTE.test(x.ru ?? ''));
check(noted.length === 0, `Russian names with a disambiguation note: ${noted.length}${noted.length ? ` (${noted.slice(0, 5).map((x) => x.ru).join(' | ')})` : ''}`);

console.log(`\ncartoons ${cartoons.length}, films ${cat.items.filter((x) => x.domain === 'film').length}, anime ${cat.items.filter((x) => x.domain === 'anime').length}`);
console.log(fails.length ? `${fails.length} checks failed` : 'all checks passed');
process.exitCode = fails.length ? 1 : 0;
