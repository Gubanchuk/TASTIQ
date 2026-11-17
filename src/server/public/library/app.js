import {animeStyleLabel,inLibraryDomain,mediaLibraryDomain} from '/shared/anime-pilot.js';
import {selectionModeTitle} from '/shared/selection-mode.js';
import {qaFetch as fetch,qaStorage,qaFeedbackOptions} from '/shared/qa-session.js';
import {createLibraryStore,LIBRARY_KEY,safeLibraryUrl} from '/shared/library-store.js';
import {collectionRecords} from '/shared/library-collection.js';
import {createGameHistory,GAME_HISTORY_PREFIX} from '/shared/game-history.js';
import {createMediaHistory,MEDIA_HISTORY_PREFIX} from '/shared/media-history.js';
import {createFeedbackStore,FEEDBACK_KEY} from '/shared/evening-feedback.js';
import {eveningControls,feedbackStatus} from '/shared/evening-view.js';
import {initCustomSelects,focusCustomSelect} from '/shared/custom-select.js';
import {createFeedbackDrafts,FEEDBACK_DRAFTS_KEY} from '/shared/feedback-drafts.js';
import {createSelectionArchive,SELECTION_ARCHIVE_KEY,selectionUrl} from '/shared/selection-archive.js';

const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const DOMAINS={game:'Игры',film:'Фильмы',series:'Сериалы',cartoon:'Мультфильмы',anime:'Аниме'};
const NOUNS={game:'игра',film:'фильм',series:'сериал',cartoon:'мультфильм',anime:'аниме'};
const VIEWS={saved:'Сохранённое',liked:'Понравилось',history:'Подборы',all:'Все отметки',evenings:'Отзывы о рекомендациях'};
const isCollection=()=>['saved','liked','all'].includes(state.view);
const EXPOSURES={played:'Уже играл',started:'Начал',finished:'Прошёл',paused:'Отложил'};
const key=row=>`${mediaLibraryDomain(row.domain,row.id)}:${row.id}`;
const title=row=>String(row.title||row.ru||row.name||'Без названия');
const icon=name=>`<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">${({search:'<circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/>',close:'<path d="m5 5 10 10M15 5 5 15"/>',arrow:'<path d="M3 10h13m-5-5 5 5-5 5"/>',book:'<path d="M5 3h10v14l-5-3-5 3V3Z"/>'})[name]||''}</svg>`;
let storage;try{storage=qaStorage(localStorage);}catch{/* keep this visit in memory */}
const library=createLibraryStore({storage});
const archive=createSelectionArchive({storage});
const familiar=createGameHistory({storage});
const mediaHistories=Object.fromEntries(['film','series','cartoon','anime'].map(domain=>[domain,createMediaHistory(domain,{storage})]));
const historyFor=domain=>domain==='game'?familiar:mediaHistories[domain];
const feedback=createFeedbackStore({storage,...qaFeedbackOptions(storage),send:async run=>{
 const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({run})});
 if(!response.ok)throw Error('Feedback unavailable');return response.json();
},onChange:()=>{
 document.querySelectorAll('[data-feedback-status]').forEach(el=>{el.textContent=feedbackStatus(feedback.status(el.dataset.feedbackStatus),feedback.persistent);});
}});
const defaultFilters=()=>({query:'',domain:'all',reaction:'all',status:'all',sort:'added',open:false,item:''});
const viewFilters=Object.fromEntries(Object.keys(VIEWS).map(view=>[view,defaultFilters()]));
const activeFilters=()=>viewFilters[state.view];
const eveningStatuses={all:'Любой',chosen:'Выбрано',started:'Начато',reviewed:'Есть отзыв',draft:'Есть черновик'};
const state={view:'saved',limit:24,undo:null};
function readNavigation(){
 const params=new URLSearchParams(globalThis.location?.search??'');
 const view=params.get('view');state.view=Object.hasOwn(VIEWS,view)?view:'saved';
 for(const [name,filters] of Object.entries(viewFilters)){
  Object.assign(filters,defaultFilters());
  filters.query=(params.get(`${name}.q`)??'').slice(0,300);
  const domain=params.get(`${name}.domain`),sort=params.get(`${name}.sort`);
  if(Object.hasOwn(DOMAINS,domain))filters.domain=domain;
  if(['oldest','title'].includes(sort))filters.sort=sort;
  if(name==='all'&&['liked','disliked','unrated','mixed'].includes(params.get(`${name}.reaction`)))filters.reaction=params.get(`${name}.reaction`);
  if(name==='evenings'){
   const status=params.get(`${name}.status`);if(Object.hasOwn(eveningStatuses,status))filters.status=status;
   filters.item=(params.get(`${name}.item`)??'').slice(0,180);
  }
  filters.open=params.get(`${name}.open`)==='1';
 }
 state.limit=24;
}
function writeNavigation(push=false){
 if(!globalThis.history?.replaceState)return;
 const params=new URLSearchParams(globalThis.location?.search??'');
 params.set('view',state.view);
 for(const [view,filters] of Object.entries(viewFilters))for(const [field,value] of Object.entries(filters)){
  const key=`${view}.${field==='query'?'q':field}`,fallback=defaultFilters()[field];
  if(value===fallback)params.delete(key);else params.set(key,field==='open'?'1':value);
 }
 const url=`${globalThis.location?.pathname??'/library/'}?${params}`;
 globalThis.history[push?'pushState':'replaceState'](null,'',url);
}
readNavigation();
const metadata=new Map(),requested=new Set(),failedImages=new Set(),openDetails=new Set(),feedbackDrafts=createFeedbackDrafts({storage});
let noticeTimer,feedbackQueue=Promise.resolve(),feedbackQueued=0,feedbackDirty=false;
const date=value=>{const at=new Date(value);return Number.isFinite(at.valueOf())?at.toLocaleDateString('ru',{day:'numeric',month:'short',year:'numeric'}):'Дата не сохранена';};
const button=(label,act,attrs='',primary=false)=>`<button type="button" class="library-button${primary?' primary':''}" data-act="${act}" ${attrs}>${label}</button>`;
const pickLink=(label='Подобрать')=>`<a class="library-button" href="/pick/start/">${label} ${icon('arrow')}</a>`;
function notice(text){$('#library-notice').textContent=text;$('#library-notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{$('#library-notice').hidden=true;},5000);}

function records() {
 const known=[...familiar.all().map(row=>({...row,domain:'game'})),...Object.entries(mediaHistories).flatMap(([domain,history])=>history.all().map(row=>({...row,domain})))];
 return collectionRecords({items:library.all(),familiar:known,runs:feedback.all()}).map(row=>{
  const extra=metadata.get(key(row))??{};
  for(const field of ['image','poster','year','link'])if(!row[field]&&extra[field])row[field]=extra[field];
  return row;
 });
}
function filtered(rows,matches=()=>true) {
 const {query,domain,sort}=activeFilters(),needle=query.trim().toLocaleLowerCase('ru');
 const at=row=>new Date(row.at??row.addedAt??0).valueOf()||0;
 return rows.filter(row=>(domain==='all'||inLibraryDomain(row,domain))&&matches(row)
  &&(!needle||`${title(row)} ${row.original??''} ${row.searchText??''}`.toLocaleLowerCase('ru').includes(needle)))
 .sort(sort==='title'?(a,b)=>title(a).localeCompare(title(b),'ru'):sort==='oldest'?(a,b)=>at(a)-at(b):(a,b)=>at(b)-at(a));
}
function hasSearchFilters(){
 const {query,domain,reaction,status,item}=activeFilters();
 return Boolean(query.trim()||domain!=='all'||reaction!=='all'||status!=='all'||item);
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
 const rating=row.ratingConflict?'Разные впечатления':({liked:'Нравится',disliked:'Не нравится',mixed:'Смешанные впечатления'}[row.rating]??'');
 const ratingButton=(status,label)=>`<button type="button" class="library-button rating-button" data-act="rate" ${attrs} data-value="${status}" data-focus="${focusKey(`rate-${status}`,row)}" aria-pressed="${row.rating===status}">${label}</button>`;
 return `<article class="board-card" data-card="${esc(k)}">${media(row)}<div class="board-card-copy"><p class="library-meta">${esc([row.year,NOUNS[row.domain],animeStyleLabel(row.id)].filter(Boolean).join(' · '))}</p><h3>${esc(title(row))}</h3>`
  +(rating?`<p class="rating-label ${esc(row.rating??'mixed')}">${rating}</p>`:'')
  +(!exposure&&(row.status==='known'||row.lane==='known')?'<p class="library-meta">Уже знакомо</p>':'')
  +`</div><div class="board-card-actions">${button(`${icon('book')}${row.saved?'Сохранено':'Сохранить'}`,'saved',`${attrs} data-focus="${focusKey('saved',row)}" aria-pressed="${row.saved}" title="${row.saved?'Убрать из сохранённого':'Сохранить на будущее'}"`)}</div>`
  +`<details class="card-details" data-detail="card:${esc(k)}"${openDetails.has(`card:${k}`)?' open':''}><summary data-focus="${focusKey('details',row)}">${rating?'Оценка и отметки':exposure?'Оценить и изменить отметки':'Оценить произведение'}</summary><div class="card-details-content">`
  +`<p>${row.ratingConflict?'В отзывах остались разные впечатления. Укажи, что думаешь сейчас.':row.ratingSource==='experience'?'Оценка из твоего отзыва после знакомства. Можно изменить её здесь.':'Уже знакомо? Отметь, понравилось ли тебе.'}</p><div class="rating-actions">${ratingButton('liked','Нравится')}${ratingButton('disliked','Не нравится')}${rating?button('Убрать оценку','rate',`${attrs} data-value="none" data-focus="${focusKey('rate-none',row)}"`):''}</div>`
  +(row.answer?'<p class="library-meta">Твои прежние уточнения к оценке сохранены и учитываются в подборе.</p>':'')
  +(exposure?`<div class="familiarity-facts"><p>${esc(row.domain==='game'?(EXPOSURES[exposure.exposure]||'Уже знакомо'):({seen:'Уже смотрел',started:'Начал смотреть',finished:'Досмотрел',dropped:'Не досмотрел',paused:'Отложил'}[exposure.exposure]||'Уже знакомо'))} · ${esc(date(exposure.updatedAt))}</p><label class="library-check"><input type="checkbox" data-act="blocked" ${attrs} data-focus="${focusKey('blocked',row)}"${exposure.blocked?' checked':''}> Не предлагать в следующих подборах</label>${button('Забыть знакомство','forget',`${attrs} data-focus="${focusKey('forget',row)}"`)}</div>`:'')
  +(row.reviews.length?button('Мои отзывы','card-reviews',`${attrs} data-focus="${focusKey('reviews',row)}"`):'')
  +(url?`<a class="library-source" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${row.domain==='game'?'Открыть игру':'Открыть страницу'} ${icon('arrow')}</a>`:'')+'</div></details></article>';
}
function filters() {
 const {query,domain,reaction,status,sort,open,item}=activeFilters();
 const activeCount=Number(domain!=='all')+Number(reaction!=='all')+Number(status!=='all')+Number(sort!=='added');
 const select=(id,label,options,value)=>`<label class="library-filter"><span>${label}</span><select id="${id}">${Object.entries(options).map(([key,text])=>`<option value="${key}"${value===key&&key!=='all'?' selected':''}>${text}</option>`).join('')}</select></label>`;
 return `<div class="library-filters" data-view-filters="${state.view}"><label class="library-search">${icon('search')}<span class="library-sr-only">Найти название</span><input id="find-title" type="search" placeholder="Найти название" autocomplete="off" value="${esc(query)}"></label>`
 +`<div class="library-filter-actions">${button(`Фильтры${activeCount?`<span class="filter-active-count">${activeCount}</span>`:''}<svg class="filter-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m6 8 4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,'filters',`data-focus="filters-toggle" aria-expanded="${open}" aria-controls="library-filter-options"`)}${button('Сбросить','clear',`data-focus="filters-reset"${query||activeCount||item?'':' disabled'}`)}</div>`
 +`<div class="library-filter-panel" id="library-filter-panel" data-active-count="${activeCount}" data-filter-open="${open}"><div class="library-filter-options" id="library-filter-options" data-filter-options>`
 +select('domain-filter','Раздел',{all:'Всё',...DOMAINS},domain)
 +(state.view==='all'?select('reaction-filter','Оценка',{all:'Любая',liked:'Нравится',disliked:'Не нравится',mixed:'Смешанная',unrated:'Без оценки'},reaction):'')
 +(state.view==='evenings'?select('status-filter','Статус',eveningStatuses,status):'')
 +select('sort','Порядок',{added:'Сначала новые',oldest:'Сначала давние',title:'По названию'},sort)+'</div></div></div>';
}
function resultCount(shown,total){return hasSearchFilters()?`<p class="library-count" role="status">Найдено ${shown} из ${total}</p>`:'';}
function noMatches(){return '<div class="library-empty wide-empty"><h2>Нет совпадений</h2><p>Попробуй другое название или сбрось фильтры.</p>'+button('Сбросить фильтры','clear')+'</div>';}
function empty(view,hasFilters) {
 if(hasFilters)return noMatches();
 const copy={saved:['Пока ничего не сохранено','Нажми «Сохранить» у интересного варианта, чтобы вернуться к нему позже.'],liked:['Здесь будет то, что понравилось','Отметь «Нравится» у знакомого произведения. Положительные впечатления из отзывов тоже появятся здесь.'],all:['Твои отметки появятся здесь','Сохранённое, оценки и знакомые произведения — всё можно найти в одном месте.']}[view];
 return `<div class="library-empty"><h2>${copy[0]}</h2><p>${copy[1]}</p>${view==='liked'?button('Открыть сохранённое','view','data-view="saved"'):pickLink('Найти вариант')}</div>`;
}
function undoLine(){return state.undo?`<div class="library-undo" role="status"><span>${esc(state.undo.message)}</span>${button('Вернуть','undo','data-focus="undo"')}</div>`:'';}
function board() {
 const all=records().filter(row=>state.view==='saved'?row.saved:state.view==='liked'?row.rating==='liked':true),{reaction}=activeFilters();
 const rows=filtered(all,row=>reaction==='all'||(reaction==='unrated'?!row.rating:row.rating===reaction)),shown=rows.slice(0,state.limit);
 return `<p class="collection-description">${{saved:'Интересное, к чему хочешь вернуться.',liked:'Произведения, которые ты оценил положительно.',all:'Сохранённое, оценки, знакомые произведения и отзывы.'}[state.view]}</p>`
  +(all.length?filters():'')+undoLine()+(all.length?resultCount(rows.length,all.length):'')
  +`<section class="library-board" aria-label="${VIEWS[state.view]}"><div class="library-card-list">${shown.map(card).join('')||empty(state.view,Boolean(all.length&&hasSearchFilters()))}</div>${rows.length>shown.length?`<div class="library-more"><p>Показано ${shown.length} из ${rows.length}</p>${button(`Показать ещё ${Math.min(24,rows.length-shown.length)}`,'more','data-focus="library-more"')}</div>`:''}</section>`;
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
 if(!all.length)return '<div class="library-empty wide-empty"><h2>Здесь будут твои подборы</h2><p>Запрос и предложенные варианты сохраняются автоматически. Можно открыть их снова.</p>'+pickLink('Найти вариант')+'</div>';
 const rows=filtered(all),saved=library.all().filter(row=>row.saved);
 const entries=rows.map(row=>{
  if(row.snapshot){
   const {snapshot,top,alternatives}=row;
   return `<article class="history-row history-selection">${media(top)}<div><p class="library-meta">${esc([date(row.at),DOMAINS[row.domain],selectionModeTitle(snapshot.state.interview?.depth)].filter(Boolean).join(' · '))}</p><h2>${esc(title(row))}</h2><p>${esc(snapshot.screen.summary||snapshot.state.summary||'Рекомендации для тебя')}</p>${alternatives.length?`<p class="history-alternatives">Ещё: ${esc(alternatives.map(card=>card.ru||card.name||card.title).join(', '))}</p>`:''}</div><a class="library-button primary" href="${selectionUrl(row)}">Открыть подбор ${icon('arrow')}</a></article>`;
  }
  return `<article class="history-row">${media(row)}<div><p class="library-meta">${esc([date(row.at),NOUNS[row.domain]].filter(Boolean).join(' · '))}</p><h2>${esc(title(row))}</h2>${Array.isArray(row.alternatives)&&row.alternatives.length?`<p>Ещё варианты: ${esc(row.alternatives.map(card=>card?.title).filter(Boolean).join(', '))}</p>`:''}</div>${saved.some(item=>item.domain===row.domain&&item.id===row.topId)?'<span class="history-saved">Сохранено</span>':button('Сохранить','save-history',`data-index="${row.legacyIndex}" data-focus="history:${row.legacyIndex}"`)}</article>`;
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
 if(!all.length)return '<div class="library-empty wide-empty"><h2>Пока нет отзывов</h2><p>Здесь можно вернуться к выбранным вариантам и рассказать, подошли ли рекомендации.</p>'+pickLink('Найти вариант')+'</div>';
 const {status,item}=activeFilters(),scope=item?all.filter(row=>key({...row.card,domain:row.domain})===item):all,rows=filtered(scope,row=>eveningMatches(row,status)),artwork=eveningArtwork();
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
 return (item?`<div class="library-review-scope"><p>Отзывы: ${esc(title(scope[0]?.card??records().find(row=>key(row)===item)??{title:'Выбранное произведение'}))}</p>${button('Все отзывы','all-reviews')}</div>`:'')+filters()+resultCount(rows.length,scope.length)+(entries?`<div class="library-evenings">${entries}</div>`:noMatches());
}
function render({feedbackFocus,focus:requestedFocus}={}) {
 const active=document.activeElement,focus=requestedFocus??active?.dataset.focus,feedbackKey=feedbackFocus??active?.dataset.fk,id=active?.id,selection=active instanceof HTMLInputElement?[active.selectionStart,active.selectionEnd]:null;
 const evenings=eveningRecords(),past=historyRecords();
 const rows=records(),counts={saved:rows.filter(row=>row.saved).length,liked:rows.filter(row=>row.rating==='liked').length,all:rows.length,history:past.length,evenings:evenings.length};
 const viewButton=(view,label=VIEWS[view])=>`<button type="button" data-act="view" data-view="${view}" data-focus="view:${view}" aria-pressed="${state.view===view}"${state.view===view?' aria-current="page"':''}>${label}<span>${counts[view]}</span></button>`;
 $('#library-app').innerHTML=`<nav class="library-views" aria-label="В библиотеке">${['saved','liked','history','all'].map(view=>viewButton(view)).join('')}</nav>`
  +(['history','evenings'].includes(state.view)?`<div class="library-secondary-nav">${viewButton('evenings')}</div>`:'')
  +(state.view==='evenings'?`<h2 class="library-view-title">${VIEWS.evenings}</h2>`:'')
  +(!library.persistent||state.view==='history'&&!archive.persistent||!familiar.persistent||Object.values(mediaHistories).some(h=>!h.persistent)||state.view==='evenings'&&(!feedback.persistent||!feedbackDrafts.persistent)?'<p class="library-storage-note" role="status">Браузер не разрешил сохранить часть изменений. Они останутся в этом окне до его закрытия.</p>':'')
  +(isCollection()?board():undoLine()+(state.view==='history'?historyView(past):eveningsView(evenings)))
  +'<p class="library-footnote">Библиотека хранится в этом браузере.</p>';
 $('#library-app').setAttribute('aria-busy','false');
 const target=focus?document.querySelector(`[data-focus="${CSS.escape(focus)}"]`):feedbackKey?document.querySelector(`[data-fk="${CSS.escape(feedbackKey)}"]`):id?document.getElementById(id):null;
 initCustomSelects(document);
 const fallback=(focus||feedbackKey)?$(`[data-focus="view:${state.view}"]`):null;
 focusCustomSelect(target??fallback,{preventScroll:true});if(target instanceof HTMLInputElement&&selection&&target.type==='search')target.setSelectionRange(...selection);
}
function rowFor(el){return records().find(row=>row.domain===el.dataset.domain&&row.id===el.dataset.id);}
function toggleSaved(row) {
 const updated=library.setSaved(row,!row.saved);if(!updated)return;
 state.undo={type:'saved',domain:row.domain,id:row.id,previous:row.saved,current:updated.saved,message:updated.saved?`Сохранено: «${title(row)}».`:`Убрано из сохранённого: «${title(row)}».`};
 render({focus:row.saved&&state.view==='saved'?'undo':`saved:${key(row)}`});
}
function forgetRow(row) {
 const history=historyFor(row.domain),entry=history?.all().find(item=>item.id===row.id);if(!entry)return;
 history.forget(row.id);state.undo={type:'familiar',domain:row.domain,entry,message:`Убрана отметка знакомства с «${entry.title}».`};render();
 document.querySelector('[data-act="undo"]')?.focus({preventScroll:true});
}
function undo() {
 const entry=state.undo;if(!entry)return;let restored=false;
 if(entry.type==='saved'){
  const current=library.all().find(row=>row.domain===entry.domain&&row.id===entry.id);
  if(current&&current.saved===entry.current)restored=Boolean(library.setSaved(current,entry.previous));
 }
 else{const history=historyFor(entry.domain??'game');if(history&&!history.all().some(row=>row.id===entry.entry.id))restored=Boolean(history.remember(entry.entry,{exposure:entry.entry.exposure,blocked:entry.entry.blocked}));}
 state.undo=null;render({focus:`view:${state.view}`});notice(restored?'Изменение отменено.':'Отметка уже изменена. Сохранили новое состояние.');
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
 if(act==='view'){
  const view=el.dataset.view==='board'?'saved':el.dataset.view;if(!Object.hasOwn(VIEWS,view)||view===state.view)return;
  state.view=view;state.limit=24;writeNavigation(true);render();void enrichCovers();return;
 }
 if(act==='filters'){activeFilters().open=!activeFilters().open;writeNavigation();render();return;}
 if(act==='more'){state.limit+=24;render();return;}
 if(act==='clear'){Object.assign(activeFilters(),defaultFilters(),{open:activeFilters().open});state.limit=24;writeNavigation();render();$('#find-title')?.focus();return;}
 if(act==='undo'){undo();return;}
 if(act==='saved'&&row){toggleSaved(row);return;}
 if(act==='forget'&&row){forgetRow(row);return;}
 if(act==='rate'&&row){if(!row.inLibrary)library.save(row,{domain:row.domain,lane:'known'});library.rate(row.domain,row.id,el.dataset.value==='none'?null:el.dataset.value);openDetails.delete(`card:${key(row)}`);render({focus:`details:${key(row)}`});notice(el.dataset.value==='none'?'Оценка убрана.':'Оценка сохранена.');return;}
 if(act==='card-reviews'&&row){state.view='evenings';Object.assign(activeFilters(),defaultFilters(),{item:key(row)});state.limit=24;writeNavigation(true);render({focus:'view:evenings'});return;}
 if(act==='all-reviews'){Object.assign(activeFilters(),defaultFilters());writeNavigation(true);render();return;}
 if(act==='save-history'){const h=legacyHistory()[Number(el.dataset.index)];if(h&&library.setSaved({...h,id:h.topId},true,{domain:h.domain})){render();notice('Сохранено.');}else notice('У этой старой записи не сохранился раздел или идентификатор. Её нельзя добавить в сохранённое.');return;}
 const actions={'evening-fit':{type:'fit',value:el.dataset.v},'evening-choose':{type:'choose',value:el.dataset.v==='on'},'evening-start':{type:'start',value:el.dataset.v==='on'},'evening-outcome':{type:'outcome',value:el.dataset.v}};
 if(actions[act])void editEvening(el,actions[act]);
});
document.addEventListener('change',event=>{
 const el=event.target;
 if(el.id==='domain-filter')activeFilters().domain=el.value;
 else if(el.id==='reaction-filter'&&state.view==='all')activeFilters().reaction=el.value;
 else if(el.id==='status-filter'&&state.view==='evenings')activeFilters().status=el.value;
 else if(el.id==='sort')activeFilters().sort=el.value;
 else if(el.dataset.act==='blocked'){historyFor(el.dataset.domain)?.setBlocked(el.dataset.id,el.checked);notice(el.checked?'Не будем предлагать это название в следующих подборах.':'Это название снова можно предлагать.');}
 else return;
 state.limit=24;writeNavigation();render();
});
document.addEventListener('input',event=>{
 const el=event.target;
 if(el.id==='find-title'){activeFilters().query=el.value;state.limit=24;writeNavigation();render();}
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
addEventListener('popstate',()=>{readNavigation();render({focus:`view:${state.view}`});void enrichCovers();});
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
 if(updated&&(isCollection()||state.view==='evenings'))render();
}
render();
// Refresh opens the authoritative IndexedDB snapshot. Viewing never observes, updates or flushes a run.
void feedback.refresh().then(()=>{render();void enrichCovers();});
