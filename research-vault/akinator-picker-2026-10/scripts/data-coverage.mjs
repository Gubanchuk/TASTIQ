// Coverage of features, fields and candidate question categories per domain, whole catalog and popular slice.
// Read-only over data/*.json; writes JSON to the scratchpad out/ folder.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { FEATURES as GAME_FEATURES, ASPECTS as GAME_ASPECTS } from 'file:///E:/project/TASTIQ/src/aspects/games.js';
import { SCREEN_FEATURES, SCREEN_ASPECTS } from 'file:///E:/project/TASTIQ/src/aspects/screen.js';

const OUT = 'C:/Users/Dusik/AppData/Local/Temp/claude/E--project-TASTIQ/316e07fd-614b-4eb4-a3ec-2c92111b7da4/scratchpad/out';
mkdirSync(OUT, { recursive: true });

const games = JSON.parse(readFileSync('E:/project/TASTIQ/data/catalog.json', 'utf8'));
const screen = JSON.parse(readFileSync('E:/project/TASTIQ/data/catalog-screen.json', 'utf8'));
const posters = JSON.parse(readFileSync('E:/project/TASTIQ/data/posters.json', 'utf8'));

const present = (v) => v && v.r >= 0.5 && v.c >= 0.5;
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
const cyr = (s) => /[а-яё]/i.test(s ?? '');

const DICT = {
  game: { features: GAME_FEATURES, aspects: GAME_ASPECTS },
  film: { features: SCREEN_FEATURES, aspects: SCREEN_ASPECTS },
  series: { features: SCREEN_FEATURES, aspects: SCREEN_ASPECTS },
  cartoon: { features: SCREEN_FEATURES, aspects: SCREEN_ASPECTS },
  anime: { features: SCREEN_FEATURES, aspects: SCREEN_ASPECTS },
};

const domains = {
  game: games.items,
  film: screen.items.filter((x) => x.domain === 'film'),
  series: screen.items.filter((x) => x.domain === 'series'),
  cartoon: screen.items.filter((x) => x.domain === 'cartoon'),
  anime: screen.items.filter((x) => x.domain === 'anime'),
};

// Candidate question categories: which features or fields would answer them.
const CATS = {
  game: {
    'company: solo': { pos: ['social.solo'] },
    'company: coop (с другом)': { pos: ['social.coop'] },
    'company: pvp (против людей)': { pos: ['social.pvp'] },
    'company: any social known': { pos: ['social.solo', 'social.coop', 'social.pvp'] },
    'kids: family-safe': { pos: ['content.family'], neg: ['content.gore', 'content.sexual'] },
    'time: length known': { pos: ['length.short', 'length.long', 'length.endless'] },
    'time: session known': { pos: ['session.short', 'session.long'] },
    'mood: relax': { pos: ['tension.low', 'tone.cozy', 'tone.serene'], neg: ['tension.high', 'difficulty.hard'] },
    'mood: adrenaline': { pos: ['tension.high', 'pace.fast'], neg: ['pace.slow', 'tension.low'] },
    'mood: story': { pos: ['story.central'], neg: ['story.minimal'] },
    'mood: laugh': { pos: ['humor.funny', 'humor.dark'] },
    'intensity: gore/horror/sex': { pos: ['content.gore', 'tone.creepy', 'content.sexual'] },
    'pace': { pos: ['pace.fast'], neg: ['pace.slow'] },
    'complexity': { pos: ['cognitive.high'], neg: ['cognitive.low'] },
    'tone: any tone.*': { pos: GAME_FEATURES.filter((f) => f.aspect === 'tone').map((f) => f.id) },
    'story vs gameplay': { pos: ['story.central', 'story.choices', 'story.lore'], neg: ['story.minimal'] },
    'difficulty': { pos: ['difficulty.hard'], neg: ['difficulty.forgiving'] },
    'freedom: open/sandbox vs linear': { pos: ['freedom.open_world', 'freedom.sandbox'], neg: ['freedom.linear'] },
    'loop: any loop.*': { pos: GAME_FEATURES.filter((f) => f.aspect === 'loop').map((f) => f.id) },
    'world: any world.* (setting)': { pos: GAME_FEATURES.filter((f) => f.aspect === 'world' && !f.risk).map((f) => f.id) },
  },
  screen: {
    'company: with kids': { pos: ['content.family', 'audience.kids'], neg: ['content.violence', 'content.sexual', 'content.disturbing', 'content.profanity'] },
    'company: date (romance)': { pos: ['characters.romance'] },
    'time: length feature': { pos: ['length.short', 'length.long'] },
    'mood: relax/feelgood': { pos: ['tone.feelgood', 'tone.lighthearted', 'cognitive.low'], neg: ['tension.high', 'content.disturbing', 'tone.dark'] },
    'mood: laugh': { pos: ['humor.funny', 'humor.dark', 'humor.satire', 'humor.silly', 'humor.deadpan'] },
    'mood: thrill': { pos: ['tension.high', 'tone.creepy'], neg: ['tension.low'] },
    'mood: cry': { pos: ['tone.melancholic', 'ending.sad'] },
    'mood: think': { pos: ['cognitive.high', 'story.complex'], neg: ['cognitive.low'] },
    'intensity: violence/horror/sex/disturbing': { pos: ['content.violence', 'tone.creepy', 'content.sexual', 'content.disturbing', 'content.profanity'] },
    'pace': { pos: ['pace.fast'], neg: ['pace.slow'] },
    'complexity': { pos: ['story.complex', 'cognitive.high'], neg: ['cognitive.low'] },
    'tone: any tone.* (non-risk)': { pos: SCREEN_FEATURES.filter((f) => f.aspect === 'tone' && !f.risk).map((f) => f.id) },
    'world: any world.* (setting)': { pos: SCREEN_FEATURES.filter((f) => f.aspect === 'world').map((f) => f.id) },
    'story: twist/mystery/true': { pos: ['story.twist', 'story.mystery', 'story.true', 'story.nonlinear', 'story.dialogue'] },
    'characters: any': { pos: SCREEN_FEATURES.filter((f) => f.aspect === 'characters' && !f.risk).map((f) => f.id) },
    'ending known': { pos: ['ending.happy', 'ending.sad', 'ending.strong'] },
    'series: structure': { pos: ['structure.procedural'], neg: ['structure.serialized'] },
    'series: completeness': { pos: ['completeness.ended'], neg: ['completeness.running'] },
  },
};

