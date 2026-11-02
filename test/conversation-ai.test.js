import test from 'node:test';
import assert from 'node:assert/strict';
import { AI } from '../src/ai/config.js';
import { aiConversation } from '../src/ai/conversation.js';
import { OpenAIError } from '../src/ai/openai.js';
import { fixtureCatalog } from './fixture.js';

const run = aiConversation;
const catalog = fixtureCatalog();
const question = { id: 'experience', title: 'Что хочется делать сегодня?', why: 'Чтобы понять сегодняшний запрос.', options: [{ id: 'explore', label: 'Исследовать' }, { id: 'story', label: 'Следить за историей' }], multiple: true, controls: ['unknown', 'indifferent', 'none'] };
const words = 'Оба. В Cyberpunk только начал, могу вернуться; реализм не важен. Не приписывай мне спутников из BG3.';
const state = () => ({ version: 1, id: 'dialogue-1', revision: 3, mode: 'guided', phase: 'talk', context: { platform: 'pc', company: 'solo', partySize: 1 }, turns: [{ id: 't3', question, selected: question.options, text: words, kind: 'answer', answer: `Исследовать; Следить за историей. ${words}` }], facts: [{ key: 'realism', text: 'Реализм не важен', stance: 'indifferent', scope: 'today', sourceId: 't3', quote: 'реализм не важен', feature: null, gameId: null, exposure: null }], question, summary: 'Уточняем сегодняшний запрос.', uncertainties: ['Неясно, какой темп нужен сегодня.'], retractions: [{ key: 'companions', sourceId: 't1' }], result: null });
const proposal = () => ({ summary: 'Сегодня хочется исследовать мир и следить за историей; реализм не важен.', facts: state().facts, uncertainties: ['Темп пока не выяснен.'], action: 'question', question: { ...question, id: 'pace', title: 'Какой темп сейчас ближе?', options: [{ id: 'calm', label: 'Спокойный' }, { id: 'varied', label: 'Чередование' }] } });
const response = (value = proposal(), extra = {}) => ({ id: 'resp-stub', status: 'completed', model: 'stub-model', usage: { input_tokens: 123, output_tokens: 45 }, output: [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: JSON.stringify(value), annotations: [] }] }], ...extra });

test('planner sends exact active evidence, corrections and feature definitions in one private request', async () => {
  let request, calls = 0;
  const original = state();
  original.profile = { favorite: 'must-not-import-old-taste' };
  original.result = { secret: 'must-not-send-result' };
  const before = structuredClone(original);
  const result = await run(catalog, original, { api: async body => { calls++; request = body; return response(); } });
  assert.equal(calls, 1);
  assert.deepEqual(result.proposal, proposal());
  assert.deepEqual(result.usage, { input_tokens: 123, output_tokens: 45 });
  assert.equal(result.model, 'stub-model');
  assert.ok(Number.isFinite(result.ms));
  const input = JSON.parse(request.input);
  assert.deepEqual(input.turns, original.turns);
  assert.deepEqual(input.facts, original.facts);
  assert.deepEqual(input.retractions, [{ key: 'companions', sourceId: 't1' }]);
  assert.deepEqual(input.context, { platform: 'pc', company: 'solo', partySize: 1 });
  assert.deepEqual(input.question, question);
  assert.equal(input.mode, 'guided');
  assert.ok(input.features.some(f => f.id === 'session.short' && typeof f.def === 'string'));
  assert.doesNotMatch(request.input, /must-not-/);
  assert.equal(request.store, false);
  assert.equal(request.model, AI.model);
  assert.equal(request.reasoning.effort, AI.effort);
  assert.deepEqual(original, before);
});

test('strict schema describes the whole fact snapshot and neutral multi-choice question contract', async () => {
  let request;
  await run(catalog, state(), { api: async body => { request = body; return response(); } });
  const format = request.text.format, schema = format.schema;
  assert.equal(format.type, 'json_schema');
  assert.equal(format.strict, true);
  assert.deepEqual(schema.required.toSorted(), ['action', 'facts', 'question', 'sessionTime', 'summary', 'uncertainties']);
  const time=schema.properties.sessionTime.anyOf.find(s=>s.type==='object');
  assert.deepEqual(time.required.toSorted(),['minutes','quote','sourceId']);
  assert.deepEqual(time.properties.minutes,{type:'integer',minimum:5,maximum:1440});
  const fact = schema.properties.facts.items;
  assert.deepEqual(fact.required.toSorted(), ['exposure', 'feature', 'gameId', 'gameIntent', 'key', 'quote', 'scope', 'sourceId', 'stance', 'text']);
  assert.deepEqual(fact.properties.stance.enum, ['want', 'avoid', 'require', 'exclude', 'indifferent', 'unknown', 'conditional', 'history']);
  assert.ok(fact.properties.feature.anyOf.some(s => s.enum?.includes('session.short')));
  assert.ok(fact.properties.feature.anyOf.some(s => s.type === 'null'));
  assert.deepEqual(fact.properties.exposure.enum, ['unplayed', 'started', 'finished', 'dropped', null]);
  assert.deepEqual(fact.properties.gameIntent.enum, ['return', 'replay', 'reference', null]);
  const q = schema.properties.question.anyOf.find(s => s.type === 'object');
  assert.equal(q.properties.multiple.type, 'boolean');
  assert.deepEqual(q.properties.controls.items.enum, ['unknown', 'indifferent', 'none']);
  function strictObjects(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'object') {
      assert.equal(node.additionalProperties, false);
      assert.deepEqual([...node.required].sort(), Object.keys(node.properties).sort());
    }
    for (const child of Object.values(node)) if (Array.isArray(child)) child.forEach(strictObjects); else strictObjects(child);
  }
  strictObjects(schema);
});

