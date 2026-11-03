const clean=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
const token=value=>typeof value==='string'&&/^[a-zA-Z0-9:_-]{1,100}$/.test(value);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export const REVIEW_VERDICTS={accept:'Нашёл своё',partial:'Есть близкие варианты',reject:'Ничего не подошло'};
export const REVIEW_ISSUES={understanding:'Не так понят запрос',constraint:'Нарушено важное условие',seen:'Уже знакомые варианты',fit:'Не заинтересовали варианты',interface:'Неудобно пользоваться',other:'Другое'};
const KEY='tastiq.selection-review-drafts.v1';
export function normalizeSelectionReview(value){
 if(!value||!Object.hasOwn(REVIEW_VERDICTS,value.verdict)||value.issue!==null&&!Object.hasOwn(REVIEW_ISSUES,value.issue)||typeof value.learn!=='boolean')return null;
 for(const [key,max]of [['note',600],['requestSummary',1600],['transcript',48000]])if(typeof value[key]!=='string'||value[key].length>max)return null;
 return {verdict:value.verdict,issue:value.issue,note:value.note.trim(),requestSummary:value.requestSummary.trim(),transcript:value.transcript.trim(),learn:value.learn};
}
export function historicalFeedback(runs,domain){
 return runs.filter(run=>run.domain===domain&&run.selectionReview?.learn===true&&Object.hasOwn(REVIEW_VERDICTS,run.selectionReview.verdict))
  .sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0,6).map(run=>({domain,verdict:run.selectionReview.verdict,issue:run.selectionReview.issue,note:clean(run.selectionReview.note,300),request:clean(run.selectionReview.requestSummary,500),cards:run.cards.slice(0,4).map(c=>({id:c.id,title:clean(c.title,200)}))}));
}
const draftOf=value=>({verdict:Object.hasOwn(REVIEW_VERDICTS,value?.verdict)?value.verdict:null,issue:Object.hasOwn(REVIEW_ISSUES,value?.issue)?value.issue:null,note:typeof value?.note==='string'?value.note.slice(0,600):'',learn:value?.learn!==false});
export const selectionReviewStatus=(run,{draft,status='pending',persistent=true}={})=>draft?'Изменения ещё не отправлены.':!run?.selectionReview?'':status==='sent'?'Отзыв отправлен. Спасибо!':persistent?'Отзыв сохранён на устройстве и ожидает отправки.':'Отзыв пока сохранён в этом окне и ожидает отправки.';
export function createSelectionReviewDrafts({storage}={}){
 let memory={},persistent=Boolean(storage);
 const read=()=>{if(!persistent)return structuredClone(memory);try{const data=JSON.parse(storage.getItem(KEY)??'{}');memory=data&&typeof data==='object'&&!Array.isArray(data)?data:{};return structuredClone(memory);}catch{persistent=false;return structuredClone(memory);}};
 const save=data=>{memory=structuredClone(data);if(persistent)try{storage.setItem(KEY,JSON.stringify(data));}catch{persistent=false;}};
 return {get:id=>draftOf(read()[id]),has:id=>Object.hasOwn(read(),id),set(id,value){if(!token(id))return;const data=read();data[id]=draftOf({...data[id],...value});const keys=Object.keys(data);for(const key of keys.slice(0,Math.max(0,keys.length-60)))delete data[key];save(data);},delete(id){const data=read();delete data[id];save(data);}};
}
export function selectionReviewHtml(run,{draft,status='pending',persistent=true}={}){
 if(!run)return '<p class="game-help">Подготавливаю форму отзыва…</p>';
 const value=draftOf(draft??run.selectionReview),rid=esc(run.id);
 return `<section class="selection-review" aria-labelledby="selection-review-title"><h2 id="selection-review-title">Как тебе подбор?</h2><form data-form="selection-review" data-run="${rid}">`
  +`<div class="selection-review-verdicts" role="group" aria-label="Оценка подбора">${Object.entries(REVIEW_VERDICTS).map(([key,label])=>`<button type="button" class="btn btn-secondary" data-act="selection-verdict" data-run="${rid}" data-v="${key}" data-focus="selection-verdict:${key}" aria-pressed="${value.verdict===key}">${label}</button>`).join('')}</div>`
  +`<details data-disclosure="selection-review:${rid}"${value.issue||value.note?' open':''}><summary>Что понравилось или что не так? <span>Необязательно</span></summary><label>Причина<select class="input" name="issue" data-focus="selection-review:issue"><option value="">Не указывать</option>${Object.entries(REVIEW_ISSUES).map(([key,label])=>`<option value="${key}"${value.issue===key?' selected':''}>${label}</option>`).join('')}</select></label><label>Своими словами<textarea class="input" name="note" data-focus="selection-review:note" rows="3" maxlength="600" placeholder="Чего не хватило или какой вариант подошёл?">${esc(value.note)}</textarea></label></details>`
  +`<label class="selection-review-learning"><input type="checkbox" name="learn" data-focus="selection-review:learn"${value.learn?' checked':''}> Учитывать этот отзыв в моих следующих подборах</label>`
  +'<p class="game-help">С отзывом сохраним запрос и показанные варианты без имени — для анализа и улучшения подбора.</p>'
  +`<button type="submit" class="btn btn-primary" data-focus="selection-review:send"${value.verdict?'':' disabled'}>${run.selectionReview?'Обновить отзыв':'Отправить отзыв'}</button>`
  +`${run.selectionReview&&status!=='sent'&&!draft?'<button type="button" class="btn btn-secondary" data-act="selection-retry">Повторить отправку</button>':''}`
  +`<p data-selection-review-status role="status" aria-live="polite">${selectionReviewStatus(run,{draft,status,persistent})}</p></form></section>`;
}