function fieldCoverage(items, domainId) {
  const n = items.length;
  const c = (fn) => pct(items.filter(fn).length, n);
  if (domainId === 'game') {
    return {
      year: c((g) => g.year != null),
      'platforms.mac/linux known': c((g) => g.platforms?.mac != null),
      'deck status known (not null/unknown)': c((g) => g.deck && g.deck !== 'unknown'),
      'price or free': c((g) => g.isFree || g.price?.final != null),
      'requiredAge field': c((g) => g.requiredAge != null),
      'requiredAge > 0': c((g) => g.requiredAge > 0),
      'contentNotes non-empty': c((g) => g.contentNotes),
      'medianHoursAtReview': c((g) => g.medianHoursAtReview != null),
      'ru name': c((g) => g.ru),
      'steam genres': c((g) => g.genres?.length),
      'steamTags >= 5': c((g) => g.steamTags?.length >= 5),
      'reviews.total >= 300 (sieve 3 floor)': c((g) => g.reviews.total >= 300),
      'reviews.desc (Steam summary label)': c((g) => g.reviews.desc),
      'image': c((g) => g.image),
      'developers': c((g) => g.developers?.length),
      'coop flag (social.coop r>=0.5)': c((g) => g.features['social.coop']?.r >= 0.5),
      'pvp flag (social.pvp r>=0.5)': c((g) => g.features['social.pvp']?.r >= 0.5),
      'solo flag (social.solo r>=0.5)': c((g) => g.features['social.solo']?.r >= 0.5),
      'controller support': 'нет поля',
      'difficulty feature': c((g) => present(g.features['difficulty.hard']) || present(g.features['difficulty.forgiving'])),
      'length to beat (length.* or median hours)': c((g) => g.medianHoursAtReview != null || ['length.short', 'length.long', 'length.endless'].some((f) => g.features[f]?.r >= 0.5)),
      'language / localisation': 'нет поля',
    };
  }
  const isSeries = items[0]?.kind === 'series' || domainId === 'series';
  return {
    year: c((x) => x.year != null),
    endYear: c((x) => x.endYear != null),
    runtime: c((x) => x.runtime != null),
    episodes: c((x) => x.episodes != null),
    seasons: c((x) => x.seasons != null),
    'status (TVmaze)': c((x) => x.status),
    network: c((x) => x.network),
    'summary (TVmaze)': c((x) => x.summary),
    'image (TVmaze)': c((x) => x.image),
    'poster (posters.json)': c((x) => posters[x.id]),
    'ru name': c((x) => x.ru),
    'original title differs (non-English proxy)': c((x) => x.original && x.original !== x.name),
    'genres >= 1': c((x) => x.genres?.length),
    'reviews.total': c((x) => x.reviews?.total > 0),
    'rating (IMDb)': c((x) => x.reviews?.desc),
    'age rating / certificate': 'нет поля',
    'country': 'нет поля в каталоге (Wikidata только для аниме)',
    'content.family feature (r>=0.5)': c((x) => x.features['content.family']?.r >= 0.5),
    'audience.kids feature (r>=0.5)': c((x) => x.features['audience.kids']?.r >= 0.5),
    'genome (MovieLens)': c((x) => Object.values(x.features).some((v) => v.src?.includes('genome'))),
    'usertag (MovieLens)': c((x) => Object.values(x.features).some((v) => v.src?.includes('usertag'))),
    'llm (Wikipedia)': c((x) => x.llm),
  };
}

