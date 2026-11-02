import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aiIntent } from '../src/ai/intent.js';
import { OpenAIError } from '../src/ai/openai.js';
import { fixtureCatalog } from './fixture.js';
const catalog = fixtureCatalog();
const text = 'Устал, но хочу напряжения, без гринда. Есть 45 минут';
const output = { wants: [{ f: 'tension.high', evidence: 'хочу напряжения' }], avoids: [{ f: 'progression.grind', evidence: 'без гринда' }], time: { minutes: 45, evidence: '45 минут' }, clarification: null };
const response = (out = output, extra = {}) => ({ status: 'completed', model: 'stub', usage: { input_tokens: 100, output_tokens: 20 }, output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(out) }] }], ...extra });

test('intent uses strict domain features, original words and quoted proposals, not a confirmed profile', async () => {
  let request;
  const result = await aiIntent(catalog, text, { api: async (body) => { request = body; return response(); } });
  assert.deepEqual(result.proposal.wants, output.wants);
  assert.equal(result.proposal.sourceText, text);
  assert.equal(result.proposal.source, undefined);
  assert.equal(request.text.format.strict, true);
  assert.ok(request.text.format.schema.properties.wants.items.properties.f.enum.includes('session.short'));
  assert.match(request.input, /Устал, но хочу напряжения/);
  assert.match(request.instructions, /fatigue alone/i);
  assert.equal(request.store, false);
});

test('an ambiguous state can ask for a wish without inventing relaxation', async () => {
  const result = await aiIntent(catalog, 'Я устал', { api: async () => response({ wants: [], avoids: [], time: null, clarification: 'Хочется расслабиться или переключиться на что-то захватывающее?' }) });
  assert.deepEqual(result.proposal.wants, []);
  assert.match(result.clarification, /Хочется/);
});

test('unverifiable quotes are discarded and budget exhaustion makes no call', async () => {
  const result = await aiIntent(catalog, text, { api: async () => response({ ...output, wants: [{ f: 'tension.low', evidence: 'расслабиться' }] }) });
  assert.deepEqual(result.proposal.wants, []);
  const noCall = async () => { assert.fail('budget guard must run before API'); };
  assert.equal((await aiIntent(catalog, text, { api: noCall, maxCostUsd: 0 })).notRequested, true);
  assert.equal((await aiIntent(catalog, ' ', { api: noCall })).notRequested, true);
});

test('refusals, incomplete and malformed replies keep usage; timeout is safe and not retried', async () => {
  for (const reply of [response(null), response({}, { status: 'incomplete' }), response({}, { output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }] })]) {
    const result = await aiIntent(catalog, text, { api: async () => reply });
    assert.ok(result.error); assert.deepEqual(result.usage, reply.usage);
  }
  let calls = 0;
  const result = await aiIntent(catalog, text, { api: async () => { calls++; throw new OpenAIError('нейросеть не ответила вовремя'); } });
  assert.equal(calls, 1); assert.match(result.error, /вовремя/);
});
