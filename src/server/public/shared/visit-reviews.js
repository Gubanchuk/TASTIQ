import {REVIEW_VERDICTS,REVIEW_ISSUES} from './selection-review.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const draftKey=id=>'__skipReview:'+id;
const memoryKey=id=>'__visitPreference:'+id;

export function tasteMemoryPanelHtml(domain,rows,enabled,{busy=false,result=false}={}){
 const href='/library/?view=memory&amp;memory.domain='+encodeURIComponent(domain);
 if(!rows.length)return `<a href="${href}">Мои предпочтения</a>`;
 const count=rows.filter(enabled).length;
 const list=rows.map(row=>`<li><label class="game-check"><input type="checkbox" data-visit-memory="${esc(row.id)}"${enabled(row)?' checked':''}${busy?' disabled':''}><span>${esc(row.text)}</span></label></li>`).join('');
 return `<details class="request-time-details" data-disclosure="visit-memory"><summary>${result?'Предпочтения для следующих вариантов':'Предпочтения для этого подбора'} · ${count} из ${rows.length}</summary><ul class="game-history-list">${list}</ul><a href="${href}">Изменить в библиотеке</a></details>`;
}

export function createVisitReviews({client,entries,memory,library,domain='game',root=document}){
 const isEnabled=id=>client.draft(draftKey(id)).text!=='off';
 const reviews=()=>memory?memory.filterReviews(domain,entries()):entries();
 const memories=()=>[...(memory?.context(domain)??[]),...(library?.ratingMemory(domain)??[]).slice(0,12)];
 const memoryEnabled=row=>{
  const override=client.draft(memoryKey(row.id)).text;
  return override?override==='on':row.source?.kind!=='review'||isEnabled(row.source.id);
 };
 const tasteContext=()=>memories().filter(memoryEnabled);
 const context=()=>reviews().filter(row=>isEnabled(row.id)).map(row=>row.context);
 const rendered=new WeakMap();
 function refreshMemory(){
  const slot=memory&&root.querySelector('[data-taste-memory]');
  if(!slot)return;
  const html=tasteMemoryPanelHtml(domain,memories(),memoryEnabled,{busy:client.busy,result:client.screen?.type==='result'});
  if(rendered.get(slot)===html)return;
  const wasOpen=slot.querySelector('details')?.open,focused=slot.contains(root.activeElement)?root.activeElement:null;
  slot.innerHTML=html;rendered.set(slot,html);
  const details=slot.querySelector('details');if(details&&wasOpen)details.open=true;
  if(focused){
   const input=[...slot.querySelectorAll('[data-visit-memory]')].find(el=>el.dataset.visitMemory===focused.dataset.visitMemory);
   (input??slot.querySelector('summary,a'))?.focus({preventScroll:true});
  }
 }
 function refresh(){
  refreshMemory();
  const slot=root.querySelector('[data-visit-reviews]');
  if(!slot)return;
  const rows=reviews();
  slot.hidden=!rows.length;
  const list=rows.map(({id,context:review})=>{
   const description=[REVIEW_VERDICTS[review.verdict],REVIEW_ISSUES[review.issue],review.note].filter(Boolean).join(' · ');
   const cards=review.cards.map(card=>card.title).filter(Boolean).join(', ');
   return `<li><label class="game-check"><input type="checkbox" data-visit-review="${esc(id)}" data-focus="visit-review:${esc(id)}"${isEnabled(id)?' checked':''}${client.busy?' disabled':''}><span>${esc(review.request||cards||'Прошлый подбор')}<small>${esc(description)}</small>${review.request&&cards?`<small>${esc(cards)}</small>`:''}</span></label></li>`;
  }).join('');
  const count=rows.filter(row=>isEnabled(row.id)).length;
  const html=list?`<details class="request-time-details visit-reviews" data-disclosure="visit-reviews"><summary data-focus="visit-reviews">Отзывы для этого подбора · ${count} из ${rows.length}</summary><p class="game-help">Эти отзывы учитываются при онлайн-подборе. Сними галочку, чтобы пропустить отзыв в этот раз.</p><ul class="game-history-list">${list}</ul></details>`:'';
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
  const pref=event.target.dataset?.visitMemory;
  if(pref&&!client.busy&&memories().some(row=>row.id===pref)){
   client.saveDraft(memoryKey(pref),{text:event.target.checked?'on':'off'});refresh();return;
  }
  const id=event.target.dataset?.visitReview;
  if(!id||client.busy||!reviews().some(row=>row.id===id))return;
  client.saveDraft(draftKey(id),{text:event.target.checked?'':'off'});
  refresh();
 });
 return {context,tasteContext,refresh};
}
