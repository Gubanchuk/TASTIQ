import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {loadCatalogs} from '../../src/core/catalog.js';
import {createMediaConversationService} from '../../src/server/media-conversation-service.js';
import {createConversationService} from '../../src/server/conversation-service.js';
import {applyMediaConversationProposal,mediaConversationScreen} from '../../src/core/media-conversation.js';
import {PaidBudget} from '../../src/stand/paid-budget.js';
import {budgetTransport} from '../../src/ai/budget-transport.js';
import {createFeedbackStore} from '../../src/server/public/shared/evening-feedback.js';
const folder=resolve('research-vault/adaptive-media-2026-11-02/live-round-4');
if(existsSync(resolve(folder,'report.json')))throw Error('Prior evidence is immutable');mkdirSync(folder,{recursive:true});
const previous=JSON.parse(readFileSync(resolve('research-vault/adaptive-media-2026-11-02/live-round-3/report.json'),'utf8'));
const ledger=new PaidBudget(resolve('research-vault/taste-quality-strategy-2026-10/eval/quality-round-2'));
const before=ledger.snapshot(),report={cap:0.60,maxTotalPaidCalls:12,before:{upper:before.cumulativeUpper,calls:before.successfulCalls},cases:[]};
const transport=budgetTransport({ledger,batchId:'adaptive-media-20261102',cap:0.60});let requests=0;
const api=request=>{assert.ok(++requests<=1,'Only the remaining cartoon confirmation may call the provider');return transport(request);};
const save=()=>writeFileSync(resolve(folder,'report.json'),JSON.stringify(report,null,2));
try{
 assert.equal(before.uncertainReserve,0);assert.equal(before.calls.filter(c=>c.id.startsWith('adaptive-media-20261102:')).length,11);
 const catalogs=loadCatalogs();
 for(const domain of ['film','series','game','cartoon']){
  const prior=previous.cases.find(c=>c.domain===domain),row={domain,steps:[],firstQuestion:prior.firstQuestion};report.cases.push(row);
  const service=(domain==='game'?createConversationService:createMediaConversationService)({domain,catalogs,api,journal:e=>appendFileSync(resolve(folder,'journal.ndjson'),JSON.stringify(e)+'\n')});
  let out;
  if(domain!=='cartoon'){
   const success=prior.steps.findLast(s=>s.state?.result?.top);assert.ok(success,domain);
   out=await service({domain,state:success.state},{uid:`final-${domain}`,ip:'127.0.0.1'});row.carriedReport='live-round-3/report.json';row.steps.push({action:'free-restore-success',...out});
  }else{
   const failed=prior.steps.find(s=>s.action==='answer');assert.ok(failed?.error);
   const receipt=before.calls.findLast(c=>c.id.startsWith('adaptive-media-20261102:')&&c.request?.text?.format?.name==='tastiq_media_conversation'&&JSON.parse(c.request.input).id===failed.state.id&&JSON.parse(c.request.input).revision===failed.state.revision);
   const proposal=JSON.parse(receipt.response.output.filter(m=>m.type==='message').flatMap(m=>m.content??[]).filter(c=>c.type==='output_text').map(c=>c.text).join(''));
   const checked=applyMediaConversationProposal(failed.state,proposal,catalogs.cartoon.dict,failed.state.revision);assert.ok(!checked.error,checked.error);
   out={state:checked.state,screen:mediaConversationScreen(checked.state)};row.reusedReceipt=receipt.id;row.steps.push({action:'offline-repaired-receipt',...out});
   assert.equal(out.state.context.company,'children');assert.equal(out.state.context.childAge,7);assert.equal(out.state.context.format,'movie');assert.equal(out.state.context.minutes,100);
   if(out.screen.type!=='review')out=await service({domain,state:out.state,action:{type:'review'}},{uid:'final-cartoon'});
   out=await service({domain,state:out.state,action:{type:'confirm'}},{uid:'final-cartoon',ip:'127.0.0.1'});row.steps.push({action:'confirm',...out});
  }
  assert.ok(!out.error,`${domain}: ${out.error}`);assert.ok(out.state.result?.top);
  const cards=[out.state.result.top,...out.state.result.alternatives];assert.ok(cards.every(c=>catalogs[domain].byId.has(c.id)));
  if(domain==='cartoon')assert.ok(cards.every(c=>c.kind==='film'));
  const feedback=createFeedbackStore({locks:{request:async(_,fn)=>fn()},id:()=>`final-feedback-${domain}`});
  const run=await feedback.observe(out.state.id,out.feedbackState??(await service({domain,state:out.state},{uid:`final-${domain}`})).feedbackState,out.state.result);assert.ok(run,`${domain} evening creation`);
  row.feedbackContext=run.context;row.passed=true;row.titles=cards.map(c=>c.ru||c.name);save();process.stdout.write(`${domain}: result + evening verified\n`);
 }
 report.passed=true;
}catch(error){report.error=error.message;process.exitCode=1;}
finally{
 const after=ledger.snapshot(),stage=after.calls.filter(c=>c.id.startsWith('adaptive-media-20261102:'));
 report.after={upper:after.cumulativeUpper,calls:after.successfulCalls,uncertainReserve:after.uncertainReserve};report.stageCalls=after.successfulCalls-before.successfulCalls;report.stageUsd=+(after.cumulativeUpper-before.cumulativeUpper).toFixed(10);report.totalDiagnosticCalls=stage.length;report.totalDiagnosticUsd=+stage.reduce((s,c)=>s+(c.costUsd??c.reserveUsd),0).toFixed(10);save();ledger.close();
 process.stdout.write(JSON.stringify({passed:report.passed??false,totalCalls:report.totalDiagnosticCalls,totalUsd:report.totalDiagnosticUsd,error:report.error??null})+'\n');
}
