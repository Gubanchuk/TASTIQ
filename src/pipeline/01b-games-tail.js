// Step 1b: the wider game catalog beyond the fully downloaded head. For these games only SteamSpy data
// is fetched (player tags with votes, review counts, price, developer): enough for the aspect vector and
// the quality sieve, without hours of Steam store calls. Platform beyond Windows is unknown for them.
//
// Env: SPY_PAGES (default 16, 1000 apps each, one page per minute), TAIL_SIZE (default 4500).
import { resolve } from 'node:path';
import { RAW, readJson, writeJson } from '../lib/fsx.js';
import { getJson, mapPool, RateLimiter } from '../lib/http.js';

const PAGES = Number(process.env.SPY_PAGES ?? 16);
const TAIL_SIZE = Number(process.env.TAIL_SIZE ?? 4500);
const spyAll = new RateLimiter(61_000);
const spyDetails = new RateLimiter(1_100);

const head = new Set(readJson(resolve(RAW, 'games-raw.json')).map((g) => g.appid));

const apps = new Map();
for (let page = 0; page < PAGES; page++) {
  const body = await getJson(`https://steamspy.com/api.php?request=all&page=${page}`, { limiter: spyAll }).catch(() => null);
  if (!body) break;
  for (const a of Object.values(body)) apps.set(a.appid, { appid: a.appid, name: a.name, reviews: a.positive + a.negative });
  console.log(`  steamspy page ${page}: ${apps.size} apps`);
}

const tail = [...apps.values()]
  .filter((a) => a.name && !head.has(a.appid) && a.reviews >= 200)
  .sort((a, b) => b.reviews - a.reviews)
  .slice(0, TAIL_SIZE);
console.log(`Tail: ${tail.length} games, smallest has ${tail.at(-1)?.reviews} reviews`);

const out = await mapPool(tail, 2, async (a, i) => {
  const d = await getJson(`https://steamspy.com/api.php?request=appdetails&appid=${a.appid}`, { limiter: spyDetails }).catch(() => null);
  if (i % 250 === 0) console.log(`  details ${i}/${tail.length}`);
  if (!d) return null;
  return {
    appid: a.appid,
    name: d.name,
    developer: d.developer,
    publisher: d.publisher,
    positive: d.positive,
    negative: d.negative,
    owners: d.owners,
    price: Number(d.price) || 0,
    genre: d.genre ?? '',
    languages: d.languages ?? '',
    tags: d.tags && !Array.isArray(d.tags) ? d.tags : {},
  };
});

writeJson(resolve(RAW, 'games-tail.json'), out.filter(Boolean), false);
console.log(`Saved ${out.filter(Boolean).length} tail games to data/raw/games-tail.json`);
