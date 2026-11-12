import {qaFetch as fetch,qaStorage,qaFeedbackOptions} from '/shared/qa-session.js';
import {createLibraryStore,LIBRARY_KEY,safeLibraryUrl} from '/shared/library-store.js';
import {createGameHistory,GAME_HISTORY_PREFIX} from '/shared/game-history.js';
import {createMediaHistory,MEDIA_HISTORY_PREFIX} from '/shared/media-history.js';
import {createFeedbackStore,FEEDBACK_KEY} from '/shared/evening-feedback.js';
import {eveningControls,feedbackStatus} from '/shared/evening-view.js';
import {initCustomSelects,focusCustomSelect} from '/shared/custom-select.js';
import {createFeedbackDrafts,FEEDBACK_DRAFTS_KEY} from '/shared/feedback-drafts.js';
import {createSelectionArchive,SELECTION_ARCHIVE_KEY,selectionUrl} from '/shared/selection-archive.js';

const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const DOMAINS={game:'Игры',film:'Фильмы',series:'Сериалы',cartoon:'Мультфильмы'};
const NOUNS={game:'игра',film:'фильм',series:'сериал',cartoon:'мультфильм'};
const LANES={want:'На потом',tonight:'На этот вечер',known:'Уже знакомо'};
const EXPOSURES={played:'Уже играл',started:'Начал',finished:'Прошёл',paused:'Отложил'};
const key=row=>`${row.domain}:${row.id}`;
const title=row=>String(row.title||row.ru||row.name||'Без названия');
const icon=name=>`<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">${({search:'<circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/>',close:'<path d="m5 5 10 10M15 5 5 15"/>',arrow:'<path d="M3 10h13m-5-5 5 5-5 5"/>',book:'<path d="M5 3h10v14l-5-3-5 3V3Z"/>'})[name]||''}</svg>`;
let storage;try{storage=qaStorage(localStorage);}catch{/* keep this visit in memory */}
const library=createLibraryStore({storage});
const archive=createSelectionArchive({storage});
const familiar=createGameHistory({storage});
const mediaHistories=Object.fromEntries(['film','series','cartoon'].map(domain=>[domain,createMediaHistory(domain,{storage})]));
const historyFor=domain=>domain==='game'?familiar:mediaHistories[domain];
const feedback=createFeedbackStore({storage,...qaFeedbackOptions(storage),send:async run=>{
 const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({run})});
 if(!response.ok)throw Error('Feedback unavailable');return response.json();
},onChange:()=>{
 document.querySelectorAll('[data-feedback-status]').forEach(el=>{el.textContent=feedbackStatus(feedback.status(el.dataset.feedbackStatus),feedback.persistent);});
}});
const defaultFilters=()=>({query:'',domain:'all',reaction:'all',status:'all',sort:'added',open:false});
const viewFilters={board:defaultFilters(),history:defaultFilters(),evenings:defaultFilters()};
const activeFilters=()=>viewFilters[state.view];
const eveningStatuses={all:'Любой',chosen:'Выбрано',started:'Начато',reviewed:'Есть отзыв',draft:'Есть черновик'};
const state={view:'board',lane:'want',limit:24,undo:null};
const initialView=new URLSearchParams(globalThis.location?.search??'').get('view');
if(['history','evenings'].includes(initialView))state.view=initialView;
const metadata=new Map(),requested=new Set(),failedImages=new Set(),openDetails=new Set(),feedbackDrafts=createFeedbackDrafts({storage});
let noticeTimer,feedbackQueue=Promise.resolve(),feedbackQueued=0,feedbackDirty=false;
const date=value=>{const at=new Date(value);return Number.isFinite(at.valueOf())?at.toLocaleDateString('ru',{day:'numeric',month:'short',year:'numeric'}):'Дата не сохранена';};
const button=(label,act,attrs='',primary=false)=>`<button type="button" class="library-button${primary?' primary':''}" data-act="${act}" ${attrs}>${label}</button>`;
const pickLink=(label='Подобрать')=>`<a class="library-button" href="/pick/start/">${label} ${icon('arrow')}</a>`;
function notice(text){$('#library-notice').textContent=text;$('#library-notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{$('#library-notice').hidden=true;},5000);}

function records() {
 const rows=library.all().map(row=>({...row,saved:true})),byId=new Map(rows.map(row=>[key(row),row]));
 for(const entry of familiar.all()) {
  const k=`game:${entry.id}`,prior=byId.get(k),extra=metadata.get(key({domain:'game',id:entry.id}))??{};
  if(prior){prior.familiarity=entry;for(const field of ['image','poster','year','link'])if(!prior[field]&&extra[field])prior[field]=extra[field];}
  else {const row={...extra,id:entry.id,title:entry.title,domain:'game',lane:'known',status:'known',addedAt:entry.updatedAt,updatedAt:entry.updatedAt,familiarity:entry,saved:false};rows.push(row);byId.set(k,row);}
 }
 for(const [domain,history] of Object.entries(mediaHistories))for(const entry of history.all()){
  const k=`${domain}:${entry.id}`,prior=byId.get(k);
  if(prior){prior.familiarity=entry;for(const field of ['image','poster','year','link'])if(!prior[field]&&entry[field])prior[field]=entry[field];}
  else{const row={...entry,domain,lane:'known',status:'known',addedAt:entry.updatedAt,familiarity:entry,saved:false};rows.push(row);byId.set(k,row);}
 }
 return rows;
}
function filtered(rows,matches=()=>true) {
 const {query,domain,sort}=activeFilters(),needle=query.trim().toLocaleLowerCase('ru');
 const at=row=>new Date(row.at??row.addedAt??0).valueOf()||0;
 return rows.filter(row=>(domain==='all'||row.domain===domain)&&matches(row)
  &&(!needle||`${title(row)} ${row.original??''} ${row.searchText??''}`.toLocaleLowerCase('ru').includes(needle)))
 .sort(sort==='title'?(a,b)=>title(a).localeCompare(title(b),'ru'):sort==='oldest'?(a,b)=>at(a)-at(b):(a,b)=>at(b)-at(a));
}
function hasSearchFilters(){
 const {query,domain,reaction,status}=activeFilters();
 return Boolean(query.trim()||domain!=='all'||reaction!=='all'||status!=='all');
}
const reviewed=response=>Boolean(response?.fit||response?.outcome||response?.reason||response?.note);
const eveningMatches=({response,draft},status)=>status==='all'
 ||status==='chosen'&&Boolean(response?.chosen)||status==='started'&&Boolean(response?.started)
 ||status==='reviewed'&&reviewed(response)||status==='draft'&&Boolean(draft);
function media(row) {
 const src=[row.poster,row.image].map(safeLibraryUrl).find(url=>url&&!failedImages.has(url));
 return `<div class="library-cover${src?'':' no-cover'}" aria-hidden="true"><small>Нет фото</small>${src?`<img src="${esc(src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`:''}</div>`;
}
const dataFor=row=>`data-domain="${esc(row.domain)}" data-id="${esc(row.id)}"`;
const focusKey=(act,row)=>esc(`${act}:${key(row)}`);
function card(row) {
 const attrs=dataFor(row),k=key(row),url=safeLibraryUrl(row.link),exposure=row.familiarity;
 const rating=row.status==='liked'?'Зашло':row.status==='disliked'?'Не зашло':'';
 const ratingButton=(status,label)=>`<button type="button" class="library-button rating-button" data-act="rate" ${attrs} data-value="${status}" data-focus="${focusKey(`rate-${status}`,row)}" aria-pressed="${row.status===status}">${label}</button>`;
 return `<article class="board-card" data-card="${esc(k)}">${media(row)}<div class="board-card-copy"><p class="library-meta">${esc([row.year,NOUNS[row.domain]].filter(Boolean).join(' · '))}</p><h3>${esc(title(row))}</h3>`
  +(rating?`<p class="rating-label ${row.status}">${rating}</p>`:'')
  +`</div><div class="board-card-actions"><label class="move-control"><span class="library-sr-only">Список для ${esc(title(row))}</span><select data-act="move" ${attrs} data-focus="${focusKey('move',row)}">${Object.entries(LANES).map(([id,label])=>`<option value="${id}"${row.lane===id?' selected':''}>${label}</option>`).join('')}</select></label>`
  +`<button type="button" class="library-remove" data-act="${row.saved?'remove':'forget'}" ${attrs} data-focus="${focusKey('remove',row)}" aria-label="${row.saved?'Убрать из библиотеки':'Забыть знакомство'}: ${esc(title(row))}" title="${row.saved?'Убрать из библиотеки':'Забыть знакомство'}">${icon('close')}</button></div>`
  +`<details class="card-details" data-detail="card:${esc(k)}"${openDetails.has(`card:${k}`)?' open':''}><summary data-focus="${focusKey('details',row)}">${exposure?'Отношение и знакомство':rating?'Изменить оценку':'Твоё отношение'}</summary><div class="card-details-content">`
  +`<p>Что думаешь об этом ${row.domain==='game'?'опыте':'названии'}? Оценка относится к вкусу, список — к планам.</p><div class="rating-actions">${ratingButton('liked','Зашло')}${ratingButton('disliked','Не зашло')}${rating?button('Убрать оценку','rate',`${attrs} data-value="none" data-focus="${focusKey('rate-none',row)}"`):''}</div>`
  +(row.answer?'<p class="library-meta">Твои прежние уточнения к оценке сохранены и учитываются в подборе.</p>':'')
  +(exposure?`<div class="familiarity-facts"><p>${esc(row.domain==='game'?(EXPOSURES[exposure.exposure]||'Уже знакомо'):({seen:'Уже смотрел',started:'Начал смотреть',finished:'Досмотрел',dropped:'Не досмотрел',paused:'Отложил'}[exposure.exposure]||'Уже знакомо'))} · ${esc(date(exposure.updatedAt))}</p><label class="library-check"><input type="checkbox" data-act="blocked" ${attrs} data-focus="${focusKey('blocked',row)}"${exposure.blocked?' checked':''}> Не предлагать в следующих подборах</label><p class="library-meta">Знакомство само по себе не означает положительную оценку.</p>${row.saved?button('Забыть знакомство','forget',`${attrs} data-focus="${focusKey('forget',row)}"`):'<p class="library-meta">Крестик убирает эту отметку знакомства. Перенос в другой список сохранит её отдельно.</p>'}</div>`:'')
  +(url?`<a class="library-source" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${row.domain==='game'?'Открыть игру':'Открыть страницу'} ${icon('arrow')}</a>`:'')+'</div></details></article>';
}
function filters() {
 const {query,domain,reaction,status,sort,open}=activeFilters();
 const activeCount=Number(domain!=='all')+Number(reaction!=='all')+Number(status!=='all')+Number(sort!=='added');
 const select=(id,label,options,value)=>`<label class="library-filter"><span>${label}</span><select id="${id}">${Object.entries(options).map(([key,text])=>`<option value="${key}"${value===key&&key!=='all'?' selected':''}>${text}</option>`).join('')}</select></label>`;
 return `<div class="library-filters" data-view-filters="${state.view}"><label class="library-search">${icon('search')}<span class="library-sr-only">Найти название</span><input id="find-title" type="search" placeholder="Найти название" autocomplete="off" value="${esc(query)}"></label>`
 +`<div class="library-filter-actions">${button(`Фильтры и порядок${activeCount?`<span class="filter-active-count">${activeCount}</span>`:''}<svg class="filter-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m6 8 4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,'filters',`data-focus="filters-toggle" aria-expanded="${open}" aria-controls="library-filter-options"`)}${button('Сбросить','clear',`data-focus="filters-reset"${query||activeCount?'':' disabled'}`)}</div>`
 +`<div class="library-filter-panel" id="library-filter-panel" data-active-count="${activeCount}" data-filter-open="${open}"><div class="library-filter-options" id="library-filter-options" data-filter-options>`
 +select('domain-filter','Раздел',{all:'Всё',...DOMAINS},domain)
 +(state.view==='board'?select('reaction-filter','Отношение',{all:'Любое',liked:'Зашло',disliked:'Не зашло',unrated:'Без оценки'},reaction):'')
 +(state.view==='evenings'?select('status-filter','Статус',eveningStatuses,status):'')
 +select('sort','Порядок',{added:'Сначала новые',oldest:'Сначала давние',title:'По названию'},sort)+'</div></div></div>';
}
function resultCount(shown,total){return hasSearchFilters()?`<p class="library-count" role="status">Найдено ${shown} из ${total}</p>`:'';}
function noMatches(){return '<div class="library-empty wide-empty"><h2>Нет совпадений</h2><p>Попробуй другое название или сбрось фильтры.</p>'+button('Сбросить фильтры','clear')+'</div>';}
function empty(lane,hasFilters) {
 return `<div class="library-empty"><h3>${hasFilters?'Нет совпадений':lane==='tonight'?'Вечер ещё свободен':lane==='known'?'Здесь будет знакомое':'Здесь будут твои планы'}</h3><p>${hasFilters?'Попробуй другое название или сбрось фильтры.':lane==='tonight'?'Перенеси сюда сохранённое, к которому хочешь вернуться сегодня.':lane==='known'?'Знакомые названия и явные оценки будут видны здесь. Знакомство и вкус хранятся отдельно.':'Сохрани вариант из подбора — он появится здесь.'}</p>${hasFilters?button('Сбросить фильтры','clear'):lane==='want'?pickLink('Найти вариант'):''}</div>`;
}
function undoLine(){return state.undo?`<div class="library-undo" role="status"><span>${esc(state.undo.message)}</span>${button('Вернуть','undo','data-focus="undo"')}</div>`:'';}
function board() {
 const all=records(),{reaction}=activeFilters();
 const rows=filtered(all,row=>reaction==='all'||(reaction==='unrated'?!['liked','disliked'].includes(row.status):row.status===reaction));
 const items=rows.filter(row=>row.lane===state.lane),shown=items.slice(0,state.limit);
 return (all.length?filters():'')+undoLine()
  +(all.length?resultCount(rows.length,all.length):'')
  +`<nav class="board-switch" aria-label="Списки библиотеки">${Object.entries(LANES).map(([id,label])=>{
   const count=rows.filter(row=>row.lane===id).length;
   return `<button type="button" data-act="lane" data-lane="${id}" data-focus="lane:${id}" aria-pressed="${state.lane===id}" aria-controls="lane-${id}">${label}${count?`<span>${count}</span>`:''}</button>`;
  }).join('')}</nav><div class="library-board">`
  +`<section class="library-lane lane-${state.lane}" id="lane-${state.lane}" data-active="true" aria-label="${LANES[state.lane]}">${items.length?`<header><div><h2>${LANES[state.lane]}</h2><p>${state.lane==='want'?'Варианты, к которым хочешь вернуться.':state.lane==='tonight'?'То, что выбрал на ближайший вечер.':'Знакомство не означает ни оценку, ни запрет в подборе.'}</p></div></header>`:''}<div class="library-card-list">${shown.map(card).join('')||empty(state.lane,Boolean(all.length&&hasSearchFilters()))}</div>${items.length>shown.length?`<div class="library-more"><p>Показано ${shown.length} из ${items.length}</p>${button(`Показать ещё ${Math.min(24,items.length-shown.length)}`,'more','data-focus="library-more"')}</div>`:''}</section></div>`
  +'<p class="library-footnote">Списки, оценки и отметки о знакомых названиях сохранены в этом браузере. Перенос между списками не меняет твой вкус.</p>';
}
const legacyHistory=()=>library.history().filter(row=>row&&typeof row==='object').reverse();
function historyRecords(){
 const saved=archive.all().map(row=>{
  const result=row.snapshot.state.result,top=result.top,alternatives=result.alternatives??[];
  return {...row,top,alternatives,title:top.ru||top.name||top.title,
   searchText:[top,...alternatives].map(card=>[card.ru,card.name,card.title,card.original].filter(Boolean).join(' ')).join(' ')};
 });
 return [...saved,...legacyHistory().map((row,legacyIndex)=>({...row,legacyIndex,
  searchText:(Array.isArray(row.alternatives)?row.alternatives:[]).map(card=>card?.title).filter(Boolean).join(' ')}))];
}
function historyView(all) {
 if(!all.length)return '<div class="library-empty wide-empty"><h2>Здесь будут твои подборы</h2><p>Результат сохраняется автоматически: запрос и все предложенные варианты. Можно вернуться к нему в этом браузере.</p>'+pickLink('Подобрать на вечер')+'</div>';
 const rows=filtered(all),saved=library.all();
 const entries=rows.map(row=>{
  if(row.snapshot){
   const {snapshot,top,alternatives}=row;
   return `<article class="history-row history-selection">${media(top)}<div><p class="library-meta">${esc(date(row.at))} · ${esc(DOMAINS[row.domain])}</p><h2>${esc(title(row))}</h2><p>${esc(snapshot.screen.summary||snapshot.state.summary||'Варианты на твой вечер')}</p>${alternatives.length?`<p class="history-alternatives">Ещё: ${esc(alternatives.map(card=>card.ru||card.name||card.title).join(', '))}</p>`:''}</div><a class="library-button primary" href="${selectionUrl(row)}">Открыть подбор ${icon('arrow')}</a></article>`;
  }
  return `<article class="history-row">${media(row)}<div><p class="library-meta">${esc([date(row.at),NOUNS[row.domain]].filter(Boolean).join(' · '))}</p><h2>${esc(title(row))}</h2>${Array.isArray(row.alternatives)&&row.alternatives.length?`<p>Ещё варианты: ${esc(row.alternatives.map(card=>card?.title).filter(Boolean).join(', '))}</p>`:''}</div>${saved.some(item=>item.domain===row.domain&&item.id===row.topId)?'<span class="history-saved">В библиотеке</span>':button('На потом','save-history',`data-index="${row.legacyIndex}" data-focus="history:${row.legacyIndex}"`)}</article>`;
 }).join('');
 return filters()+resultCount(rows.length,all.length)+(entries?`<div class="library-history">${entries}</div>`:noMatches());
}
function eveningRecords(){
 const drafts=new Map(feedbackDrafts);
 return feedback.all().flatMap(run=>run.cards.flatMap(card=>{
  const response=run.responses.find(row=>row.cardId===card.id),draft=drafts.get(`${run.id}:${card.id}`);
  if(!response?.chosen&&!reviewed(response)&&!draft)return [];
  return [{run,card,response,draft,title:title(card),domain:run.domain,at:run.at}];
 }));
}
function eveningArtwork(){
 const artwork=new Map(metadata);
 for(const row of archive.all().reverse()){
  const result=row.snapshot.state.result;
  for(const card of [result.top,...(result.alternatives??[])])if(card.poster||card.image)artwork.set(key({...card,domain:row.domain}),card);
 }
 for(const row of records())if(row.poster||row.image)artwork.set(key(row),row);
 return artwork;
}
function eveningsView(all) {
 if(!all.length)return '<div class="library-empty wide-empty"><h2>Здесь будут твой выбор и отзывы</h2><p>Выбери вариант на сегодня или оцени его в подборе.</p>'+pickLink('Подобрать на вечер')+'</div>';
 const {status}=activeFilters(),rows=filtered(all,row=>eveningMatches(row,status)),artwork=eveningArtwork();
 const entries=rows.map(({run,card,response,draft})=>{
  const pair=`${run.id}:${card.id}`,detail=`evening:${pair}`,outcome=`outcome:${pair}`;
  const cover=artwork.get(key({domain:run.domain,id:card.id}))??card;
  const label=response?.started?'Начато':response?.chosen?'Выбрано':reviewed(response)?'Есть отзыв':'Черновик';
  const controls=eveningControls(run,card.id,{
   modern:true,history:true,open:openDetails.has(`feedback:${pair}`),
   ratingOpen:openDetails.has(`rating:${pair}`),outcomeOpen:openDetails.has(outcome),
   status:feedback.status(run.id),persistent:feedback.persistent,draft,
  });
  return `<details class="library-evening" data-detail="${esc(detail)}"${openDetails.has(detail)?' open':''}><summary data-focus="${esc(detail)}">${media(cover)}<div class="evening-summary-copy"><strong>${esc(title(card))}</strong><span>${esc(date(run.at))} · ${esc(DOMAINS[run.domain])}</span><small class="evening-state" data-chosen="${Boolean(response?.chosen)}">${label}</small></div></summary><div class="evening-content">${run.context.note?`<p class="evening-context">${esc(run.context.note)}</p>`:''}<article class="evening-card">${controls}</article></div></details>`;
 }).join('');
 return filters()+resultCount(rows.length,all.length)+(entries?`<div class="library-evenings">${entries}</div>`:noMatches());
}
function render({feedbackFocus,focus:requestedFocus}={}) {
 const active=document.activeElement,focus=requestedFocus??active?.dataset.focus,feedbackKey=feedbackFocus??active?.dataset.fk,id=active?.id,selection=active instanceof HTMLInputElement?[active.selectionStart,active.selectionEnd]:null;
 const evenings=eveningRecords(),past=historyRecords();
 const counts={board:records().length,history:past.length,evenings:evenings.length};
 $('#library-app').innerHTML=`<nav class="library-views" aria-label="В библиотеке">${Object.entries({board:'Списки',history:'Подборы',evenings:'Выбор и отзывы'}).map(([view,label])=>`<button type="button" data-act="view" data-view="${view}" data-focus="view:${view}" aria-pressed="${state.view===view}">${label}${counts[view]?`<span>${counts[view]}</span>`:''}</button>`).join('')}</nav>`
  +(!library.persistent||state.view==='history'&&!archive.persistent||!familiar.persistent||Object.values(mediaHistories).some(h=>!h.persistent)||state.view==='evenings'&&(!feedback.persistent||!feedbackDrafts.persistent)?'<p class="library-storage-note" role="status">Браузер не разрешил сохранить часть изменений. Они останутся в этом окне до его закрытия.</p>':'')
  +(state.view==='board'?board():undoLine()+(state.view==='history'?historyView(past):eveningsView(evenings)));
 $('#library-app').setAttribute('aria-busy','false');
 const target=focus?document.querySelector(`[data-focus="${CSS.escape(focus)}"]`):feedbackKey?document.querySelector(`[data-fk="${CSS.escape(feedbackKey)}"]`):id?document.getElementById(id):null;
 initCustomSelects(document);
 const fallback=feedbackKey&&state.view==='evenings'?$('[data-focus="view:evenings"]'):null;
 focusCustomSelect(target??fallback,{preventScroll:true});if(target instanceof HTMLInputElement&&selection&&target.type==='search')target.setSelectionRange(...selection);
}
function rowFor(el){return records().find(row=>row.domain===el.dataset.domain&&row.id===el.dataset.id);}
function saveRow(row,lane){return library.save(row,{domain:row.domain,lane});}
function removeRow(row) {
 const removed=library.remove(row.domain,row.id);if(!removed)return;
 state.undo={type:'library',removed,message:`Убрано из библиотеки: «${title(row)}».${row.familiarity?' Отметка знакомства осталась.':''}`};render();
 document.querySelector('[data-act="undo"]')?.focus({preventScroll:true});
}
function forgetRow(row) {
 const history=historyFor(row.domain),entry=history?.all().find(item=>item.id===row.id);if(!entry)return;
 history.forget(row.id);state.undo={type:'familiar',domain:row.domain,entry,message:`Убрана отметка знакомства с «${entry.title}».${row.saved?' План и оценка сохранены.':''}`};render();
 document.querySelector('[data-act="undo"]')?.focus({preventScroll:true});
}
function undo() {
 const entry=state.undo;if(!entry)return;let restored=false;
 if(entry.type==='library')restored=Boolean(library.restore(entry.removed));
 else{const history=historyFor(entry.domain??'game');if(history&&!history.all().some(row=>row.id===entry.entry.id))restored=Boolean(history.remember(entry.entry,{exposure:entry.entry.exposure,blocked:entry.entry.blocked}));}
 state.undo=null;render();notice(restored?'Вернули сохранённое.':'Это название уже сохранено заново. Новая запись оставлена.');
}
function editEvening(el,action) {
 const rid=el.dataset.run,cid=el.dataset.id,queuedAction={...action},focusKey=el.dataset.fk;
 feedbackQueued++;el.disabled=true;
 const apply=async()=>{
  try {
   if(!await feedback.update(rid,cid,queuedAction)){notice('Не удалось сохранить отзыв. Повтори действие.');return;}
   feedbackDirty=true;
   if(queuedAction.type==='explain') {
    const draftKey=`${rid}:${cid}`,draft=feedbackDrafts.get(draftKey);
    if(draft?.note===queuedAction.note&&(draft.reason||null)===queuedAction.reason)feedbackDrafts.delete(draftKey);
    openDetails.delete(`feedback:${draftKey}`);
   }
   if(queuedAction.type==='choose'&&queuedAction.value){const run=feedback.get(rid),card=run.cards.find(card=>card.id===cid),prior=library.all().find(row=>row.domain===run.domain&&row.id===cid);if(card&&prior?.lane!=='want')library.save(prior??card,{domain:run.domain,lane:'tonight'});}
   let feedbackFocus=focusKey;
   if(['choose','start'].includes(queuedAction.type))feedbackFocus=`evening-${queuedAction.type}:${rid}:${cid}:${queuedAction.value?'off':'on'}`;
   if(['fit','explain','outcome'].includes(queuedAction.type)){
    const panel=queuedAction.type==='outcome'?'outcome':'rating';
    openDetails.delete(`${panel}:${rid}:${cid}`);
    feedbackFocus=`evening-${panel}:${rid}:${cid}`;
   }
   render({feedbackFocus});
  }catch{notice('Отзыв пока не сохранён. Повтори действие.');}
  finally {
   feedbackQueued--;if(el.isConnected)el.disabled=false;
   // Drain explicit local edits first; the store keeps network delivery asynchronous.
   if(feedbackQueued===0&&feedbackDirty){feedbackDirty=false;void feedback.flush();}
  }
 };
 feedbackQueue=feedbackQueue.then(apply,apply);return feedbackQueue;
}
document.addEventListener('click',event=>{
 const el=event.target instanceof Element?event.target.closest('button[data-act]'):null;if(!el)return;
 const act=el.dataset.act,row=rowFor(el);
 if(act==='view'){state.view=el.dataset.view;render();void enrichCovers();return;}
 if(act==='filters'){activeFilters().open=!activeFilters().open;render();return;}
 if(act==='lane'){state.lane=el.dataset.lane;state.limit=24;render();return;}
 if(act==='more'){state.limit+=24;render();return;}
 if(act==='clear'){Object.assign(activeFilters(),defaultFilters(),{open:activeFilters().open});state.limit=24;render();$('#find-title')?.focus();return;}
 if(act==='undo'){undo();return;}
 if(act==='remove'&&row){removeRow(row);return;}
 if(act==='forget'&&row){forgetRow(row);return;}
 if(act==='rate'&&row){if(!row.saved)saveRow(row,row.lane);library.rate(row.domain,row.id,el.dataset.value==='none'?null:el.dataset.value);openDetails.delete(`card:${key(row)}`);render({focus:`details:${key(row)}`});notice('Оценка сохранена.');return;}
 if(act==='save-history'){const h=legacyHistory()[Number(el.dataset.index)];if(h&&library.save({...h,id:h.topId},{domain:h.domain})){render();notice('Сохранено на потом.');}else notice('У этой старой записи не сохранился раздел или идентификатор. Её нельзя добавить в планы.');return;}
 const actions={'evening-fit':{type:'fit',value:el.dataset.v},'evening-choose':{type:'choose',value:el.dataset.v==='on'},'evening-start':{type:'start',value:el.dataset.v==='on'},'evening-outcome':{type:'outcome',value:el.dataset.v}};
 if(actions[act])void editEvening(el,actions[act]);
});
document.addEventListener('change',event=>{
 const el=event.target;
 if(el.id==='domain-filter')activeFilters().domain=el.value;
 else if(el.id==='reaction-filter')activeFilters().reaction=el.value;
 else if(el.id==='status-filter')activeFilters().status=el.value;
 else if(el.id==='sort')activeFilters().sort=el.value;
 else if(el.dataset.act==='move'){const row=rowFor(el);if(row){row.saved?library.move(row.domain,row.id,el.value):saveRow(row,el.value);state.lane=el.value;notice(`Перенесено в «${LANES[el.value]}».`);}}
 else if(el.dataset.act==='blocked'){historyFor(el.dataset.domain)?.setBlocked(el.dataset.id,el.checked);notice(el.checked?'Не будем предлагать это название в следующих подборах.':'Это название снова можно предлагать.');}
 else return;
 state.limit=24;render();
});
document.addEventListener('input',event=>{
 const el=event.target;
 if(el.id==='find-title'){activeFilters().query=el.value;state.limit=24;render();}
 const form=el.closest?.('[data-form="evening-reason"]');if(form)feedbackDrafts.set(`${form.dataset.run}:${form.dataset.id}`,{reason:form.elements.reason.value,note:form.elements.note.value});
});
document.addEventListener('submit',event=>{
 const form=event.target;if(!form.matches('[data-form="evening-reason"]'))return;event.preventDefault();
 const submit=form.querySelector('button[type="submit"]');submit.dataset.run=form.dataset.run;submit.dataset.id=form.dataset.id;
 void editEvening(submit,{type:'explain',reason:form.elements.reason.value||null,note:form.elements.note.value});
});
document.addEventListener('toggle',event=>{
 const el=event.target;
 if(el.dataset.detail){el.open?openDetails.add(el.dataset.detail):openDetails.delete(el.dataset.detail);}
 if(el.matches('[data-feedback-details]')){const k=`feedback:${el.dataset.run}:${el.dataset.id}`;el.open?openDetails.add(k):openDetails.delete(k);}
},true);
document.addEventListener('error',event=>{const image=event.target;if(image instanceof HTMLImageElement&&image.closest('.library-cover')){failedImages.add(image.getAttribute('src'));image.closest('.library-cover').classList.add('no-cover');image.closest('.library-cover').innerHTML='<small>Нет фото</small>'; }},true);
document.addEventListener('load',event=>{
 const image=event.target;
 if(image instanceof HTMLImageElement&&image.naturalWidth>0)image.closest('.library-cover')?.classList.add('is-loaded');
},true);
addEventListener('storage',event=>{
 if(event.key===LIBRARY_KEY||event.key===SELECTION_ARCHIVE_KEY||event.key?.startsWith(GAME_HISTORY_PREFIX)||event.key?.startsWith(MEDIA_HISTORY_PREFIX)||event.key===null){render();void enrichCovers();}
 if(event.key===FEEDBACK_KEY||event.key===null)void feedback.refresh().then(()=>{render();});
 if(event.key===FEEDBACK_DRAFTS_KEY)render();
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();void feedback.refresh().then(()=>{render();});void enrichCovers();}});

// Match by domain and stable ID so older feedback can recover its cover.
async function enrichCovers() {
 const artwork=eveningArtwork();
 const rows=[...familiar.all().map(row=>({...row,domain:'game'})),
  ...(state.view==='evenings'?eveningRecords().map(({card,domain})=>({...card,domain})):[])];
 const queue=[];
 for(const row of rows){
  const id=key(row);
  if(requested.has(id)||artwork.has(id))continue;
  requested.add(id);queue.push(row);
 }
 let updated=false;
 const worker=async()=>{for(let entry;entry=queue.shift();) {
  try {
   const response=await fetch(`/api/search?domain=${entry.domain}&q=${encodeURIComponent(entry.title)}`);
   if(!response.ok)continue;
   const found=await response.json(),match=Array.isArray(found)?found.find(card=>card?.id===entry.id):null;
   if(match){metadata.set(key(entry),match);updated=true;}
  }catch{/* Missing artwork uses the same local fallback as the lists. */}
 }};
 await Promise.all([worker(),worker()]);
 if(updated&&(state.view==='board'||state.view==='evenings'))render();
}
const firstRows=records();
state.lane=Object.keys(LANES).find(lane=>firstRows.some(row=>row.lane===lane))??'want';
render();
// Refresh opens the authoritative IndexedDB snapshot. Viewing never observes, updates or flushes a run.
void feedback.refresh().then(()=>{render();void enrichCovers();});
