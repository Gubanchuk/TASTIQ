export const mediaConfig=domain=>({film:{label:'Фильмы',noun:'фильм',title:'Что посмотреть сегодня'},series:{label:'Сериалы',noun:'сериал',title:'Какой сериал посмотреть'},cartoon:{label:'Мультфильмы',noun:'мультфильм',title:'Какой мультфильм посмотреть'}}[domain]??null);
export function mediaTimeBudgetHtml(time,{scope='summary',timeMode}={}){
 if(!Number.isInteger(time?.minutes)||time.minutes<5||time.minutes>1440||!time.sourceId||!time.quote)return '';
 const label=timeMode==='episode'?'На эпизод':timeMode==='runtime'?'На фильм':'На сегодня';
 return `<div class="game-time-budget"><span>${label}: ${time.minutes} мин</span><button type="button" class="btn btn-plain btn-s" data-act="remove-time" data-focus="remove-time:${scope==='review'?'review':'summary'}">Убрать ограничение времени</button></div>`;
}
export function mediaJourneyStage(state,screen){if(screen?.type==='result')return 3;if(screen?.question?.id==='direction')return 0;if(['time','company','child_age','commitment','format','duration'].includes(screen?.question?.id))return 1;return state?2:0;}
export function mediaLoadingPresentation(action,state){
 const scalarAnswer=action?.type==='answer'&&(state?.question?.id??action.questionId)==='only_ended'&&!action.text?.trim()&&(action.kind&&action.kind!=='answer'||action.selected?.some(id=>['yes','any'].includes(id)));
 const operation=scalarAnswer?'local':action?.type==='retry'?state?.failedAction:action?.type==='confirm'?'pick':action?.type==='more'?'more':action?.type==='replace_familiar'?'replace':['answer','correct'].includes(action?.type)?'plan':'local';
 return {prominent:operation!=='local'&&Boolean(operation),...({more:{title:'Ищу другие варианты',description:'Продолжаю по тому же запросу. Уже показанное не повторится.'},pick:{title:'Подбираю варианты для тебя',description:'Сопоставляю твой запрос с каталогом и проверяю условия просмотра.'},replace:{title:'Ищу замену знакомым вариантам',description:'Остальные названия и твой запрос сохранятся.'},plan:{title:'Обдумываю твой ответ',description:'Учитываю сказанное и выбираю полезное уточнение.'},local:{title:'Сохраняю изменение…',description:'Применяю изменение к текущему подбору.'}}[operation]??{title:'Сохраняю изменение…',description:'Твой ответ сохранён.'})};
}
const base=context=>JSON.stringify(context);
export const mediaContextDraftText=(context,values,dialogueId)=>JSON.stringify({dialogueId,base:base(context),values});
export function mediaContextEditorValues(context,text,dialogueId){try{const d=JSON.parse(text);if(d.dialogueId===dialogueId&&d.base===base(context)&&d.values&&typeof d.values==='object')return {...context,...d.values};}catch{/* use accepted context */}return {...context};}
