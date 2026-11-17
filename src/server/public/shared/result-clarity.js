export const resultBatchHelp='Обычно четыре варианта за раз. При строгих условиях их может быть меньше. «Показать ещё» продолжает этот же подбор.';
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
