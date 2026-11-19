import {REVIEW_VERDICTS,REVIEW_ISSUES} from './selection-review.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const draftKey=id=>'__skipReview:'+id;

export function createVisitReviews({client,entries,root=document}){
 const isEnabled=id=>client.draft(draftKey(id)).text!=='off';
 const context=()=>entries().filter(row=>isEnabled(row.id)).map(row=>row.context);
 const rendered=new WeakMap();
 function refresh(){
  const slot=root.querySelector('[data-visit-reviews]');
  if(!slot)return;
  const rows=entries();
  slot.hidden=!rows.length;
  const list=rows.map(({id,context:review})=>{
   const description=[REVIEW_VERDICTS[review.verdict],REVIEW_ISSUES[review.issue],review.note].filter(Boolean).join(' · ');
   const cards=review.cards.map(card=>card.title).filter(Boolean).join(', ');
   return `<li><label class="game-check"><input type="checkbox" data-visit-review="${esc(id)}" data-focus="visit-review:${esc(id)}"${isEnabled(id)?' checked':''}${client.busy?' disabled':''}><span>${esc(review.request||cards||'Прошлый подбор')}<small>${esc(description)}</small>${review.request&&cards?`<small>${esc(cards)}</small>`:''}</span></label></li>`;
  }).join('');
  const count=rows.filter(row=>isEnabled(row.id)).length;
  const html=list?`<details class="request-time-details visit-reviews" data-disclosure="visit-reviews"><summary data-focus="visit-reviews">Отзывы для этого подбора · ${count} из ${rows.length}</summary><p class="game-help">Ты разрешил учитывать эти отзывы при онлайн-подборе. Можно выключить любой для текущего запроса.</p><ul class="game-history-list">${list}</ul></details>`:'';
  if(rendered.get(slot)===html)return;
  const details=slot.querySelector('details'),wasOpen=details?.open;
  const focused=slot.contains(root.activeElement)?root.activeElement:null;
  const focusId=focused?.dataset.visitReview;
  slot.innerHTML=html;rendered.set(slot,html);
  const next=slot.querySelector('details');
  if(next&&wasOpen)next.open=true;
  if(focused){
   const target=focusId?[...slot.querySelectorAll('[data-visit-review]')].find(box=>box.dataset.visitReview===focusId):null;
   (target??next?.querySelector('summary'))?.focus({preventScroll:true});
  }
 }
 root.addEventListener('change',event=>{
  const id=event.target.dataset?.visitReview;
  if(!id||client.busy||!entries().some(row=>row.id===id))return;
  client.saveDraft(draftKey(id),{text:event.target.checked?'':'off'});
  refresh();
 });
 return {context,refresh};
}
