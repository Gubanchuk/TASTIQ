// Bounded evaluation only; never imported by the product or deployed function.
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {PaidBudget} from '../../src/stand/paid-budget.js';
import {reserveCost,estimateCost} from '../../src/ai/usage.js';
import {BudgetError} from '../../src/ai/budget-error.js';
import {requestResponse} from '../../src/ai/openai.js';
import {AI} from '../../src/ai/config.js';
import {loadCatalogs,catalogMeta} from '../../src/core/catalog.js';
import {createMediaConversationService} from '../../src/server/media-conversation-service.js';
import {mediaConversationScreen,mediaConversationToLegacy} from '../../src/core/media-conversation.js';
import {criteriaOf} from '../../src/ai/pick-constraints.js';
import {selectionCopyText} from '../../src/server/public/shared/selection-copy.js';

const folder=resolve('research-vault/media-more-constraints-2026-11-03'),plan=JSON.parse(readFileSync(resolve(folder,'plan.json'))),live=resolve(folder,'live-round-1');
if(existsSync(resolve(live,'started.json')))throw Error('Immutable evaluation: inspect the existing run, never overwrite');
mkdirSync(live,{recursive:true});
const ledger=new PaidBudget(resolve('research-vault/taste-quality-strategy-2026-10/eval/quality-round-2'));
const before=ledger.snapshot(),budget=plan.budget,prefix=plan.run+':',money=n=>Math.round(n*1e10)/1e10,hash=value=>createHash('sha256').update(value).digest('hex');
let busy=false,stage=null,closed=false,requestNumber=0;
const rows=()=>ledger.data.calls.filter(r=>r.id.startsWith(prefix));
const spend=()=>money(rows().reduce((sum,r)=>sum+(r.status==='settled'?r.costUsd:r.reserveUsd),0));
const modelCalls=()=>rows().filter(r=>r.status==='settled'&&r.response?.status!=='not_requested').length;
const unknown=()=>ledger.data.calls.filter(r=>r.status!=='settled'&&r.id!==budget.historicalHoldId);
const grant=()=>JSON.parse(readFileSync(resolve('data/api-test-authorization-2026-11-01.json')));
const save=()=>{const snap=ledger.snapshot();writeFileSync(resolve(live,'budget-summary.json'),JSON.stringify({run:plan.run,cap:budget.capUsd,maxCalls:budget.maxModelCalls,spent:spend(),modelCalls:modelCalls(),newUncertain:unknown().length,before:{upper:before.cumulativeUpper,calls:before.successfulCalls,hold:before.uncertainReserve},after:{upper:snap.cumulativeUpper,calls:snap.successfulCalls,hold:snap.uncertainReserve,technicalRemaining:snap.remainingLower,grantRemaining:money(grant().maxCumulativeUpper-snap.cumulativeUpper-snap.uncertainReserve)},closed},null,2));};
const catalogs=loadCatalogs(),catalog=catalogs.cartoon,latest={},attempted=new Set();
try{
 const holds=ledger.data.calls.filter(r=>r.status!=='settled');
 if(holds.length!==1||holds.some(r=>r.id!==budget.historicalHoldId||r.status!=='uncertain'||r.reserveUsd!==budget.historicalHoldUsd)||ledger.data.haltReason||rows().length)throw Error('Budget history changed; stop before dispatch');
 if(AI.model!=='gpt-6.1-sol'||before.cumulativeUpper!==budget.baselineSettledUsd||before.successfulCalls!==budget.baselineSuccessfulCalls||budget.capUsd>Math.min(before.remainingLower,money(before.roundCap-before.settledNewUsd-before.uncertainReserve),money(grant().maxCumulativeUpper-before.cumulativeUpper-before.uncertainReserve)))throw Error('Model or allowance preflight failed');
 for(const test of plan.cases){
  const saved=JSON.parse(readFileSync(resolve(test.source))),input=test.sourceField?saved[test.sourceField]:saved,state=structuredClone(input.state);
  if(state.domain!=='cartoon'||state.phase!=='result'||!state.result?.top)throw Error('Expected saved cartoon result');
  latest[test.id]={state,screen:mediaConversationScreen(state),feedbackState:mediaConversationToLegacy(state,catalog.dict,catalog)};
  writeFileSync(resolve(live,test.id+'-before.json'),JSON.stringify(latest[test.id],null,2));
  writeFileSync(resolve(live,test.id+'-criteria.json'),JSON.stringify(criteriaOf(latest[test.id].feedbackState),null,2));
 }
 const response=await fetch(`https://api.openai.com/v1/models/${AI.model}`,{headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(`Free model preflight HTTP${response.status}`);
 const sources=['src/ai/pick-constraints.js','src/ai/pick.js','src/server/media-conversation-service.js','src/core/media-conversation.js','src/core/session-time.js',...plan.cases.map(t=>t.source),'research-vault/media-more-constraints-2026-11-03/plan.json'];
 writeFileSync(resolve(live,'started.json'),JSON.stringify({at:new Date().toISOString(),model:AI.model,sourceCommitBefore:plan.sourceCommit,sourceHashes:Object.fromEntries(sources.map(path=>[path,hash(readFileSync(resolve(path)))])),cap:budget.capUsd,maxCalls:budget.maxModelCalls,historicHold:before.uncertainReserve,freeModelGet:response.status},null,2));save();
}catch(error){ledger.close();throw error;}

const api=async request=>{
 const snap=ledger.snapshot(),reserve=reserveCost(request);
 if(closed||busy||stage?.action!=='more'||unknown().length||ledger.data.haltReason||rows().length>=budget.maxModelCalls)throw new BudgetError('Evaluation stopped before dispatch','AI_BUDGET_LIMIT');
 const available=Math.min(budget.capUsd-spend(),snap.remainingLower,snap.roundCap-snap.settledNewUsd-snap.uncertainReserve,grant().maxCumulativeUpper-snap.cumulativeUpper-snap.uncertainReserve,budget.perCallReserveCeilingUsd);
 if(reserve==null||reserve>available)throw new BudgetError('Reserve exceeds bounded allowance','AI_BUDGET_LIMIT');
 const row={id:prefix+(rows().length+1),request:structuredClone(request),hash:hash(JSON.stringify(request)),reserveUsd:reserve,status:'pending',startedAt:new Date().toISOString(),evaluation:{...stage}};
 ledger.data.calls.push(row);ledger.save();busy=true;save();
 console.log(JSON.stringify({event:'model-start',case:stage.case,call:rows().length,reserveUsd:reserve}));
 try{
  const result=await requestResponse(request,{timeoutMs:180000}),cost=estimateCost(result.usage,result.model??request.model);row.response=result;
  if(cost==null){row.status='uncertain';ledger.save();throw Error('No billable receipt; no further evaluation');}
  row.costUsd=cost;row.status='settled';row.completedAt=new Date().toISOString();if(cost>reserve)ledger.data.haltReason='Actual usage exceeded evaluation reserve';ledger.save();
  const publicOutput=(result.output??[]).filter(o=>o.type==='message').map(o=>({type:'message',content:o.content.filter(c=>c.type==='output_text').map(c=>({type:'output_text',text:c.text}))}));
  writeFileSync(resolve(live,stage.case+'-provider-text.json'),JSON.stringify({status:result.status,model:result.model,output:publicOutput},null,2));
  console.log(JSON.stringify({event:'model-end',case:stage.case,status:result.status,costUsd:cost,stageUsd:spend(),calls:modelCalls()}));
  if(cost>reserve)throw Error('Charge exceeded reserve; stopped');return result;
 }catch(error){if(row.status==='pending'){row.status='uncertain';row.error='No usage receipt; no automatic retry';ledger.save();}throw error;}
 finally{busy=false;save();}
};
const service=createMediaConversationService({domain:'cartoon',catalogs,api});
const publicRoot=resolve('src/server/public');
const json=(res,data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const bodyOf=async req=>{let text='';for await(const chunk of req){text+=chunk;if(text.length>400000)throw Error('Body too large');}return JSON.parse(text||'{}');};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost:5180');
  if(url.pathname==='/__qa/finish'){
   if(busy||stage)return json(res,{error:'Await the current receipt'},409);
   closed=true;save();ledger.close();json(res,{closed:true,spent:spend(),modelCalls:modelCalls()});server.close();return;
  }
  if(url.pathname==='/__qa/status')return json(res,{...JSON.parse(readFileSync(resolve(live,'budget-summary.json'))),cases:Object.keys(latest),attempted:[...attempted]});
  if(url.pathname==='/__qa/latest')return json(res,latest[url.searchParams.get('case')]??{});
  if(url.pathname==='/__qa/setup'){
   const id=url.searchParams.get('case'),snapshot=latest[id];if(!snapshot)return json(res,{error:'Unknown case'},400);
   const run=plan.run+'-'+id,value=JSON.stringify(JSON.stringify({version:1,snapshot,drafts:{},previous:null,correctionCheckpoint:null})).replaceAll('<','\\u003c');
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
   return res.end(`<!doctype html><meta charset="utf-8"><script>sessionStorage.setItem('tastiq.qa.run',${JSON.stringify(run)});localStorage.setItem(${JSON.stringify('tastiq.qa.'+run+':tastiq.conversation.cartoon.v1')},${value});location.replace(${JSON.stringify('/pick/watch/?domain=cartoon&qa_run='+run)});</script>`);
  }
  if(url.pathname==='/api/meta')return json(res,catalogMeta(catalogs));
  if(url.pathname==='/api/ai/status')return json(res,{enabled:true,model:AI.model});
  if(url.pathname==='/api/feedback')return json(res,{ok:true});
  if(url.pathname==='/api/media-conversation'&&req.method==='POST'){
   const run=req.headers['x-tastiq-qa-run'],test=plan.cases.find(t=>run===plan.run+'-'+t.id);if(!test)return json(res,{error:'Isolated case required'},403);
   const body=await bodyOf(req),action=body.action?.type;
   if(body.domain!=='cartoon'||![undefined,'more','undo_replacement'].includes(action))return json(res,{error:'Only saved-state more/resume/undo'},403);
   if(busy||stage)return json(res,{error:'Sequential evaluation only'},409);
   if(action==='more'&&attempted.has(test.id))return json(res,{error:'One attempt per case; no retries'},403);
   if(action==='more')attempted.add(test.id);
   stage={case:test.id,action:action??'resume'};const number=String(++requestNumber).padStart(2,'0');
   writeFileSync(resolve(live,number+'-'+test.id+'-request.json'),JSON.stringify(body,null,2));
   let out;try{out=await service(body,{uid:run});}finally{stage=null;}
   latest[test.id]=out;writeFileSync(resolve(live,number+'-'+test.id+'-response.json'),JSON.stringify(out,null,2));
   if(out.screen?.type==='result')writeFileSync(resolve(live,test.id+'-selection.txt'),selectionCopyText(out));
   return json(res,out);
  }
  if(url.pathname.startsWith('/api/'))return json(res,{error:'Outside evaluation'},404);
  const path=decodeURIComponent(url.pathname),file=resolve(publicRoot,'.'+path+(path.endsWith('/')?'index.html':''));
  if(!file.startsWith(publicRoot+sep)||!existsSync(file))return json(res,{error:'Not found'},404);
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
  res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(readFileSync(file));
 }catch(error){if(!res.headersSent)json(res,{error:error.message},error.status??500);else res.end();}
});
server.listen(5180,'127.0.0.1',()=>console.log(JSON.stringify({event:'ready',model:AI.model,cap:budget.capUsd,maxCalls:budget.maxModelCalls,historicHold:before.uncertainReserve})));
