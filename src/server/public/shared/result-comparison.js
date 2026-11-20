import {genreLabels} from './card-metadata.js';
import {resultArtworkHtml} from './card-artwork.js';
import {animeArtwork} from './anime-artwork.js';
import {resultCardReason} from './result-clarity.js';

const nameOf=card=>(card.ru||card.name||card.title||'Без названия')+(card.year?' ('+card.year+')':'');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const number=value=>Number.isFinite(value)&&value>0?String(value):'';
const statuses={Ended:'Завершён',Running:'Продолжается','In Development':'В разработке','To Be Determined':'Продолжение под вопросом'};

export function currentFinalists(state,screen){
 if(screen?.type!=='result')return [];
 const result=screen.result??state?.result;
 if(!result?.top)return [];
 const seen=new Set(state?.familiar?.marked??[]);
 return [result.top,...(result.alternatives??[]).slice(0,3)].filter(card=>{
  if(!card?.id||seen.has(card.id))return false;
  seen.add(card.id);return true;
 });
}

function factInfo(card,id){
 return card.explanation?.info?.find(info=>info.factIds?.includes(id))?.text??'';
}

export function comparisonRows(cards,domain){
 if(cards.length!==2||cards[0].id===cards[1].id)return [];
 const rows=[];
 const add=(label,read)=>{
  const values=cards.map(read);
  if(values[0]!==values[1])rows.push({label,values});
 };
 if(domain!=='game'){
  add('Длительность',card=>{
   if(!number(card.runtime))return '';
   if(card.kind==='series')return card.runtime+' мин · '+(domain==='anime'?'первая серия':'эпизод');
   return card.runtime+' мин'+(card.kind==='film'?' · фильм':'');
  });
 }
 add('Жанры',card=>[...new Set(genreLabels(card,domain))].sort((a,b)=>a.localeCompare(b,'ru')).join(', '));
 if(domain==='game'){
  add('Число игроков',card=>card.feasibility?.find(check=>check.key==='players'&&['yes','conditional','no'].includes(check.status))?.text??'');
  add('Steam Deck',card=>factInfo(card,'fact:deck'));
 }else{
  add('Формат',card=>({film:'Фильм',series:'Сериал'})[card.kind]??'');
  add('Сезоны',card=>number(card.seasons));
  add('Эпизоды',card=>number(card.episodes));
  add('Статус сериала',card=>Object.hasOwn(statuses,card.status)?statuses[card.status]:'');
 }
 add('Год выхода',card=>number(card.year));
 add(domain==='game'?'Отзывы в Steam':'Оценки зрителей',card=>factInfo(card,'fact:reviews'));
 return rows;
}

const glyphs={
 close:'M6 6l12 12M18 6 6 18', arrow:'M5 12h13m-5-5 5 5-5 5',
 prev:'m14 6-6 6 6 6', next:'m10 6 6 6-6 6',
};
const icon=key=>'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="'+glyphs[key]+'"/></svg>';
const titleOf=card=>card.ru||card.name||card.title||'Без названия';
const cover=(card,domain)=>resultArtworkHtml(card,{title:titleOf(card),domain,eager:true,extra:domain==='anime'?animeArtwork(card.id)?.url:null});

function finalistPanel(slot,canSwitch){
 const side=slot===0?'слева':'справа';
 const arrows=canSwitch?`<div class="finalist-controls">
  <button type="button" data-step="-1" aria-label="Предыдущий вариант ${side}">${icon('prev')}</button>
  <button type="button" data-step="1" aria-label="Следующий вариант ${side}">${icon('next')}</button>
 </div>`:'';
 return `<article class="finalist-panel" data-slot="${slot}" aria-labelledby="finalist-title-${slot}">
  ${arrows}<div class="finalist-stage"></div><div class="finalist-identity"></div></article>`;
}

export function comparisonReasonsHtml(cards){
 const reasons=cards.map(resultCardReason);
 const sharedReason=reasons.length===2&&reasons[0]===reasons[1]?reasons[0]:'';
 const entries=cards.map((card,i)=>{
  const reason=reasons[i];
  const caveat=[card.ai?.caveat,card.caveat].find(text=>typeof text==='string'&&text.trim())?.trim();
  const paragraphs=[];
  if(reason&&!sharedReason)paragraphs.push(`<p>${esc(reason)}</p>`);
  if(caveat&&caveat!==reason)paragraphs.push(`<p class="finalist-caveat"><strong>Учти</strong> ${esc(caveat)}</p>`);
  if(!paragraphs.length)return '';
  return `<section data-slot="${i}"><h4>${esc(titleOf(card))}</h4>
   ${paragraphs.join('')}</section>`;
 });
 if(sharedReason){
  const details=entries.some(Boolean)?'<div class="finalist-reasons">'+entries.join('')+'</div>':'';
  return '<h3>Почему подходят оба варианта</h3><p class="finalist-shared-reason">'+esc(sharedReason)+'</p>'+details;
 }
 if(entries.every(entry=>!entry))return '<p class="finalist-empty">В этой подборке для пары нет пояснений к запросу.</p>';
 const columns=entries.map((entry,i)=>entry||`<section data-slot="${i}"><h4>${esc(titleOf(cards[i]))}</h4><p>Для этого варианта нет пояснения к запросу.</p></section>`);
 return '<h3>Под твой запрос</h3><div class="finalist-reasons">'+columns.join('')+'</div>';
}

