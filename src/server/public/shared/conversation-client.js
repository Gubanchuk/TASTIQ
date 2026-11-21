import {initialConversationSnapshot,isSelectionDepth} from './conversation-entry.js';
import {questionDraftKey} from '../pick/game/question-drafts.js';
import {createSelectionArchive} from './selection-archive.js';
export const CONVERSATION_KEY='tastiq.conversation.game.v1';
export const conversationStorageKey=domain=>`tastiq.conversation.${domain}.v1`;
const clone=value=>value==null?value:structuredClone(value);
const defaultStorage=()=>{try{return globalThis.localStorage;}catch{return undefined;}};
const cleanDraft=value=>({text:typeof value?.text==='string'?value.text.slice(0,1600):'',selected:Array.isArray(value?.selected)?value.selected.filter(x=>typeof x==='string').slice(0,20):[],kind:['answer','unknown','indifferent','none'].includes(value?.kind)?value.kind:'answer'});
const recoveryOf=value=>typeof value?.error==='string'&&value.error?{error:value.error,retryable:value.retryable!==false,
 id:value.state?.id,revision:value.state?.revision,failedAction:value.state?.failedAction??null}:null;
const pristine=value=>value?.state?.phase==='direction'&&value.state.revision===0&&!value.state.turns.length&&!value.error;

