import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createHmac} from 'node:crypto';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fixtureCatalog,screenFixture} from './fixture.js';

test('HTTP feedback preserves retryable database errors and revision conflicts without exposing upstream data',async t=>{
 const scratch=mkdtempSync(join(tmpdir(),'tastiq-feedback-http-'));
 t.after(()=>rmSync(scratch,{recursive:true,force:true}));
 const game=fixtureCatalog();
 writeFileSync(join(scratch,'catalog.json'),JSON.stringify({items:game.items,idf:game.idf,df:game.df}));
 writeFileSync(join(scratch,'screen.json'),JSON.stringify({items:['film','series','cartoon'].flatMap(domain=>screenFixture(domain).items),idf:{},df:{}}));
 Object.assign(process.env,{CATALOG_PATH:join(scratch,'catalog.json'),SCREEN_CATALOG_PATH:join(scratch,'screen.json'),AI_ACCESS:'off',AI_EVAL_BUDGET_DIR:'',FEEDBACK_DATABASE_URL:'https://feedback-test.invalid',FEEDBACK_DATABASE_SECRET:'TEST_ONLY_FEEDBACK_HTTP',JOURNAL_PATH:join(scratch,'qa.ndjson')});
 let upstream=503;
 t.mock.method(globalThis,'fetch',async url=>{assert.equal(url,'https://feedback-test.invalid/functions/v1/tastiq-feedback');return new Response(JSON.stringify({error:'UPSTREAM_PRIVATE_CANARY'}),{status:upstream});});
 t.mock.method(console,'error',()=>{});
 const {handler}=await import('../src/server/app.js');
 const qa='feedback_http_errors',signature=createHmac('sha256',process.env.FEEDBACK_DATABASE_SECRET).update('tastiq-feedback-probe:'+qa).digest('hex');
 const at='2026-11-04T00:00:00Z',run={version:1,id:'http-error-test',dialogueId:'http-error-test-dialogue',domain:'game',revision:0,at,updatedAt:at,context:{},cards:[{id:'7',title:'Synthetic',origin:'engine'}],responses:[]};
 for(const status of [503,409]){
  upstream=status;
  const req=Readable.from([JSON.stringify({run})]);Object.assign(req,{method:'POST',url:'/api/feedback',headers:{host:'localhost','x-tastiq-qa-run':qa,'x-tastiq-feedback-probe':signature,'x-tastiq-max-reserve-usd':'0'}});
  let actual,body;await handler(req,{writeHead:value=>{actual=value;},end:value=>{body=JSON.parse(value);}});
  assert.equal(actual,status);assert.ok(!JSON.stringify(body).includes('UPSTREAM_PRIVATE_CANARY'));assert.deepEqual(body.qaBilling.calls,[]);assert.equal(body.ok,undefined);
 }
});
