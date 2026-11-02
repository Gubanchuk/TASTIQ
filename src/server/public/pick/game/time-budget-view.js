const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export const hasSessionTime=time=>Boolean(Number.isInteger(time?.minutes)&&time.minutes>0&&typeof time.sourceId==='string'&&time.sourceId.trim()&&typeof time.quote==='string'&&time.quote.trim());
export function timeBudgetHtml(time,{scope='summary'}={}) {
 if(!hasSessionTime(time))return '';
 return `<div class="game-time-budget"><span>На сегодня: ${time.minutes} мин</span><button type="button" class="btn btn-plain btn-s" data-act="remove-time" data-focus="remove-time:${esc(scope)}">Убрать ограничение времени</button></div>`;
}
export function timeEvidenceHtml(time) {
 if(!hasSessionTime(time))return '';
 return `<li><span><b class="game-fact-label">Время на сегодня · из твоих слов</b> «${esc(time.quote)}»</span></li>`;
}
