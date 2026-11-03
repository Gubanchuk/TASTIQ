// Read-only replay audit. Never dispatches a provider request or writes the billing ledger.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {loadCatalogs} from '../../src/core/catalog.js';
import {normalizeTitle} from '../../src/lib/text.js';
const root=resolve('research-vault/cartoon-journeys-2026-11-03');
const read=path=>JSON.parse(readFileSync(resolve(root,path),'utf8'));
const catalog=loadCatalogs().cartoon;
const cards=response=>[response.state.result?.top,...(response.state.result?.alternatives??[])].filter(Boolean);
const files=(round,id)=>readdirSync(resolve(root,round)).filter(f=>new RegExp(`^\\d+-${id}-response\\.json$`).test(f)).sort().map(f=>({file:round+'/'+f,response:read(round+'/'+f)}));
const results=[];
for(const [id,round,format,minutes,company,age] of [['reference','live-round-2','episodic',30,'solo',null],['adult-scifi','live-round-2','movie',120,'solo',null],['family','live-round-3','movie',90,'children',7]]){
 const recorded=files(round,id).filter(r=>r.response.screen?.type==='result');assert.ok(recorded.length,id);
 let previous=[];
 for(const {file,response:r} of recorded){
  assert.equal(r.error,undefined,file);assert.equal(r.state.context.format,format);assert.equal(r.state.context.minutes,minutes);assert.equal(r.state.context.company,company);assert.equal(r.state.context.childAge,age);
  if(id==='reference')assert.equal(r.state.context.timeMode,'episode');
  const shown=cards(r);assert.ok(shown.length>0&&shown.length<=4);assert.equal(new Set(shown.map(c=>c.id)).size,shown.length);
  assert.ok(shown.every(c=>!previous.includes(c.id)),'more must not repeat earlier cards');
  const checked=shown.map(c=>{
   const item=catalog.byId.get(c.id);assert.ok(item,c.id);assert.equal(c.kind,item.kind);assert.equal(c.runtime,item.runtime);assert.equal(c.kind,format==='movie'?'film':'series');assert.ok(!item.runtime||item.runtime<=minutes);
   if(age!==null)assert.ok(c.feasibility.some(f=>f.key==='age'&&f.status==='unknown'),'no unsupported age guarantee');
   return {id:c.id,title:c.ru||c.name,year:c.year,kind:c.kind,runtime:c.runtime,own:c.ai?.own,reason:c.ai?.reason,caveat:c.ai?.caveat,feasibility:c.feasibility};
  });
  results.push({id,file,context:r.state.context,cards:checked});previous.push(...shown.map(c=>c.id));
 }
}
const first=read('live-round-1/01-reference-response.json');assert.equal(first.state.context.format,null);
const failed=read('live-round-2/05-family-response.json');assert.match(failed.error,/число минут/);
const more=read('live-round-5/family-no-fit-replayed-response.json'),before=read('live-round-4/family-before-more-response.json');
assert.match(more.error,/проверку каталога/);assert.equal(more.retryable,false);assert.deepEqual(more.state.result,before.state.result);
assert.equal(more.state.context.childAge,7);assert.equal(more.state.context.minutes,90);
const budget=read('live-round-5/budget-summary.json');assert.ok(budget.spent<=budget.cap);assert.ok(budget.modelCalls<=budget.maxCalls);assert.equal(budget.uncertain.length,0);assert.equal(budget.after.hold,0.25);
const miffy=catalog.items.filter(c=>[c.name,c.original,c.ru].filter(Boolean).some(t=>/nijntje|miffy|миффи/u.test(normalizeTitle(t)))).map(c=>({id:c.id,name:c.name,original:c.original,kind:c.kind,runtime:c.runtime}));
const ledger=JSON.parse(readFileSync('research-vault/taste-quality-strategy-2026-10/eval/quality-round-2/budget.json','utf8'));
const receipts=ledger.calls.filter(r=>r.id.startsWith('cartoon-journeys-20261103:')).map(r=>({id:r.id,case:r.evaluation?.case,action:r.evaluation?.action,status:r.status,costUsd:r.costUsd,model:r.response?.model,usage:r.response?.usage}));
assert.ok(receipts.every(r=>r.status==='settled'));
const report={verifiedAt:new Date().toISOString(),initialFailuresPreserved:['reference omitted format','family viewing-time rejection','family more knowingly violated no scary scenes','unverified new title displayed as technical id error'],structuralResults:results,moreAfterPromptRepair:{file:'live-round-5/family-no-fit-replayed-response.json',context:more.state.context,error:more.error,retryable:more.retryable,priorCardsPreserved:true,successfulNewReplacement:false},budget,miffyCatalogMatches:miffy,offlineCatalog:read('live-round-3/catalog-baseline.json'),limits:['Synthetic requests; no human fit labels','Original tester request lost; original failure cause unknown','One initial plan per case; fixes replay the same paid response for free','Round3 more has valid structural metadata but failed semantic exclusion criterion','Improved more named one unverified title: no successful new replacement','One improved sample is not a guarantee of semantic safety','No anime/short/import/ranking policy changes']};
writeFileSync(resolve(root,'verification.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({structuralResultBatches:results.length,afterRepairMore:'unverified title omitted; previous cards preserved',cards:results.map(r=>({case:r.id,count:r.cards.length})),calls:budget.modelCalls,spent:budget.spent,oldHold:budget.after.hold,miffyCatalogMatches:miffy}));
