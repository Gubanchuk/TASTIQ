import { FIT, REASONS, OUTCOMES } from './evening-feedback.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export const feedbackStatus = (status,persistent=true) => status==='sent'
  ? (persistent?'Отзыв отправлен без имени.':'Отзыв отправлен. На устройстве сохранится только до закрытия окна.')
  : (persistent?'Сохранено на устройстве. Ожидает отправки.':'Пока сохранено только в этом окне. Ожидает отправки.');

export function eveningControls(run,cardId,{open=false,outcomeOpen,history=false,status='pending',persistent=true,draft=null,modern=false}={}) {
  const card=run?.cards.find(c=>c.id===cardId);if(!card)return '';
  const r=run.responses.find(x=>x.cardId===cardId)??{},rid=esc(run.id),cid=esc(cardId);
  const resultCard=modern&&!history;
  const button=(act,value,label,on=false,primary=false)=>{
    const today=resultCard&&act==='evening-choose',focusValue=today?'toggle':value;
    const check=today&&on?'<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m4 10 4 4 8-8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>':'';
    return `<button type="button" class="btn ${primary?'btn-primary':'btn-secondary'} btn-s" data-act="${act}" data-run="${rid}" data-id="${cid}" data-v="${value}" data-fk="${act}:${rid}:${cid}:${focusValue}" aria-pressed="${on}"${today&&on?' title="Снять выбор на сегодня"':''}>${check}${esc(label)}</button>`;
  };
  const chosen=resultCard
    ? button('evening-choose',r.chosen?'off':'on','На сегодня',Boolean(r.chosen),true)
    : r.chosen
    ? `<p class="evening-chosen"><span>${history?'Выбрано':'Выбрано на сегодня'}</span> ${button('evening-choose','off',modern?'Отменить выбор':'Отменить')}</p>`
    : button('evening-choose','on','Выбираю на сегодня',false,!history);
  const start=r.chosen?button('evening-start',r.started?'off':'on',modern?(r.started?'Начато':'Отметить начало'):(r.started?'Уже начал ✓':'Уже начал'),Boolean(r.started)):'';
  const outcomeLabel=modern&&r.outcome?`Как прошло: ${esc(OUTCOMES[r.outcome])}`:resultCard?'Начало и впечатление':'Как прошло?';
  const outcome=r.chosen?`<details class="evening-outcome"${history?` data-detail="outcome:${rid}:${cid}"`:''}${(outcomeOpen??Boolean(r.outcome))?' open':''}><summary>${outcomeLabel}</summary>${resultCard?`<div class="evening-result-start">${start}</div>`:''}<div class="evening-buttons" role="group" aria-label="Впечатление после знакомства">${Object.entries(OUTCOMES).map(([v,label])=>button('evening-outcome',v,label,r.outcome===v)).join('')}</div></details>`:'';
  const progress=r.chosen?`<div class="evening-progress">${start}${outcome}</div>`:'';
  if(modern){
    const hasExplanation=Boolean(r.reason||r.note),hasDraft=Boolean(draft?.reason||draft?.note);
    const fit=`<div class="evening-fit-prompt"><div class="evening-buttons" role="group" aria-label="Подходит на сегодня">${Object.entries(FIT).map(([v,label])=>button('evening-fit',v,label,r.fit===v)).join('')}</div></div>`;
    return `<section class="evening-controls evening-controls-modern" aria-label="Выбор и отзыв: ${esc(card.title)}"><div class="evening-decision">${chosen}${history?start:''}</div>`
      + (history?`<div class="evening-review"><p class="evening-fit-label">Подошёл ли вариант?</p>${fit}`:`<details class="evening-rating" data-disclosure="rating:${rid}:${cid}"><summary data-fk="evening-rating:${rid}:${cid}">${r.fit?`Твоя оценка: ${esc(FIT[r.fit])}`:hasDraft?'Продолжить оценку':'Оценить вариант'}</summary>${fit}`)
      + `<details class="evening-fit evening-feedback-note" data-feedback-details data-run="${rid}" data-id="${cid}"${open?' open':''}><summary data-fk="evening-note:${rid}:${cid}">${hasExplanation?'Изменить уточнение':hasDraft?'Продолжить отзыв':'Добавить уточнение'}<span>Необязательно</span></summary>`
      + `<form class="evening-reason" data-form="evening-reason" data-run="${rid}" data-id="${cid}">`
      + `<label>Что стоит учесть? <select class="input" name="reason"><option value="">Без причины</option>${Object.entries(REASONS).map(([v,label])=>`<option value="${v}"${(draft?.reason??r.reason)===v?' selected':''}>${esc(label)}</option>`).join('')}</select></label>`
      + `<label>Своими словами <textarea class="input" name="note" rows="2" maxlength="300" placeholder="Что добавить к своей оценке?">${esc(draft?.note??r.note??'')}</textarea></label>`
      + `<button type="submit" class="btn btn-secondary btn-s" data-fk="evening-reason:${rid}:${cid}">Сохранить отзыв</button></form>`
      + '<p class="evening-help">Оценка и уточнение отправляются без имени, чтобы улучшать подбор. Исходное пожелание не прикладываем.</p></details>'
      + (history?'</div>':'</details>')+outcome
      + (r.fit||r.outcome||hasExplanation?`<p class="evening-status" data-feedback-status="${rid}" role="status">${esc(feedbackStatus(status,persistent))}</p>`:'')+'</section>';
  }
  return `<section class="evening-controls" aria-label="Твой вечер: ${esc(card.title)}">${chosen}${progress}`
    + `<details class="evening-fit" data-feedback-details data-run="${rid}" data-id="${cid}"${open?' open':''}><summary>Подходит на сегодня?${r.fit?` · ${FIT[r.fit]}`:''}</summary>`
    + `<div class="evening-buttons" role="group" aria-label="Подходит на сегодня">${Object.entries(FIT).map(([v,label])=>button('evening-fit',v,label,r.fit===v)).join('')}</div>`
    + `<form class="evening-reason" data-form="evening-reason" data-run="${rid}" data-id="${cid}">`
    + `<label>Что стоит учесть? <select class="input" name="reason"><option value="">Без причины</option>${Object.entries(REASONS).map(([v,label])=>`<option value="${v}"${(draft?.reason??r.reason)===v?' selected':''}>${esc(label)}</option>`).join('')}</select></label>`
    + `<label>Своими словами <textarea class="input" name="note" rows="2" maxlength="300" placeholder="Необязательно">${esc(draft?.note??r.note??'')}</textarea></label>`
    + `<button type="submit" class="btn btn-secondary btn-s" data-fk="evening-reason:${rid}:${cid}">Сохранить отзыв</button></form>`
    + '<p class="evening-help">Отметки и текст отзыва сохраняются здесь и отправляются без имени, чтобы улучшать подбор. Исходное пожелание к отзыву не прикладываем.</p>'
    + '</details>'
    + (run.responses.some(x=>x.cardId===cardId)?`<p class="evening-status" data-feedback-status="${rid}" role="status">${esc(feedbackStatus(status,persistent))}</p>`:'')+'</section>';
}
