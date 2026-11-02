// Russian translations of the English evidence quotes (Wikipedia paragraphs, Steam reviews, store descriptions),
// so a reason on the result reads in Russian and the original stays one tap away. The quote itself is what the
// checker found verbatim in the source; the translation is shown as a translation, never fed back into tagging.
//
// Incremental: data/quotes-ru.json maps the English text to its translation, and only quotes missing there are
// sent, so a later run after new tagging costs only the new quotes. Model Claude Haiku 5.5, 50 quotes a request.
// Env: LIMIT — at most this many new quotes (a trial run); POOL — parallel requests (default 6).
// Usage: node --max-old-space-size=8192 src/pipeline/08-translate-quotes.js
import Anthropic from '@anthropic-ai/sdk';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { DATA, ROOT, readJson, writeJson } from '../lib/fsx.js';
import { mapPool } from '../lib/http.js';

const ENV = resolve(ROOT, '.env');
if (!process.env.ANTHROPIC_API_KEY && existsSync(ENV)) process.loadEnvFile(ENV);

const MODEL = 'claude-haiku-5-5';
const PRICE = { input: 0.1 / 1e6, output: 0.5 / 1e6 }; // $ per token, prompts under 100K tokens (skill claude-api, models)
const CHUNK = 50;
const OUT = resolve(DATA, 'quotes-ru.json');
const TEXT_KINDS = new Set(['wiki', 'summary', 'review', 'description']);
// The same test as the page (pick/app.js, looksEnglish): printable ASCII and typographic quotes only.
const looksEnglish = (q) => /^[\x20-\x7E‘-‟–—…]+$/.test(q ?? '') && /[a-z]{3}/i.test(q);

function quotesOf(path) {
  const catalog = readJson(path, null);
  const out = new Set();
  for (const item of catalog?.items ?? []) {
    for (const v of Object.values(item.features)) for (const e of v.ev ?? []) if (TEXT_KINDS.has(e.kind) && looksEnglish(e.q)) out.add(e.q);
  }
  return out;
}

const done = readJson(OUT, {});
const all = new Set([...quotesOf(resolve(DATA, 'catalog-screen.json')), ...quotesOf(resolve(DATA, 'catalog.json'))]);
let todo = [...all].filter((q) => !(q in done));
if (process.env.LIMIT) todo = todo.slice(0, Number(process.env.LIMIT));
console.log(`quotes ${all.size}, already translated ${[...all].filter((q) => q in done).length}, to translate now ${todo.length}`);

const SYSTEM = [
  'You translate short English quotes into Russian for a film, series and game recommender.',
  'The quotes come from Wikipedia articles, critics and player reviews; each backs a reason like "funny" or "slow pace".',
  'Translate each quote into natural, plain Russian with the same meaning: no additions, no explanations, no quotation marks around it.',
  'Keep it about as short as the original. A fragment stays a fragment.',
  'Titles of works: use the established Russian title when you are sure of it, otherwise keep the original. Names of people stay in Latin letters.',
  'Return one translation per quote, in the same order.',
].join('\n');
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['ru'],
  // Structured outputs accept no item counts beyond 0 or 1, so the count is checked after the answer.
  properties: { ru: { type: 'array', items: { type: 'string' } } },
};

const client = new Anthropic({ maxRetries: 3, timeout: 120_000 });
const usage = { input: 0, output: 0, requests: 0, failed: 0 };
const chunks = [];
for (let i = 0; i < todo.length; i += CHUNK) chunks.push(todo.slice(i, i + CHUNK));

async function translate(chunk, attempt = 1) {
  const content = chunk.map((q, i) => `${i + 1}. ${q}`).join('\n');
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 16_000,
    thinking: { type: 'disabled' },
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: 'user', content: `Quotes (${chunk.length}):\n${content}` }],
  });
  usage.requests++;
  usage.input += res.usage.input_tokens;
  usage.output += res.usage.output_tokens;
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  let ru = null;
  try { ru = JSON.parse(text).ru; } catch { /* retried below */ }
  if (!Array.isArray(ru) || ru.length !== chunk.length || ru.some((x) => typeof x !== 'string' || !x.trim())) {
    if (attempt < 2) return translate(chunk, attempt + 1);
    usage.failed++;
    return;
  }
  chunk.forEach((q, i) => { done[q] = ru[i].trim(); });
}

let finished = 0;
await mapPool(chunks, Number(process.env.POOL ?? 6), async (chunk) => {
  try {
    await translate(chunk);
  } catch (err) {
    usage.failed++;
    console.log(`  chunk failed: ${err.message}`);
  }
  finished++;
  if (finished % 20 === 0) {
    writeJson(OUT, done, false);
    console.log(`  ${finished}/${chunks.length} requests, $${(usage.input * PRICE.input + usage.output * PRICE.output).toFixed(3)}`);
  }
});
writeJson(OUT, done, false);
const cost = usage.input * PRICE.input + usage.output * PRICE.output;
console.log(`translated ${Object.keys(done).length} quotes in total; requests ${usage.requests}, failed chunks ${usage.failed}; tokens in ${usage.input}, out ${usage.output}; about $${cost.toFixed(3)}`);
