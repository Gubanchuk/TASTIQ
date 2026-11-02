// IMDb non-commercial datasets → base list of films and series with enough votes to be known.
// Reads the gzipped TSV files as streams (basics alone is ~1 GB unpacked).
//
// Env: MIN_VOTES_FILM (default 2000), MIN_VOTES_SERIES (default 1000).
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import { resolve } from 'node:path';
import { RAW, writeJson } from '../../lib/fsx.js';

const DIR = resolve(RAW, 'imdb');
const MIN_VOTES_FILM = Number(process.env.MIN_VOTES_FILM ?? 2000);
const MIN_VOTES_SERIES = Number(process.env.MIN_VOTES_SERIES ?? 1000);
const TYPES = new Set(['movie', 'tvSeries', 'tvMiniSeries']);
// Shows that are not stories: nobody asks a picker for these.
const NON_STORY_GENRES = new Set(['Reality-TV', 'Talk-Show', 'Game-Show', 'News', 'Adult']);

async function eachRow(file, fn) {
  const rl = createInterface({ input: createReadStream(resolve(DIR, file)).pipe(createGunzip()), crlfDelay: Infinity });
  let header = null;
  for await (const line of rl) {
    const cols = line.split('\t');
    if (!header) { header = cols; continue; }
    fn(cols);
  }
}
const val = (x) => (x === '\\N' ? null : x);

console.log('ratings…');
const ratings = new Map();
await eachRow('title.ratings.tsv.gz', ([id, rating, votes]) => {
  const v = Number(votes);
  if (v >= Math.min(MIN_VOTES_FILM, MIN_VOTES_SERIES)) ratings.set(id, [Number(rating), v]);
});

console.log('basics…');
const titles = new Map();
await eachRow('title.basics.tsv.gz', ([id, type, primary, original, isAdult, start, end, runtime, genres]) => {
  if (!TYPES.has(type) || isAdult === '1') return;
  const r = ratings.get(id);
  if (!r) return;
  const isSeries = type !== 'movie';
  if (r[1] < (isSeries ? MIN_VOTES_SERIES : MIN_VOTES_FILM)) return;
  const g = val(genres) ? genres.split(',') : [];
  if (g.some((x) => NON_STORY_GENRES.has(x))) return;
  titles.set(id, {
    imdb: id,
    type,
    name: primary,
    original: original !== primary ? original : null,
    year: val(start) ? Number(start) : null,
    endYear: val(end) ? Number(end) : null,
    runtime: val(runtime) ? Number(runtime) : null,
    genres: g,
    rating: r[0],
    votes: r[1],
    ru: null,
    episodes: null,
    seasons: null,
  });
});
console.log(`  ${titles.size} titles`);

console.log('episodes…');
await eachRow('title.episode.tsv.gz', ([, parent, season]) => {
  const t = titles.get(parent);
  if (!t) return;
  t.episodes = (t.episodes ?? 0) + 1;
  const s = Number(val(season));
  if (s) t.seasons = Math.max(t.seasons ?? 0, s);
});

console.log('russian titles…');
// Prefer the title shown in Russia's release ("imdbDisplay"), then any Russian-region title.
const rank = (types) => (types?.includes('imdbDisplay') ? 0 : types?.includes('working') || types?.includes('festival') ? 2 : 1);
const best = new Map();
await eachRow('title.akas.tsv.gz', ([id, , title, region, language, types]) => {
  if (!titles.has(id)) return;
  if (region !== 'RU' && !(region === '\\N' && language === 'ru')) return;
  const score = rank(val(types));
  const prev = best.get(id);
  if (!prev || score < prev.score) best.set(id, { title, score });
});
for (const [id, b] of best) titles.get(id).ru = b.title;

const list = [...titles.values()];
writeJson(resolve(RAW, 'screen-base.json'), list, false);
const count = (fn) => list.filter(fn).length;
console.log(
  `IMDb base: ${list.length} titles; films ${count((t) => t.type === 'movie')}, series ${count((t) => t.type !== 'movie')}, ` +
    `animation ${count((t) => t.genres.includes('Animation'))}, with Russian title ${count((t) => t.ru)}`,
);
