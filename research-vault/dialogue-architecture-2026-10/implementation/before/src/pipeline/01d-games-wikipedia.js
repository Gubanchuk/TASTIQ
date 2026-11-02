// Texts for LLM tagging of the games that have no Steam review sample (the tail: the review endpoint is closed,
// and Steam tags alone miss things like "memorable characters"): the English Wikipedia article (CC BY-SA), lead plus
// gameplay/plot and reception sections, split into paragraphs with evidence ids. Same input shape as the screen
// inputs, so 06-tag-ingest.js (games) checks the answers against `paragraphs`.
//
// Env: MIN_REVIEWS (default 5000) — only games with at least that many Steam reviews, most reviewed first;
// RUN (default run3); WIKI_MS — pause between Wikipedia requests (default 400), WIKI_POOL — parallel requests
// (default 4); SKIP_EXISTING=1 — keep inputs written by an earlier pass; ONLY — comma-separated appids to
// (re)write just those inputs, leaving the run's manifest alone.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DATA, readJson, writeJson } from '../lib/fsx.js';
import { getJson, mapPool, RateLimiter } from '../lib/http.js';
import { fetchPlainArticle, GAME_SECTIONS, paragraphs } from './screen/wiki-text.js';
import { buildTaggingPrompt } from './tag-prompt.js';

const MIN_REVIEWS = Number(process.env.MIN_REVIEWS ?? 5000);
const RUN = process.env.RUN ?? 'run3';
const sparql = new RateLimiter(1_500);
// Wikipedia answers 429 to about 4 requests a second (seen 2026-10-25); WIKI_MS keeps well under that.
const wiki = new RateLimiter(Number(process.env.WIKI_MS ?? 400));
const MIN_PARAGRAPHS = 2;

const catalog = readJson(resolve(DATA, 'catalog.json'));
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',').map(Number)) : null;
const targets = catalog.items
  .filter((g) => g.qid && (ONLY ? ONLY.has(g.appid) : g.tagged === false && g.reviews.total >= MIN_REVIEWS))
  .sort((a, b) => b.reviews.total - a.reviews.total);
console.log(`Targets: ${targets.length}`);

// Wikidata → title of the English article. The wbgetentities API answered 429 to every request from this machine
// on 2026-10-28 (as did the Wikipedia API), while the SPARQL endpoint kept answering, so qids go through SPARQL,
// 150 per query as in s05-wikipedia.js.
const articles = new Map();
const byQid = new Map(targets.map((t) => [t.qid, t]));
for (let i = 0; i < targets.length; i += 150) {
  const ids = targets.slice(i, i + 150).map((t) => `wd:${t.qid}`).join(' ');
  const q = `SELECT ?item ?article WHERE { VALUES ?item { ${ids} } ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> . }`;
  const body = await getJson(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(q)}`, { limiter: sparql, headers: { Accept: 'application/sparql-results+json' } });
  for (const r of body.results.bindings) {
    const t = byQid.get(r.item.value.split('/entity/')[1]);
    if (t) articles.set(t.appid, decodeURIComponent(r.article.value.split('/wiki/')[1]).replace(/_/g, ' '));
  }
}
console.log(`Articles found: ${articles.size}`);

const dir = resolve(DATA, 'tagging', RUN);
mkdirSync(resolve(dir, 'in'), { recursive: true });
mkdirSync(resolve(dir, 'out'), { recursive: true });
writeFileSync(resolve(DATA, 'tagging', 'PROMPT-games-wiki.md'), buildTaggingPrompt(null, 'games-wiki') + '\n', 'utf8');

const stats = { written: 0, noArticle: articles.size === targets.length ? 0 : targets.length - articles.size, noText: 0, thin: 0, paragraphs: 0 };
const skip = (id) => process.env.SKIP_EXISTING && existsSync(resolve(dir, 'in', `${id}.json`));
const written = [];
await mapPool(targets, Number(process.env.WIKI_POOL ?? 4), async (t) => {
  const title = articles.get(t.appid);
  if (!title || skip(t.appid)) return;
  const text = await fetchPlainArticle(title, wiki);
  if (!text) { stats.noText++; return; }
  const paras = paragraphs(text, GAME_SECTIONS);
  if (paras.length < MIN_PARAGRAPHS) { stats.thin++; return; }
  writeJson(resolve(dir, 'in', `${t.appid}.json`), {
    appid: t.appid,
    name: t.name,
    released: t.year ?? null,
    genres: t.genres,
    d: '', // the catalog keeps no store description for the tail ("deck" there is Steam Deck compatibility)
    paragraphs: paras.map((p, i) => ({ id: `p${i}`, section: p.section, text: p.text })),
    source: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
  });
  written.push(t.appid);
  stats.written++;
  stats.paragraphs += paras.length;
  if (stats.written % 100 === 0) console.log(`  ${stats.written} written`);
});
if (!ONLY) writeJson(resolve(dir, 'manifest.json'), { run: RUN, createdAt: new Date().toISOString(), appids: targets.filter((t) => articles.has(t.appid)).map((t) => t.appid) });
console.log(`Wrote ${stats.written} inputs to data/tagging/${RUN}/in; no article ${stats.noArticle}, no text ${stats.noText}, under ${MIN_PARAGRAPHS} paragraphs ${stats.thin}; mean paragraphs ${(stats.paragraphs / Math.max(1, stats.written)).toFixed(1)}`);
