// Step 7: the catalog the recommender reads. Joins Steam facts, Wikidata names, Steam tag votes
// and validated LLM tags into one aspect vector per game with relevance r and confidence c (0..1).
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { DICTIONARY_VERSION, FEATURE_BY_ID } from '../aspects/games.js';
import { STEAM_CATEGORY_FACTS, STEAM_TAG_FEATURES } from '../aspects/steam-tags.js';
import { computeIdf } from '../core/idf.js';
import { DATA, RAW, readJson, writeJson } from '../lib/fsx.js';
import { workKey } from '../lib/text.js';
import { withLengthFromHours } from './length-from-hours.js';

const TAG_MIN_SHARE = 0.08; // tag votes relative to the game's top tag; below this a tag is noise
const C_TAG = 0.6; // confidence of a feature backed only by player tag votes
const QUALITY_PRIOR_WEIGHT = 500; // Bayesian shrinkage: reviews worth of prior
// A store category says a mode exists, not that it is the core of the game. An optional PvP mode must not
// trip "никогда против людей"; PvP-centred games get the rest from player tags (PvP, Competitive).
const CATEGORY_FACT_R = { 'social.pvp': 0.4, 'social.coop': 0.6, 'social.solo': 0.6 };

// Steam types some tools as "game" (Wallpaper Engine, SteamVR); players tag them as software.
const SOFTWARE_TAGS = new Set(['Software', 'Utilities']);
const isSoftware = (g) => Object.keys(g.steamSpy?.tags ?? {}).slice(0, 4).some((t) => SOFTWARE_TAGS.has(t));
const allGames = readJson(resolve(RAW, 'games-raw.json'));
const games = allGames.filter((g) => !isSoftware(g));
if (games.length < allGames.length) {
  console.log(`Excluded as software: ${allGames.filter(isSoftware).map((g) => g.name).join(', ')}`);
}
// The wider catalog beyond the head: SteamSpy data only (01b-games-tail.js).
const tailRaw = readJson(resolve(RAW, 'games-tail.json'), []);
// Year and platforms from the Steam store card (01c-tail-details.js); playtime is unknown for the tail.
const tailDetails = readJson(resolve(RAW, 'games-tail-details.json'), {});
const headIds = new Set(games.map((g) => g.appid));
const tail = tailRaw.filter((t) => !headIds.has(t.appid)).map((t) => ({ ...t, steamSpy: { tags: t.tags } })).filter((g) => !isSoftware(g));
const wikidata = readJson(resolve(RAW, 'wikidata.json'), {});
const llm = readJson(resolve(DATA, 'tagging', 'llm-tags.json'), {});
// Measured agreement between two independent taggers on the shared sample, per feature
// (06-tag-ingest.js). For games tagged once, it stands in for the missing second opinion.
const AGREEMENT_MIN_N = 8;
const report = readJson(resolve(DATA, 'tagging', 'report.json'), { agreement: { perFeature: {} } });
const featureAgreement = Object.fromEntries(
  Object.entries(report.agreement.perFeature)
    .filter(([, v]) => v.both + v.oneOnly >= AGREEMENT_MIN_N)
    .map(([f, v]) => [f, v.presenceAgreement]),
);

function parseYear(date) {
  const m = /(\d{4})/.exec(date ?? '');
  return m ? Number(m[1]) : null;
}

function deckLabel(category) {
  return { 3: 'verified', 2: 'playable', 1: 'unsupported' }[category] ?? 'unknown';
}

function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function reviewMeta(appid) {
  // Tagging inputs carry thumbs and hours per review id; used to show "reviewer, 120 h" next to a quote.
  // Inputs from Wikipedia (run3, 01d-games-wikipedia.js) carry paragraphs with their section and the article link.
  const meta = new Map();
  for (const run of ['run1', 'run2', 'run3']) {
    const path = resolve(DATA, 'tagging', run, 'in', `${appid}.json`);
    if (!existsSync(path)) continue;
    const input = readJson(path);
    for (const r of input.reviews ?? []) meta.set(r.id, r);
    for (const p of input.paragraphs ?? []) meta.set(p.id, { section: p.section, url: input.source });
  }
  return meta;
}

