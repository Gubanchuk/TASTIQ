import {feedbackTransactions} from './evening-storage.js';
const key='tastiq.qa.run',valid=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(value);
const safeSession=()=>{try{return globalThis.sessionStorage;}catch{return undefined;}};
export function createQaSession({search=globalThis.location?.search??'',session=safeSession(),origin=globalThis.location?.origin??'http://localhost',fetcher=globalThis.fetch,onMeter=value=>console.info('TASTIQ_QA_METER '+JSON.stringify(value)),indexedDB=globalThis.indexedDB}={}){
 const incoming=new URLSearchParams(search).get('qa_run');let run=null;
 try{if(incoming==='off')session?.removeItem(key);else if(valid(incoming))session?.setItem(key,incoming);run=valid(incoming)&&incoming!=='off'?incoming:incoming==='off'?null:session?.getItem(key);}catch{run=valid(incoming)&&incoming!=='off'?incoming:null;}
 if(!valid(run))run=null;
 const prefix=run?`tastiq.qa.${run}:`:'';
 const storage=raw=>{
  if(!run||!raw)return raw;
  const keys=()=>Array.from({length:raw.length},(_,i)=>raw.key(i)).filter(k=>typeof k==='string'&&k.startsWith(prefix));
  return{getItem:k=>raw.getItem(prefix+k),setItem:(k,v)=>raw.setItem(prefix+k,v),removeItem:k=>raw.removeItem(prefix+k),key:i=>keys()[i]?.slice(prefix.length)??null,get length(){return keys().length;}};
 };
 const feedbackOptions=raw=>run?{transaction:feedbackTransactions(raw,indexedDB,`tastiq-qa-${run}`)}:{};
 const fetch=async(input,init)=>{
  const url=new URL(input,origin);if(!run||url.origin!==origin||!url.pathname.startsWith('/api/'))return fetcher(input,init);
  const headers=new Headers(init?.headers);headers.set('x-tastiq-qa-run',run);headers.set('x-tastiq-max-reserve-usd','0.25');
  const response=await fetcher(input,{...init,headers});
  try{const data=await response.clone().json();let action='resume';try{action=JSON.parse(init?.body??'{}').action?.type??'resume';}catch{}
   onMeter({path:url.pathname,action,status:response.status,stateId:data.state?.id??null,billing:data.qaBilling??null});
  }catch{/* malformed transport is handled by the existing caller; no content is logged */}
  return response;
 };
 return{run,storage,fetch,feedbackOptions};
}
const current=createQaSession();
export const qaStorage=raw=>current.storage(raw);
export const qaFeedbackOptions=raw=>current.feedbackOptions(raw);
export const qaFetch=(input,init)=>current.fetch(input,init);
// Legacy has separate raw stores. QA stays on the isolated modern surfaces.
export const qaLegacyTarget=current.run?'/library/':null;
