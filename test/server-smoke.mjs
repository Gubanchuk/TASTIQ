// Manual integration check: a real local HTTP server with fixture data and a fully stubbed OpenAI fetch.
// Run separately from node:test because sandbox environments may forbid local sockets.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { fixtureCatalog, screenFixture } from './fixture.js';
import { initialState } from '../src/core/dialogue.js';
import { PaidBudget } from '../src/stand/paid-budget.js';

const scratch = mkdtempSync(join(tmpdir(), 'tastiq-openai-smoke-'));
const fixture = fixtureCatalog();
writeFileSync(join(scratch, 'catalog.json'), JSON.stringify({ items: fixture.items, idf: fixture.idf, df: fixture.df, stats: {} }));
const mediaItems=['film','series','cartoon'].flatMap(domain=>screenFixture(domain).items);
writeFileSync(join(scratch,'screen.json'),JSON.stringify({items:mediaItems,idf:{},df:{},stats:{}}));
const reservation = createServer();
await new Promise((resolve, reject) => { reservation.once('error', reject); reservation.listen(0, '127.0.0.1', resolve); });
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const ledgerDir = join(scratch, 'budget');
const ledger = new PaidBudget(ledgerDir, { ceiling: 5, baselineUpper: 1, baselineCalls: 1, roundCap: 2 });
ledger.close();
Object.assign(process.env, {
  PORT: String(port), OPENAI_API_KEY: 'offline-smoke-key', OPENAI_MODEL: 'gpt-6.1-sol',
  AI_ACCESS: 'all', AI_SPARES: '0', AI_EFFORT: 'low',
  CATALOG_PATH: join(scratch, 'catalog.json'), SCREEN_CATALOG_PATH: join(scratch, 'screen.json'),
  JOURNAL_PATH: join(scratch, 'journal.ndjson'),
  AI_EVAL_BUDGET_DIR: ledgerDir, AI_EVAL_BATCH_ID: 'http-smoke', AI_EVAL_BATCH_CAP: '0.75',
});

const localFetch = globalThis.fetch;
let requests = 0;
globalThis.fetch = async (url, init) => {
  assert.equal(url, 'https://api.openai.com/v1/responses', 'no unplanned external request');
  requests++;
  assert.equal(JSON.parse(readFileSync(join(ledgerDir, 'budget.json'), 'utf8')).calls.at(-1).status, 'pending', 'reserve is on disk before the HTTP transport');
  const request = JSON.parse(init.body);
  assert.equal(request.text.format.strict, true);
  await new Promise((resolve) => setTimeout(resolve, 30));
  return new Response(JSON.stringify({
    status: 'completed', model: request.model,
    usage: { input_tokens: 100, input_tokens_details: { cached_tokens: 40 }, output_tokens: 20 },
    output: [{ type: 'reasoning', summary: [] }, { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(request.text.format.name === 'tastiq_intent' ? {
      wants: [{ f: 'tone.cozy', evidence: 'уют' }], avoids: [], time: null, clarification: null,
    } : request.text.format.name==='tastiq_media_conversation'?{
      summary:'Сегодня хочется истории с юмором',facts:[],uncertainties:[],action:'question',
      question:{id:'experience',title:'Какого впечатления хочется?',why:'Уточним сегодняшний запрос',options:[],multiple:false,controls:['unknown','indifferent','none']},
      context:{company:null,childAge:null,timeMode:null,commitment:null,onlyEnded:null,format:null},sessionTime:null,
    } : {
      understood: 'Тебе нужен живой мир', picks: (String(request.input).includes('id=t1 |')?['t1','t2','t3']:['7', '10', '4', '13']).map((id) => ({ id, title: '', year: 0, reason: 'Причина', caveat: '', likelySeen: false })),
    }) }] }],
  }));
};

