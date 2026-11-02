// Step 4: tagging inputs. One file per game with the evidence texts and their ids, plus the shared
// prompt. Any backend (05-tag-api.js or a manual agent run) reads in/<appid>.json and writes
// out/<appid>.json; 06-tag-ingest.js validates the result against these same inputs.
//
// Usage: node src/pipeline/04-tag-prepare.js [run] [--only=appid,appid] [--sample=N]
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { DATA, RAW, readJson, writeJson } from '../lib/fsx.js';
import { bbcodeToText, htmlToText, truncate } from '../lib/text.js';
import { buildTaggingPrompt } from './tag-prompt.js';

const args = process.argv.slice(2);
const run = args.find((a) => !a.startsWith('--')) ?? 'run1';
const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',').map(Number);
const sample = Number(args.find((a) => a.startsWith('--sample='))?.slice(9) ?? 0);

const REVIEW_PLAN = [
  { key: 'enPositive', take: 8 },
  { key: 'enNegative', take: 5 },
  { key: 'ru', take: 4 },
];
const REVIEW_MAX_CHARS = 600;
const ABOUT_MAX_CHARS = 1200;

let games = readJson(resolve(RAW, 'games-raw.json'));
if (only) games = games.filter((g) => only.includes(g.appid));
if (sample) {
  // Every k-th game, so a second run covers the whole popularity range, not just the top.
  const step = Math.max(1, Math.floor(games.length / sample));
  games = games.filter((_, i) => i % step === 0).slice(0, sample);
}

const dir = resolve(DATA, 'tagging', run);
mkdirSync(resolve(dir, 'in'), { recursive: true });
mkdirSync(resolve(dir, 'out'), { recursive: true });
writeFileSync(resolve(DATA, 'tagging', 'PROMPT.md'), buildTaggingPrompt() + '\n', 'utf8');

for (const g of games) {
  const seen = new Set();
  const reviews = [];
  for (const { key, take } of REVIEW_PLAN) {
    let taken = 0;
    for (const r of g.reviews?.[key] ?? []) {
      if (taken >= take || seen.has(r.id)) continue;
      const text = bbcodeToText(r.text);
      if (text.length < 60) continue;
      seen.add(r.id);
      taken++;
      reviews.push({
        id: `r${r.id}`,
        thumb: r.up ? 'up' : 'down',
        hours: r.playtimeAtReview == null ? null : Math.round(r.playtimeAtReview / 60),
        lang: r.lang,
        text: truncate(text, REVIEW_MAX_CHARS),
      });
    }
  }
  writeJson(resolve(dir, 'in', `${g.appid}.json`), {
    appid: g.appid,
    name: g.name,
    released: g.releaseDate?.date ?? null,
    genres: g.genres,
    d: htmlToText(g.shortDescription),
    a: truncate(htmlToText(g.aboutTheGame), ABOUT_MAX_CHARS),
    reviews,
  });
}

writeJson(resolve(dir, 'manifest.json'), { run, createdAt: new Date().toISOString(), appids: games.map((g) => g.appid) });
console.log(`Prepared ${games.length} tagging inputs in data/tagging/${run}/in`);