function comparisonValue(label,value,sameFilmFormat){
 if(!value)return '<span class="finalist-unknown">Нет данных</span>';
 if(label==='Длительность'){
  const [time,unit]=value.split(' · ');
  return '<strong class="finalist-time">'+esc(time)+'</strong>'+(unit&&!(sameFilmFormat&&unit==='фильм')?'<small>'+esc(unit)+'</small>':'');
 }
 if(label==='Оценки зрителей'){
  const rating=/^(IMDb\s+)?(\d+(?:[.,]\d+)?) из 10, (.+)$/u.exec(value);
  if(rating)return '<span class="finalist-rating">'+esc((rating[1]??'')+rating[2].replace('.',','))+' из 10</span><small>'+esc(rating[3])+'</small>';
 }
 return esc(value);
}

function comparisonTable(cards,domain){
 // Each card already shows its year; the screen reader table headers also include it.
 const rows=comparisonRows(cards,domain).filter(row=>row.label!=='Год выхода'||cards.some(card=>!card.year));
 if(!rows.length)return '<p class="finalist-empty">Других различий по известным характеристикам нет.</p>';
 const sameFilmFormat=cards.every(card=>card.kind==='film');
 const body=rows.map(({label,values})=>'<tr><th scope="row">'+esc(label)+'</th>'+
  values.map(value=>'<td>'+comparisonValue(label,value,sameFilmFormat)+'</td>').join('')+'</tr>').join('');
 return '<table class="finalist-table" role="table"><caption class="finalist-sr">Чем отличаются</caption><thead class="finalist-sr"><tr><th scope="col">Свойство</th>'+
  cards.map(card=>'<th scope="col">'+esc(nameOf(card))+'</th>').join('')+'</tr></thead><tbody>'+body+'</tbody></table>';
}

export function openComparison(dialog,cards,domain,onCard){
 if(cards.length<2)return;
 // The displayed pair is a preview of the batch. No choice or feedback is recorded.
 const pair=cards.slice(0,2);
 dialog.classList.add('finalist-dialog');
 dialog.innerHTML='<header class="finalist-heading"><h2 id="result-dialog-title" tabindex="-1" autofocus>Сравнение</h2><button class="finalist-close" type="button" data-close aria-label="Закрыть сравнение">'+icon('close')+'</button></header>'
  +'<div class="finalist-pair">'+pair.map((_,i)=>finalistPanel(i,cards.length>2)).join('')+'</div>'
  +'<section data-comparison-copy></section><div data-comparison></div><span class="finalist-sr" role="status"></span>';
 const panels=dialog.querySelectorAll('.finalist-panel');
 function drawCard(slot){
  const card=pair[slot],panel=panels[slot];
  panel.querySelector('.finalist-stage').innerHTML=cover(card,domain);
  panel.querySelector('.finalist-identity').innerHTML=(card.year?'<div class="finalist-year">'+esc(card.year)+'</div>':'')
   +`<h3 id="finalist-title-${slot}"><button type="button" data-open-card="${esc(card.id)}" aria-label="К карточке «${esc(nameOf(card))}»"><span>${esc(titleOf(card))}</span>${icon('arrow')}</button></h3>`;
 }
 function drawDetails(){
  dialog.querySelector('[data-comparison-copy]').innerHTML=comparisonReasonsHtml(pair);
  dialog.querySelector('[data-comparison]').innerHTML=comparisonTable(pair,domain);
 }
 dialog.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-open-card')){dialog.close();onCard(button.dataset.openCard);return;}
  if(!button.hasAttribute('data-step'))return;
  const slot=Number(button.closest('[data-slot]').dataset.slot);
  const available=cards.filter(card=>card.id!==pair[1-slot].id);
  const index=available.indexOf(pair[slot]);
  pair[slot]=available[(index+Number(button.dataset.step)+available.length)%available.length];
  drawCard(slot);drawDetails();
  dialog.querySelector('[role="status"]').textContent='Сравниваются '+pair.map(nameOf).join(' и ')+'.';
 });
 drawCard(0);drawCard(1);drawDetails();dialog.showModal();
}

// Native dialog owns the focus trap and Escape. A changed selection invalidates an open preview.
let activeDialog=null;
export function syncResultDialog(state,screen,busy){
 if(activeDialog&&(busy||screen?.type!=='result'||activeDialog.dataset.scope!==JSON.stringify([state?.id,state?.revision,currentFinalists(state,screen).map(card=>card.id)])))activeDialog.close();
}
export function resultDialog(state,screen){
 activeDialog?.close();
 const dialog=document.createElement('dialog');
 dialog.className='result-dialog';
 dialog.setAttribute('aria-labelledby','result-dialog-title');
 dialog.dataset.scope=JSON.stringify([state.id,state.revision,currentFinalists(state,screen).map(card=>card.id)]);
 dialog.addEventListener('click',event=>{if(event.target.closest('[data-close]'))dialog.close();});
 dialog.addEventListener('close',()=>{if(activeDialog===dialog)activeDialog=null;dialog.remove();},{once:true});
 document.body.append(dialog);
 activeDialog=dialog;return dialog;
}