test('today session time and source retraction reach planning as bounded evidence, not extra private metadata',async()=>{
 const original=state();original.sessionTime={minutes:30,sourceId:'t3',quote:'Сегодня есть 30 минут',debug:'must-not-leak'};
 original.turns[0].answer+=' Сегодня есть 30 минут';
 original.retractions.push({kind:'session_time',sourceId:'t1',quote:'Могу поиграть час',at:'t2'});
 let request;
 const result=await run(catalog,original,{api:async body=>{request=body;return response({...proposal(),sessionTime:{minutes:30,sourceId:'t3',quote:'Сегодня есть 30 минут'}});}});
 assert.equal(result.error,undefined);assert.deepEqual(result.proposal.sessionTime,{minutes:30,sourceId:'t3',quote:'Сегодня есть 30 минут'});
 const input=JSON.parse(request.input);assert.deepEqual(input.sessionTime,{minutes:30,sourceId:'t3',quote:'Сегодня есть 30 минут'});assert.deepEqual(input.retractions,original.retractions);assert.doesNotMatch(request.input,/must-not-leak/);
 assert.match(request.instructions,/sessionTime/);assert.match(request.instructions,/session_time/);
});

test('an explicit current upper cap remains a quoted available budget rather than an exact duration promise',async()=>{
 const original=state(),sessionTime={minutes:60,sourceId:'t3',quote:'Сегодня не больше часа'};
 original.turns[0].answer+=' Сегодня не больше часа';let request;
 const result=await run(catalog,original,{api:async body=>{request=body;return response({...proposal(),sessionTime});}});
 assert.deepEqual(result.proposal.sessionTime,sessionTime);assert.match(request.instructions,/upper cap.*available.*budget/i);assert.match(request.instructions,/Lower bounds.*null/i);
});

test('time root accepts null and old five-field replies; malformed time shape keeps billed usage and makes no retry',async()=>{
 for(const value of [proposal(),{...proposal(),sessionTime:null}]) {
  const result=await run(catalog,state(),{api:async()=>response(value)});assert.equal(result.error,undefined);assert.deepEqual(result.proposal,value);
 }
 for(const sessionTime of [30,'30',{minutes:30,sourceId:'t3'},{minutes:30,sourceId:'t3',quote:'Сегодня есть 30 минут',extra:true},{minutes:4,sourceId:'t3',quote:'4 минуты'},{minutes:30.5,sourceId:'t3',quote:'30 минут'},{minutes:1441,sourceId:'t3',quote:'1441 минута'}]) {
  let calls=0;const result=await run(catalog,state(),{api:async()=>{calls++;return response({...proposal(),sessionTime});}});
  assert.ok(result.error,JSON.stringify(sessionTime));assert.equal(result.proposal,undefined);assert.equal(calls,1);assert.deepEqual(result.usage,{input_tokens:123,output_tokens:45});
 }
 let input;await run(catalog,state(),{api:async request=>{input=JSON.parse(request.input);return response();}});assert.equal(input.sessionTime,null);
});

test('matched identity aliases and source evidence reach the planner without unrelated title semantics',async()=>{
 let request;
 const knownGames=[{id:'skyrim',name:'The Elder Scrolls V: Skyrim',aliases:['Skyrim'],evidence:[{sourceId:'t3',quote:'Skyrim',aliasId:'curated:skyrim-base-v1:catalog:skyrim:name',exposure:'finished'}],exposure:'finished',mechanics:'must-not-leak'}];
 await run(catalog,state(),{knownGames,api:async body=>{request=body;return response();}});
 const sent=JSON.parse(request.input).knownGames[0];
 assert.deepEqual(sent.aliases,['Skyrim']);assert.deepEqual(sent.evidence,[{sourceId:'t3',quote:'Skyrim',aliasId:'curated:skyrim-base-v1:catalog:skyrim:name'}]);assert.equal(sent.exposure,undefined);assert.equal(sent.mechanics,undefined);
 assert.match(request.instructions,/gameIntent/);assert.match(request.instructions,/sourceId/);
});

