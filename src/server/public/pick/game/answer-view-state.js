export function chooseNeutral(draft,kind) {
 return {...draft,kind:draft.kind===kind?'answer':kind};
}
export function chooseOption(draft,id,multiple) {
 const selected=draft.kind==='answer'?draft.selected:[];
 return {...draft,kind:'answer',selected:selected.includes(id)?selected.filter(x=>x!==id):multiple?[...selected,id]:[id]};
}
export function answerAction(question,draft) {
 if(question.allowText===false){if(!draft.selected.length)return null;return {type:'answer',questionId:question.id,selected:draft.selected,text:'',kind:'answer'};}
 const kind=draft.kind!=='answer'?draft.kind:draft.selected.length||draft.text.trim()?'answer':'unknown';
 return {type:'answer',questionId:question.id,selected:kind==='answer'?draft.selected:[],text:kind==='answer'?draft.text:'',kind};
}
export const hasPendingAnswer=draft=>Boolean(draft.text.trim()||draft.selected.length||draft.kind!=='answer');
export function keyboardSubmit({key,control=false,busy=false,composing=false,modified=false,form=null,prevented=false,dialog=false}={}) {
 if(key!=='Enter'||busy||composing||prevented||dialog||control&&!modified)return null;
 return modified&&form?form:'primary';
}
const contextBase=context=>JSON.stringify([context.platform??null,context.company??null,context.partySize??null]);
export const contextDraftText=(context,values,dialogueId)=>JSON.stringify({dialogueId,base:contextBase(context),values});
export function contextEditorValues(context,text,dialogueId) {
 try {
  const draft=JSON.parse(text),v=draft.values;
  if(typeof dialogueId!=='string'||draft.dialogueId!==dialogueId||draft.base!==contextBase(context)
   ||!['windows','mac','linux','deck'].includes(v?.platform)||!['solo','friend','group'].includes(v.company)
   ||!['2','3','4','5+'].includes(v.partySize))return {...context};
  return {platform:v.platform,company:v.company,partySize:v.partySize};
 }catch{return {...context};}
}
