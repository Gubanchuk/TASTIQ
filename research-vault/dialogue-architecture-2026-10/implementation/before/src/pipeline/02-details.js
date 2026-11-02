// Step 2: per-game facts and texts from Steam and SteamSpy.
// Facts (platforms, release, categories) feed sieve 1; review summary feeds sieve 3;
// user tags and review texts are the raw material for aspects.
import { resolve } from 'node:path';
import { RAW, readJson, writeJson } from '../lib/fsx.js';
import { getJson, mapPool, RateLimiter } from '../lib/http.js';

const HEAD_SIZE = Number(process.env.HEAD_SIZE ?? 500);
const storeDetails = new RateLimiter(1_500); // appdetails is limited to about 200 calls per 5 minutes
const storeReviews = new RateLimiter(700);
const storeDeck = new RateLimiter(700);
const spyDetails = new RateLimiter(1_100); // SteamSpy: one appdetails call per second

// Apps that are tools, not games, even when Steam types them as "game".
const NON_GAME_GENRES = new Set([
  'Utilities', 'Software Training', 'Video Production', 'Design & Illustration',
  'Animation & Modeling', 'Audio Production', 'Photo Editing', 'Web Publishing', 'Education',
]);

const candidates = readJson(resolve(RAW, 'head-candidates.json'));

console.log(`Fetching app details for ${candidates.length} candidates`);
const details = await mapPool(candidates, 2, async (c, i) => {
  const url = `https://store.steampowered.com/api/appdetails?appids=${c.appid}&l=english`;
  const body = await getJson(url, { limiter: storeDetails }).catch((e) => {
    console.warn(`appdetails ${c.appid}: ${e.message}`);
    return null;
  });
  if (i % 50 === 0) console.log(`  details ${i}/${candidates.length}`);
  const entry = body?.[c.appid];
  return entry?.success ? entry.data : null;
});

const games = [];
candidates.forEach((c, i) => {
  const d = details[i];
  if (!d || d.type !== 'game') return;
  const genres = (d.genres ?? []).map((g) => g.description);
  if (genres.length && genres.every((g) => NON_GAME_GENRES.has(g))) return;
  games.push({ candidate: c, details: d });
});
const head = games.slice(0, HEAD_SIZE);
console.log(`${games.length} games after filtering, keeping ${head.length}`);

const REVIEW_QUERIES = [
  { key: 'enPositive', language: 'english', reviewType: 'positive', count: 20 },
  { key: 'enNegative', language: 'english', reviewType: 'negative', count: 20 },
  { key: 'ru', language: 'russian', reviewType: 'all', count: 12 },
];

const out = await mapPool(head, 3, async ({ candidate, details: d }, i) => {
  const appid = candidate.appid;
  const spy = await getJson(`https://steamspy.com/api.php?request=appdetails&appid=${appid}`, {
    limiter: spyDetails,
  }).catch(() => null);

  const reviews = {};
  let summary = null;
  for (const q of REVIEW_QUERIES) {
    const url =
      `https://store.steampowered.com/appreviews/${appid}?json=1&filter=all&language=${q.language}` +
      `&review_type=${q.reviewType}&purchase_type=all&num_per_page=${q.count}`;
    const body = await getJson(url, { limiter: storeReviews }).catch(() => null);
    reviews[q.key] = (body?.reviews ?? []).map((r) => ({
      id: r.recommendationid,
      up: r.voted_up,
      votesUp: r.votes_up,
      lang: r.language,
      playtimeAtReview: r.author?.playtime_at_review ?? null,
      playtimeForever: r.author?.playtime_forever ?? null,
      text: r.review,
    }));
    if (q.key === 'enPositive') summary = body?.query_summary ?? null;
  }
  // The language-filtered summary only counts English reviews; ask once more for all languages.
  const all = await getJson(
    `https://store.steampowered.com/appreviews/${appid}?json=1&language=all&purchase_type=all&num_per_page=0`,
    { limiter: storeReviews },
  ).catch(() => null);

  const deck = await getJson(
    `https://store.steampowered.com/saleaction/ajaxgetdeckappcompatibilityreport?nAppID=${appid}`,
    { limiter: storeDeck },
  ).catch(() => null);

  if (i % 25 === 0) console.log(`  texts ${i}/${head.length}`);
  return {
    appid,
    name: d.name,
    isFree: d.is_free,
    requiredAge: Number(d.required_age) || 0,
    shortDescription: d.short_description,
    aboutTheGame: d.about_the_game,
    developers: d.developers ?? [],
    publishers: d.publishers ?? [],
    genres: (d.genres ?? []).map((g) => g.description),
    categories: (d.categories ?? []).map((c) => c.description),
    platforms: d.platforms,
    releaseDate: d.release_date,
    contentDescriptors: d.content_descriptors ?? null,
    metacritic: d.metacritic?.score ?? null,
    price: d.price_overview ? { final: d.price_overview.final, currency: d.price_overview.currency } : null,
    headerImage: d.header_image,
    pcRequirements: d.pc_requirements ?? null,
    reviewSummary: all?.query_summary ?? summary,
    englishSummary: summary,
    steamSpy: spy ? { tags: spy.tags ?? {}, owners: spy.owners, medianForever: spy.median_forever } : null,
    deckCategory: deck?.results?.resolved_category ?? null,
    reviews,
  };
});

writeJson(resolve(RAW, 'games-raw.json'), out);
console.log(`Saved ${out.length} games to data/raw/games-raw.json`);
