import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureCatalog } from './fixture.js';
import { initialState } from '../src/core/dialogue.js';
import { aiPick } from '../src/ai/pick.js';
import { directPick } from '../src/stand/ai-direct.js';
import { comparisonDetail } from '../src/stand/quality-results.js';
import { replayComparisons } from '../src/stand/quality-replay.js';
import { analyzeComparisons } from '../src/stand/quality-analysis.js';
const catalog = fixtureCatalog(), catalogs = { game: catalog }, state = { ...initialState(), domain: 'game', platform: 'windows' };

test('incomplete/refusal lists survive comparison → replay → analysis with failed denominators and engine origins', async () => {
  const details = [], ledger = { calls: [], ceiling: 5, settledNewUsd: 0.0016, cumulativeUpper: 0.7177141, remainingLower: 4.2822859 };
  for (const system of ['hybrid','direct']) for (const kind of ['incomplete','refusal']) {
    const response = { status: kind === 'incomplete' ? 'incomplete' : 'completed', model: 'gpt-6.1-sol', usage: { input_tokens: 100, output_tokens: 20 },
      output: kind === 'incomplete' ? [] : [{type:'message',content:[{type:'refusal',refusal:'no'}]}] };
    let request;
    const api = async (body) => { request = body; return response; };
    const result = system === 'hybrid' ? await aiPick(catalogs, state, {api}) : await directPick(catalog, state, {api});
    assert.ok(result.error);
    details.push(comparisonDetail(kind, system, state, result, catalog));
    ledger.calls.push({id:`compare-v1-${system}-${kind}`,status:'settled',request,response,costUsd:0.0004});
  }
  const replay = await replayComparisons(details, ledger, catalogs);
  const { result, bundle, humanSummary } = analyzeComparisons(details, ledger, replay, catalogs);
  for (const name of ['hybrid','direct']) {
    assert.equal(result.systems[name].lists, 2);
    assert.equal(result.systems[name].failedLists, 2);
    assert.equal(result.systems[name].model, 0);
    assert.equal(result.systems[name].fill, 0);
    assert.equal(result.systems[name].engine, 8);
    assert.equal(humanSummary[name].failedLists, 2);
    assert.equal(humanSummary[name].strictAcceptance, null);
  }
  assert.equal(replay.changes.length, 4);
  assert.ok(replay.changes.every((x) => x.errorAfter && x.cards.every((c) => c.origin === 'engine')));
  assert.ok(bundle.key.lists.every((x) => x.error));
  assert.equal(result.responseErrors.length, 4);
});
