import {genreLabels} from './card-metadata.js';
import {resultArtworkHtml} from './card-artwork.js';
import {animeArtwork} from './anime-artwork.js';

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
 swap:'M4 8h15m-4-4 4 4-4 4M20 16H5m4 4-4-4 4-4',
};
const icon=key=>'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="'+glyphs[key]+'"/></svg>';
const titleOf=card=>card.ru||card.name||card.title||'Без названия';
const cover=(card,domain)=>resultArtworkHtml(card,{title:titleOf(card),domain,eager:true,extra:domain==='anime'?animeArtwork(card.id)?.url:null});

function finalistPanel(card,slot,domain,canSwitch){
 const title=esc(titleOf(card)),full=esc(nameOf(card));
 return '<article class="finalist-panel" data-slot="'+slot+'"><div class="finalist-stage">'+cover(card,domain)+'</div>'
  +'<div class="finalist-identity">'+(card.year?'<div class="finalist-year">'+esc(card.year)+'</div>':'')
  +'<h3>'+title+'</h3></div><div class="finalist-controls">'
  +'<button type="button" data-open-card="'+esc(card.id)+'" aria-label="К карточке «'+full+'»">К карточке '+icon('arrow')+'</button>'
  +(canSwitch?'<button type="button" data-switch-slot="'+slot+'" aria-expanded="false" aria-controls="finalist-picker" aria-label="Сменить вариант «'+full+'»">'+icon('swap')+'Сменить</button>':'')
  +'</div></article>';
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
 let editing=null;
 dialog.classList.add('finalist-dialog');
 dialog.innerHTML='<header class="finalist-heading"><h2 id="result-dialog-title" tabindex="-1" autofocus>Сравнить два варианта</h2><button class="finalist-close" type="button" data-close aria-label="Закрыть сравнение">'+icon('close')+'</button></header>'
  +'<div class="finalist-pair"></div><section id="finalist-picker" hidden></section><div data-comparison></div><span class="finalist-sr" role="status"></span>';
 const panels=dialog.querySelector('.finalist-pair'),picker=dialog.querySelector('#finalist-picker'),facts=dialog.querySelector('[data-comparison]');
 function drawPair(){
  panels.innerHTML=pair.map((card,i)=>finalistPanel(card,i,domain,cards.length>2)).join('');
  facts.innerHTML=comparisonTable(pair,domain);
 }
 function showPicker(slot){
  const previous=editing;
  editing=slot;
  panels.querySelectorAll('[data-switch-slot]').forEach(button=>button.setAttribute('aria-expanded',String(Number(button.dataset.switchSlot)===slot)));
  picker.hidden=slot===null;
  if(slot===null){
   picker.replaceChildren();
   if(previous!==null)panels.querySelector('[data-switch-slot="'+previous+'"]')?.focus();
   return;
  }
  const available=cards.filter(card=>pair.every(selected=>selected.id!==card.id));
  picker.innerHTML='<div class="finalist-picker-head"><h3>Вместо «'+esc(nameOf(pair[slot]))+'»</h3><button type="button" data-cancel-switch>Отмена</button></div><div class="finalist-candidates">'
   +available.map(card=>'<button type="button" data-finalist-id="'+esc(card.id)+'">'+cover(card,domain)+'<span>'+esc(titleOf(card))+(card.year?'<small>'+esc(card.year)+'</small>':'')+'</span>'+icon('arrow')+'</button>').join('')+'</div>';
  picker.querySelector('[data-finalist-id]')?.focus();
 }
 dialog.addEventListener('cancel',event=>{if(editing!==null){event.preventDefault();showPicker(null);}});
 dialog.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-open-card')){dialog.close();onCard(button.dataset.openCard);return;}
  if(button.hasAttribute('data-switch-slot')){const slot=Number(button.dataset.switchSlot);showPicker(slot===editing?null:slot);return;}
  if(button.hasAttribute('data-cancel-switch')){showPicker(null);return;}
  if(editing===null||!button.hasAttribute('data-finalist-id'))return;
  const next=cards.find(card=>card.id===button.dataset.finalistId);
  if(!next||pair.some(card=>card.id===next.id))return;
  pair[editing]=next;drawPair();showPicker(null);
  dialog.querySelector('[role="status"]').textContent='Сравниваются '+pair.map(nameOf).join(' и ')+'.';
 });
 drawPair();dialog.showModal();
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
