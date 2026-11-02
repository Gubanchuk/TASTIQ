// AI picker (src/ai): the model reorders the engine's shortlist and may name two titles of its own, which are looked
// up among the titles that passed the sieves; any failure keeps the engine's picks, and access limits hold. No request
// leaves the machine: the model is a stub.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixtureCatalog, game } from './fixture.js';
import { aiAccess, aiSpend, AI_LIMITS } from '../src/ai/access.js';
import { AI, aiPick, candidatesOf, checkPicks, shortlistOf } from '../src/ai/pick.js';
import { describeCandidates, describePerson, SYSTEM, systemFor } from '../src/ai/prompt.js';
import { initialState, profileOf, sessionOf } from '../src/core/dialogue.js';
import { recommendIds } from '../src/core/recommend.js';

const catalog = fixtureCatalog();
const catalogs = { game: catalog };
const state = {
  ...initialState(),
  domain: 'game',
  step: 'result',
  answers: { 1: { reaction: 'love', reasons: ['world.living'], issues: [] }, 5: { reaction: 'dislike', issues: [{ f: 'difficulty.hard', hard: true }] } },
};
const response = (out, extra = {}) => ({
  status: 'completed', model: 'stub', usage: { input_tokens: 100, output_tokens: 20 },
  output: [{ type: 'reasoning', summary: [] }, { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(out) }] }],
  ...extra,
});
const stub = (out, extra = {}) => async () => response(out, extra);

test('OpenAI receives the schema, instructions and candidates without Anthropic fields', async () => {
  const id = shortlistOf(catalog, state)[0].game.id;
  let request;
  const result = await aiPick(catalogs, state, { api: async (body) => {
    request = body;
    return response({ understood: 'понял', picks: [{ id, reason: 'мир', caveat: '' }] });
  } });
  assert.equal(result.picks[0].id, id);
  assert.equal(request.model, AI.model);
  assert.equal(request.reasoning.effort, AI.effort);
  assert.equal(request.text.format.type, 'json_schema');
  assert.equal(request.text.format.strict, true);
  assert.equal(request.text.format.schema.additionalProperties, false);
  assert.match(request.instructions, /You pick what a person/);
  assert.match(request.input, /Кандидаты/);
  assert.equal(request.store, false);
  assert.equal(request.service_tier, 'default');
  assert.equal(request.max_output_tokens, 8000);
  assert.equal(request.betas, undefined);
  assert.equal(request.output_config, undefined);
});

test('the person is described with reactions, reasons, hard complaints and the wish', () => {
  const text = describePerson(state, catalog, { wish: 'посвежее' });
  assert.match(text, /The Witcher 3.*обожаю.*за что: /);
  assert.match(text, /\(никогда\)/);
  assert.match(text, /Пожелание своими словами: «посвежее»/);
});

test('what the person typed about a title reaches the model as said', () => {
  const typed = { ...state, answers: { ...state.answers, 1: { ...state.answers[1], text: 'можно включить фоном' } } };
  assert.match(describePerson(typed, catalog), /своими словами: «можно включить фоном»/);
});

test('review playtime is not presented as completion time, and weak matches stay labelled weak', () => {
  const rows = candidatesOf(catalog, state).rows;
  const text = describeCandidates(rows, catalog);
  assert.match(text, /на момент отзыва.*30 ч/);
  assert.match(text, /не время прохождения/);
  assert.match(text, /подтверждено:/);
  assert.match(text, /слабый вывод:/);
  assert.doesNotMatch(text, /~30 ч игры/);
});
test('game-specific selection guidance does not change the established film/series prompt',()=>{
  assert.equal(systemFor({domain:'film',situation:{company:'pair'}}),SYSTEM);
  assert.equal(systemFor({domain:'series',situation:{company:'solo'}}),SYSTEM);
  assert.match(systemFor(state),/NOT completion time/);
  assert.match(systemFor({domain:'cartoon',situation:{company:'kids'}}),/age suitability/);
});

