export const resultBatchHelp='Обычно четыре варианта за раз. При строгих условиях их может быть меньше. «Показать ещё» продолжает этот же подбор.';
// Older drafts also store the catalog fallback notice as a clarifying question.
export function resultRequestScreen(screen){
 if(screen.type!=='result'||!(screen.provisional||screen.result?.ai?.error))return screen;
 const note='Это предварительный подбор по доступным признакам: помощник сейчас недоступен, свободный ответ мог быть учтён не полностью.';
 return {...screen,uncertainties:(screen.uncertainties??[]).filter(text=>text!==note)};
}
export function resultCardReason(card){
 const direct=[card.ai?.reason,card.reason].find(text=>typeof text==='string'&&text.trim());
 if(direct)return direct.trim();
 const facts=new Set((card.facts??[]).map(fact=>fact.id));
 const match=(card.explanation?.reasons??[]).find(reason=>!reason.weak&&reason.text?.trim()&&reason.factIds?.length&&reason.factIds.every(id=>facts.has(id)));
 if(match)return match.text;
 return (card.feasibility??[]).find(check=>check.status==='yes'&&['minutes','players'].includes(check.key)&&check.text?.trim())?.text??'';
}
export function resultBatchNotice(count,{more=false}={}){
 if(count===4)return more?'Ещё 4 варианта по тому же запросу.':'';
 return `Нашёл ${more?'ещё ':''}${count===1?'1 подходящий вариант':`${count} подходящих варианта`} по этому запросу.`;
}
export function singleReplacementIndex(state){
 const undo=state?.familiar?.undo;
 const changed=state?.replacement?.changedIds;
 if(changed?.length!==1||!undo?.marked?.includes(changed[0]))return -1;
 const index=[undo.result?.top,...(undo.result?.alternatives??[])].findIndex(card=>card?.id===changed[0]);
 const current=[state.result?.top,...(state.result?.alternatives??[])][index];
 return current&&!state.familiar.marked?.includes(current.id)?index:-1;
}
export function resultSectionHeading(index){
 return index===0?'<h2 class="game-choice-heading">Главный вариант</h2>':index===1?'<h2 class="game-alternatives-heading">Другие варианты</h2>':'';
}
