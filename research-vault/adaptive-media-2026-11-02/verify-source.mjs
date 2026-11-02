// Read-only checks against prior frozen evidence and this task's settled ledger.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const text=p=>readFileSync(p,'utf8').replace(/\r\n/g,'\n');
const base='research-vault/conversation-production-2026-11-02/';
const html=text('src/server/public/index.html');
const first=html.match(/<section class="first"[\s\S]*?<\/section>/)?.[0];
const baseline=JSON.parse(text(base+'frozen-baseline.json'));
const hash=value=>createHash('sha256').update(value).digest('hex');
const frozen={firstUnchanged:first===text(base+'baseline-first.html'),rootStyleUnchanged:hash(readFileSync('src/server/public/style.css'))===baseline.rootStyle};
assert.equal(frozen.firstUnchanged,true);assert.equal(frozen.rootStyleUnchanged,true);
const ledger=JSON.parse(text('research-vault/taste-quality-strategy-2026-10/eval/quality-round-2/budget.json'));
const task=ledger.calls.filter(c=>c.id.startsWith('adaptive-media-20261102:'));
const money=n=>Math.round(n*1e10)/1e10;
const upper=money(ledger.baselineUpper+ledger.calls.filter(c=>c.status==='settled').reduce((s,c)=>s+c.costUsd,0));
const spend={taskCalls:task.length,taskUsd:money(task.reduce((s,c)=>s+(c.costUsd??0),0)),taskUnsettled:task.filter(c=>c.status!=='settled').length,
  upper,calls:ledger.baselineCalls+ledger.calls.filter(c=>c.status==='settled'&&c.response?.status==='completed').length,
  uncertainReserve:money(ledger.calls.filter(c=>c.status!=='settled').reduce((s,c)=>s+c.reserveUsd,0)),
  technicalRemaining:money(ledger.ceiling-upper),grantRemainingLower:money(11.5782519-upper)};
assert.equal(spend.taskCalls,12);assert.equal(spend.taskUsd,0.1772022);assert.equal(spend.taskUnsettled,0);
const result={checkedAt:new Date().toISOString(),frozen,spend};
writeFileSync('research-vault/adaptive-media-2026-11-02/source-proof.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