function buildFeatures(g) {
  const features = {};
  const slot = (f) => (features[f] ??= { tag: null, llm: null, fact: false, ev: [] });

  const tags = Object.entries(g.steamSpy?.tags ?? {});
  const maxVotes = Math.max(1, ...tags.map(([, v]) => v));
  for (const [name, votes] of tags) {
    const share = votes / maxVotes;
    if (share < TAG_MIN_SHARE) continue;
    for (const [f, strength] of STEAM_TAG_FEATURES[name] ?? []) {
      const r = strength * Math.min(1, share / 0.5);
      const s = slot(f);
      if (!s.tag || r > s.tag.r) s.tag = { r, name, votes };
    }
  }

  for (const category of g.categories ?? []) {
    const f = STEAM_CATEGORY_FACTS[category];
    if (f) slot(f).fact = Math.max(slot(f).fact || 0, CATEGORY_FACT_R[f] ?? 1);
  }
  if ((g.genres ?? []).includes('Early Access')) slot('completeness.unfinished').fact = 1;

  const tagged = llm[g.appid];
  const meta = tagged ? reviewMeta(g.appid) : new Map();
  if (tagged) {
    for (const [f, v] of Object.entries(tagged.features)) {
      if (!FEATURE_BY_ID.has(f)) continue;
      const mean = v.rs.reduce((a, b) => a + b, 0) / v.rs.length;
      slot(f).llm = { r: mean / 3, present: v.rs.length, runs: tagged.runs };
      slot(f).ev = v.ev.map((e) => {
        const m = meta.get(e.id);
        if (/^p\d+$/.test(e.id)) return { id: e.id, q: e.q, kind: 'wiki', section: m?.section ?? null, url: m?.url ?? null };
        const kind = e.id === 'd' || e.id === 'a' ? 'description' : 'review';
        return { id: e.id, q: e.q, kind, thumb: m?.thumb ?? null, hours: m?.hours ?? null, lang: m?.lang ?? null };
      });
    }
  }

  const out = {};
  for (const [f, s] of Object.entries(features)) {
    const parts = [];
    let r = 0;
    if (s.fact) { parts.push(1); r = s.fact; }
    if (s.tag) { parts.push(C_TAG); r = Math.max(r, s.tag.r); }
    if (s.llm) {
      const evidenceFactor = Math.min(1, s.ev.length / 2);
      // Two runs: found by both = agreement, by one = disagreement. One run: how reliably two taggers
      // agree on this feature in general (0.5 + 0.5·rate), or 0.75 when not measured.
      const measured = featureAgreement[f];
      const agreement = s.llm.runs >= 2 ? (s.llm.present >= 2 ? 1 : 0.5) : measured != null ? 0.5 + 0.5 * measured : 0.75;
      parts.push((0.5 + 0.5 * evidenceFactor) * agreement);
      r = Math.max(r, s.llm.r);
    }
    const c = 1 - parts.reduce((acc, p) => acc * (1 - p), 1);
    const src = [s.fact && 'fact', s.tag && 'tag', s.llm && 'llm'].filter(Boolean);
    const ev = [...s.ev];
    if (s.tag) ev.push({ id: `tag:${s.tag.name}`, kind: 'tag', q: s.tag.name, votes: s.tag.votes });
    out[f] = { r: round(r), c: round(c), src, ev };
  }
  return out;
}

const round = (x) => Math.round(x * 1000) / 1000;

const ratios = games.filter((g) => g.reviewSummary?.total_reviews).map((g) => g.reviewSummary.total_positive / g.reviewSummary.total_reviews);
const meanRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;

