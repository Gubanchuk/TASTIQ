// One bounded real API scenario. Never run without its owner's authorization and a free ledger lock.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {loadCatalogs,editionsOf} from '../../src/core/catalog.js';
import {newConversation,answerConversation} from '../../src/core/conversation.js';
import {createConversationService} from '../../src/server/conversation-service.js';
import {PaidBudget} from '../../src/stand/paid-budget.js';
import {budgetTransport} from '../../src/ai/budget-transport.js';
import {reserveCost} from '../../src/ai/usage.js';

const dir=resolve('research-vault/familiar-games-2026-11/live');mkdirSync(dir,{recursive:true});
assert.ok(!existsSync(resolve(dir,'report.json')),'This diagnostic already has a report. Inspect it; do not rerun or overwrite its cost history.');
const ledgerDir=resolve('research-vault/taste-quality-strategy-2026-10/eval/quality-round-2');
const grantPath=resolve('data/api-test-authorization-2026-11-01.json');
const batchId='familiar-live-20261101',capUsd=0.60,maxRequests=3;
const scenario={id:'familiar-live-20261101-a',mode:'guided',platform:'windows',company:'solo',
 text:'Сегодня хочу одиночную RPG на Windows с интересной историей, исследованием мира и развитием героя: пробовать разные билды, чувствовать рост возможностей. Не хочется постоянных повторов после смерти. Спутники не обязательны, реализм неважен. Skyrim и Red Dead Redemption 2 прошёл; Cyberpunk 2077 только начал и могу вернуться, если он подходит.'};
