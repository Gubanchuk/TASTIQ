// The game tail (01b-games-tail.js) has only SteamSpy data: no release year, no platforms beyond Windows, no
// playtime (SteamSpy now returns 0 for median_forever). This step adds the year and platforms from the Steam store
// card, the request the head uses in 02-details.js. Playtime would come from the reviews endpoint, but on 2026-10-25
// store.steampowered.com/appreviews redirected every request to the store front page, so REVIEWS=1 turns it on
// only when it works again. About two hours for 4 500 games at the store's limits; the disk cache makes it restartable.
import { resolve } from 'node:path';
import { RAW, readJson, writeJson } from '../lib/fsx.js';
import { getJson, mapPool, RateLimiter } from '../lib/http.js';

const storeDetails = new RateLimiter(1_500); // appdetails is limited to about 200 calls per 5 minutes
const storeReviews = new RateLimiter(700);

const tail = readJson(resolve(RAW, 'games-tail.json'), []);
const median = (xs) => {
  const v = [...xs].sort((a, b) => a - b);
  return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
};
const yearOf = (date) => Number(String(date ?? '').match(/\b(19|20)\d{2}\b/)?.[0]) || null;

console.log(`Steam details for ${tail.length} tail games`);
const out = {};
await mapPool(tail, 2, async (t, i) => {
  const card = await getJson(`https://store.steampowered.com/api/appdetails?appids=${t.appid}&l=english`, { limiter: storeDetails }).catch(() => null);
  const d = card?.[t.appid]?.success ? card[t.appid].data : null;
  const reviews = !process.env.REVIEWS ? null : await getJson(`https://store.steampowered.com/appreviews/${t.appid}?json=1&filter=all&language=all&purchase_type=all&num_per_page=100`, { limiter: storeReviews }).catch(() => null);
  const minutes = (reviews?.reviews ?? []).map((r) => r.author?.playtime_at_review).filter((m) => m > 0);
  out[t.appid] = {
    year: yearOf(d?.release_date?.date),
    platforms: d?.platforms ?? null,
    medianHoursAtReview: minutes.length >= 10 ? Math.round(median(minutes) / 60) : null,
    reviewsSampled: minutes.length,
  };
  if (i % 250 === 0) console.log(`  ${i}/${tail.length}`);
});

writeJson(resolve(RAW, 'games-tail-details.json'), out, false);
const values = Object.values(out);
console.log(`Saved ${values.length}: year ${values.filter((x) => x.year).length}, playtime ${values.filter((x) => x.medianHoursAtReview != null).length}, platforms ${values.filter((x) => x.platforms).length}`);
