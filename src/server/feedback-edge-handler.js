import {normalizeFeedback,publicFeedback} from './public/shared/evening-feedback.js';
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const unavailable=()=>reply({error:'Feedback storage temporarily unavailable'},503);
const equalHash=(a,b)=>{if(a.length!==b.length)return false;let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a.charCodeAt(i)^b.charCodeAt(i);return mismatch===0;};
async function readBounded(request){
 if(Number(request.headers.get('content-length'))>262144)throw Error('large');
 const reader=request.body?.getReader();if(!reader)return '';
 const chunks=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>262144){await reader.cancel();throw Error('large');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return new TextDecoder().decode(bytes);
}
// This capability can only append TASTIQ feedback. It cannot select arbitrary tables or execute SQL.
export function createFeedbackEdgeHandler({tokenHash,projectUrl,serviceKey,fetch:request=globalThis.fetch}={}){
 return async incoming=>{
  if(incoming.method!=='POST')return reply({error:'Method not allowed'},405);
  const authorization=incoming.headers.get('authorization')??'',token=authorization.startsWith('Bearer ')?authorization.slice(7):'';
  if(!/^[a-f0-9]{64}$/.test(tokenHash??'')||token.length<32||token.length>256)return reply({error:'Unauthorized'},401);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
  const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  if(!equalHash(hash,tokenHash))return reply({error:'Unauthorized'},401);
  let raw;try{raw=await readBounded(incoming);}catch{return reply({error:'Feedback payload too large'},413);}
  let body;try{body=JSON.parse(raw);}catch{return reply({error:'Invalid JSON'},400);}
  const run=normalizeFeedback(body?.p_payload),namespace=body?.p_namespace??'production';
  if(!run||typeof namespace!=='string'||namespace!=='production'&&!/^qa:[a-zA-Z0-9_-]{1,64}$/.test(namespace))return reply({error:'Invalid feedback'},400);
  if(!projectUrl||!serviceKey)return unavailable();
  try{
   const response=await request(new URL('/rest/v1/rpc/tastiq_record_feedback',projectUrl).href,{method:'POST',headers:{'Content-Type':'application/json',apikey:serviceKey,Authorization:`Bearer ${serviceKey}`},body:JSON.stringify({p_payload:publicFeedback(run),p_namespace:namespace}),signal:AbortSignal.timeout(6000)});
   if(response.status===409)return reply({error:'Feedback revision conflict'},409);
   if(!response.ok)return unavailable();
   const receipt=await response.json();
   if(receipt?.ok!==true||receipt.id!==run.id||receipt.revision!==run.revision)return unavailable();
   return reply({ok:true,id:run.id,revision:run.revision});
  }catch{return unavailable();}
 };
}