test('free baseline retains the same evidence and schema but delegates sequence to the model', async () => {
  const requests = [];
  for (const mode of ['guided', 'free']) await run(catalog, { ...state(), mode }, { api: async body => { requests.push(body); return response(); } });
  assert.deepEqual(requests[0].text, requests[1].text);
  assert.equal(requests[0].model, requests[1].model);
  assert.deepEqual(requests[0].reasoning, requests[1].reasoning);
  const guided = JSON.parse(requests[0].input), free = JSON.parse(requests[1].input);
  assert.deepEqual({ ...guided, mode: 'free' }, free);
  assert.match(requests[1].instructions, /model controls.*sequenc/i);
  assert.match(requests[0].instructions, /guided.*invariant/i);
});

test('a review remains a proposal and original full natural answers are not truncated', async () => {
  let request;
  const original = state();
  original.turns[0].text = 'Есть нюанс: '.padEnd(1500, 'я');
  original.turns[0].answer = `${original.turns[0].text} — и это важно`;
  const review = { ...proposal(), action: 'review', question: null };
  const result = await run(catalog, original, { api: async body => { request = body; return response(review); } });
  assert.deepEqual(result.proposal, review);
  assert.equal(JSON.parse(request.input).turns[0].answer, original.turns[0].answer);
  assert.equal(original.phase, 'talk');
});

test('explicit title matches supply usable IDs without importing catalog properties or invented exposure', async () => {
  let request;
  const original = state();
  await run(catalog, original, {
    knownGames: [{ id: 'cp2077', name: 'Cyberpunk 2077', ru: 'Киберпанк 2077', year: 2020, mechanics: 'invented-mechanic-must-not-leak', liked: true, exposure: 'finished' }],
    api: async body => { request = body; return response(); },
  });
  const input = JSON.parse(request.input);
  assert.deepEqual(input.knownGames, [{ id: 'cp2077', name: 'Cyberpunk 2077', ru: 'Киберпанк 2077', year: 2020 }]);
  assert.deepEqual(input.turns, original.turns);
  assert.doesNotMatch(request.input, /invented-mechanic-must-not-leak/);
  assert.equal(input.knownGames[0].exposure, undefined);
  assert.equal(input.knownGames[0].liked, undefined);
  assert.equal((await run(catalog, original, { knownGames: Array(65).fill({ id: 'a', name: 'A' }), api: async () => assert.fail('oversized identity context must not spend') })).notRequested, true);
});

test('thirteen exact identities reach the bounded planner intact; more than sixty-four refuse with a specific free error',async()=>{
 const knownGames=Array.from({length:13},(_,i)=>({id:`game:${i}`,name:`Unmistakable Chronicle ${i+100}`}));let input;
 const result=await run(catalog,state(),{knownGames,api:async request=>{input=JSON.parse(request.input);return response();}});
 assert.equal(result.error,undefined);assert.deepEqual(input.knownGames,knownGames);
 const tooMany=await run(catalog,state(),{knownGames:Array.from({length:65},(_,i)=>({id:`game:${i}`,name:`Chronicle ${i}`})),api:async()=>assert.fail('No dispatch for too many identities')});
 assert.match(tooMany.error,/64/);assert.equal(tooMany.notRequested,true);assert.equal(tooMany.retryable,false);
});

test('budget and oversized context are rejected before spending rather than silently dropping evidence', async () => {
  const noCall = async () => assert.fail('this input must not spend');
  for (const maxCostUsd of [0, -1, NaN, 0.000001]) assert.equal((await run(catalog, state(), { api: noCall, maxCostUsd })).notRequested, true);
  assert.equal((await run(null, state(), { api: noCall })).notRequested, true);
  assert.equal((await run(catalog, null, { api: noCall })).notRequested, true);
  assert.equal((await run(catalog, { ...state(), turns: Array(25).fill(state().turns[0]) }, { api: noCall })).notRequested, true);
  const tooLong = state(); tooLong.turns[0].text = 'x'.repeat(300_000);
  assert.equal((await run(catalog, tooLong, { api: noCall })).notRequested, true);
});

test('malformed, refusal, incomplete and empty replies preserve usage and make no second paid call', async () => {
  const replies = [response(null), response({}), response({ ...proposal(), action: 'recommend' }), response({ ...proposal(), question: null }), response({ ...proposal(), facts: 'bad' }), response({}, { status: 'incomplete' }), response({}, { output: [] }), response({}, { output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }] }), response({}, { output: [{ type: 'message', content: [{ type: 'output_text', text: '{broken' }] }] })];
  for (const reply of replies) {
    let calls = 0;
    const result = await run(catalog, state(), { api: async () => { calls++; return reply; } });
    assert.equal(calls, 1);
    assert.ok(result.error);
    assert.equal(result.proposal, undefined);
    assert.deepEqual(result.usage, { input_tokens: 123, output_tokens: 45 });
  }
});

test('transport failures are safe, preserve explicit OpenAI message and never retry', async () => {
  for (const error of [new OpenAIError('нейросеть не ответила вовремя'), new Error('secret-provider-detail')]) {
    let calls = 0;
    const result = await run(catalog, state(), { api: async () => { calls++; throw error; } });
    assert.equal(calls, 1);
    assert.ok(result.error);
    assert.doesNotMatch(result.error, /secret-provider-detail/);
    if (error instanceof OpenAIError) assert.match(result.error, /вовремя/);
  }
});
