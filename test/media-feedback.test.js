import test from 'node:test';
import assert from 'node:assert/strict';
import {newMediaConversation,answerMediaConversation,mediaConversationToLegacy} from '../src/core/media-conversation.js';
import {createFeedbackStore,normalizeFeedback,publicFeedback} from '../src/server/public/shared/evening-feedback.js';
import {screenFixture} from './fixture.js';
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
const store=saved=>createFeedbackStore({storage:saved,locks:{request:async(_,fn)=>fn()},id:()=>crypto.randomUUID()});

test('media evenings preserve grounded available minutes and the meaning of the viewing context',async()=>{
 for(const domain of ['film','series','cartoon']){
  let s=newMediaConversation({domain,id:`${domain}-one`});
  s=answerMediaConversation(s,{type:'set_context',context:{company:'solo',minutes:45,timeMode:domain==='film'?'runtime':'episode',format:domain==='film'?'movie':'episodic',commitment:'short',onlyEnded:true}});
  const catalog=screenFixture(domain),projection=mediaConversationToLegacy(s,catalog.dict,catalog),saved=storage(),feedback=store(saved);
  const run=await feedback.observe(s.id,projection,{top:{id:'t1',name:'Title'}});
  assert.ok(run);assert.equal(run.domain,domain);assert.equal(run.context.minutes,45);assert.equal(run.context.timeMode,domain==='film'?'runtime':'episode');assert.equal(run.context.format,domain==='film'?'movie':'episodic');assert.equal(run.context.commitment,'short');assert.equal(run.context.onlyEnded,true);
  assert.deepEqual(normalizeFeedback(run).context,run.context);assert.equal(publicFeedback(run).context.timeMode,run.context.timeMode);
  assert.equal(store(saved).get(run.id).context.minutes,45);
  const invalid={...run,context:{...run.context,format:'game'}};assert.equal(normalizeFeedback(invalid),null);
 }
});
