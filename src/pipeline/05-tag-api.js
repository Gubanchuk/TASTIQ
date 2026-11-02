// Step 5 (API backend): tag every prepared input through the Message Batches API.
// Same prompt and output shape as a manual run, so 06-tag-ingest.js treats both alike.
//
// Usage: node src/pipeline/05-tag-api.js [run]
// Env:   ANTHROPIC_API_KEY (or an `ant auth login` profile)
//        TAG_MODEL   model id, default claude-opus-5-5. The research cost estimate
//                    ($33.50–67.50 per 100 000 games per run) assumes TAG_MODEL=claude-haiku-5-5.
//        TAG_BATCH   id of an already created batch to resume polling instead of creating a new one
import Anthropic from '@anthropic-ai/sdk';
import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { DATA, readJson, writeJson } from '../lib/fsx.js';
import { sleep } from '../lib/http.js';
import { buildTaggingPrompt, TAG_OUTPUT_SCHEMA } from './tag-prompt.js';

const run = process.argv[2] ?? 'run1';
const model = process.env.TAG_MODEL ?? 'claude-opus-5-5';
const dir = resolve(DATA, 'tagging', run);
const client = new Anthropic();
const system = buildTaggingPrompt();

const pending = readdirSync(resolve(dir, 'in'))
  .filter((f) => f.endsWith('.json'))
  .filter((f) => !existsSync(resolve(dir, 'out', f)));

if (!pending.length && !process.env.TAG_BATCH) {
  console.log('Nothing to tag: every input already has an output');
  process.exit(0);
}

let batchId = process.env.TAG_BATCH;
if (!batchId) {
  const requests = pending.map((file) => ({
    custom_id: file.replace('.json', ''),
    params: {
      model,
      max_tokens: 16000,
      // The prompt is identical for every game, so it is cached once per batch.
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: JSON.stringify(readJson(resolve(dir, 'in', file))) }],
      output_config: { effort: 'low', format: { type: 'json_schema', schema: TAG_OUTPUT_SCHEMA } },
    },
  }));
  const batch = await client.messages.batches.create({ requests });
  batchId = batch.id;
  writeJson(resolve(dir, 'batch.json'), { id: batchId, model, createdAt: new Date().toISOString(), count: requests.length });
  console.log(`Created batch ${batchId} with ${requests.length} requests (model ${model})`);
}

let batch;
while (true) {
  batch = await client.messages.batches.retrieve(batchId);
  if (batch.processing_status === 'ended') break;
  console.log(`Batch ${batchId}: ${batch.processing_status}, processing ${batch.request_counts.processing}`);
  await sleep(60_000);
}

const usage = { input: 0, output: 0, cacheRead: 0 };
const failed = [];
for await (const result of await client.messages.batches.results(batchId)) {
  const appid = result.custom_id;
  if (result.result.type !== 'succeeded') {
    failed.push({ appid, type: result.result.type });
    continue;
  }
  const message = result.result.message;
  usage.input += message.usage.input_tokens;
  usage.output += message.usage.output_tokens;
  usage.cacheRead += message.usage.cache_read_input_tokens ?? 0;
  if (message.stop_reason === 'refusal' || message.stop_reason === 'max_tokens') {
    failed.push({ appid, type: message.stop_reason });
    continue;
  }
  const text = message.content.find((b) => b.type === 'text')?.text;
  try {
    writeJson(resolve(dir, 'out', `${appid}.json`), JSON.parse(text));
  } catch {
    failed.push({ appid, type: 'invalid_json' });
  }
}

writeJson(resolve(dir, 'batch-result.json'), { id: batchId, model, usage, failed });
console.log(`Done. Tokens: input ${usage.input}, cache read ${usage.cacheRead}, output ${usage.output}; failed ${failed.length}`);
