import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const runner = fileURLToPath(new URL('../src/stand/personas-ai.js', import.meta.url));
const run = (...args) => spawnSync(process.execPath, [runner, ...args], {
  encoding: 'utf8', timeout: 3000, env: { ...process.env, OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '' },
});

test('paid personas require explicit opt-in and a configured OpenAI key before loading catalogs', () => {
  const noConsent = run();
  assert.notEqual(noConsent.status, 0);
  assert.match(noConsent.stderr, /--paid/);
  const noKey = run('--paid');
  assert.notEqual(noKey.status, 0);
  assert.match(noKey.stderr, /OPENAI_API_KEY/);
});

test('unknown options, invalid limits and modes fail before an API request', () => {
  for (const args of [['--typo'], ['--paid', '--limit', '0'], ['--paid', '--limit', '1.5'], ['--paid', '--mode', 'wrong'], ['--paid', '--budget-usd', '-1'], ['--paid', '--budget-usd', 'NaN']]) {
    const result = run(...args);
    assert.notEqual(result.status, 0);
    assert.equal(result.signal, null, 'CLI must fail immediately rather than hang loading data');
    assert.doesNotMatch(result.stdout, /целей|отчёт:/);
  }
});
