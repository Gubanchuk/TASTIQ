const presentations={
 plan:{prominent:true,title:'Обдумываю твой ответ',description:'Учитываю то, что ты рассказал, и уточняю сегодняшнее желание.'},
 pick:{prominent:true,title:'Подбираю игры для тебя',description:'Сопоставляю твой запрос с играми и проверяю условия выбора.'},
 replace:{prominent:true,title:'Ищу замену знакомым играм',description:'Подбираю новые варианты. Остальные игры и твой запрос сохранятся.'},
 local:{prominent:false,title:'Сохраняю ответ…',description:'Применяю изменение к текущему подбору.'},
};

// Use the submitted action and the question before accepting it. In particular,
// answering company=group only opens the party-size question; it does not plan.
export function loadingPresentation(action,state){
 let operation='local';
 if(action?.type==='retry'){
  if(['plan','pick','replace'].includes(state?.failedAction))operation=state.failedAction;
 }else if(action?.type==='confirm')operation='pick';
 else if(action?.type==='replace_familiar')operation='replace';
 else if(action?.type==='correct')operation='plan';
 else if(action?.type==='answer'){
  const question=state?.question?.id??action.questionId;
  if(question==='company'){
   if(action.selected?.some(id=>id==='solo'||id==='friend'))operation='plan';
  }else if(question&&!['direction','platform'].includes(question))operation='plan';
 }
 return {...presentations[operation]};
}