const frozenPath=resolve(dir,'scenario.frozen.json');
const frozen=JSON.stringify({scenario,batchId,capUsd,maxRequests},null,2)+'\n';
if(existsSync(frozenPath))assert.equal(readFileSync(frozenPath,'utf8'),frozen,'Never overwrite a frozen scenario');
else writeFileSync(frozenPath,frozen,{flag:'wx'});
const snapshot=JSON.parse(readFileSync(resolve(ledgerDir,'budget.json'),'utf8'));
if(!existsSync(grantPath))writeFileSync(grantPath,JSON.stringify({version:1,dateLocal:'2026-11-01',authorizedAt:new Date().toISOString(),
 source:'Owner: максимум еще 10$ на API, если действительно потребуется и даст результат; для теста.',
 maxAdditionalUsd:10,baselineCumulativeUpper:snapshot.cumulativeUpper,baselineSuccessfulCalls:snapshot.successfulCalls,
 maxCumulativeUpper:Math.round((snapshot.cumulativeUpper+10)*1e10)/1e10,
 unusedOldAllowanceAdded:false,scope:'API tests; all post-grant ledger spend is conservatively counted against the additional cap.',
 technicalLimitsUnchanged:{ledgerCeiling:snapshot.ceiling,roundCap:snapshot.roundCap,interactiveBatchCap:0.75},
 note:'This is not a requirement to spend $10. Keep smaller per-experiment limits. Current experiment is <=3 requests and $0.60. Do not add the old unused remainder on top. The old ledger ceiling stays more restrictive until a justified experiment needs an authorized increase.'
},null,2)+'\n',{flag:'wx'});
const grant=JSON.parse(readFileSync(grantPath,'utf8'));
assert.equal(grant.maxAdditionalUsd,10);
const ledger=new PaidBudget(ledgerDir),before=ledger.snapshot();
let requests=0;
const bounded=budgetTransport({ledger,batchId,cap:capUsd});
const api=async request=>{
 if(++requests>maxRequests)throw Error('Three-request diagnostic ceiling reached');
 const s=ledger.snapshot(),reserve=reserveCost(request);
 if(reserve==null||s.cumulativeUpper+s.uncertainReserve+reserve>grant.maxCumulativeUpper)throw Error('Additional owner grant reserve exceeded');
 return bounded(request);
};
const save=(name,value)=>writeFileSync(resolve(dir,name+'.json'),JSON.stringify(value,null,2)+'\n');
const cards=state=>[state.result?.top,...(state.result?.alternatives??[])].filter(Boolean);
let report={batchId,capUsd,maxRequests,synthetic:true,humanFitMeasured:false,checks:[],status:'failed'};
try {
 assert.equal(before.uncertainReserve,0,'Do not continue uncertain spending');
 const catalogs=loadCatalogs();
 const service=createConversationService({catalogs,api,access:()=>({allowed:true}),journal:row=>appendFileSync(resolve(dir,'journal.ndjson'),JSON.stringify(row)+'\n')});
 const who={uid:'isolated-paid-diagnostic-20261101'};
 let s=newConversation({id:scenario.id,mode:scenario.mode});
 for(const [id,text]of [['rpg',scenario.text],[scenario.platform,''],[scenario.company,'']])s=answerConversation(s,{type:'answer',questionId:s.question.id,selected:[id],text,kind:'answer'});
 const planned=await service({state:s,action:{type:'retry'}},who);save('plan',planned);assert.ok(!planned.error,planned.error);s=planned.state;
 report.summary=s.summary;report.facts=s.facts;report.modelAction=planned.screen.type;
 if(s.phase!=='review'){const review=await service({state:s,action:{type:'review'}},who);assert.ok(!review.error,review.error);s=review.state;}
 const initial=await service({state:s,action:{type:'confirm'}},who);save('initial',initial);assert.ok(!initial.error,initial.error);s=initial.state;
 const originals=cards(s);assert.ok(originals.length>=3,'Need two replaceable games and at least one retained card');
 const source=structuredClone({context:s.context,turns:s.turns,facts:s.facts,summary:s.summary});
 const marked=originals.slice(0,2).map(c=>c.id),retained=originals.slice(2);
 const beforeFree=requests;
 for(const id of marked){const out=await service({state:s,action:{type:'familiar_mark',id}},who);assert.ok(!out.error,out.error);s=out.state;}
 assert.equal(requests,beforeFree);report.checks.push('Marking two games is free.');
 const replaced=await service({state:s,action:{type:'replace_familiar'}},who);save('replacement',replaced);assert.ok(!replaced.error,replaced.error);s=replaced.state;
 assert.equal(s.replacement.changedIds.length,2,'Both selected slots must receive admissible replacements');
 assert.deepEqual({context:s.context,turns:s.turns,facts:s.facts,summary:s.summary},source);
 for(const original of retained)assert.deepEqual(cards(s).find(c=>c.id===original.id),original);
 const forbidden=new Set(marked.flatMap(id=>editionsOf(catalogs.game,id)));
 assert.ok(cards(s).every(c=>!forbidden.has(c.id)));
 report.checks.push('Two marked slots replaced; original request and all retained card objects unchanged.','No removed game edition returned as a replacement.');
 report.initial=originals.map(c=>({id:c.id,title:c.ru||c.name}));report.after=cards(s).map(c=>({id:c.id,title:c.ru||c.name,reason:c.ai?.reason,caveat:c.ai?.caveat}));
 const afterPaid=requests;
 const restored=await service({state:s},who);assert.ok(!restored.error,restored.error);
 const undone=await service({state:s,action:{type:'undo_replacement'}},who);assert.deepEqual(cards(undone.state),originals);
 const kept=await service({state:undone.state,action:{type:'familiar_keep',id:marked[0]}},who);assert.ok(kept.state.familiar.keep.includes(marked[0]));
 assert.equal(requests,afterPaid);report.checks.push('Actionless restore, undo and explicit keep-return add no API requests.');
 report.status='pass';
}catch(error){report.error=error.message;process.exitCode=1;}
finally {
 const after=ledger.snapshot();
 report={...report,requests,successfulCallsAdded:after.successfulCalls-before.successfulCalls,
  costUsd:Math.round((after.cumulativeUpper-before.cumulativeUpper)*1e10)/1e10,uncertainReserve:after.uncertainReserve,
  cumulativeUpper:after.cumulativeUpper,successfulCalls:after.successfulCalls,remainingOriginalGuard:after.remainingLower,
  additionalSpentUpper:Math.round((after.cumulativeUpper+after.uncertainReserve-grant.baselineCumulativeUpper)*1e10)/1e10,
  additionalRemainingLower:Math.round((grant.maxCumulativeUpper-after.cumulativeUpper-after.uncertainReserve)*1e10)/1e10};
 save('report',report);ledger.close();
 console.log(JSON.stringify({status:report.status,requests:report.requests,costUsd:report.costUsd,successfulCallsAdded:report.successfulCallsAdded,uncertainReserve:report.uncertainReserve,additionalRemainingLower:report.additionalRemainingLower,error:report.error,initial:report.initial,after:report.after}));
}