try {
  await import('../src/server/server.js');
  const base = `http://127.0.0.1:${port}`;
  let meta;
  for (let i = 0; i < 100; i++) {
    try { meta = await (await localFetch(`${base}/api/meta`)).json(); break; }
    catch { await new Promise((resolve) => setTimeout(resolve, 20)); }
  }
  assert.equal(meta?.domains.game.items, 13);
  assert.equal(meta?.domains.film.items,3);
  const mediaPost=body=>localFetch(`${base}/api/media-conversation`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,uid:'offline-media'})});
  for(const domain of ['film','series','cartoon']){
    const response=await mediaPost({domain});assert.equal(response.status,200);const initial=await response.json();
    assert.equal(initial.state.domain,domain);assert.ok(initial.screen.question);
    assert.equal((await mediaPost({domain:domain==='film'?'series':'film',state:initial.state})).status,400);
    const restored=await (await mediaPost({domain,state:initial.state})).json();assert.equal(restored.state.id,initial.state.id);
  }
  assert.equal((await mediaPost({domain:'game'})).status,400);
  assert.equal((await mediaPost({})).status,400);
  assert.equal(requests,0,'media initial/restore/domain rejection never dispatch model');
  assert.equal((await localFetch(`${base}/pick/`)).status, 200);
  assert.equal((await localFetch(`${base}/shared/dialogue-client.js`)).status, 200);
  assert.equal((await (await localFetch(`${base}/api/ai/status?uid=offline-smoke`)).json()).enabled, true);

  const state = { ...initialState(), domain: 'game', step: 'result', answers: {
    1: { reaction: 'love', reasons: ['world.living'], issues: [] },
    5: { reaction: 'dislike', issues: [{ f: 'difficulty.hard', hard: true }] },
  } };
  const body = JSON.stringify({ state, uid: 'offline-smoke' });
  const pick = async () => (await localFetch(`${base}/api/ai/pick`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })).json();
  const [first, shared] = await Promise.all([pick(), pick()]);
  assert.deepEqual(first, shared);
  assert.deepEqual([first.result.top.id, ...first.result.alternatives.map((p) => p.id)], ['7', '10', '4', '13']);
  assert.equal(first.result.ai.model, 'gpt-6.1-sol');
  assert.deepEqual(await pick(), first, 'cached request preserves the response');
  assert.equal(requests, 1, 'concurrent and cached requests make one model call');

  const entries = readFileSync(process.env.JOURNAL_PATH, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].data.usage.cached, 40);
  assert.equal(entries[0].data.usage.estimatedUsd, 0.000324);
  const intent = async (text = 'хочу уют', domain = 'game') => (await localFetch(`${base}/api/ai/intent`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain, text, uid: 'offline-smoke' }) })).json();
  assert.ok((await intent(' ')).error);
  assert.ok((await intent('хочу уют', 'fake')).error);
  assert.equal(requests, 1);
  const [understood, joined] = await Promise.all([intent(), intent()]);
  assert.deepEqual(understood, joined);
  assert.equal(understood.proposal.wants[0].f, 'tone.cozy');
  assert.equal(understood.proposal.source, undefined, 'no automatic confirmation');
  assert.deepEqual(await intent(), understood);
  assert.equal(requests, 2);
  const intentEntries = readFileSync(process.env.JOURNAL_PATH, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(intentEntries.length, 2); assert.equal(intentEntries[1].event, 'ai-intent');
  assert.equal(intentEntries[1].data.usage.estimatedUsd, 0.000324);
  for(const domain of ['film','series','cartoon']){
    const initial=await (await mediaPost({domain})).json();
    const answer={domain,state:initial.state,action:{type:'answer',questionId:initial.screen.question.id,selected:[],text:'Хочу историю с юмором на сегодняшний вечер',kind:'answer'}};
    const [planned,joined]=await Promise.all([mediaPost(answer).then(r=>r.json()),mediaPost(answer).then(r=>r.json())]);
    assert.deepEqual(planned,joined);assert.equal(planned.error,undefined);assert.equal(planned.screen.question.id,'experience');
    assert.deepEqual(await (await mediaPost(answer)).json(),planned);
    const review=await (await mediaPost({domain,state:planned.state,action:{type:'review'}})).json();
    const confirm={domain,state:review.state,action:{type:'confirm'}};
    const [picked,shared]=await Promise.all([mediaPost(confirm).then(r=>r.json()),mediaPost(confirm).then(r=>r.json())]);
    assert.equal(picked.error,undefined);assert.deepEqual(picked,shared);assert.equal(picked.screen.type,'result');assert.equal(picked.state.result.top.domain,domain);assert.equal(picked.feedbackState.domain,domain);
    assert.deepEqual(await (await mediaPost(confirm)).json(),picked);
    const restored=await (await mediaPost({domain,state:picked.state})).json();assert.equal(restored.state.result.top.id,picked.state.result.top.id);
  }
  assert.equal(requests,8,'three scoped media plans+picks each dispatch once across concurrent/cache/restore');
  const mediaEntries=readFileSync(process.env.JOURNAL_PATH,'utf8').trim().split('\n').map(JSON.parse).filter(x=>x.event.startsWith('media-conversation-'));
  assert.equal(mediaEntries.length,6);assert.deepEqual(mediaEntries.map(x=>x.data.domain),['film','film','series','series','cartoon','cartoon']);
  assert.ok(mediaEntries.every(x=>x.data.usage.cached===40&&x.data.usage.estimatedUsd===0.000324));
  const { AI_LIMITS } = await import('../src/ai/access.js');
  AI_LIMITS.perHour = 2;
  assert.ok((await intent('хочу скорость')).error, 'intent and picks share the rate limit');
  assert.equal(requests, 8);
  process.env.OPENAI_API_KEY = '';
  const disabled = await (await localFetch(`${base}/api/ai/status?uid=offline-smoke`)).json();
  assert.equal(disabled.enabled, false);
  assert.equal((await pick()).result.top.id, '7', 'an already paid/cached result can still be reused without a key');
  const uncached = await (await localFetch(`${base}/api/ai/pick`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state, wish: 'другой запрос' }) })).json();
  assert.ok(uncached.error);
  assert.equal(requests, 8);
  assert.ok((await intent('ещё одно пожелание')).error);
  const feedbackRun={version:1,id:'smoke-run',dialogueId:'smoke-dialogue',domain:'game',revision:0,at:new Date().toISOString(),updatedAt:new Date().toISOString(),
    context:{note:'private source words',wants:['story.central']},cards:[{id:'7',title:'Fake title',origin:'model',reason:'private copied words'}],responses:[]};
  const feedbackPost=run=>localFetch(`${base}/api/feedback`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({run})});
  const feedbackResponse=await feedbackPost(feedbackRun);
  assert.equal(feedbackResponse.status,200);assert.deepEqual(await feedbackResponse.json(),{ok:true,id:'smoke-run',revision:0});
  assert.equal((await feedbackPost({...feedbackRun,cards:[{id:'foreign-id',title:'Unknown',origin:'model'}]})).status,400);
  assert.equal((await feedbackPost({...feedbackRun,domain:'film'})).status,400);
  assert.equal((await feedbackPost({...feedbackRun,revision:-2})).status,400);
  const feedbackEvents=readFileSync(process.env.JOURNAL_PATH,'utf8').trim().split('\n').map(JSON.parse).filter(x=>x.event==='quality-feedback');
  assert.equal(feedbackEvents.length,1);assert.equal(feedbackEvents[0].data.cards[0].title,'Red Dead Redemption 2');
  assert.equal(feedbackEvents[0].data.context.note,undefined);assert.equal(feedbackEvents[0].data.cards[0].reason,undefined);
  assert.equal(requests,8,'feedback cannot invoke the model');
  const paid = JSON.parse(readFileSync(join(ledgerDir, 'budget.json'), 'utf8'));
  assert.equal(paid.calls.length, 8, 'cached and concurrent HTTP requests are not paid twice');
  assert.ok(Math.abs(paid.cumulativeUpper-1.002592)<1e-10);
  console.log('PASS: HTTP/static, AI picks + intent + three media domains, feedback validation/privacy, in-flight sharing, cache, shared limits, isolated usage journal, disabled access. Paid requests: 0.');
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(1);
}