function analyse(items, domainId, label) {
  const { features, aspects } = DICT[domainId];
  const n = items.length;
  const byId = new Map(features.map((f) => [f.id, f]));
  const likeable = new Set(features.filter((f) => f.like && !f.risk).map((f) => f.id));
  const counts = { any3: 0, any5: 0, any10: 0, like3: 0, like5: 0, zero: 0, sumPresent: 0, sumAll: 0 };
  const aspectHits = Object.fromEntries(aspects.map((a) => [a.id, 0]));
  const featureHits = Object.fromEntries(features.map((f) => [f.id, 0]));
  const featureAny = Object.fromEntries(features.map((f) => [f.id, 0]));
  const titleSrc = {};
  const instSrc = {};
  const evKinds = {};
  const quoteLang = { ru: 0, en: 0 };
  const shownLang = { ru: 0, en: 0, kinds: {} }; // first 2 ev of each present feature: what a match shows
  const presentHist = {};

  for (const it of items) {
    const feats = Object.entries(it.features);
    let presentN = 0;
    let likeN = 0;
    const aspSeen = new Set();
    const srcSeen = new Set();
    for (const [f, v] of feats) {
      if (!byId.has(f)) continue;
      if (v.r > 0) featureAny[f]++;
      if (!present(v)) continue;
      presentN++;
      featureHits[f]++;
      if (likeable.has(f)) likeN++;
      aspSeen.add(byId.get(f).aspect);
      for (const s of v.src ?? []) { srcSeen.add(s); instSrc[s] = (instSrc[s] ?? 0) + 1; }
      for (const [i, e] of (v.ev ?? []).entries()) {
        evKinds[e.kind] = (evKinds[e.kind] ?? 0) + 1;
        const isQuote = ['review', 'description', 'wiki', 'summary'].includes(e.kind);
        if (isQuote) quoteLang[cyr(e.q) ? 'ru' : 'en']++;
        if (i < 2) {
          shownLang.kinds[e.kind] = (shownLang.kinds[e.kind] ?? 0) + 1;
          const ru = e.kind === 'fact' || cyr(e.q);
          shownLang[ru ? 'ru' : 'en']++;
        }
      }
    }
    counts.sumPresent += presentN;
    counts.sumAll += feats.length;
    presentHist[presentN] = (presentHist[presentN] ?? 0) + 1;
    if (presentN === 0) counts.zero++;
    if (presentN >= 3) counts.any3++;
    if (presentN >= 5) counts.any5++;
    if (presentN >= 10) counts.any10++;
    if (likeN >= 3) counts.like3++;
    if (likeN >= 5) counts.like5++;
    for (const a of aspSeen) aspectHits[a]++;
    for (const s of srcSeen) titleSrc[s] = (titleSrc[s] ?? 0) + 1;
  }

  const cats = CATS[domainId === 'game' ? 'game' : 'screen'];
  const splits = {};
  for (const [name, { pos, neg = [] }] of Object.entries(cats)) {
    let p = 0, ng = 0, both = 0, none = 0;
    for (const it of items) {
      const hasP = pos.some((f) => present(it.features[f]));
      const hasN = neg.some((f) => present(it.features[f]));
      if (hasP && hasN) both++;
      else if (hasP) p++;
      else if (hasN) ng++;
      else none++;
    }
    splits[name] = { pos: pct(p, n), neg: neg.length ? pct(ng, n) : null, both: neg.length ? pct(both, n) : null, unknown: pct(none, n) };
  }
  // Field-based splits that always exist.
  const years = items.map((x) => x.year).filter((y) => y != null);
  const decades = {};
  for (const y of years) { const d = `${Math.floor(y / 10) * 10}s`; decades[d] = (decades[d] ?? 0) + 1; }
  const votes = items.map((x) => x.reviews?.total ?? 0).sort((a, b) => a - b);
  const q = (k) => votes[Math.floor((votes.length - 1) * k)];
  let runtimeSplit = null;
  if (domainId !== 'game') {
    const rt = items.filter((x) => x.kind === 'film' && x.runtime);
    const ep = items.filter((x) => x.kind === 'series' && x.episodes);
    runtimeSplit = {
      films_with_runtime: rt.length,
      'film <= 95': pct(rt.filter((x) => x.runtime <= 95).length, rt.length),
      'film 96-129': pct(rt.filter((x) => x.runtime > 95 && x.runtime < 130).length, rt.length),
      'film 130-149': pct(rt.filter((x) => x.runtime >= 130 && x.runtime < 150).length, rt.length),
      'film >= 150': pct(rt.filter((x) => x.runtime >= 150).length, rt.length),
      series_with_episodes: ep.length,
      'series <= 10 ep': pct(ep.filter((x) => x.episodes <= 10).length, ep.length),
      'series 11-30': pct(ep.filter((x) => x.episodes > 10 && x.episodes <= 30).length, ep.length),
      'series 31-60': pct(ep.filter((x) => x.episodes > 30 && x.episodes < 60).length, ep.length),
      'series >= 60': pct(ep.filter((x) => x.episodes >= 60).length, ep.length),
    };
  } else {
    const h = items.map((x) => x.medianHoursAtReview).filter((x) => x != null).sort((a, b) => a - b);
    runtimeSplit = {
      with_median_hours: h.length,
      'hours <= 10': pct(h.filter((x) => x <= 10).length, h.length),
      'hours 11-40': pct(h.filter((x) => x > 10 && x <= 40).length, h.length),
      'hours 41-100': pct(h.filter((x) => x > 40 && x <= 100).length, h.length),
      'hours > 100': pct(h.filter((x) => x > 100).length, h.length),
    };
  }

  return {
    label,
    n,
    featuresPerTitle: { meanAll: Math.round((counts.sumAll / n) * 10) / 10, meanPresent: Math.round((counts.sumPresent / n) * 10) / 10 },
    confident: { zero: pct(counts.zero, n), '3+': pct(counts.any3, n), '5+': pct(counts.any5, n), '10+': pct(counts.any10, n), 'likeable 3+': pct(counts.like3, n), 'likeable 5+': pct(counts.like5, n), raw: { ...counts } },
    presentHist,
    titlesBySource: Object.fromEntries(Object.entries(titleSrc).map(([k, v]) => [k, pct(v, n)])),
    instancesBySource: instSrc,
    evidenceKinds: evKinds,
    quoteLanguage: { ...quoteLang, ruShare: pct(quoteLang.ru, quoteLang.ru + quoteLang.en) },
    shownEvidence: { ...shownLang, ruShare: pct(shownLang.ru, shownLang.ru + shownLang.en) },
    perAspect: Object.fromEntries(aspects.map((a) => [a.id, pct(aspectHits[a.id], n)])),
    perFeature: Object.fromEntries(features.map((f) => [f.id, { present: pct(featureHits[f.id], n), any: pct(featureAny[f.id], n) }])),
    fields: fieldCoverage(items, domainId),
    splits,
    era: { withYear: pct(years.length, n), decades },
    votes: { p10: q(0.1), p25: q(0.25), median: q(0.5), p75: q(0.75), p90: q(0.9), max: votes.at(-1) },
    lengthSplit: runtimeSplit,
  };
}

