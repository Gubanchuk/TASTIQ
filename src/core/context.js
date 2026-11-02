export const CONTEXTS = {
  childAge: {
    contextKey:'childAge', title:'Какого возраста дети?', hint:'Учту это при выборе и предупреждениях. Можно пропустить.',
    options:[{value:'preschool',label:'до 7 лет'},{value:'school',label:'7–11 лет'},{value:'teen',label:'12 лет и старше'},{value:'mixed',label:'разного возраста'}],
  },
  partySize: {
    contextKey:'partySize', title:'Сколько вас будет?', hint:'Чтобы не предлагать игру на двоих для всей компании. Можно пропустить.',
    options:[{value:'2',label:'двое'},{value:'3',label:'трое'},{value:'4',label:'четверо'},{value:'5+',label:'пятеро или больше'}],
  },
};
export function contextQuestion(state) {
  if(state.situation?.company==='kids')return CONTEXTS.childAge;
  if(state.domain==='game' && state.situation?.company==='group')return CONTEXTS.partySize;
  return null;
}
