// Explicitly bounded evaluation only. Never imported by the product or deployed function.
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {PaidBudget} from '../../src/stand/paid-budget.js';
import {reserveCost,estimateCost} from '../../src/ai/usage.js';
import {BudgetError} from '../../src/ai/budget-error.js';
import {requestResponse} from '../../src/ai/openai.js';
import {AI} from '../../src/ai/config.js';
import {loadCatalogs,catalogMeta,makeCatalog} from '../../src/core/catalog.js';
import {createMediaConversationService} from '../../src/server/media-conversation-service.js';
import {mediaConversationToLegacy} from '../../src/core/media-conversation.js';
import {profileOf,sessionOf} from '../../src/core/dialogue.js';
import {rankAll} from '../../src/core/recommend.js';
import {candidatesOf} from '../../src/ai/pick.js';
import {selectionCopyText} from '../../src/server/public/shared/selection-copy.js';

const folder=resolve('research-vault/cartoon-journeys-2026-11-03'),plan=JSON.parse(readFileSync(resolve(folder,'plan.json')));
const round=process.argv[2]??'live-round-1';if(!/^live-round-[1-9][0-9]*$/.test(round))throw Error('Invalid round');
const live=resolve(folder,round);if(existsSync(resolve(live,'started.json')))throw Error('Preserve the previous run; inspect it instead of overwriting');
mkdirSync(live,{recursive:true});
const ledger=new PaidBudget(resolve('research-vault/taste-quality-strategy-2026-10/eval/quality-round-2'));
const before=ledger.snapshot(),budget=plan.budget,prefix=plan.run+':',money=n=>Math.round(n*1e10)/1e10;
let busy=false,stage=null,closed=false,requestNumber=0;
const rows=()=>ledger.data.calls.filter(r=>r.id.startsWith(prefix));
const spend=()=>money(rows().reduce((s,r)=>s+(r.status==='settled'?r.costUsd:r.reserveUsd),0));
const modelCalls=()=>rows().filter(r=>r.status==='settled'&&r.response?.status!=='not_requested').length;
const unknown=()=>ledger.data.calls.filter(r=>r.status!=='settled'&&r.id!==budget.historicalHoldId);
const save=()=>{const snap=ledger.snapshot();writeFileSync(resolve(live,'budget-summary.json'),JSON.stringify({run:plan.run,round,cap:budget.capUsd,maxCalls:budget.maxModelCalls,spent:spend(),modelCalls:modelCalls(),uncertain:unknown().map(r=>({id:r.id,reserveUsd:r.reserveUsd})),before:{upper:budget.baselineSettledUsd,calls:budget.baselineSuccessfulCalls,hold:budget.historicalHoldUsd},roundBefore:{upper:before.cumulativeUpper,calls:before.successfulCalls,hold:before.uncertainReserve},after:{upper:snap.cumulativeUpper,calls:snap.successfulCalls,hold:snap.uncertainReserve},closed},null,2));};
try {
 const holds=ledger.data.calls.filter(r=>r.status!=='settled');
 if(holds.some(r=>r.id!==budget.historicalHoldId||r.status!=='uncertain'||r.reserveUsd!==budget.historicalHoldUsd)||ledger.data.haltReason)throw Error('Unexpected unresolved spend; no paid dispatch');
 if(AI.model!=='gpt-6.1-sol'||round==='live-round-1'&&rows().length||round!=='live-round-1'&&!existsSync(resolve(folder,'live-round-1/started.json'))||budget.capUsd-spend()>before.remainingLower||budget.capUsd-spend()>money(before.roundCap-before.settledNewUsd-before.uncertainReserve))throw Error('Budget/model preflight failed');
 const grant=JSON.parse(readFileSync(resolve('data/api-test-authorization-2026-11-01.json')));
 if(budget.capUsd-spend()>money(grant.maxCumulativeUpper-before.cumulativeUpper-before.uncertainReserve))throw Error('Grant does not cover the stage');
 const response=await fetch(`https://api.openai.com/v1/models/${AI.model}`,{headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(`Free model-access preflight failed: HTTP${response.status}`);
 const sourceHashes=Object.fromEntries(['src/core/media-conversation.js','src/ai/media-conversation.js','src/core/session-time.js','src/ai/prompt.js','src/ai/pick.js'].map(path=>[path,createHash('sha256').update(readFileSync(resolve(path))).digest('hex')]));
 writeFileSync(resolve(live,'started.json'),JSON.stringify({at:new Date().toISOString(),model:AI.model,sourceCommitBefore:plan.sourceCommit,sourceHashes,cap:budget.capUsd,maxCalls:budget.maxModelCalls,heldHistorical:holds.map(r=>({id:r.id,reserveUsd:r.reserveUsd})),freeModelGet:response.status},null,2));save();
}catch(error){ledger.close();throw error;}

const api=async request=>{
 const snap=ledger.snapshot(),reserve=reserveCost(request);
 if(closed||busy||!stage||unknown().length||ledger.data.haltReason||modelCalls()>=budget.maxModelCalls)throw new BudgetError('Evaluation stopped before dispatch','AI_BUDGET_LIMIT');
 const grant=JSON.parse(readFileSync(resolve('data/api-test-authorization-2026-11-01.json')));
 const available=Math.min(budget.capUsd-spend(),snap.remainingLower,snap.roundCap-snap.settledNewUsd-snap.uncertainReserve,grant.maxCumulativeUpper-snap.cumulativeUpper-snap.uncertainReserve,budget.perCallReserveCeilingUsd);
 if(reserve==null||reserve>available)throw new BudgetError('Evaluation reserve does not fit remaining allowance','AI_BUDGET_LIMIT');
 const row={id:prefix+(rows().length+1),request:structuredClone(request),hash:createHash('sha256').update(JSON.stringify(request)).digest('hex'),reserveUsd:reserve,status:'pending',startedAt:new Date().toISOString(),evaluation:{case:stage.case,action:stage.action}};
 ledger.data.calls.push(row);ledger.save();busy=true;save();
 console.log(JSON.stringify({event:'model-start',case:stage.case,action:stage.action,call:rows().length,reserveUsd:reserve}));
 try {
  const result=await requestResponse(request,{timeoutMs:180000}),cost=estimateCost(result.usage,result.model??request.model);
  row.response=result;
  if(cost==null){row.status='uncertain';ledger.save();throw Error('Missing billable usage; paid evaluation stopped');}
  row.costUsd=cost;row.status='settled';row.completedAt=new Date().toISOString();
  if(cost>reserve)ledger.data.haltReason='Actual usage exceeded evaluation reserve';
  ledger.save();console.log(JSON.stringify({event:'model-end',case:stage.case,status:result.status,costUsd:cost,stageUsd:spend(),calls:modelCalls()}));
  if(cost>reserve)throw Error('Actual charge exceeded reserve; evaluation stopped');
  return result;
 }catch(error){if(row.status==='pending'){row.status='uncertain';row.error='No billable usage receipt; no automatic retry';ledger.save();}throw error;}
 finally{busy=false;save();}
};
const catalogs=loadCatalogs(),catalog=catalogs.cartoon,latest={};
const service=createMediaConversationService({domain:'cartoon',catalogs,api,journal:event=>appendFileSync(resolve(live,'journal.ndjson'),JSON.stringify(event)+'\n')});
const publicRoot=resolve('src/server/public');
const json=(res,data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const bodyOf=async req=>{let text='';for await(const chunk of req){text+=chunk;if(text.length>400000)throw Error('Request too large');}return JSON.parse(text||'{}');};
const diagnosis=state=>{
 const scoped=state.context?.format?makeCatalog({...catalog,items:catalog.items.filter(item=>item.kind===(state.context.format==='movie'?'film':'series'))},'cartoon'):catalog;
 const legacy=mediaConversationToLegacy(state,catalog.dict,catalog),{ranked,dropped}=rankAll(scoped,profileOf(legacy),sessionOf(legacy)),shortlist=candidatesOf(scoped,legacy,60).rows;
 return {context:state.context,sessionTime:state.sessionTime,facts:state.facts,summary:state.summary,rankedCount:ranked.length,droppedCount:dropped?.length??null,shortlist:shortlist.map(r=>({id:r.game.id,name:r.game.ru||r.game.name,rank:r.rank,score:r.score,kind:r.game.kind,runtime:r.game.runtime})),rawTop:ranked.slice(0,12).map(r=>({id:r.game.id,name:r.game.ru||r.game.name,kind:r.game.kind,runtime:r.game.runtime,score:r.score}))};
};
const offline={cartoons:catalog.items.length,kinds:Object.fromEntries([...new Set(catalog.items.map(c=>c.kind))].map(kind=>[kind,catalog.items.filter(c=>c.kind===kind).length])),filmUnder30:catalog.items.filter(c=>c.kind==='film'&&c.runtime>0&&c.runtime<=30).map(c=>({id:c.id,title:c.ru||c.name,runtime:c.runtime})),unknownFilmRuntime:catalog.items.filter(c=>c.kind==='film'&&!c.runtime).length};
writeFileSync(resolve(live,'catalog-baseline.json'),JSON.stringify(offline,null,2));
if(round!=='live-round-1'){
 const recorded=JSON.parse(readFileSync(resolve('test/fixtures/cartoon-reference-format-2026-11-03.json')));
 const replay=createMediaConversationService({domain:'cartoon',catalogs,plan:async()=>({proposal:recorded.proposal,model:'recorded-plan-offline-replay'})});
 latest.reference=await replay({domain:'cartoon',state:recorded.state,action:recorded.action},{uid:plan.run+'-reference'});
 if(latest.reference.error||latest.reference.state.context.format!=='episodic')throw Error('Offline repair replay failed');
 writeFileSync(resolve(live,'reference-repaired-response.json'),JSON.stringify(latest.reference,null,2));
 writeFileSync(resolve(live,'reference-diagnosis.json'),JSON.stringify(diagnosis(latest.reference.state),null,2));
}
if(round==='live-round-3'){
 const recorded=JSON.parse(readFileSync(resolve('test/fixtures/cartoon-family-time-2026-11-03.json')));
 const replay=createMediaConversationService({domain:'cartoon',catalogs,plan:async()=>({proposal:recorded.proposal,model:'recorded-plan-offline-replay'})});
 latest.family=await replay({domain:'cartoon',state:recorded.state,action:recorded.action},{uid:plan.run+'-family'});
 if(latest.family.error||latest.family.state.context.minutes!==90)throw Error('Offline time repair replay failed');
 writeFileSync(resolve(live,'family-repaired-response.json'),JSON.stringify(latest.family,null,2));
 writeFileSync(resolve(live,'family-diagnosis.json'),JSON.stringify(diagnosis(latest.family.state),null,2));
}
if(round==='live-round-4'){
 latest.family=JSON.parse(readFileSync(resolve(folder,'live-round-3/02-family-response.json')));
 if(latest.family.screen?.type!=='result')throw Error('Expected saved pre-more result');
 writeFileSync(resolve(live,'family-before-more-response.json'),JSON.stringify(latest.family,null,2));
}
if(round==='live-round-5'){
 const saved=JSON.parse(readFileSync(resolve('test/fixtures/cartoon-more-no-fit-2026-11-03.json')));
 const replay=createMediaConversationService({domain:'cartoon',catalogs,api:async()=>saved.response});
 latest.family=await replay(saved.request);
 if(latest.family.retryable!==false||!latest.family.error?.includes('проверку каталога'))throw Error('Expected terminal catalog gate');
 writeFileSync(resolve(live,'family-no-fit-replayed-response.json'),JSON.stringify(latest.family,null,2));
}
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:5180');
  if(url.pathname==='/__qa/finish'){
   if(busy||stage)return json(res,{error:'Wait for the current request receipt'},409);
   closed=true;save();ledger.close();json(res,{closed:true,spent:spend(),modelCalls:modelCalls()});server.close();return;
  }
  if(url.pathname==='/__qa/repaired'){
   const id=url.searchParams.get('case')??'reference',snapshot=latest[id];if(!snapshot)return json(res,{error:'No recorded repair'},404);
   const run=plan.run+'-'+id,value=JSON.stringify(JSON.stringify({version:1,snapshot,drafts:{},checkpoint:null})).replaceAll('<','\\u003c');
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
   return res.end(`<!doctype html><meta charset="utf-8"><title>Recorded response replay</title><script>sessionStorage.setItem('tastiq.qa.run',${JSON.stringify(run)});localStorage.setItem(${JSON.stringify('tastiq.qa.'+run+':tastiq.conversation.cartoon.v1')},${value});location.replace(${JSON.stringify('/pick/watch/?domain=cartoon&qa_run='+run)});</script>`);
  }
  if(url.pathname==='/__qa/status')return json(res,{...JSON.parse(readFileSync(resolve(live,'budget-summary.json'))),freeModelGet:200,offlineCatalog:{items:offline.cartoons,kinds:offline.kinds,filmsUnder30:offline.filmUnder30.length,unknownFilmRuntime:offline.unknownFilmRuntime},cases:Object.keys(latest)});
  if(url.pathname==='/__qa/cases')return json(res,plan.cases);
  if(url.pathname==='/__qa/latest')return json(res,latest[url.searchParams.get('case')]??{});
  if(url.pathname==='/api/meta')return json(res,catalogMeta(catalogs));
  if(url.pathname==='/api/ai/status')return json(res,{enabled:true,model:AI.model});
  if(url.pathname==='/api/feedback')return json(res,{ok:true});
  if(url.pathname==='/api/media-conversation'&&req.method==='POST'){
   const run=req.headers['x-tastiq-qa-run'],test=plan.cases.find(c=>run===plan.run+'-'+c.id);if(!test)return json(res,{error:'Use an isolated case namespace'},403);
   const body=await bodyOf(req);if(body.domain!=='cartoon')return json(res,{error:'Cartoon-only evaluation'},400);
   if(body.action?.type==='retry')return json(res,{error:'No automatic paid retries in this evaluation'},403);
   if(round==='live-round-5'&&body.action)return json(res,{error:'Paid stage finished; read-only replay'},403);
   if(busy||stage)return json(res,{error:'Sequential evaluation only'},409);
   stage={case:test.id,action:body.action?.type??'resume'};const number=++requestNumber;
   writeFileSync(resolve(live,`${String(number).padStart(2,'0')}-${test.id}-request.json`),JSON.stringify(body,null,2));
   let out;
   try{out=await service(body,{uid:run});}
   finally{stage=null;}
   latest[test.id]=out;writeFileSync(resolve(live,`${String(number).padStart(2,'0')}-${test.id}-response.json`),JSON.stringify(out,null,2));
   if(['review','result'].includes(out.screen?.type))writeFileSync(resolve(live,`${test.id}-diagnosis.json`),JSON.stringify(diagnosis(out.state),null,2));
   if(out.screen?.type==='result')writeFileSync(resolve(live,`${test.id}-selection.txt`),selectionCopyText(out));
   return json(res,out);
  }
  if(url.pathname.startsWith('/api/'))return json(res,{error:'Not part of this evaluation'},404);
  const path=decodeURIComponent(url.pathname),file=resolve(publicRoot,'.'+path+(path.endsWith('/')?'index.html':''));
  if(!file.startsWith(publicRoot+sep)||!existsSync(file))return json(res,{error:'Not found'},404);
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
  res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(readFileSync(file));
 }catch(error){if(!res.headersSent)json(res,{error:error.message},error.status??500);else res.end();}
});
process.on('SIGINT',()=>{closed=true;save();if(!busy)ledger.close();server.close();process.exit(0);});
server.listen(5180,'127.0.0.1',()=>console.log(JSON.stringify({event:'ready',url:'http://127.0.0.1:5180/pick/watch/?domain=cartoon',model:AI.model,cap:budget.capUsd,maxCalls:budget.maxModelCalls,heldHistorical:before.uncertainReserve,catalogItems:catalog.items.length})));
