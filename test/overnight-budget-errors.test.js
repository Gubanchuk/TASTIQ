import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join,resolve,sep} from 'node:path';
import {PaidBudget} from '../src/stand/paid-budget.js';
import {budgetTransport} from '../src/ai/budget-transport.js';
import {aiPick} from '../src/ai/pick.js';
import {aiConversation} from '../src/ai/conversation.js';
import {aiIntent} from '../src/ai/intent.js';
import {newConversation,answerConversation} from '../src/core/conversation.js';
import {createConversationService} from '../src/server/conversation-service.js';
import {initialState} from '../src/core/dialogue.js';
import {fixtureCatalog} from './fixture.js';

const request={model:'gpt-6.1-sol',max_output_tokens:100,input:'budget error regression'};
function setup(t,options={}) {
 const root=resolve('.'),dir=mkdtempSync(join(root,'.tastiq-night-budget-'));
 const ledger=new PaidBudget(dir,{ceiling:5,baselineUpper:0,baselineCalls:0,roundCap:2,...options});
 t.after(()=>{ledger.close();assert.ok(dir.startsWith(root+sep));rmSync(dir,{recursive:true,force:true});});
 return ledger;
}
test('known batch budget refusal is non-retryable and never dispatches or reserves spend',async t=>{
 const ledger=setup(t);let dispatched=0;
 const api=budgetTransport({ledger,batchId:'night-budget-refusal',cap:0.000001,transport:async()=>{dispatched++;assert.fail('No paid request expected');}});
 await assert.rejects(api(request),error=>{assert.equal(error.code,'AI_BUDGET_LIMIT');assert.equal(error.retryable,false);assert.equal(error.notRequested,true);assert.match(error.publicMessage,/лимит/);return true;});
 assert.equal(dispatched,0);assert.equal(ledger.snapshot().calls.length,0);
});
test('known cumulative reserve refusal is explained without opening an uncertain receipt',async t=>{
 const ledger=setup(t,{roundCap:0.000001});let dispatched=0;
 await assert.rejects(ledger.api('refuse',async()=>{dispatched++;})(request),error=>{assert.equal(error.code,'AI_BUDGET_LIMIT');assert.equal(error.notRequested,true);assert.equal(error.retryable,false);return true;});
 assert.equal(dispatched,0);assert.equal(ledger.snapshot().uncertainReserve,0);
});
test('uncertain transport still stops spending and retains its full reservation',async t=>{
 const ledger=setup(t);let dispatched=0;
 await assert.rejects(ledger.api('lost',async()=>{dispatched++;throw Error('private transport details');})(request),error=>{assert.equal(error.code,'AI_SPEND_UNCERTAIN');assert.equal(error.notRequested,false);assert.equal(error.retryable,false);assert.doesNotMatch(error.publicMessage,/private/);return true;});
 const reserve=ledger.snapshot().uncertainReserve;assert.ok(reserve>0);
 await assert.rejects(ledger.api('blocked',async()=>{dispatched++;})(request),error=>{assert.equal(error.code,'AI_SPEND_UNCERTAIN');assert.equal(error.notRequested,true);return true;});
 assert.equal(dispatched,1);assert.equal(ledger.snapshot().uncertainReserve,reserve);
});
test('planner, picker and controller preserve safe non-retryable pre-dispatch budget status',async t=>{
 const ledger=setup(t),catalog=fixtureCatalog(),catalogs={game:catalog};let dispatched=0;
 const api=budgetTransport({ledger,batchId:'night-ui-budget',cap:0.000001,transport:async()=>{dispatched++;assert.fail('No API expected');}});
 const planned=await aiConversation(catalog,newConversation(),{api});
 assert.match(planned.error,/лимит/);assert.equal(planned.retryable,false);assert.equal(planned.notRequested,true);
 const picked=await aiPick(catalogs,{...initialState(),domain:'game'},{api});
 assert.match(picked.error,/лимит/);assert.equal(picked.retryable,false);assert.equal(picked.notRequested,true);
 const interpreted=await aiIntent(catalog,'Сегодня хочу спокойную игру',{api});
 assert.match(interpreted.error,/лимит/);assert.equal(interpreted.retryable,false);assert.equal(interpreted.notRequested,true);
 let s=newConversation();for(const id of ['rpg','windows','solo'])s=answerConversation(s,{type:'answer',questionId:s.question.id,selected:[id],kind:'answer'});
 const out=await createConversationService({catalogs,api})({state:s,action:{type:'retry'}});
 assert.equal(out.retryable,false);assert.match(out.error,/лимит/);assert.equal(out.state.turns.length,3);assert.equal(dispatched,0);assert.equal(ledger.snapshot().calls.length,0);
});