// Transport, snapshots and drafts are independent of DOM. Reload is always a free resume.
export function createConversationClient({fetch:request=globalThis.fetch,storage=defaultStorage(),archiveStorage=storage,onChange=()=>{},mode='guided',uid=null,rememberedExclusions,qualityFeedback,tasteMemory,domain='game',storageKey=conversationStorageKey(domain),endpoint=domain==='game'?'/api/conversation':'/api/media-conversation',localStart=false,selectionId=null,archiveVisit=false,savedSource=null,savedListView=null}={}) {
 if(!['game','film','series','cartoon','anime'].includes(domain)||typeof storageKey!=='string'||!storageKey||domain!=='game'&&storageKey===CONVERSATION_KEY)throw TypeError('Некорректный раздел подбора');
 const allowed=savedSource?new Set(savedSource.ids):null;
 function scoped(value,requestedSource=null){
  const state=value?.state;
  if(!state||(state.domain??'game')!==domain||value.screen?.domain&&value.screen.domain!==domain)return false;
  if(!allowed)return !state.savedSource;
  const source=state.savedSource;
  if(source?.version!==1||source.domain!==domain||!Array.isArray(source.ids)||!source.ids.every(id=>allowed.has(id)))return false;
  const ids=new Set(source.ids);
  if(ids.size!==source.ids.length)return false;
  if(requestedSource){
   const requested=new Set(requestedSource.ids);
   if(source.ids.some(id=>!requested.has(id)))return false;
  }
  return [state.result,value.screen?.result].every(result=>!result||
   [result.top,...(result.alternatives??[])].filter(Boolean).every(card=>ids.has(card.id)));
 }
 let snapshot=null,drafts={},previous=null,correctionCheckpoint=null,persistent=Boolean(storage),generation=0,busy=false,error=null,retryBody=null,retryOptions={};
 try{
  const saved=JSON.parse(storage?.getItem(storageKey)??'null');
  const valid=value=>value?.state?.version===1&&value.screen&&scoped(value);
  if(saved?.version===1){
   if(valid(saved.snapshot)){snapshot=saved.snapshot;if(saved.drafts&&typeof saved.drafts==='object')drafts=saved.drafts;}
   if(valid(saved.previous?.snapshot))previous=saved.previous;
   const checkpoint=saved.correctionCheckpoint;
   if(valid(checkpoint?.snapshot)&&checkpoint.snapshot.screen.type==='result'&&checkpoint.snapshot.state.result&&checkpoint.drafts&&typeof checkpoint.drafts==='object')correctionCheckpoint=checkpoint;
  }
 }catch{/* A broken local draft cannot replace a valid selection. */}
 const archive=createSelectionArchive({storage:archiveStorage});
 const selected=selectionId?archive.get(selectionId,domain):null;
 if(scoped(selected)&&JSON.stringify(snapshot?.state)!==JSON.stringify(selected.state)){if(snapshot)previous={snapshot:clone(snapshot),drafts:clone(drafts),fromArchive:true};snapshot=selected;drafts={};correctionCheckpoint=null;}
 function initialSnapshot(depth,restart=false){
  const prior=snapshot?.state;
  const initial=initialConversationSnapshot({domain,mode:prior?.mode??mode,depth,savedSource:prior?.savedSource??savedSource,requireDirection:true,...(!restart&&prior?{id:prior.id}:{})});
  if(prior?.savedSourceKey)initial.state.savedSourceKey=prior.savedSourceKey;
  return initial;
 }
 if(localStart&&(!snapshot||pristine(snapshot))){
  const initial=initialSnapshot(snapshot?.state.depth);
  // v3 draft keys include question wording and options. Upgrade a pristine entry
  // without hiding words or genre choices written before quick wishes existed.
  if(snapshot?.screen?.question){
   const from=questionDraftKey(snapshot.state,snapshot.screen.question),to=questionDraftKey(initial.state,initial.screen.question);
   if(from!==to&&Object.hasOwn(drafts,from)&&!Object.hasOwn(drafts,to)){
    const options=new Set(initial.screen.question.options.map(option=>option.id));
    const draft=cleanDraft(drafts[from]);drafts[to]={...draft,selected:draft.selected.filter(id=>options.has(id))};
   }
  }
  snapshot=initial;
 }
 error=recoveryOf(snapshot)?.error??null;
 if(error&&snapshot.retryable!==false)retryBody={state:clone(snapshot.state),action:{type:'retry'},...(uid?{uid}:{})};
 let lastArchived=null;
 const save=()=>{
  // The library search and aliases stay on the device. Requests send just the state.
  if(snapshot&&savedListView)snapshot.savedListView=savedListView;
  if(snapshot!==lastArchived){archive.capture(snapshot);lastArchived=snapshot;}
  try{if(!storage)throw Error();storage.setItem(storageKey,JSON.stringify({version:1,snapshot,drafts,previous,correctionCheckpoint}));}catch{persistent=false;}
 };
 const notify=()=>onChange(api);
 async function execute(body,{reset=false,restoredDrafts=null,clearPrevious=false,resumeFailure=null}={}) {
  if(domain!=='game')body={...body,domain};
  if(typeof rememberedExclusions==='function'&&!Object.hasOwn(body,'rememberedExclusions'))body={...body,rememberedExclusions:clone(rememberedExclusions())};
  // A transport retry repeats its action and exclusions. Taste permissions
  // and review text are reread even if the previous request never got a reply.
  retryBody=clone(body);
  if(typeof tasteMemory==='function')body={...body,tasteMemory:clone(tasteMemory())};
  if(typeof qualityFeedback==='function'){
   // A review can be switched off between a network failure and its retry.
   const rows=qualityFeedback();
   if(rows?.length)body={...body,qualityFeedback:clone(rows)};
   else if(Object.hasOwn(body,'qualityFeedback')){body={...body};delete body.qualityFeedback;}
  }
  const ticket=++generation,base=clone(body.state);busy=true;error=null;retryOptions={reset,restoredDrafts:clone(restoredDrafts),clearPrevious,resumeFailure:clone(resumeFailure)};notify();
  try {
   const response=await request(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const data=await response.json().catch(()=>{throw Error('Сервер не ответил. Попробуй ещё раз.');});if(ticket!==generation)return null;
   if(!data?.state||!data?.screen)throw Error(data?.error||'Не удалось получить ответ. Попробуй ещё раз.');
   if(!scoped(data,base?.savedSource)||base?.savedSourceKey&&!data.state.savedSourceKey)throw Error(allowed?'Ответ не совпадает с сохранённым списком. Твой подбор сохранён.':'Ответ относится к другому разделу. Твой подбор сохранён.');
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
  get snapshot(){return clone(snapshot);},get busy(){return busy;},get error(){return error;},get persistent(){return persistent;},get archivePersistent(){return archive.persistent;},
  get needsDepth(){return Boolean(pristine(snapshot)&&!isSelectionDepth(snapshot.state.depth));},
  chooseDepth(depth,{restart=false}={}){
   if(!localStart||busy||!isSelectionDepth(depth)||(!restart&&!pristine(snapshot)))return false;
   if(restart&&snapshot){previous={snapshot:clone(snapshot),drafts:clone(drafts)};drafts={};correctionCheckpoint=null;}
   snapshot=initialSnapshot(depth,restart);
   generation++;error=null;retryBody=null;save();notify();return true;
  },
  get canRestoreCorrection(){return Boolean(correctionCheckpoint&&correctionCheckpoint.snapshot.state.id===snapshot?.state?.id&&correctionCheckpoint.snapshot.state.revision!==snapshot?.state?.revision);},
  restoreCorrection(){if(!api.canRestoreCorrection||busy)return false;generation++;snapshot=clone(correctionCheckpoint.snapshot);drafts={...clone(correctionCheckpoint.drafts),...drafts};correctionCheckpoint=null;error=snapshot.error??null;retryBody=null;save();notify();return true;},
  get canRestorePrevious(){return Boolean(previous&&(previous.fromArchive||previous.snapshot.state.id!==snapshot?.state?.id));},
  draft(key){return cleanDraft(drafts[key]);},
  saveDraft(key,value){drafts[key]=cleanDraft(value);save();},
  start(){
   const archivedResult=(selected||archiveVisit)&&snapshot?.state.phase==='result'&&snapshot.screen?.type==='result';
   if(localStart&&(pristine(snapshot)||archivedResult)){save();notify();return Promise.resolve(clone(snapshot));}
   return execute({...(snapshot?{state:clone(snapshot.state)}:{mode:mode==='free'?'free':'guided'}),...(uid?{uid}:{})},{resumeFailure:recoveryOf(snapshot)});
  },
  send(action){if(action.type==='correct'&&snapshot?.state?.result){correctionCheckpoint={snapshot:clone(snapshot),drafts:clone(drafts)};delete correctionCheckpoint.snapshot.error;delete correctionCheckpoint.snapshot.retryable;correctionCheckpoint.snapshot.state.failedAction=null;save();}if(action.type==='restart'&&localStart)action={...action,requireDirection:true};if(action.type==='restart'&&snapshot){previous={snapshot:clone(snapshot),drafts:clone(drafts)};save();}return execute({...(snapshot?{state:clone(snapshot.state)}:{}),action:clone(action),...(uid?{uid}:{})},{reset:action.type==='restart'});},
  retry(){if(error&&snapshot?.retryable===false&&snapshot.error===error)return Promise.resolve(null);return retryBody?execute(clone(retryBody),retryOptions):api.send({type:'retry'});},
  restorePrevious(){return previous?execute({state:clone(previous.snapshot.state),...(uid?{uid}:{})},{reset:true,restoredDrafts:clone(previous.drafts??{}),clearPrevious:true,resumeFailure:recoveryOf(previous.snapshot)}):Promise.resolve(null);},
  invalidate(){generation++;busy=false;error=null;notify();},
 };
 return api;
}