test('discovery candidates widen the sieved pool with compact lines and preserve true engine ranks', () => {
  const before=AI.discovery.game;AI.discovery.game=120;
  try {
  const extra = Array.from({length:70},(_,i)=>game(100+i,`Extra ${i}`,{'world.living':0.8},{popularity:4.5}));
  const large = fixtureCatalog(extra);
  const { rows, ranked } = candidatesOf(large, state);
  assert.ok(rows.length > AI.shortlist);
  assert.ok(rows.length <= AI.shortlist + AI.discovery.game);
  assert.ok(rows.every(r=>!['1','2','5','8','9'].includes(r.game.id)), 'sieved titles never enter discovery');
  assert.ok(rows.every(r=>r.rank===ranked.findIndex(x=>x.game.id===r.game.id)+1));
  const text = describeCandidates(rows, large, [], { detailed: 2 });
  assert.match(text, /Дополнительный поиск/);
  assert.equal((text.match(/движок #/g)??[]).length, 2, 'only the detailed prefix gets full descriptions');
  assert.equal((text.match(/id=/g)??[]).length, rows.length);
  }finally{AI.discovery.game=before;}
});

test('a title the model names itself is looked up by name and year among the titles that passed the sieves', () => {
  const { ranked } = candidatesOf(catalog, state);
  const short = ranked.slice(0, 2);
  const outside = ranked.slice(2).map((r) => r.game);
  const [x, y, z] = outside;
  const out = checkPicks({ understood: '', picks: [
    { id: '', title: x.name, year: x.year, reason: 'своё', caveat: '', likelySeen: true },
    { id: '', title: 'Dark Souls', year: 2020, reason: 'отсеян', caveat: '', likelySeen: false }, // hard «никогда»: sieved
    { id: '', title: y.name, year: y.year, reason: 'второе своё', caveat: '', likelySeen: false },
    { id: '', title: z.name, year: z.year, reason: 'третье своё', caveat: '', likelySeen: false },
    { id: short[0].game.id, title: '', year: 0, reason: 'из списка', caveat: '', likelySeen: false },
  ] }, short, 4, ranked);
  assert.deepEqual(out.picks.map((p) => p.id), [x.id, y.id, short[0].game.id]);
  assert.deepEqual(out.picks.map((p) => p.own), [true, true, false]);
  assert.equal(out.picks[0].likelySeen, true);
  assert.equal(AI.ownPicks, 2);
});

test('picks outside the shortlist and repeats are dropped, the rest keep the model order', () => {
  const rows = shortlistOf(catalog, state);
  const [a, b] = rows.map((r) => r.game.id);
  const out = checkPicks({ understood: 'x', picks: [{ id: 'nope', reason: 'r', caveat: '' }, { id: b, reason: 'rb', caveat: '' }, { id: b, reason: 'again', caveat: '' }, { id: a, reason: 'ra', caveat: 'c' }] }, rows);
  assert.deepEqual(out.picks.map((p) => p.id), [b, a]);
  assert.equal(out.dropped, 2);
});

test('a refusal, broken JSON or no valid id keeps the engine picks', async () => {
  assert.ok((await aiPick(catalogs, state, { api: stub({}, { output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }] }) })).error);
  const broken = async () => response({}, { output: [{ type: 'message', content: [{ type: 'output_text', text: '{' }] }] });
  assert.ok((await aiPick(catalogs, state, { api: broken })).error);
  assert.ok((await aiPick(catalogs, state, { api: stub({ understood: '', picks: [{ id: 'nope', reason: '', caveat: '' }] }) })).error);
});

test('incomplete or failed output keeps engine picks and retains billed usage', async () => {
  for (const status of ['incomplete', 'failed']) {
    const result = await aiPick(catalogs, state, { api: stub({}, { status, incomplete_details: { reason: 'max_output_tokens' } }) });
    assert.ok(result.error);
    assert.equal(result.usage.input_tokens, 100);
    assert.equal(result.usage.output_tokens, 20);
  }
  const result = await aiPick(catalogs, state, { api: stub({}, { output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }] }) });
  assert.equal(result.usage.output_tokens, 20);
});

test('malformed model content and unexpected API errors do not escape to the server', async () => {
  for (const out of [null, { picks: {} }, { picks: [null] }]) {
    assert.ok((await aiPick(catalogs, state, { api: stub(out) })).error);
  }
  const result = await aiPick(catalogs, state, { api: async () => { throw new Error('sensitive upstream details'); } });
  assert.ok(result.error);
  assert.doesNotMatch(result.error, /sensitive/);
});

