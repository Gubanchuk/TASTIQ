import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestResponse } from '../src/ai/openai.js';

test('the transport sends a single authenticated Responses request and returns raw JSON', async () => {
  let calls = 0;
  const result = await requestResponse({ model: 'test', input: 'hello' }, { key: 'test-key', fetcher: async (url, init) => {
    calls++;
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.Authorization, 'Bearer test-key');
    assert.deepEqual(JSON.parse(init.body), { model: 'test', input: 'hello' });
    assert.equal(init.signal,undefined,'ordinary calls have no application deadline');
    return new Response(JSON.stringify({ status: 'completed', output: [] }));
  } });
  assert.equal(result.status, 'completed');
  assert.equal(calls, 1, 'no automatic paid retries');
});

test('a model response arriving beyond the old 45-second deadline is accepted without another paid request', async t=>{
  const deadlines=[];let complete,calls=0;
  t.mock.method(AbortSignal,'timeout',ms=>{const controller=new AbortController();deadlines.push({ms,controller});return controller.signal;});
  const result=requestResponse({model:'test'},{key:'test',fetcher:async(_url,init)=>{
    calls++;return new Promise((resolve,reject)=>{complete=()=>resolve(new Response(JSON.stringify({status:'completed',id:'slow-response'})));init.signal?.addEventListener('abort',()=>reject(new DOMException('late','TimeoutError')));});
  }});
  for(const {ms,controller}of deadlines)if(ms<=45000)controller.abort();
  complete();assert.equal((await result).id,'slow-response');assert.equal(calls,1);
});

test('a missing key makes no HTTP request', async () => {
  await assert.rejects(requestResponse({}, { key: '', fetcher: () => assert.fail('network called') }), /не подключена/);
});

test('HTTP failures have safe Russian messages, without forwarding the response body', async () => {
  for (const [status, code, pattern] of [
    [401, 'invalid_api_key', /ключ/], [403, 'permission_denied', /доступ/],
    [429, 'rate_limit_exceeded', /перегружена/], [429, 'insufficient_quota', /баланс|лимит оплаты/],
    [500, 'server_error', /500/], [400, 'bad_request', /400/],
  ]) {
    await assert.rejects(requestResponse({}, { key: 'test', fetcher: async () => new Response(JSON.stringify({ error: { code, message: 'sensitive upstream body' } }), { status }) }), (error) => {
      assert.match(error.message, pattern);
      assert.doesNotMatch(error.message, /sensitive/);
      return true;
    });
  }
});

test('timeouts, network errors and invalid HTTP JSON become safe failures', async () => {
  for (const [error, pattern] of [[new DOMException('secret', 'TimeoutError'), /вовремя/], [new TypeError('secret'), /связаться/]]) {
    await assert.rejects(requestResponse({}, { key: 'test', fetcher: async () => { throw error; } }), pattern);
  }
  await assert.rejects(requestResponse({}, { key: 'test', fetcher: async () => new Response('not json') }), /не по форме/);
});
