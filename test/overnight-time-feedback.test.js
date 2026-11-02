import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeedbackStore,publicFeedback} from '../src/server/public/shared/evening-feedback.js';
const result={top:{id:'one',name:'One'},alternatives:[{id:'two',name:'Two'}]};
function store(){let seq=0;const map=new Map();return createFeedbackStore({storage:{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},locks:{request:async(_,fn)=>fn()},id:()=>`time-${++seq}`,send:async()=>({ok:false})});}
function state(minutes=30){const quote=`Сегодня есть ${minutes} минут: частная формулировка`;
 return {domain:'game',platform:'windows',situation:{company:'solo',note:'Одно и то же сегодняшнее желание'},answers:{},preferences:[],corrections:[],stops:[],session:{minutes},
  conversation:{sessionTime:{minutes,sourceId:'dialogue:1',quote},turns:[{id:'dialogue:1',answer:quote,superseded:false}]}};
}
test('validated conversation session minutes reach evening context without leaking their quote',async()=>{
 const feedback=store(),s=state(30),run=await feedback.observe('dialogue',s,result);
 assert.equal(run.context.minutes,30);
 const publicRun=publicFeedback(run);assert.equal(publicRun.context.minutes,30);
 assert.doesNotMatch(JSON.stringify(publicRun),/частная формулировка|sessionTime|sourceId/);
});
test('different current time budgets separate evenings and cannot inherit prior choice',async()=>{
 const feedback=store(),a=await feedback.observe('dialogue',state(30),result);
 await feedback.update(a.id,'one',{type:'choose',value:true});
 const b=await feedback.observe('dialogue',state(60),result,{inheritFrom:a.id,carryIntoExisting:true,retainedIds:['one','two']});
 assert.notEqual(a.id,b.id);assert.equal(b.context.minutes,60);assert.deepEqual(b.responses,[]);
});
test('stale, unquoted and mismatched direct minute projections do not manufacture an evening budget',async()=>{
 for(const alter of [s=>delete s.conversation.sessionTime,s=>s.conversation.turns[0].superseded=true,s=>s.conversation.sessionTime.quote='Invented quote',s=>s.session.minutes=45]){
  const feedback=store(),s=state(30);alter(s);const run=await feedback.observe('dialogue',s,result);assert.equal(run.context.minutes,null);
 }
});
test('legacy confirmed intent time remains supported independently',async()=>{
 const feedback=store(),s={domain:'game',platform:'windows',situation:{note:'Сегодня есть45мин',company:'solo',intent:{source:'confirmed',sourceText:'Сегодня есть45мин',time:{minutes:45,evidence:'45мин'}}},answers:{},stops:[]};
 const run=await feedback.observe('legacy',s,result);assert.equal(run.context.minutes,45);
});
