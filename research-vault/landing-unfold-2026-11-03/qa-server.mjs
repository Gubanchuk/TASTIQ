// Isolated landing and navigation QA: real app, no model or owner journal.
import {createServer} from 'node:http';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
process.loadEnvFile=()=>{};
process.env.AI_ACCESS='off';
process.env.JOURNAL_PATH=join(mkdtempSync(join(tmpdir(),'tastiq-landing-unfold-')),'journal.ndjson');
for(const key of ['AI_EVAL_BUDGET_DIR','OPENAI_API_KEY','ANTHROPIC_API_KEY'])delete process.env[key];
globalThis.fetch=async()=>{throw Error('External provider disabled in landing QA');};
const {handler}=await import('../../src/server/app.js');
createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:5180');
 if(['/pick/game/','/pick/watch/'].includes(url.pathname)&&!url.searchParams.has('qa_run')){
  url.searchParams.set('qa_run','landingunfold20261103');
  res.writeHead(302,{Location:url.pathname+url.search});res.end();return;
 }
 return handler(req,res);
}).listen(5180,'127.0.0.1',()=>console.log('Landing QA http://127.0.0.1:5180/ · paid 0'));
