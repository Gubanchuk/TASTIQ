// Step 1: pick the popularity head of Steam. SteamSpy "all" pages list apps with review counts;
// the head is ranked by total reviews (positive + negative), a proxy for how many people know the game.
import { resolve } from 'node:path';
import { RAW, writeJson } from '../lib/fsx.js';
import { getJson, RateLimiter } from '../lib/http.js';

const PAGES = Number(process.env.SPY_PAGES ?? 4);
const CANDIDATES = Number(process.env.HEAD_CANDIDATES ?? 700);
// SteamSpy asks for at most one "all" request per 60 seconds.
const spyAll = new RateLimiter(61_000);

const apps = new Map();
for (let page = 0; page < PAGES; page++) {
  console.log(`SteamSpy all, page ${page}`);
  const body = await getJson(`https://steamspy.com/api.php?request=all&page=${page}`, { limiter: spyAll });
  for (const app of Object.values(body)) {
    apps.set(app.appid, {
      appid: app.appid,
      name: app.name,
      positive: app.positive,
      negative: app.negative,
      reviews: app.positive + app.negative,
      owners: app.owners,
    });
  }
}

const head = [...apps.values()]
  .filter((a) => a.name && a.reviews > 0)
  .sort((a, b) => b.reviews - a.reviews)
  .slice(0, CANDIDATES);

writeJson(resolve(RAW, 'head-candidates.json'), head);
console.log(`Saved ${head.length} candidates; smallest has ${head.at(-1).reviews} reviews`);
