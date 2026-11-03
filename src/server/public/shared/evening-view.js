import { FIT, REASONS, OUTCOMES } from './evening-feedback.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export const feedbackStatus = (status,persistent=true) => status==='sent'
  ? (persistent?'Отзыв отправлен без имени.':'Отзыв отправлен. На устройстве сохранится только до закрытия окна.')
  : (persistent?'Сохранено на устройстве. Ожидает отправки.':'Пока сохранено только в этом окне. Ожидает отправки.');

export function eveningControls(run,cardId,{open=false,history=false,status='pending',persistent=true,draft=null,modern=false}={}) {
  const card=run?.cards.find(c=>c.id===cardId);if(!card)return '';
  const r=run.responses.find(x=>x.cardId===cardId)??{},rid=esc(run.id),cid=esc(cardId);
  const button=(act,value,label,on=false,primary=false)=>`<button type="button" class="btn ${primary?'btn-primary':'btn-secondary'} btn-s" data-act="${act}" data-run="${rid}" data-id="${cid}" data-v="${value}" data-fk="${act}:${rid}:${cid}:${value}" aria-pressed="${on}">${esc(label)}</button>`;
  const chosen=r.chosen
    ? `<p class="evening-chosen">Выбрано на сегодня ${button('evening-choose','off','Отменить')}</p>`
    : button('evening-choose','on','Выбираю на сегодня',false,!history);
  const progress=r.chosen?`<div class="evening-progress">${button('evening-start',r.started?'off':'on',r.started?'Уже начал ✓':'Уже начал',Boolean(r.started))}`
    + `<details class="evening-outcome"${r.outcome?' open':''}><summary>Как прошло?</summary><div class="evening-buttons" role="group" aria-label="Впечатление после знакомства">${Object.entries(OUTCOMES).map(([v,label])=>button('evening-outcome',v,label,r.outcome===v)).join('')}</div></details></div>`:'';
  if(modern){
    const hasExplanation=Boolean(r.reason||r.note),hasDraft=Boolean(draft?.reason||draft?.note);
    return `<section class="evening-controls evening-controls-modern" aria-label="Твой вечер: ${esc(card.title)}"><div class="evening-decision">${chosen}</div>`
      + `<div class="evening-fit-prompt"><p>Как тебе вариант на сегодня?</p><div class="evening-buttons" role="group" aria-label="Подходит на сегодня">${Object.entries(FIT).map(([v,label])=>button('evening-fit',v,label,r.fit===v)).join('')}</div></div>`
      + `<details class="evening-fit evening-feedback-note" data-feedback-details data-run="${rid}" data-id="${cid}"${open?' open':''}><summary data-fk="evening-note:${rid}:${cid}">${hasExplanation?'Изменить уточнение':hasDraft?'Продолжить отзыв':'Добавить уточнение'}<span>Необязательно</span></summary>`
      + `<form class="evening-reason" data-form="evening-reason" data-run="${rid}" data-id="${cid}">`
      + `<label>Что стоит учесть? <select class="input" name="reason"><option value="">Без причины</option>${Object.entries(REASONS).map(([v,label])=>`<option value="${v}"${(draft?.reason??r.reason)===v?' selected':''}>${esc(label)}</option>`).join('')}</select></label>`
      + `<label>Своими словами <textarea class="input" name="note" rows="2" maxlength="300" placeholder="Что добавить к своей оценке?">${esc(draft?.note??r.note??'')}</textarea></label>`
      + `<button type="submit" class="btn btn-secondary btn-s" data-fk="evening-reason:${rid}:${cid}">Сохранить отзыв</button></form>`
      + '<p class="evening-help">Оценка и уточнение отправляются без имени, чтобы улучшать подбор. Исходное пожелание не прикладываем.</p></details>'
      + progress
      + (run.responses.some(x=>x.cardId===cardId)?`<p class="evening-status" data-feedback-status="${rid}" role="status">${esc(feedbackStatus(status,persistent))}</p>`:'')+'</section>';
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
