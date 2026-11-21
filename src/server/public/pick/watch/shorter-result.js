export function shorterLimit(state,domain){
 const context=state.context??{},previous=state.sessionTime?.minutes??context.minutes;
 const mode=context.timeMode??(domain==='film'||context.format==='movie'?'runtime':domain==='series'||context.format==='episodic'?'episode':'session');
 const label={runtime:'Фильм',episode:'Один эпизод',session:'Просмотр сегодня'}[mode];
 const lead=state.result?.top;
 const leadMinutes=(mode==='runtime'&&lead?.kind==='film'||mode==='episode'&&lead?.kind==='series')?lead.runtime:null;
 const reference=previous??leadMinutes;
 const max=Number.isInteger(reference)?Math.min(1440,reference-1):1440;
 return max<5?null:{max,previous,leadMinutes,label,mode};
}

export function shorterAction(limit,value){
 const minutes=Number(value);
 if(!limit||!Number.isInteger(minutes)||minutes<5||minutes>limit.max)return null;
 return {type:'set_context',context:{minutes,timeMode:limit.mode}};
}

export function openShorter(dialog,limit,apply){
 dialog.innerHTML='<h2 id="result-dialog-title">Сколько минут есть на просмотр?</h2><form class="shorter-form">'
  +(limit.previous?'<p>Текущий предел — '+limit.previous+' мин.</p>':limit.leadMinutes?'<p>Главный вариант длится '+limit.leadMinutes+' мин.</p>':'')
  +'<label>'+limit.label+', не дольше (мин)<input class="input" name="minutes" type="number" inputmode="numeric" min="5" max="'+limit.max+'" step="1" required></label>'
  +'<p data-limit-preview role="status">Введи от 5 до '+limit.max+' минут.</p>'
  +'<div class="result-dialog-actions"><button class="btn btn-primary" type="submit" disabled>Проверить запрос</button><button class="btn btn-secondary" type="button" data-close>Отмена</button></div></form>';
 const form=dialog.querySelector('form'),submit=form.querySelector('[type="submit"]'),input=form.elements.minutes;
 form.addEventListener('input',()=>{
  const action=shorterAction(limit,input.value);submit.disabled=!action;
  form.querySelector('[data-limit-preview]').textContent=action?limit.label+' до '+action.context.minutes+' мин. Остальные условия сохранятся.':'Введи от 5 до '+limit.max+' минут.';
 });
 form.addEventListener('submit',event=>{
  event.preventDefault();const action=shorterAction(limit,input.value);
  if(action){dialog.close();apply(action);}
 });
 dialog.showModal();
}
