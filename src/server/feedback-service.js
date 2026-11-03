import {normalizeFeedback,publicFeedback} from './public/shared/evening-feedback.js';
const invalid=()=>Object.assign(Error('Некорректный отзыв о подборе'),{status:400});
export function createFeedbackService({catalogs,repository,production=process.env.VERCEL==='1',journal=()=>{}}){
 return async(body,{qa=false,namespace}={})=>{
  const run=normalizeFeedback(body?.run),catalog=run&&catalogs[run.domain];
  if(!run||!catalog||run.cards.some(c=>!catalog.byId.has(c.id))||[...run.context.wants,...run.context.avoids,...run.context.stops].some(f=>!catalog.dict.featureById.has(f)))throw invalid();
  const data=publicFeedback(run);
  data.cards=data.cards.map(c=>({...c,title:String(catalog.byId.get(c.id).ru??catalog.byId.get(c.id).name).slice(0,200)}));
  if(namespace&&(!qa||!/^qa:[a-zA-Z0-9_-]{1,64}$/.test(namespace)))throw invalid();
  if(qa&&!namespace)return {ok:true,id:run.id,revision:run.revision};
  if(repository.configured!==false)return namespace?repository.save(data,{namespace}):repository.save(data);
  if(production||namespace)throw Object.assign(Error('Постоянное хранилище отзывов пока недоступно. Отзыв сохранён на устройстве.'),{status:503});
  journal({at:new Date().toISOString(),event:'quality-feedback',data});
  return {ok:true,id:run.id,revision:run.revision};
 };
}
