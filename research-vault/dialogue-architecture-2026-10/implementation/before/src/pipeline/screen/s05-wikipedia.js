// Texts for LLM tagging of titles that MovieLens Tag Genome does not cover (all series and cartoons,
// recent films): the English Wikipedia article (CC BY-SA), lead plus reception/style sections, split
// into paragraphs with evidence ids. Same input shape as game tagging, so the same checker applies.
//
// Env: SERIES (default 500), CARTOONS (default 200), FILMS (default 300) — top titles by IMDb votes;
// RUN (default screen-run1); WIKI_MS — pause between Wikipedia requests; ONLY — comma-separated IMDb ids to
// (re)write just those inputs, leaving the run's manifest alone (used after fixing ARTICLE_OVERRIDES); ONLY_FILE — the
// same as a JSON file.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DATA, readJson, writeJson } from '../../lib/fsx.js';
import { getJson, mapPool, RateLimiter } from '../../lib/http.js';
import { paragraphs, plainFromWikitext } from './wiki-text.js';
import { buildTaggingPrompt } from '../tag-prompt.js';
import { SCREEN_DICT } from '../../aspects/index.js';

const N = { series: Number(process.env.SERIES ?? 500), cartoon: Number(process.env.CARTOONS ?? 200), film: Number(process.env.FILMS ?? 300) };
const RUN = process.env.RUN ?? 'screen-run1';
const sparql = new RateLimiter(1_500);
// Wikipedia answers 429 to about 4 requests a second (seen 2026-10-25); WIKI_MS slows it down.
const wiki = new RateLimiter(Number(process.env.WIKI_MS ?? 250));

const catalog = readJson(resolve(DATA, 'catalog-screen.json'));
const byVotes = (a, b) => b.reviews.total - a.reviews.total;
const pick = (domain, filter = () => true) => catalog.items.filter((x) => x.domain === domain && filter(x)).sort(byVotes).slice(0, N[domain]);
// ONLY_FILE: a JSON array of IMDb ids, for lists too long for an environment variable (re-fetching thin inputs).
const ONLY = process.env.ONLY_FILE ? new Set(readJson(process.env.ONLY_FILE)) : process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const targets = ONLY ? catalog.items.filter((x) => ONLY.has(x.id)) : [...pick('series'), ...pick('cartoon'), ...pick('film', (x) => !x.tagged)];
console.log(`Targets: ${targets.length}`);

const articles = new Map();
for (let i = 0; i < targets.length; i += 150) {
  const ids = targets.slice(i, i + 150).map((t) => `"${t.id}"`).join(' ');
  const q = `SELECT ?imdb ?article WHERE { VALUES ?imdb { ${ids} } ?item wdt:P345 ?imdb . ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> . }`;
  const body = await getJson(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(q)}`, { limiter: sparql, headers: { Accept: 'application/sparql-results+json' } });
  for (const b of body.results.bindings) articles.set(b.imdb.value, decodeURIComponent(b.article.value.split('/wiki/')[1]).replace(/_/g, ' '));
}
// Wikidata links some IMDb ids to an article about another title; found by
// research-vault/akinator-picker-2026-10/scripts/wrong-articles.mjs and checked by hand. null: no article of its own.
const ARTICLE_OVERRIDES = {
  tt1074206: 'The Passage (TV series)', // The Passage (2019, Fox); Wikidata gave Lorong Waktu, an Indonesian cartoon series
  tt9131050: null, // A Confession (2019, ITV); its article redirects to the article about the real case
  tt0063951: 'Sesame Street', // Wikidata gave «1, rue Sésame», the French version
  tt1372153: null, // The Nutshack (2007); its article redirects to Myx, the TV channel
  tt6556604: null, // Miracle Star; Wikidata gave the article on a season of The Amazing World of Gumball
};
for (const [id, title] of Object.entries(ARTICLE_OVERRIDES)) {
  if (!targets.some((t) => t.id === id)) continue;
  if (title) articles.set(id, title);
  else articles.delete(id);
}
console.log(`Articles found: ${articles.size}`);

const UA = 'TASTIQ-prototype/0.1 (game recommender research)';
// A 429 is waited out (Retry-After, at most 60 s) and retried three times: on 2026-10-28 a re-fetch at 4 requests
// a second lost 1 292 of 2 697 titles to silent skips.
async function rawText(title, hops = 0, tries = 0) {
  await wiki.wait();
  const res = await fetch(`https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(title.replace(/ /g, '_'))}&action=raw`, { headers: { 'User-Agent': UA } }).catch(() => null);
  if ((!res || res.status === 429 || res.status >= 500) && tries < 3) {
    const wait = Math.min(60, Number(res?.headers.get('retry-after')) || 10 * (tries + 1));
    await new Promise((r) => setTimeout(r, wait * 1000));
    return rawText(title, hops, tries + 1);
  }
  if (!res?.ok) return null;
  const text = await res.text();
  const redirect = /^#REDIRECT\s*\[\[([^\]|#]+)/i.exec(text);
  if (redirect) return hops < 2 ? rawText(redirect[1].trim(), hops + 1) : null;
  return plainFromWikitext(text);
}
async function extractOf(title) {
  if (process.env.SOURCE === 'raw') return rawText(title);
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exsectionformat=wiki&redirects=1&format=json&titles=${encodeURIComponent(title)}`;
  const body = await getJson(url, { limiter: wiki }).catch(() => null);
  return Object.values(body?.query?.pages ?? {})[0]?.extract ?? null;
}

const dir = resolve(DATA, 'tagging', RUN);
mkdirSync(resolve(dir, 'in'), { recursive: true });
mkdirSync(resolve(dir, 'out'), { recursive: true });
writeFileSync(resolve(DATA, 'tagging', 'PROMPT-screen.md'), buildTaggingPrompt(SCREEN_DICT, 'screen') + '\n', 'utf8');

let written = 0;
// SKIP_EXISTING=1 leaves inputs already written by an earlier, interrupted pass.
const skip = (id) => process.env.SKIP_EXISTING && existsSync(resolve(dir, 'in', `${id}.json`));
// Wikipedia asks for requests in series; WIKI_POOL > 1 only where it is known to cope.
await mapPool(targets, Number(process.env.WIKI_POOL ?? 6), async (t) => {
  const title = articles.get(t.id);
  if (!title || skip(t.id)) return;
  const extract = await extractOf(title);
  if (!extract) return;
  const paras = paragraphs(extract);
  if (!paras.length) return;
  writeJson(resolve(dir, 'in', `${t.id}.json`), {
    id: t.id,
    name: t.name,
    kind: t.kind,
    domain: t.domain,
    year: t.year,
    genres: t.genres,
    s: t.summary ?? '',
    paragraphs: paras.map((p, i) => ({ id: `p${i}`, section: p.section, text: p.text })),
    source: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
  });
  written++;
  if (written % 100 === 0) console.log(`  ${written} written`);
});
if (!ONLY) writeJson(resolve(dir, 'manifest.json'), { run: RUN, createdAt: new Date().toISOString(), ids: targets.map((t) => t.id).filter((id) => articles.has(id)) });
console.log(`Wrote ${written} tagging inputs to data/tagging/${RUN}/in`);