const catalog = games.map((g) => {
  const wd = wikidata[g.appid] ?? {};
  const total = g.reviewSummary?.total_reviews ?? 0;
  const positive = g.reviewSummary?.total_positive ?? 0;
  const hours = Object.values(g.reviews ?? {}).flat().map((r) => r.playtimeAtReview).filter((m) => m > 0).map((m) => m / 60);
  const medianHours = hours.length ? Math.round(median(hours)) : null;
  return {
    id: `steam:${g.appid}`,
    domain: 'game',
    kind: 'game',
    appid: g.appid,
    link: `https://store.steampowered.com/app/${g.appid}/`,
    name: g.name,
    ru: wd.ru && wd.ru !== g.name ? wd.ru : null,
    aliases: [...new Set([...(wd.aliases ?? []), wd.en].filter(Boolean))],
    work: wd.work ?? workKey(g.name),
    series: wd.series ?? [],
    qid: wd.qid ?? null,
    year: parseYear(g.releaseDate?.date),
    released: !g.releaseDate?.coming_soon,
    platforms: g.platforms,
    deck: deckLabel(g.deckCategory),
    isFree: g.isFree,
    price: g.price,
    requiredAge: g.requiredAge,
    contentNotes: g.contentDescriptors?.notes?.trim() ?? null,
    genres: g.genres,
    steamTags: Object.keys(g.steamSpy?.tags ?? {}).slice(0, 12),
    image: g.headerImage,
    developers: g.developers,
    reviews: { total, positive, ratio: total ? round(positive / total) : null, desc: g.reviewSummary?.review_score_desc ?? null },
    quality: round((positive + QUALITY_PRIOR_WEIGHT * meanRatio) / (total + QUALITY_PRIOR_WEIGHT)),
    popularity: round(Math.log10(total + 1)),
    medianHoursAtReview: medianHours,
    tagged: Boolean(llm[g.appid]),
    head: true,
    features: withLengthFromHours(buildFeatures(g), medianHours),
  };
});

// Tail games: player tags, review counts and price from SteamSpy, year and platforms from the store card.
// Steam Deck status and playtime are unknown for them.
for (const g of tail) {
  const wd = wikidata[g.appid] ?? {};
  const details = tailDetails[g.appid] ?? {};
  const total = g.positive + g.negative;
  catalog.push({
    id: `steam:${g.appid}`,
    domain: 'game',
    kind: 'game',
    appid: g.appid,
    link: `https://store.steampowered.com/app/${g.appid}/`,
    name: g.name,
    ru: wd.ru && wd.ru !== g.name ? wd.ru : null,
    aliases: [...new Set([...(wd.aliases ?? []), wd.en].filter(Boolean))],
    work: wd.work ?? workKey(g.name),
    series: wd.series ?? [],
    qid: wd.qid ?? null,
    year: details.year ?? null,
    released: true,
    platforms: details.platforms ?? { windows: true, mac: null, linux: null },
    deck: null,
    isFree: g.price === 0,
    price: g.price ? { final: g.price, currency: 'USD' } : null,
    genres: g.genre ? g.genre.split(', ') : [],
    steamTags: Object.keys(g.tags).slice(0, 12),
    image: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
    developers: g.developer ? [g.developer] : [],
    reviews: { total, positive: g.positive, ratio: total ? round(g.positive / total) : null, desc: null },
    quality: round((g.positive + QUALITY_PRIOR_WEIGHT * meanRatio) / (total + QUALITY_PRIOR_WEIGHT)),
    popularity: round(Math.log10(total + 1)),
    medianHoursAtReview: null,
    tagged: Boolean(llm[g.appid]), // LLM tags from Wikipedia (run3) since 2026-10-28
    head: false,
    features: buildFeatures({ ...g, genres: g.genre ? g.genre.split(', ') : [] }),
  });
}

const { df, idf } = computeIdf(catalog);

const stats = {
  games: catalog.length,
  head: catalog.filter((g) => g.head).length,
  tailTagged: catalog.filter((g) => !g.head && g.tagged).length,
  llmTagged: catalog.filter((g) => g.tagged).length,
  withRussianName: catalog.filter((g) => g.ru).length,
  meanFeatures: round(catalog.reduce((a, g) => a + Object.keys(g.features).length, 0) / catalog.length),
  meanReviewRatio: round(meanRatio),
  taggerAgreement: report.agreement.overallPresenceAgreement ?? null,
  agreementSample: report.agreement.sharedGames ?? 0,
};

writeJson(resolve(DATA, 'catalog.json'), {
  dictionaryVersion: DICTIONARY_VERSION,
  builtAt: new Date().toISOString(),
  sources: ['Steam Store API', 'SteamSpy', 'Wikidata (CC0)', 'LLM tags from Steam review texts'],
  stats,
  df,
  idf,
  items: catalog,
}, false);
console.log(`Catalog: ${JSON.stringify(stats)}`);
