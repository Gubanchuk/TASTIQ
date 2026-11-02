// Episode length for series whose IMDb record has no runtime: the median runtime of their episodes in IMDb
// (title.episode links an episode to its series, title.basics holds the episode's own runtime). Streaming
// series often have no series-level runtime in IMDb or TVmaze, and without one the «20–30 minutes or an hour»
// answer cannot sieve them (seen on 2026-10-28: Presumed Innocent passed «20–30 minutes»).
// Writes data/raw/episode-runtime.json { imdbId: minutes }; s04-catalog.js takes it after IMDb and TVmaze.
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import { resolve } from 'node:path';
import { RAW, readJson, writeJson } from '../../lib/fsx.js';

const DIR = resolve(RAW, 'imdb');

async function eachRow(file, fn) {
  const rl = createInterface({ input: createReadStream(resolve(DIR, file)).pipe(createGunzip()), crlfDelay: Infinity });
  let header = null;
  for await (const line of rl) {
    if (!header) { header = line; continue; }
    fn(line.split('\t'));
  }
}

const series = new Set(readJson(resolve(RAW, 'screen-base.json')).filter((t) => t.type !== 'movie' && !t.runtime).map((t) => t.imdb));
console.log(`series without runtime: ${series.size}`);

const parentOf = new Map();
await eachRow('title.episode.tsv.gz', ([id, parent]) => { if (series.has(parent)) parentOf.set(id, parent); });
console.log(`their episodes: ${parentOf.size}`);

const minutes = new Map();
await eachRow('title.basics.tsv.gz', ([id, , , , , , , runtime]) => {
  const parent = parentOf.get(id);
  if (!parent || runtime === '\\N') return;
  const m = Number(runtime);
  if (m > 0) (minutes.get(parent) ?? minutes.set(parent, []).get(parent)).push(m);
});

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
// Two episodes with a runtime are enough: a pilot alone can be double length.
const out = Object.fromEntries([...minutes].filter(([, xs]) => xs.length >= 2).map(([id, xs]) => [id, median(xs)]));
writeJson(resolve(RAW, 'episode-runtime.json'), out, false);
console.log(`episode runtime found for ${Object.keys(out).length} of ${series.size}`);
