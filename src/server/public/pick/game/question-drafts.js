const turnsOf=state=>Array.isArray(state?.turns)?state.turns:[];
const fingerprint=question=>JSON.stringify([
 question?.id??'',question?.title??'',question?.multiple!==false,question?.allowText!==false,
 (Array.isArray(question?.options)?question.options:[]).filter(option=>option&&typeof option.id==='string').map(option=>[option.id,option.label]).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0),
]);
export function questionDraftKey(state,question) {
 const turns=turnsOf(state),correctionIndex=turns.findLastIndex(turn=>!turn?.superseded&&typeof turn?.question?.id==='string'&&turn.question.id.startsWith('correction:'));
 const epoch=correctionIndex<0?null:turns[correctionIndex].id??turns[correctionIndex].question.id;
 const semantic=fingerprint(question),occurrence=turns.slice(correctionIndex+1).filter(turn=>turn?.question&&fingerprint(turn.question)===semantic).length;
 return `question.v3:${JSON.stringify([state.id,epoch,semantic,occurrence])}`;
}
export const legacyQuestionDraftKeyV2=(state,question)=>`question.v2:${JSON.stringify([state.id,fingerprint(question),turnsOf(state).filter(turn=>turn?.question&&fingerprint(turn.question)===fingerprint(question)).length])}`;
export const questionScreenKey=(state,screen)=>JSON.stringify([state.id,screen.type,screen.type==='question'&&screen.question?questionDraftKey(state,screen.question):null]);

const toDraft=turn=>({text:typeof turn.text==='string'?turn.text:'',selected:(Array.isArray(turn.selected)?turn.selected:[]).map(option=>typeof option==='string'?option:option?.id).filter(id=>typeof id==='string'),kind:['unknown','indifferent','none'].includes(turn.kind)?turn.kind:'answer'});
const hasData=draft=>Boolean(draft?.text?.trim()||draft?.selected?.length||draft?.kind&&draft.kind!=='answer');
const comparable=draft=>JSON.stringify([draft.kind??'answer',(draft.text??'').replace(/\s+/g,' ').trim(),[...new Set(draft.selected??[])].sort()]);

// Legacy keys carry no question wording or occurrence. Migrate an obviously accepted
// answer back to its old instance; preserve ambiguous current words rather than discard them.
export function planLegacyQuestionDraftMigration(state,screen,readDraft) {
 if(!state?.id)return [];
 const writes=new Map(),previous=[],lastById=new Map();
 const put=(key,draft)=>{if(hasData(draft)&&!hasData(readDraft(key)))writes.set(key,structuredClone(draft));};
 const legacyDraft=(v2key,id)=>{const v2=readDraft(v2key);return hasData(v2)?v2:readDraft(id);};
 for(const turn of turnsOf(state)) {
  if(turn?.question?.id&&turn.question.title){
   const priorState={...state,turns:previous},key=questionDraftKey(priorState,turn.question),v2key=legacyQuestionDraftKeyV2(priorState,turn.question),v2=readDraft(v2key);
   put(key,hasData(v2)?v2:toDraft(turn));lastById.set(turn.question.id,{turn,key,v2key});
  }
  previous.push(turn);
 }
 const current=screen?.type==='question'?screen.question:null;
 for(const [id,last] of lastById){
  const legacy=legacyDraft(last.v2key,id);
  if(hasData(legacy)&&(current?.id!==id||comparable(legacy)===comparable(toDraft(last.turn))))put(last.key,legacy);
 }
 if(current){
  const legacy=legacyDraft(legacyQuestionDraftKeyV2(state,current),current.id),last=lastById.get(current.id);
  if(hasData(legacy)){
   if(last&&comparable(legacy)===comparable(toDraft(last.turn)))put(last.key,legacy);
   else put(questionDraftKey(state,current),legacy);
  }
 }
 return [...writes];
}
export function backDraftSeed(question,removedTurn,{hasDraft=false}={}) {
 if(hasDraft||!question?.id||question.id!==removedTurn?.question?.id)return null;
 return toDraft(removedTurn);
}
export function prepareBackDraft(state) {
 const turn=turnsOf(state).at(-1);return turn?{dialogueId:state.id,turn:structuredClone(turn)}:null;
}
export function finishBackDraft(pending,state,screen,{successful=false,error=null,hasDraft=false}={}) {
 if(!pending)return {pending:null,seed:null};
 if(!successful||error)return {pending,seed:null};
 return {pending:null,seed:state?.id===pending.dialogueId&&screen?.type==='question'?backDraftSeed(screen.question,pending.turn,{hasDraft}):null};
}
