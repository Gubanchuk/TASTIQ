import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {makeCatalog} from '../../../src/core/catalog.js';
import {applyConversationProposal,conversationToLegacy} from '../../../src/core/conversation.js';
import {validateSessionTime} from '../../../src/core/session-time.js';
const read=relative=>JSON.parse(readFileSync(new URL(relative,import.meta.url),'utf8'));
const failed=read('../live-round-1/05-correction-plan.json');
const ledger=read('../../taste-quality-strategy-2026-10/eval/quality-round-2/budget.json');
const receiptId='overnight-20261101-01:2d8ab0f030feb022017025fcd0891ff86589a725d377d63506516ad6d3bf48be';
const receipt=ledger.calls.find(r=>r.id===receiptId);assert.equal(receipt?.status,'settled');
const proposal=JSON.parse(receipt.response.output.filter(x=>x.type==='message').flatMap(x=>x.content).filter(x=>x.type==='output_text').map(x=>x.text).join(''));
assert.equal(proposal.sessionTime.quote,'Сегодня есть 45 минут.');
const time=validateSessionTime(proposal.sessionTime,failed.state);assert.equal(time.error,undefined);
const catalog=makeCatalog(read('../../../data/catalog.json'),'game');
const applied=applyConversationProposal(failed.state,proposal,catalog.dict);assert.equal(applied.error,undefined);
const legacy=conversationToLegacy(applied.state,catalog.dict,catalog);
assert.equal(applied.state.phase,'review');assert.equal(legacy.session.minutes,45);
assert.ok(legacy.session.goalWants.some(f=>f.f==='loop.driving'));assert.ok(!legacy.session.genreWants.includes('RPG'));
assert.deepEqual(legacy.conversation.familiarity.returnToIds,[]);assert.ok(legacy.session.notNow.includes('steam:72850'));
const report={at:new Date().toISOString(),method:'Exact saved real response through local validator/core only, no model retry',receiptId,originalFailure:failed.error,
 sourceAnswer:failed.state.turns.find(t=>t.id===proposal.sessionTime.sourceId).answer,sessionTime:applied.state.sessionTime,acceptedPhase:applied.state.phase,
 checks:{wholeProposalAccepted:true,drivingGoalPreserved:true,noOldRpgPositive:true,noOldReplayOverride:true,todaySkyrimExcludePreserved:true},externalApiCalls:0};
writeFileSync(new URL('./saved-proposal.json',import.meta.url),JSON.stringify(proposal,null,2)+'\n');
writeFileSync(new URL('./replay-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
process.stdout.write(JSON.stringify(report,null,2));
