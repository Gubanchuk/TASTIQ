// Small synthetic catalogs with hand-set features, so scenario tests do not depend on downloads.
import { SCREEN_FEATURES } from '../src/aspects/screen.js';
import { makeCatalog } from '../src/core/catalog.js';
import { computeIdf } from '../src/core/idf.js';

const PC = { windows: true, mac: false, linux: false };

export function game(appid, name, features, extra = {}) {
  const f = {};
  for (const [id, r] of Object.entries(features)) {
    f[id] = { r, c: 0.8, src: ['llm'], ev: [{ id: `r${appid}0`, q: `quote about ${id}`, kind: 'review', thumb: 'up', hours: 20 }] };
  }
  for (const id of extra.facts ?? []) f[id] = { r: 1, c: 1, src: ['fact'], ev: [] };
  return {
    id: String(appid),
    domain: 'game',
    kind: 'game',
    appid,
    link: `https://store.steampowered.com/app/${appid}/`,
    name,
    ru: extra.ru ?? null,
    aliases: [],
    work: extra.work ?? name.toLowerCase(),
    series: extra.series ?? [],
    year: 2020,
    released: extra.released ?? true,
    platforms: extra.platforms ?? PC,
    deck: extra.deck ?? 'unknown',
    isFree: false,
    price: null,
    genres: [],
    image: '',
    reviews: { total: 50_000, positive: 45_000, ratio: extra.ratio ?? 0.9 },
    quality: extra.quality ?? 0.9,
    popularity: extra.popularity ?? 4.5,
    medianHoursAtReview: 30,
    tagged: true,
    features: f,
  };
}

/** The game fixture, optionally with extra games (a test that needs a special title adds it here). */
export function fixtureCatalog(extra = []) {
  const games = [
    game(1, 'The Witcher 3', { 'world.living': 1, 'story.central': 1, 'world.fantasy': 1, 'freedom.open_world': 1, 'loop.melee': 0.7, 'characters.memorable': 0.9, 'tone.dark': 0.7 }, { ru: 'Ведьмак 3: Дикая Охота', work: 'witcher 3', series: ['The Witcher'], popularity: 5.9 }),
    game(2, 'The Witcher 3 Remastered', { 'world.living': 1, 'story.central': 1, 'world.fantasy': 1 }, { work: 'witcher 3', series: ['The Witcher'], popularity: 4 }),
    game(3, 'Kingdom Come', { 'world.living': 0.9, 'world.realistic': 1, 'world.historical': 1, 'freedom.open_world': 0.9, 'difficulty.hard': 0.7, 'story.central': 0.8, 'combat.clunky': 0.67 }, { popularity: 5.2 }),
    game(4, 'Stardew Valley', { 'tone.cozy': 1, 'loop.life_sim': 1, 'tension.low': 1, 'session.short': 0.6 }, { facts: ['social.coop'], platforms: { windows: true, mac: true, linux: true }, deck: 'verified', popularity: 5.7 }),
    game(5, 'Dark Souls', { 'difficulty.hard': 1, 'combat.weighty': 1, 'tone.dark': 1, 'story.lore': 0.8, 'world.fantasy': 0.8 }, { popularity: 5.3 }),
    game(6, 'Hades', { 'session.short': 1, 'combat.fast': 1, 'difficulty.hard': 0.6, 'humor.funny': 0.5, 'aesthetic.stylized': 1 }, { platforms: { windows: true, mac: true, linux: false }, popularity: 5.4 }),
    game(7, 'Red Dead Redemption 2', { 'world.living': 1, 'world.realistic': 0.9, 'story.central': 1, 'freedom.open_world': 1, 'pace.slow': 0.8, 'characters.memorable': 1 }, { popularity: 5.8 }),
    game(8, 'Unreleased Game', { 'world.living': 1, 'story.central': 1 }, { released: false }),
    game(9, 'Bad Game', { 'world.living': 1, 'story.central': 1, 'freedom.open_world': 1 }, { quality: 0.5, ratio: 0.45 }),
    game(10, 'Skyrim', { 'world.fantasy': 1, 'freedom.open_world': 1, 'freedom.sandbox': 0.8, 'world.living': 0.7, 'progression.power': 0.7 }, { popularity: 5.6 }),
    game(11, 'Civilization VI', { 'cognitive.high': 1, 'loop.management': 1, 'session.long': 1 }, { platforms: { windows: true, mac: true, linux: true }, popularity: 5.1 }),
    game(12, 'Portal 2', { 'loop.puzzles': 1, 'humor.funny': 1, 'length.short': 1, 'freedom.linear': 1 }, { platforms: { windows: true, mac: true, linux: true }, popularity: 5.5 }),
    game(13, 'It Takes Two', { 'tone.lighthearted': 1, 'loop.platforming': 0.8, 'story.central': 0.6 }, { facts: ['social.coop'], popularity: 5 }),
    ...extra,
  ];
  const { df, idf } = computeIdf(games);
  return makeCatalog({ items: games, df, idf, stats: {} }, 'game');
}

export function title(id, name, kind, features, extra = {}) {
  const f = {};
  for (const [fid, r] of Object.entries(features)) f[fid] = { r, c: 0.86, src: ['genome'], ev: [] };
  return {
    id, domain: kind, kind, name, ru: null, original: null, aliases: [], work: name.toLowerCase(), year: 2010, released: true,
    genres: [], reviews: { total: 100_000, ratio: 0.8, desc: '8,0' }, quality: 0.8, popularity: 5, features: f,
    runtime: extra.runtime ?? null, seasons: extra.seasons ?? null, episodes: extra.episodes ?? null, status: extra.status ?? null,
  };
}

/** Films, series or cartoons: a few titles with runtime, episodes and animation flags. */
export function screenFixture(domainId) {
  const kind = domainId === 'series' ? 'series' : 'film';
  const items = [
    title('t1', 'Short One', kind, { 'humor.funny': 1, 'format.animation': 1, 'tone.feelgood': 0.8 }, { runtime: 90, episodes: 8, seasons: 1 }),
    title('t2', 'Long One', kind, { 'humor.funny': 0.9, 'format.animation': 1, 'tone.dark': 0.7 }, { runtime: 150, episodes: 100, seasons: 9 }),
    title('t3', 'Unknown Length', kind, { 'humor.funny': 0.8, 'format.animation': 1 }),
  ].map((x) => ({ ...x, domain: domainId }));
  const { df, idf } = computeIdf(items, SCREEN_FEATURES);
  return makeCatalog({ items, df, idf, stats: {} }, domainId);
}
