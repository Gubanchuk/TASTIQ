import { FIT, REASONS, OUTCOMES } from './evening-feedback.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export const feedbackStatus = (status,persistent=true) => status==='sent'
  ? (persistent?'Отзыв отправлен без имени.':'Отзыв отправлен. На устройстве сохранится только до закрытия окна.')
  : (persistent?'Сохранено на устройстве. Ожидает отправки.':'Пока сохранено только в этом окне. Ожидает отправки.');

export function eveningControls(run,cardId,{open=false,ratingOpen=false,outcomeOpen,history=false,status='pending',persistent=true,draft=null,modern=false}={}) {
  const card=run?.cards.find(c=>c.id===cardId);if(!card)return '';
  const r=run.responses.find(x=>x.cardId===cardId)??{},rid=esc(run.id),cid=esc(cardId);
  const resultCard=modern&&!history;
  const button=(act,value,label,on=false,primary=false)=>{
    const today=resultCard&&act==='evening-choose',focusValue=today?'toggle':value;
    const check=today&&on?'<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m4 10 4 4 8-8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>':'';
    return `<button type="button" class="btn ${primary?'btn-primary':'btn-secondary'} btn-s" data-act="${act}" data-run="${rid}" data-id="${cid}" data-v="${value}" data-fk="${act}:${rid}:${cid}:${focusValue}" aria-pressed="${on}"${today&&on?' title="Отменить выбор"':''}>${check}${esc(label)}</button>`;
  };
  const chosen=resultCard
    ? button('evening-choose',r.chosen?'off':'on',r.chosen?'Выбрано':'Выбираю',Boolean(r.chosen),true)
    : r.chosen
    ? `<p class="evening-chosen"><span>Выбрано</span> ${button('evening-choose','off',modern?'Отменить выбор':'Отменить')}</p>`
    : button('evening-choose','on','Выбираю',false,!history);
  const start=r.chosen?button('evening-start',r.started?'off':'on',modern?(r.started?'Начато':'Отметить начало'):(r.started?'Уже начал ✓':'Уже начал'),Boolean(r.started)):'';
  const disclosure=(type,expanded)=>` ${history?'data-detail':'data-disclosure'}="${type}:${rid}:${cid}"${expanded?' open':''}`;
  const savedLabel=(label,edit)=>`<span class="evening-saved-label">${label}<small>${edit}</small></span>`;
  const outcomeLabel=modern&&r.outcome?savedLabel(`Как прошло: ${esc(OUTCOMES[r.outcome])}`,'Изменить отзыв'):resultCard?'Начало и впечатление':'Как прошло?';
  const outcomeAttrs=modern||history?disclosure('outcome',outcomeOpen??(!modern&&Boolean(r.outcome))):(outcomeOpen??Boolean(r.outcome))?' open':'';
  const outcome=r.chosen?`<details class="evening-outcome"${outcomeAttrs}><summary${modern?` data-fk="evening-outcome:${rid}:${cid}"`:''}>${outcomeLabel}</summary>${resultCard?`<div class="evening-result-start">${start}</div>`:''}<div class="evening-buttons" role="group" aria-label="Впечатление после знакомства">${Object.entries(OUTCOMES).map(([v,label])=>button('evening-outcome',v,label,r.outcome===v)).join('')}</div></details>`:'';
  const progress=r.chosen?`<div class="evening-progress">${start}${outcome}</div>`:'';
  if(modern){
    const hasExplanation=Boolean(r.reason||r.note),hasDraft=Boolean(draft?.reason||draft?.note);
    const hasRating=Boolean(r.fit||hasExplanation),ratingDetails=!history||hasRating||Boolean(r.outcome);
    const ratingLabel=r.fit?savedLabel(`Подходит ли запросу: ${esc(FIT[r.fit])}`,'Изменить оценку'):hasExplanation?'Изменить уточнение':hasDraft?'Продолжить оценку':resultCard?'Оценить вариант':'Оценить рекомендацию';
    const fit=`<div class="evening-fit-prompt"><div class="evening-buttons" role="group" aria-label="Подходит запросу">${Object.entries(FIT).map(([v,label])=>button('evening-fit',v,label,r.fit===v)).join('')}</div></div>`;
    return `<section class="evening-controls evening-controls-modern" aria-label="Выбор и отзыв: ${esc(card.title)}"><div class="evening-decision">${chosen}${history?start:''}</div>`
      + (history?'<div class="evening-review">':'')
      + (ratingDetails?`<details class="evening-rating"${disclosure('rating',ratingOpen)}><summary data-fk="evening-rating:${rid}:${cid}">${ratingLabel}</summary>`:'<p class="evening-fit-label">Подошёл ли вариант?</p>')
      + fit
      + `<details class="evening-fit evening-feedback-note" data-feedback-details data-run="${rid}" data-id="${cid}"${open?' open':''}><summary data-fk="evening-note:${rid}:${cid}">${hasExplanation?'Изменить уточнение':hasDraft?'Продолжить отзыв':'Добавить уточнение'}<span>Необязательно</span></summary>`
      + `<form class="evening-reason" data-form="evening-reason" data-run="${rid}" data-id="${cid}">`
      + `<label>Что стоит учесть? <select class="input" name="reason"><option value="">Без причины</option>${Object.entries(REASONS).map(([v,label])=>`<option value="${v}"${(draft?.reason??r.reason)===v?' selected':''}>${esc(label)}</option>`).join('')}</select></label>`
      + `<label>Своими словами <textarea class="input" name="note" rows="2" maxlength="300" placeholder="Что добавить к своей оценке?">${esc(draft?.note??r.note??'')}</textarea></label>`
      + `<button type="submit" class="btn btn-secondary btn-s" data-fk="evening-reason:${rid}:${cid}">Сохранить отзыв</button></form>`
      + '<p class="evening-help">Оценка и уточнение отправляются без имени, чтобы улучшать подбор. Исходное пожелание не прикладываем.</p></details>'
      + (ratingDetails?'</details>':'')+(history?'</div>':'')+outcome
      + (hasRating||r.outcome?`<p class="evening-status evening-confirmation" role="status"><img src="/assets/brand/tastiq-symbol-cobalt.svg" alt="" width="20" height="20"><span><strong>Спасибо за отзыв!</strong><span data-feedback-status="${rid}">${esc(feedbackStatus(status,persistent))}</span></span></p>`:'')+'</section>';
  }
  return `<section class="evening-controls" aria-label="Твой выбор: ${esc(card.title)}">${chosen}${progress}`
    + `<details class="evening-fit" data-feedback-details data-run="${rid}" data-id="${cid}"${open?' open':''}><summary>Подходит запросу?${r.fit?` · ${FIT[r.fit]}`:''}</summary>`
    + `<div class="evening-buttons" role="group" aria-label="Подходит запросу">${Object.entries(FIT).map(([v,label])=>button('evening-fit',v,label,r.fit===v)).join('')}</div>`
    + `<form class="evening-reason" data-form="evening-reason" data-run="${rid}" data-id="${cid}">`
    + `<label>Что стоит учесть? <select class="input" name="reason"><option value="">Без причины</option>${Object.entries(REASONS).map(([v,label])=>`<option value="${v}"${(draft?.reason??r.reason)===v?' selected':''}>${esc(label)}</option>`).join('')}</select></label>`
    + `<label>Своими словами <textarea class="input" name="note" rows="2" maxlength="300" placeholder="Необязательно">${esc(draft?.note??r.note??'')}</textarea></label>`
    + `<button type="submit" class="btn btn-secondary btn-s" data-fk="evening-reason:${rid}:${cid}">Сохранить отзыв</button></form>`
    + '<p class="evening-help">Отметки и текст отзыва сохраняются здесь и отправляются без имени, чтобы улучшать подбор. Исходное пожелание к отзыву не прикладываем.</p>'
    + '</details>'
    + (run.responses.some(x=>x.cardId===cardId)?`<p class="evening-status" data-feedback-status="${rid}" role="status">${esc(feedbackStatus(status,persistent))}</p>`:'')+'</section>';
}
