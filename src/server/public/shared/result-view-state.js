// Result redraws preserve unsubmitted words and open evidence without changing the sent AI request.
export function createResultViewState(){
 const drafts=new Map();
 const value=(key,fallback='')=>drafts.has(key)?drafts.get(key):fallback;
 function remember(key,text){if(key)drafts.set(key,String(text??''));}
 function capture(root,active){
  const input=root.querySelector('#ai-wish');
  const key=root.querySelector('[data-result-owner]')?.dataset.resultOwner??input?.dataset.resultKey??null;
  if(input)remember(key,input.value);
  return {key,text:input?.value??null,start:input?.selectionStart,end:input?.selectionEnd,focused:Boolean(input&&active===input),open:[...root.querySelectorAll('details[data-result-disclosure]')].filter(el=>el.open).map(el=>el.dataset.resultDisclosure)};
 }
 function restore(snapshot,root){
  if(!snapshot)return;
  const input=root.querySelector('#ai-wish');
  const key=root.querySelector('[data-result-owner]')?.dataset.resultOwner??input?.dataset.resultKey??null;
  if(key!==snapshot.key)return;
  if(input&&snapshot.text!==null){
   input.value=value(key,snapshot.text);
   if(snapshot.focused)input.focus({preventScroll:true});
   if(Number.isInteger(snapshot.start)&&Number.isInteger(snapshot.end))try{input.setSelectionRange(snapshot.start,snapshot.end);}catch{/* Some input types have no caret range. */}
  }
  const opened=new Set(snapshot.open);
  for(const el of root.querySelectorAll('details[data-result-disclosure]'))el.open=opened.has(el.dataset.resultDisclosure);
 }
 return {value,remember,capture,restore};
}