test('a bounded paid run refuses a request before calling the model when its budget is too small', async () => {
  const result = await aiPick(catalogs, state, { maxCostUsd: 0.001, api: async () => assert.fail('paid request must not start') });
  assert.match(result.error, /бюджет/);
  assert.equal(result.usage, undefined);
});

test('valid picks come back in order and the engine explains them like its own', async () => {
  const ids = shortlistOf(catalog, state).map((r) => r.game.id).slice(0, 3).reverse();
  const res = await aiPick(catalogs, state, { api: stub({ understood: 'понял', picks: ids.map((id) => ({ id, reason: `про ${id}`, caveat: '' })) }) });
  assert.deepEqual(res.picks.map((p) => p.id), ids);
  const result = recommendIds(catalog, profileOf(state), sessionOf(state), ids);
  assert.deepEqual([result.top.id, ...result.alternatives.map((p) => p.id)], ids);
  assert.ok(result.top.explanation);
});

test('fewer than four picks are filled with the engine order, without a model sentence', async () => {
  const rows = shortlistOf(catalog, state);
  const second = rows[1].game.id;
  const res = await aiPick(catalogs, state, { api: stub({ understood: '', picks: [{ id: second, reason: 'one', caveat: '' }, { id: 'nope', reason: 'x', caveat: '' }] }) });
  assert.deepEqual(res.picks.map((p) => p.id), [second]);
  assert.equal(res.filled.length, Math.min(3, rows.length - 1));
  assert.ok(!res.filled.includes(second));
});

test('with spares on, the model is asked for more picks in order and the prompt says which are spares', async () => {
  const rows = shortlistOf(catalog, state);
  const ids = rows.slice(0, 6).map((r) => r.game.id);
  let asked = '';
  const api = async (req) => {
    asked = req.input;
    return response({ understood: '', picks: ids.map((id) => ({ id, reason: id, caveat: '' })) });
  };
  const before = AI.spares;
  AI.spares = 2;
  try {
    const res = await aiPick(catalogs, state, { api });
    assert.deepEqual(res.picks.map((p) => p.id), ids, 'four shown and two spares, in the model order');
    assert.deepEqual(res.filled, []);
    assert.match(asked, /ровно 6 разных тайтлов/);
  } finally {
    AI.spares = before;
  }
});

test('«Уже смотрел» from the result reaches the model, with the rating when given', () => {
  const text = describePerson({ ...state, corrections: [{ id: '7', kind: 'played' }, { id: '3', kind: 'played', reaction: 'dislike' }] }, catalog);
  assert.match(text, /Уже играл \(сказал на подборе\): Red Dead Redemption 2, Kingdom Come — не зашло\./);
});

test('a title the sieves removed is never shown, even if named', () => {
  // The Witcher 3 was marked, so it is consumed and cannot come back as a pick.
  const result = recommendIds(catalog, profileOf(state), sessionOf(state), ['1']);
  assert.equal(result, null);
});

test('access: a configured provider has no browser/day quota or subscription gate', () => {
  const key = process.env.OPENAI_API_KEY,access=AI_LIMITS.access;
  try {
    delete process.env.OPENAI_API_KEY;
    assert.equal(aiAccess({ uid: 'a' }).allowed, false);
    process.env.OPENAI_API_KEY = 'test';
    AI_LIMITS.access='all';const now = Date.now();
    for (let i = 0; i < 550; i++) aiSpend({ uid: 'limit-test' }, now);
    assert.equal(aiAccess({ uid: 'limit-test' }, now).allowed, true);
    assert.equal(aiAccess({ uid: 'someone-else' }, now).allowed, true);
    AI_LIMITS.access='list';assert.equal(aiAccess({uid:'not-subscribed'}).allowed,true);
    AI_LIMITS.access='off';assert.equal(aiAccess().allowed,false,'offline fixtures may explicitly disable provider calls');
  } finally {
    AI_LIMITS.access=access;
    if (key === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = key;
  }
});
