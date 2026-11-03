export const CONVERSATION_KEY='tastiq.conversation.game.v1';
export const conversationStorageKey=domain=>`tastiq.conversation.${domain}.v1`;
const clone=value=>value==null?value:structuredClone(value);
const defaultStorage=()=>{try{return globalThis.localStorage;}catch{return undefined;}};
const cleanDraft=value=>({text:typeof value?.text==='string'?value.text.slice(0,1600):'',selected:Array.isArray(value?.selected)?value.selected.filter(x=>typeof x==='string').slice(0,20):[],kind:['answer','unknown','indifferent','none'].includes(value?.kind)?value.kind:'answer'});
const recoveryOf=value=>typeof value?.error==='string'&&value.error?{error:value.error,retryable:value.retryable!==false,
 id:value.state?.id,revision:value.state?.revision,failedAction:value.state?.failedAction??null}:null;

// Transport, snapshots and drafts are independent of DOM. Reload is always a free resume.
export function createConversationClient({fetch:request=globalThis.fetch,storage=defaultStorage(),onChange=()=>{},mode='guided',uid=null,rememberedExclusions,domain='game',storageKey=conversationStorageKey(domain),endpoint=domain==='game'?'/api/conversation':'/api/media-conversation'}={}) {
 if(!['game','film','series','cartoon'].includes(domain)||typeof storageKey!=='string'||!storageKey||domain!=='game'&&storageKey===CONVERSATION_KEY)throw TypeError('Некорректный раздел подбора');
 const scoped=state=>state&&(domain==='game'?state.domain==null||state.domain==='game':state.domain===domain);
 let snapshot=null,drafts={},previous=null,correctionCheckpoint=null,persistent=Boolean(storage),generation=0,busy=false,error=null,retryBody=null,retryOptions={};
 try {const saved=JSON.parse(storage?.getItem(storageKey)??'null');if(saved?.version===1){if(saved.snapshot?.state?.version===1&&saved.snapshot?.screen&&scoped(saved.snapshot.state)){snapshot=saved.snapshot;if(saved.drafts&&typeof saved.drafts==='object')drafts=saved.drafts;}if(saved.previous?.snapshot?.state?.version===1&&saved.previous.snapshot.screen&&scoped(saved.previous.snapshot.state))previous=saved.previous;}}catch { /* invalid storage is not trusted */ }
 try {const saved=JSON.parse(storage?.getItem(storageKey)??'null');if(saved?.version===1&&saved.correctionCheckpoint?.snapshot?.state?.version===1&&saved.correctionCheckpoint.snapshot.screen?.type==='result'&&saved.correctionCheckpoint.snapshot.state.result&&scoped(saved.correctionCheckpoint.snapshot.state)&&saved.correctionCheckpoint.drafts&&typeof saved.correctionCheckpoint.drafts==='object')correctionCheckpoint=saved.correctionCheckpoint;}catch {}
 error=recoveryOf(snapshot)?.error??null;
 if(error&&snapshot.retryable!==false)retryBody={state:clone(snapshot.state),action:{type:'retry'},...(uid?{uid}:{})};
 const save=()=>{try{if(!storage)throw Error();storage.setItem(storageKey,JSON.stringify({version:1,snapshot,drafts,previous,correctionCheckpoint}));}catch{persistent=false;}};
 const notify=()=>onChange(api);
 async function execute(body,{reset=false,restoredDrafts=null,clearPrevious=false,resumeFailure=null}={}) {
  if(domain!=='game')body={...body,domain};
  if(typeof rememberedExclusions==='function'&&!Object.hasOwn(body,'rememberedExclusions'))body={...body,rememberedExclusions:clone(rememberedExclusions())};
  const ticket=++generation,base=clone(body.state);busy=true;error=null;retryBody=clone(body);retryOptions={reset,restoredDrafts:clone(restoredDrafts),clearPrevious,resumeFailure:clone(resumeFailure)};notify();
  try {
   const response=await request(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const data=await response.json();if(ticket!==generation)return null;
   if(!data?.state||!data?.screen)throw Error(data?.error||'Не удалось получить ответ. Попробуй ещё раз.');
   if(!scoped(data.state))throw Error('Ответ относится к другому разделу. Твой подбор сохранён.');
   if(!reset&&base&&(data.state.id!==base.id||data.state.revision<base.revision))throw Error('Ответ устарел. Повтори действие.');
   // Free resume does not finish a previously rejected interpretation. Keep its explicit
   // recovery, including a nonretryable budget failure, only on that same accepted state.
   const resumedFailure=!body.action&&!data.error&&resumeFailure&&data.state.id===resumeFailure.id
    &&data.state.revision===resumeFailure.revision&&(data.state.failedAction??null)===resumeFailure.failedAction;
   if(resumedFailure){data.error=resumeFailure.error;data.retryable=resumeFailure.retryable;}
   snapshot=clone(data);if(reset)drafts=clone(restoredDrafts??{});if(clearPrevious&&(!data.error||resumedFailure))previous=null;error=data.error||(!response.ok?'Не удалось получить ответ. Попробуй ещё раз.':null);
   // A server error can preserve an accepted revision. Retry that state explicitly.
   if(data.error&&data.retryable){retryBody={state:clone(data.state),action:{type:'retry'},...(uid?{uid}:{})};retryOptions={};}
   else if(data.error&&data.retryable===false)retryBody=null;
   else if(!error)retryBody=null;
   save();return clone(data);
  } catch(cause) {if(ticket===generation)error=cause?.name==='TypeError'?'Нет связи с сервером. Ответ сохранён. Попробуй ещё раз.':cause?.message||'Нет связи с сервером. Ответ сохранён. Попробуй ещё раз.';return null;}
  finally {if(ticket===generation){busy=false;notify();}}
 }
 const api={
  get state(){return clone(snapshot?.state??null);},get screen(){return clone(snapshot?.screen??null);},
  get snapshot(){return clone(snapshot);},get busy(){return busy;},get error(){return error;},get persistent(){return persistent;},
  get canRestoreCorrection(){return Boolean(correctionCheckpoint&&correctionCheckpoint.snapshot.state.id===snapshot?.state?.id&&correctionCheckpoint.snapshot.state.revision!==snapshot?.state?.revision);},
  restoreCorrection(){if(!api.canRestoreCorrection||busy)return false;generation++;snapshot=clone(correctionCheckpoint.snapshot);drafts={...clone(correctionCheckpoint.drafts),...drafts};correctionCheckpoint=null;error=snapshot.error??null;retryBody=null;save();notify();return true;},
  get canRestorePrevious(){return Boolean(previous&&previous.snapshot.state.id!==snapshot?.state?.id);},
  draft(key){return cleanDraft(drafts[key]);},
  saveDraft(key,value){drafts[key]=cleanDraft(value);save();},
  start(){return execute({...(snapshot?{state:clone(snapshot.state)}:{mode:mode==='free'?'free':'guided'}),...(uid?{uid}:{})},{resumeFailure:recoveryOf(snapshot)});},
  send(action){if(action.type==='correct'&&snapshot?.state?.result){correctionCheckpoint={snapshot:clone(snapshot),drafts:clone(drafts)};delete correctionCheckpoint.snapshot.error;delete correctionCheckpoint.snapshot.retryable;correctionCheckpoint.snapshot.state.failedAction=null;save();}if(action.type==='restart'&&snapshot){previous={snapshot:clone(snapshot),drafts:clone(drafts)};save();}return execute({...(snapshot?{state:clone(snapshot.state)}:{}),action:clone(action),...(uid?{uid}:{})},{reset:action.type==='restart'});},
  retry(){if(error&&snapshot?.retryable===false&&snapshot.error===error)return Promise.resolve(null);return retryBody?execute(clone(retryBody),retryOptions):api.send({type:'retry'});},
  restorePrevious(){return previous?execute({state:clone(previous.snapshot.state),...(uid?{uid}:{})},{reset:true,restoredDrafts:clone(previous.drafts??{}),clearPrevious:true,resumeFailure:recoveryOf(previous.snapshot)}):Promise.resolve(null);},
  invalidate(){generation++;busy=false;error=null;notify();},
 };
 return api;
}
