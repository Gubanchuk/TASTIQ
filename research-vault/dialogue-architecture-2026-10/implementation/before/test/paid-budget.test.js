import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { PaidBudget } from '../src/stand/paid-budget.js';

const body = { model: 'gpt-6.1-sol', max_output_tokens: 100, input: 'test' };
const response = { status: 'completed', model: body.model, usage: { input_tokens: 100, output_tokens: 20 }, output: [] };
function setup(t, options = {}) {
  // Windows sandbox cannot atomically rename in redirected OS temp. Use an owned workspace fixture.
  const root = resolve('.'), dir = mkdtempSync(join(root, '.tastiq-budget-test-'));
  const budget = new PaidBudget(dir, { ceiling: 5, baselineUpper: 0.7161141, baselineCalls: 47, roundCap: 2, ...options });
  t.after(() => { budget.close(); assert.ok(dir.startsWith(root + sep)); rmSync(dir, { recursive: true, force: true }); });
  return { budget, dir };
}

test('paid budget journals before dispatch, settles usage and replays exactly once', async (t) => {
  const { budget, dir } = setup(t); let calls = 0;
  const api = budget.api('one', async () => {
    calls++;
    const onDisk = JSON.parse(readFileSync(join(dir, 'budget.json'), 'utf8'));
    assert.equal(onDisk.calls[0].status, 'pending');
    assert.ok(onDisk.calls[0].reserveUsd > 0);
    return response;
  });
  assert.deepEqual(await api(body), response);
  assert.deepEqual(await api(body), response);
  assert.equal(calls, 1);
  assert.equal(budget.snapshot().calls[0].costUsd, 0.0004);
  assert.equal(budget.snapshot().cumulativeUpper, 0.7165141);
  await assert.rejects(api({ ...body, input: 'changed' }), /different request/);
  assert.equal(calls, 1);
});

test('reserve refuses a call before dispatch and cannot open a parallel ledger', async (t) => {
  const { budget, dir } = setup(t, { roundCap: 0.0001 }); let calls = 0;
  await assert.rejects(budget.api('no', async () => { calls++; return response; })(body), /budget/);
  assert.equal(calls, 0);
  assert.throws(() => new PaidBudget(dir), /locked/);
});

test('unknown usage or interrupted transport blocks all subsequent spending, including resume', async (t) => {
  const { budget, dir } = setup(t);
  await assert.rejects(budget.api('uncertain', async () => ({ status: 'completed' }))(body), /usage/);
  await assert.rejects(budget.api('second', async () => response)(body), /uncertain/);
  budget.close();
  const resumed = new PaidBudget(dir);
  try {
    await assert.rejects(resumed.api('third', async () => response)(body), /uncertain/);
    assert.equal(resumed.snapshot().calls.length, 1);
  } finally { resumed.close(); }
});

test('network error remains uncertain; no automatic retry or lost reservation', async (t) => {
  const { budget } = setup(t);
  await assert.rejects(budget.api('network', async () => { throw new Error('timeout'); })(body), /usage/);
  assert.equal(budget.snapshot().calls[0].status, 'uncertain');
  assert.ok(budget.snapshot().uncertainReserve > 0);
  assert.equal(budget.snapshot().settledNewUsd, 0);
});

test('a breached reserve settles known usage but halts later requests', async (t) => {
  const { budget } = setup(t);
  await assert.rejects(budget.api('breach', async () => ({ ...response, usage: { input_tokens: 10000, output_tokens: 10000 } }))(body), /reservation/);
  await assert.rejects(budget.api('after-breach', async () => response)(body), /halted/);
  assert.equal(budget.snapshot().calls.length, 1);
});