const result = {};
for (const [d, items] of Object.entries(domains)) {
  const sorted = [...items].sort((a, b) => (b.reviews?.total ?? 0) - (a.reviews?.total ?? 0));
  result[d] = {
    all: analyse(items, d, 'all'),
    top3000: analyse(sorted.slice(0, 3000), d, 'top3000'),
    top1000: analyse(sorted.slice(0, 1000), d, 'top1000'),
    top300: analyse(sorted.slice(0, 300), d, 'top300'),
  };
}
writeFileSync(`${OUT}/coverage.json`, JSON.stringify(result, null, 1));

// Compact console summary.
for (const [d, r] of Object.entries(result)) {
  for (const k of ['all', 'top3000', 'top1000']) {
    const x = r[k];
    console.log(`${d} ${k}: n=${x.n} present/title=${x.featuresPerTitle.meanPresent} zero=${x.confident.zero}% 3+=${x.confident['3+']}% 5+=${x.confident['5+']}% 10+=${x.confident['10+']}% like3+=${x.confident['likeable 3+']}% like5+=${x.confident['likeable 5+']}% src=${JSON.stringify(x.titlesBySource)} quotesRu=${x.quoteLanguage.ruShare}% shownRu=${x.shownEvidence.ruShare}%`);
  }
}
