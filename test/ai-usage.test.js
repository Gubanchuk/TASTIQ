import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateCost, reserveCost } from '../src/ai/usage.js';

test('OpenAI cost separates cached input and does not count reasoning twice', () => {
  const usage = { input_tokens: 1000, input_tokens_details: { cached_tokens: 400 }, output_tokens: 100, output_tokens_details: { reasoning_tokens: 60 } };
  assert.equal(estimateCost(usage, 'gpt-6.1-sol'), (600 * 2 + 400 * 0.1 + 100 * 10) / 1e6);
  assert.equal(estimateCost({ input_tokens: 1000, output_tokens: 100 }, 'gpt-6.1-sol'), 0.003);
});

test('a request reserve covers all UTF-8 bytes as input tokens, framing and the maximum output', () => {
  const request = { model: 'gpt-6.1-sol', input: 'Проверка', max_output_tokens: 8000 };
  const reserve = reserveCost(request);
  assert.equal(reserve, ((Buffer.byteLength(JSON.stringify(request), 'utf8') + 4096) * 2 + 8000 * 10) / 1e6);
  assert.ok(reserve > 0.08);
  assert.equal(reserveCost({ ...request, model: 'unknown' }), null);
});

test('unknown pricing or missing/invalid usage is not reported as zero cost', () => {
  assert.equal(estimateCost({ input_tokens: 10, output_tokens: 1 }, 'unknown-model'), null);
  for (const usage of [undefined, {}, { input_tokens: -1, output_tokens: 1 }, { input_tokens: 1, output_tokens: 1, input_tokens_details: { cached_tokens: 2 } }]) {
    assert.equal(estimateCost(usage, 'gpt-6.1-sol'), null);
  }
  assert.equal(estimateCost({ input_tokens: 0, output_tokens: 0 }, 'gpt-6.1-sol'), 0);
});
