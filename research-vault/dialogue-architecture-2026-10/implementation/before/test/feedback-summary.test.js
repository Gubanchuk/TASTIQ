import test from 'node:test';
import assert from 'node:assert/strict';
import { createFeedbackStore, publicFeedback } from '../src/server/public/shared/evening-feedback.js';
import { summarizeFeedback } from '../src/stand/feedback-summary.js';
const state={domain:'game',situation:{},answers:{}};
const result={top:{id:'1',name:'One'},alternatives:[{id:'2',name:'Two'}]};
const event=(run)=>({event:'quality-feedback',data:publicFeedback(run)});
test('latest revisions and distinct dialogues are counted; unknown and not-started are not rejection',async()=>{
 let seq=0;const s=createFeedbackStore({id:()=>`r${++seq}`,send:async()=>{},now:()=> '2026-10-31T12:00:00Z'});
 const a=await s.observe('d1',state,result), logs=[event(a)];
 await s.update(a.id,'1',{type:'fit',value:'unknown'});logs.push(event(s.get(a.id)));
 await s.update(a.id,'2',{type:'fit',value:'conditional'});
 await s.update(a.id,'2',{type:'choose',value:true});await s.update(a.id,'2',{type:'outcome',value:'not_started'});
 const newest=event(s.get(a.id));logs.push(newest,newest,event(a));
 const b=await s.observe('d1',state,{top:{id:'3',name:'Three'},alternatives:[]});logs.push(event(b));
 const summary=summarizeFeedback(logs);
 assert.equal(summary.runs,2);assert.equal(summary.dialogues,1);assert.equal(summary.fit.unknown,1);assert.equal(summary.fit.conditional,1);
 assert.equal(summary.fit.unreviewed,1);assert.equal(summary.fit.reject,0);assert.equal(summary.fit.decidable,1);
 assert.equal(summary.choice.runs,1);assert.equal(summary.started.runs,0);assert.equal(summary.outcomes.not_started,1);
 assert.equal(summary.afterUse.positiveRate,null);assert.equal(summary.duplicates,2);
});
test('same revision with conflicting answers is excluded instead of arbitrarily winning by arrival order',async()=>{
 const s=createFeedbackStore({id:()=> 'r1',send:async()=>{}}),r=await s.observe('d1',state,result);
 await s.update(r.id,'1',{type:'fit',value:'accept'});const a=event(s.get(r.id)),b=structuredClone(a);b.data.responses[0].fit='reject';
 const summary=summarizeFeedback([a,b]);assert.equal(summary.conflicts,1);assert.equal(summary.runs,0);assert.equal(summary.fit.strictAcceptance,null);
});
