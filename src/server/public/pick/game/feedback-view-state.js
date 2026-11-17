// View-only state follows retained games, never newly recommended games.
export function carryFeedbackView({drafts,open,disclosures},from,to,retainedIds=[],{overwrite=false}={}) {
 if(!from||!to||from===to)return;
 const transfer=(map,source,target)=>{
  if(map.has(source)&&(overwrite||!map.has(target)))map.set(target,structuredClone(map.get(source)));
  else if(overwrite&&!map.has(source))map.delete(target);
 };
 for(const id of new Set(retainedIds)) {
  if(typeof id!=='string')continue;
  const source=`${from}:${id}`,target=`${to}:${id}`;
  transfer(drafts,source,target);transfer(open,source,target);
  transfer(disclosures,`rating:${source}`,`rating:${target}`);
 }
}

// Choosing toggles the value while the action and card stay the same.
export function feedbackToggleFocus(dataset={}) {
 return dataset.act==='evening-choose'&&dataset.id?{act:dataset.act,id:dataset.id}:null;
}

export function acceptedFamiliarCard(state,pending) {
 if(!pending||!['familiar_mark','familiar_keep'].includes(pending.type)||state?.id!==pending.dialogueId)return null;
 const accepted=state.familiar?.[pending.type==='familiar_keep'?'keep':'marked']??[];
 return accepted.includes(pending.card.id)?pending.card:null;
}
export function captureTextSelection(element) {
 return typeof element?.selectionStart==='number'&&typeof element?.selectionEnd==='number'
  ?{start:element.selectionStart,end:element.selectionEnd,direction:element.selectionDirection??'none',scrollTop:element.scrollTop??0}:null;
}
export function restoreTextSelection(element,selection) {
 if(!selection||typeof element?.setSelectionRange!=='function')return;
 element.setSelectionRange(selection.start,selection.end,selection.direction);element.scrollTop=selection.scrollTop;
}
