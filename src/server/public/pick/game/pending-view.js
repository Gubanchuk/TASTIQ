const presentations={
 plan:{prominent:true,title:'Уточняю запрос',description:''},
 pick:{prominent:true,title:'Подбираю игры',description:''},
 more:{prominent:true,title:'Ищу другие варианты',description:'По тому же запросу, без повторов.'},
 replace:{prominent:true,title:'Ищу замену знакомым играм',description:'Остальные игры останутся в подборе.'},
 local:{prominent:false,title:'Сохраняю ответ…',description:''},
};

// Use the submitted action and the question before accepting it. In particular,
// answering company=group only opens the party-size question; it does not plan.
export function loadingPresentation(action,state){
 let operation='local';
 if(action?.type==='retry'){
  if(['plan','pick','replace','more'].includes(state?.failedAction))operation=state.failedAction;
 }else if(action?.type==='confirm')operation='pick';
 else if(action?.type==='more')operation='more';
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
