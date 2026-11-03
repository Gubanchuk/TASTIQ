import {createHmac,timingSafeEqual} from 'node:crypto';
const unavailable=()=>Object.assign(Error('База отзывов временно недоступна. Отзыв сохранён на устройстве и будет отправлен позже.'),{status:503});
export function feedbackVerificationNamespace({run,signature,secret=process.env.FEEDBACK_DATABASE_SECRET}={}){
 if(!secret||typeof run!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(run)||typeof signature!=='string'||!/^[a-f0-9]{64}$/.test(signature))return undefined;
 const expected=createHmac('sha256',secret).update('tastiq-feedback-probe:'+run).digest();
 return timingSafeEqual(expected,Buffer.from(signature,'hex'))?'qa:'+run:undefined;
}
export function createFeedbackRepository({url=process.env.FEEDBACK_DATABASE_URL,secret=process.env.FEEDBACK_DATABASE_SECRET,fetch:request=globalThis.fetch}={}){
 const configured=Boolean(url&&secret);
 return {configured,async save(run,{namespace='production'}={}){
  if(!configured)throw unavailable();
  let response,data;
  try{
   const endpoint=new URL('/functions/v1/tastiq-feedback',url);if(endpoint.protocol!=='https:')throw unavailable();
   response=await request(endpoint.href,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${secret}`},body:JSON.stringify({p_payload:run,p_namespace:namespace}),signal:AbortSignal.timeout(8000)});
   data=await response.json();
  }catch{throw unavailable();}
  if(response.status===409||data?.code==='23505')throw Object.assign(Error('Эта версия отзыва уже сохранена с другим содержимым. Обнови отзыв.'),{status:409});
  if(!response.ok||data?.ok!==true||data.id!==run.id||data.revision!==run.revision)throw unavailable();
  return {ok:true,id:run.id,revision:run.revision};
 }};
}
