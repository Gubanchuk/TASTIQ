import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
import { PaidBudget } from '../src/stand/paid-budget.js';
import { budgetTransport } from '../src/ai/budget-transport.js';
import { reserveCost } from '../src/ai/usage.js';

const request = { model: 'gpt-6.1-sol', max_output_tokens: 100, input: 'one' };
const response = { status: 'completed', model: request.model, usage: { input_tokens: 100, output_tokens: 20 }, output: [] };
function setup(t) {
  const root = resolve('.'), dir = mkdtempSync(join(root, '.tastiq-budget-test-'));
  const ledger = new PaidBudget(dir, { ceiling: 5, baselineUpper: 1, baselineCalls: 1, roundCap: 2 });
  t.after(() => { ledger.close(); assert.ok(dir.startsWith(root + sep)); rmSync(dir, { recursive: true, force: true }); });
  return ledger;
}
test('runtime batch cap reserves before dispatch, survives wrapper recreation, and replays paid requests', async t => {
  const ledger = setup(t); let calls = 0;
  const options = { ledger, batchId: 'journey-v1', cap: reserveCost(request), transport: async () => { calls++; return response; } };
  const api = budgetTransport(options);
  await api(request);
  const resumed = budgetTransport(options);
  assert.deepEqual(await resumed(request), response);
  await assert.rejects(resumed({ ...request, input: 'two' }), /batch budget/);
  assert.equal(calls, 1);
  assert.equal(ledger.snapshot().calls.length, 1);
});
test('runtime cannot dispatch concurrent or retry uncertain calls', async t => {
  const ledger = setup(t); let finish, calls = 0;
  const api = budgetTransport({ ledger, batchId: 'journey-v1', cap: 0.75, transport: () => { calls++; return new Promise(resolve => { finish = resolve; }); } });
  const first = api(request);
  await assert.rejects(api({ ...request, input: 'two' }), /uncertain/);
  finish({ status: 'completed' });
  await assert.rejects(first, /usage/);
  await assert.rejects(api(request), /uncertain/);
  assert.equal(calls, 1);
});
