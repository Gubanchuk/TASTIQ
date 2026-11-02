import {AsyncLocalStorage} from 'node:async_hooks';
import {createHash} from 'node:crypto';
import {reserveCost,estimateCost} from '../ai/usage.js';
import {BudgetError} from '../ai/budget-error.js';
import {requestResponse} from '../ai/openai.js';
const context=new AsyncLocalStorage();
const runPattern=/^[a-zA-Z0-9_-]{1,64}$/;
export function runQaRequest(req,fn){
 const run=req.headers?.['x-tastiq-qa-run'],limit=Number(req.headers?.['x-tastiq-max-reserve-usd']??0.25);
 return context.run(typeof run==='string'&&runPattern.test(run)?{run,maxReserveUsd:Number.isFinite(limit)&&limit>=0?Math.min(limit,0.25):0,reserved:0,calls:[],uncertain:false}:null,fn);
}
export const isQaRequest=()=>Boolean(context.getStore()?.run);
export function qaReceipt(){const c=context.getStore();return c?structuredClone({run:c.run,maxReserveUsd:c.maxReserveUsd,calls:c.calls}):null;}
// QA can only lower its own request ceiling. Ordinary traffic keeps the same API and policy.
export function observeQaApi(api=requestResponse){return async request=>{
 const c=context.getStore();if(!c)return api(request);
 const reserve=reserveCost(request),row={requestHash:createHash('sha256').update(JSON.stringify(request)).digest('hex'),model:request.model,reserveUsd:reserve,status:'pending'};
 if(c.uncertain)throw new BudgetError('QA usage is uncertain','AI_SPEND_UNCERTAIN');
 if(reserve===null||c.calls.some(call=>!call.notRequested)||c.reserved+reserve>c.maxReserveUsd){c.calls.push({...row,status:'not_requested',notRequested:true,costUsd:0});throw new BudgetError('QA request reserve exceeded','AI_BUDGET_LIMIT');}
 c.reserved+=reserve;c.calls.push(row);
 try{
  const result=await api(request),model=result.model??request.model,cost=estimateCost(result.usage,model);
  Object.assign(row,{responseId:result.id??null,model,status:result.status??'completed',usage:result.usage??null,costUsd:cost});
  if(cost===null||cost>reserve){c.uncertain=true;row.status='uncertain';throw new BudgetError('QA usage requires inspection','AI_SPEND_UNCERTAIN',{notRequested:false});}
  return result;
 }catch(error){
  if(error.notRequested===true)Object.assign(row,{status:'not_requested',notRequested:true,costUsd:0});
  else{c.uncertain=true;row.status='uncertain';row.code=error.code??'transport_unknown';}
  throw error;
 }
};}
