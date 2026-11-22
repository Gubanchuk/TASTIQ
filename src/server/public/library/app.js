import {animeStyleLabel,inLibraryDomain,mediaLibraryDomain} from '/shared/anime-pilot.js';
import {selectionModeTitle} from '/shared/selection-mode.js';
import {qaFetch as fetch,qaStorage,qaFeedbackOptions} from '/shared/qa-session.js';
import {createLibraryStore,LIBRARY_KEY,safeLibraryUrl} from '/shared/library-store.js';
import {createTasteMemory,TASTE_MEMORY_PREFIX} from '/shared/taste-memory.js';
import {createMemoryView} from './memory-view.js?v=memory-search';
import {createSavedSource,matchesLibraryQuery,savedPickerDomains} from '/shared/saved-source.js';
import {artworkImageHtml,retryArtworkImage} from '/shared/card-artwork.js';
import {collectionRecords} from '/shared/library-collection.js';
import {createGameHistory,GAME_HISTORY_PREFIX} from '/shared/game-history.js';
import {createMediaHistory,MEDIA_HISTORY_PREFIX} from '/shared/media-history.js';
import {createFeedbackStore,FEEDBACK_KEY,FIT,OUTCOMES,REASONS} from '/shared/evening-feedback.js';
import {eveningControls,feedbackStatus} from '/shared/evening-view.js?v=library-reviews';
import {initCustomSelects,focusCustomSelect} from '/shared/custom-select.js';
import {createFeedbackDrafts,FEEDBACK_DRAFTS_KEY} from '/shared/feedback-drafts.js';
import {createSelectionArchive,SELECTION_ARCHIVE_KEY,selectionUrl} from '/shared/selection-archive.js';

const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const DOMAINS={game:'Игры',film:'Фильмы',series:'Сериалы',cartoon:'Мультфильмы',anime:'Аниме'};
const NOUNS={game:'игра',film:'фильм',series:'сериал',cartoon:'мультфильм',anime:'аниме'};
const VIEWS={saved:'Сохранённое',liked:'Понравилось',history:'Подборы',all:'Все отметки',evenings:'Отзывы о рекомендациях',memory:'Память'};
const isCollection=()=>['saved','liked','all'].includes(state.view);
const EXPOSURES={played:'Уже играл',started:'Начал',finished:'Прошёл',paused:'Отложил'};
const key=row=>`${mediaLibraryDomain(row.domain,row.id)}:${row.id}`;
const title=row=>String(row.title||row.ru||row.name||'Без названия');
const icon=name=>`<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">${({search:'<circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/>',close:'<path d="m5 5 10 10M15 5 5 15"/>',arrow:'<path d="M3 10h13m-5-5 5 5-5 5"/>',book:'<path d="M5 3h10v14l-5-3-5 3V3Z"/>'})[name]||''}</svg>`;
const wallIcon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${({
 saved:'M6 4h12v16l-6-4-6 4z',liked:'M20.5 6.5c-2.5-3-6.5-2-8.5 1-2-3-6-4-8.5-1-3 4 0 7 8.5 13.5 8.5-6.5 11.5-9.5 8.5-13.5z',
 history:'M4 11a8 8 0 1 1 2 7M4 5v6h6M12 7v5l4 2',all:'m4 7 2 2 3-4M12 7h8M4 16l2 2 3-4M12 16h8',
 memory:'M9 19h6M10 22h4M8 15a7 7 0 1 1 8 0c-1 .8-1.2 1.1-1.2 2H9.6c0-.9-.2-1.2-1.6-2z',
 evenings:'M4 4h16v12H9l-5 4zM8 8h8M8 12h5',dislike:'M4 4h4v10H4zM8 13l5 7c2 0 3-1 2-4l-1-3h5c1 0 2-1 2-2l-2-6c0-1-1-1-2-1H8'
 })[name]}"/></svg>`;
let storage,handoffStorage;
try{storage=qaStorage(localStorage);}catch{/* keep this visit in memory */}
try{handoffStorage=qaStorage(sessionStorage);}catch{/* list launch will explain the storage limit */}
const library=createLibraryStore({storage});
const tasteMemory=createTasteMemory({storage});
const archive=createSelectionArchive({storage});
const familiar=createGameHistory({storage});
const mediaHistories=Object.fromEntries(['film','series','cartoon','anime'].map(domain=>[domain,createMediaHistory(domain,{storage})]));
const historyFor=domain=>domain==='game'?familiar:mediaHistories[domain];
const feedback=createFeedbackStore({storage,...qaFeedbackOptions(storage),send:async run=>{
 const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({run})});
 return response.ok?response.json():{ok:false,status:response.status};
},onChange:()=>{
 document.querySelectorAll('[data-feedback-status]').forEach(el=>{el.textContent=feedbackStatus(feedback.status(el.dataset.feedbackStatus),feedback.persistent);});
 document.querySelectorAll('[data-feedback-retry]').forEach(el=>{el.hidden=!['conflict','rejected'].includes(feedback.status(el.dataset.feedbackRetry));});
}});
const defaultFilters=()=>({query:'',domain:'all',reaction:'all',status:'all',sort:'added',open:false,item:''});
const viewFilters=Object.fromEntries(Object.keys(VIEWS).map(view=>[view,defaultFilters()]));
const activeFilters=()=>viewFilters[state.view];
const eveningStatuses={all:'Любой',chosen:'Выбрано',started:'Начато',reviewed:'Есть отзыв',draft:'Есть черновик'};
const state={view:'saved',limit:24,undo:null};
const memoryView=createMemoryView({memory:tasteMemory,library,feedback,domains:DOMAINS,escape:esc,render,notice,revealDomain(domain){
 const filters=viewFilters.memory;
 if(filters.domain!=='all')filters.domain=domain;
 filters.query='';writeNavigation();
},fetchLabels:async()=>{
 const response=await fetch('/api/meta');
 if(!response.ok)throw Error('Справочник недоступен');
 const {domains}=await response.json();
 return Object.fromEntries(Object.entries(domains).map(([id,section])=>[id,section.labels]));
}});
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
const metadata=new Map(),requested=new Set(),pendingMetadata=new Set(),openDetails=new Set(),feedbackDrafts=createFeedbackDrafts({storage});
let noticeTimer,feedbackQueue=Promise.resolve(),feedbackQueued=0,feedbackDirty=false;
const date=value=>{const at=new Date(value);return Number.isFinite(at.valueOf())?at.toLocaleDateString('ru',{day:'numeric',month:'short',year:'numeric'}):'Дата не сохранена';};
const button=(label,act,attrs='',primary=false)=>`<button type="button" class="library-button${primary?' primary':''}" data-act="${act}" ${attrs}>${label}</button>`;
const pickLink=(label='Подобрать')=>`<a class="library-button" href="/pick/start/">${label} ${icon('arrow')}</a>`;
function notice(text){$('#library-notice').textContent=text;$('#library-notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{$('#library-notice').hidden=true;},5000);}

function records() {
 const known=[...familiar.all().map(row=>({...row,domain:'game'})),...Object.entries(mediaHistories).flatMap(([domain,history])=>history.all().map(row=>({...row,domain})))];
 return collectionRecords({items:library.all(),familiar:known,runs:feedback.all(),archivedOutcomes:feedback.archivedOutcomes()}).map(row=>{
  const extra=metadata.get(key(row))??{};
  for(const field of ['image','poster','year','link','name','original','aliases'])if(!row[field]&&extra[field])row[field]=extra[field];
  return row;
 });
}
function filtered(rows,matches=()=>true) {
 const {query,domain,sort}=activeFilters();
 const at=row=>new Date(row.at??row.addedAt??0).valueOf()||0;
 return rows.filter(row=>(domain==='all'||inLibraryDomain(row,domain))&&matches(row)
  &&matchesLibraryQuery(row,query))
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
 const image=artworkImageHtml(row);
 return `<div class="library-cover${image?'':' no-cover'}" aria-hidden="true"><small><span>${esc(title(row))}</span></small>${image}</div>`;
}
const dataFor=row=>`data-domain="${esc(row.domain)}" data-id="${esc(row.id)}"`;
const focusKey=(act,row)=>esc(`${act}:${key(row)}`);
const workMeta=row=>esc([row.year,NOUNS[row.domain],animeStyleLabel(row.id)].filter(Boolean).join(' · '));
function card(row) {
 const attrs=dataFor(row),name=esc(title(row));
 const bookmark=row.saved?'Убрать из сохранённого':'Сохранить';
 return `<article class="board-card poster-tile" data-card="${esc(key(row))}">
  <button type="button" class="poster-open" data-act="work" ${attrs} data-focus="${focusKey('poster',row)}" aria-haspopup="dialog" aria-label="Открыть карточку «${name}»">${media(row)}</button>
  <h3><button type="button" class="title-open" data-act="work" ${attrs} data-focus="${focusKey('title',row)}" aria-haspopup="dialog">${name}</button></h3>
  <p class="library-meta">${workMeta(row)}</p>
  <button type="button" class="poster-bookmark" data-act="saved" ${attrs} data-focus="${focusKey('saved',row)}" aria-pressed="${row.saved}" aria-label="${bookmark} — ${name}" title="${bookmark}">${wallIcon('saved')}</button>
 </article>`;
}
function workPanel(row) {
 const attrs=dataFor(row),url=safeLibraryUrl(row.link),exposure=row.familiarity;
 const hasRating=Boolean(row.rating||row.ratingConflict);
 const ratingButton=(status,label)=>button(wallIcon(status==='liked'?'liked':'dislike')+label,'rate',`${attrs} data-value="${status}" data-focus="${focusKey(`rate-${status}`,row)}" aria-pressed="${row.rating===status}"`);
 const ratingHint=row.ratingConflict?'В прошлых отзывах оценки различаются.':row.ratingSource==='experience'?(row.rating==='mixed'?'В отзыве у тебя смешанные впечатления.':'Эта оценка взята из твоего отзыва.'):'';
 const savedLabel=row.saved?'В сохранённом':'Сохранить';
 const reviewCount=eveningRecords().filter(entry=>key({domain:entry.domain,id:entry.card.id})===key(row)).length;
 const familiarity=exposure
  ? `<details class="work-familiar" data-detail="familiar:${esc(key(row))}"${openDetails.has('familiar:'+key(row))?' open':''}><summary data-focus="${focusKey('familiar',row)}">${esc((row.domain==='game'?EXPOSURES:{seen:'Уже смотрел',started:'Начал смотреть',finished:'Досмотрел',dropped:'Не досмотрел',paused:'Отложил'})[exposure.exposure]||'Уже знакомо')} · ${esc(date(exposure.updatedAt))}</summary>
    <label class="library-check"><input type="checkbox" data-act="blocked" ${attrs} data-focus="${focusKey('blocked',row)}"${exposure.blocked?' checked':''}> Не предлагать в следующих подборах</label>${button('Убрать отметку знакомства','forget',`${attrs} data-focus="${focusKey('forget',row)}"`)}</details>`
  : (row.status==='known'||row.lane==='known'?'<p class="work-hint">Уже знакомо</p>':'');
 return `<div class="work-panel">
  <div class="work-art">${media(row)}</div>
  <header class="work-intro"><p class="library-meta">${workMeta(row)}</p><h2 id="work-title">${esc(title(row))}</h2>
   ${button(wallIcon('saved')+savedLabel,'saved',`${attrs} data-focus="${focusKey('work-saved',row)}" aria-pressed="${row.saved}" aria-label="${row.saved?'В сохранённом. Убрать из сохранённого':savedLabel}"`)}</header>
  <div class="work-actions"><section class="work-rating" aria-labelledby="work-rating-title"><h3 id="work-rating-title">Твоя оценка</h3>
   <div class="rating-actions">${ratingButton('liked','Нравится')}${ratingButton('disliked','Не нравится')}</div>
   ${ratingHint?`<p class="work-hint">${ratingHint}</p>`:''}
   ${hasRating?button('Убрать оценку','rate',`${attrs} data-value="none" data-focus="${focusKey('rate-none',row)}"`):''}</section>
   ${row.answer?`<p class="work-hint">${typeof row.answer.text==='string'&&row.answer.text.trim()?`Твои слова из подбора — «${esc(row.answer.text.trim())}».`:'С этой оценкой сохранены уточнения из подбора.'}</p>`:''}
   ${familiarity}
   ${reviewCount?button(`${wallIcon('evenings')}Открыть отзывы <span>${reviewCount}</span>${icon('arrow')}`,'card-reviews',`${attrs} data-focus="${focusKey('reviews',row)}"`):''}
   ${url?`<a class="library-source" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${row.domain==='game'?'Страница игры':'Страница произведения'} ${icon('arrow')}</a>`:''}
  </div>
  <button type="button" class="work-close" data-act="close-work" data-focus="work-close" aria-label="Закрыть карточку">${icon('close')}</button>
 </div>`;
}
function filters() {
 const {query,domain,reaction,status,sort,open}=activeFilters();
 const memorySearch=state.view==='memory';
 const activeCount=memorySearch?0:Number(domain!=='all')+Number(reaction!=='all')+Number(status!=='all')+Number(sort!=='added');
 const label=memorySearch?'Поиск в памяти':'Поиск по названию';
 const select=(id,label,options,value)=>`<label class="library-filter"><span>${label}</span><select id="${id}">${Object.entries(options).map(([key,text])=>`<option value="${key}"${value===key&&key!=='all'?' selected':''}>${text}</option>`).join('')}</select></label>`;
 const search=`<label class="library-search">${icon('search')}<span class="library-sr-only">${label}</span><input id="find-title" type="search" placeholder="${label}" autocomplete="off" maxlength="300" value="${esc(query)}"></label>`;
 const options=memorySearch?'':select('domain-filter','Раздел',{all:'Всё',...DOMAINS},domain)
  +(state.view==='all'?select('reaction-filter','Оценка',{all:'Любая',liked:'Нравится',disliked:'Не нравится',mixed:'Смешанная',unrated:'Без оценки'},reaction):'')
  +(state.view==='evenings'?select('status-filter','Статус',eveningStatuses,status):'')
  +select('sort','Порядок',{added:'Сначала новые',oldest:'Сначала старые',title:'По названию'},sort);
 const reset=button('Сбросить','clear',`data-focus="filters-reset"${query||activeCount?'':' disabled'}`);
 const summary=[query.trim()?`«${query.trim()}»`:'',!memorySearch&&DOMAINS[domain],
  {liked:'Нравится',disliked:'Не нравится',mixed:'Смешанная',unrated:'Без оценки'}[reaction],
  status==='all'?'':eveningStatuses[status],!memorySearch&&{oldest:'Сначала старые',title:'По названию'}[sort]].filter(Boolean).join(' · ');
 return {
  toggle:`<button type="button" class="search-toggle" data-act="filters" data-focus="filters-toggle" aria-label="Поиск и фильтры" aria-expanded="${open}" aria-controls="library-filter-panel">${icon('search')}<span>Поиск<span class="wide-label"> и фильтры</span></span></button>`,
  fields:`${!open&&summary?`<button type="button" class="filter-summary" data-act="clear" aria-label="Сбросить фильтры: ${esc(summary)}">${esc(summary)} ×</button>`:''}<div id="library-filter-panel" class="shelf-filter-fields" data-active-count="${activeCount}"${open?'':' hidden'}>${search}${options?`<div class="library-filter-options">${options}</div>`:''}${reset}</div>`
 };
}
function resultCount(shown,total){return hasSearchFilters()?`<p class="library-count" role="status">Найдено ${shown} из ${total}</p>`:'';}
function noMatches(){return '<div class="library-empty wide-empty"><h2>Нет совпадений</h2><p>Попробуй другое название или сбрось фильтры.</p>'+button('Сбросить фильтры','clear')+'</div>';}
function empty(view,hasFilters) {
 if(hasFilters)return noMatches();
 const copy={saved:['Пока ничего не сохранено','Нажми «Сохранить» у интересного варианта, чтобы вернуться к нему позже.'],liked:['Здесь будет то, что понравилось','Нажми «Нравится» в карточке. Если выберешь «Понравилось» в отзыве, название тоже появится здесь.'],all:['Твои отметки появятся здесь','Сохрани вариант, оцени его или отметь как знакомый.']}[view];
 return `<div class="library-empty"><h2>${copy[0]}</h2><p>${copy[1]}</p>${view==='liked'?button('Открыть сохранённое','view','data-view="saved"'):pickLink('Найти вариант')}</div>`;
}
function undoLine(){return state.undo?`<div class="library-undo" role="status"><span>${esc(state.undo.message)}</span>${button('Вернуть','undo','data-focus="undo"')}</div>`:'';}
const inActiveCollection=row=>state.view==='saved'?row.saved:state.view==='liked'?row.rating==='liked':true;
let savedPreview=[];
function checkingSavedNames(rows,domain,query){
 return Boolean(query.trim()&&pendingMetadata.size&&rows.some(row=>inLibraryDomain(row,domain)&&!Array.isArray(row.aliases)&&pendingMetadata.has(key(row))));
}
const savedSourceLabel='<span>Выбрать<span class="source-suffix"> из сохранённого</span></span>';
function savedSourceControls(rows,all) {
 let {domain,query}=activeFilters();
 if(!rows.length||state.view!=='saved')return '';
 if(domain==='all'){
  const sections=savedPickerDomains.map(id=>({id,count:rows.filter(row=>inLibraryDomain(row,id)).length})).filter(section=>section.count);
  if(!sections.length)return '';
  if(sections.length>1){
   const choices=sections.map(({id,count})=>button(
    `<span>${DOMAINS[id]}</span><span class="source-count">${count}</span>`,
    'saved-source-domain',`data-domain="${id}" data-focus="saved-source-domain:${id}" aria-label="${DOMAINS[id]}, сохранено ${count}"`
   )).join('');
   return {action:`<details class="saved-source-chooser" data-detail="saved-source"${openDetails.has('saved-source')?' open':''}><summary data-focus="saved-source-menu" aria-label="Выбрать из сохранённого">${savedSourceLabel}</summary><div class="saved-source-actions" role="group" aria-labelledby="saved-domain-question"><p id="saved-domain-question">Из какого раздела выбрать?</p>${choices}</div></details>`};
  }
  domain=sections[0].id;
 }
 if(!savedPickerDomains.includes(domain))return '';
 const checking=checkingSavedNames(all,domain,query);
 const count=rows.filter(row=>inLibraryDomain(row,domain)).length;
 return {action:button(savedSourceLabel,'saved-source-start',`data-domain="${domain}" data-focus="saved-source-start" aria-label="Выбрать из сохранённого" aria-describedby="saved-source-scope"`+(checking?' disabled':''),true),scope:`<p id="saved-source-scope">${DOMAINS[domain]}${query.trim()?` · Поиск «${esc(query.trim())}»`:''} · ${checking?'Проверяем названия…':`В подборе: ${count}`}</p>`};
}
function board(records) {
 const all=records.filter(inActiveCollection),{reaction}=activeFilters();
 const rows=filtered(all,row=>reaction==='all'||(reaction==='unrated'?!row.rating:row.rating===reaction)),shown=rows.slice(0,state.limit);
 savedPreview=state.view==='saved'?rows:[];
 const source=savedSourceControls(rows,all);
 return {shown,source:source?.action,
  html:(source?.scope??'')+undoLine()+(all.length?resultCount(rows.length,all.length):'')
   +`<section class="library-board" aria-label="${VIEWS[state.view]}"><div class="library-card-list wall-grid">${shown.map(card).join('')||empty(state.view,Boolean(all.length&&hasSearchFilters()))}</div>${rows.length>shown.length?`<div class="library-more"><p>Показано ${shown.length} из ${rows.length}</p>${button(`Показать ещё ${Math.min(24,rows.length-shown.length)}`,'more','data-focus="library-more"')}</div>`:''}</section>`
 };
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
 if(!all.length)return '<div class="library-empty wide-empty"><h2>Здесь будут твои подборы</h2><p>После подбора здесь можно снова открыть запрос и рекомендации.</p>'+pickLink('Найти вариант')+'</div>';
 const rows=filtered(all),saved=library.all().filter(row=>row.saved);
 const entries=rows.map(row=>{
  if(row.snapshot){
   const {snapshot,top,alternatives}=row;
   return `<article class="history-row history-selection">${media(top)}<div><p class="library-meta">${esc([date(row.at),DOMAINS[row.domain],selectionModeTitle(snapshot.state.interview?.depth)].filter(Boolean).join(' · '))}</p><h2>${esc(title(row))}</h2><p>${esc(snapshot.screen.summary||snapshot.state.summary||'Рекомендации для тебя')}</p>${alternatives.length?`<p class="history-alternatives">Ещё: ${esc(alternatives.map(card=>card.ru||card.name||card.title).join(', '))}</p>`:''}</div><a class="library-button primary" href="${selectionUrl(row)}">Открыть подбор ${icon('arrow')}</a></article>`;
  }
  return `<article class="history-row">${media(row)}<div><p class="library-meta">${esc([date(row.at),NOUNS[row.domain]].filter(Boolean).join(' · '))}</p><h2>${esc(title(row))}</h2>${Array.isArray(row.alternatives)&&row.alternatives.length?`<p>Ещё варианты: ${esc(row.alternatives.map(card=>card?.title).filter(Boolean).join(', '))}</p>`:''}</div>${saved.some(item=>item.domain===row.domain&&item.id===row.topId)?'<span class="history-saved">Сохранено</span>':button('Сохранить','save-history',`data-index="${row.legacyIndex}" data-focus="history:${row.legacyIndex}"`)}</article>`;
 }).join('');
 return resultCount(rows.length,all.length)+(entries?`<div class="library-history">${entries}</div>`:noMatches());
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
 const {status,item,query,domain}=activeFilters();
 const scope=item?all.filter(row=>key({domain:row.domain,id:row.card.id})===item):all;
 const rows=filtered(scope,row=>eveningMatches(row,status));
 const scopedTitle=item?title(scope[0]?.card??records().find(row=>key(row)===item)??{title:'Выбранное произведение'}):'';
 const heading=`<header class="reviews-heading">${item?button(`${icon('arrow')} Все отзывы`,'all-reviews','data-focus="all-reviews"'):''}
   <h2 tabindex="-1" data-focus="reviews-heading">${item?esc(scopedTitle):VIEWS.evenings}</h2>
   ${scope.length?`<p>${item?'Рекомендации с этим произведением':'Твой выбор и впечатления после подбора'} · ${scope.length}</p>`:''}</header>`;
 const artwork=eveningArtwork();
 const entries=rows.map(({run,card,response,draft})=>{
  const pair=`${run.id}:${card.id}`,detail=`evening:${pair}`;
  const cover=artwork.get(key({domain:run.domain,id:card.id}))??card;
  const progress=response?.started?'Начато':response?.chosen?'Выбрано':'';
  const reviewState=reviewed(response)?'Есть отзыв':draft?'Черновик':'';
  const labels=[progress,reviewState].filter(Boolean);
  const preview=response?.note||draft?.note||(response?.outcome?`После знакомства — ${OUTCOMES[response.outcome]}`:response?.fit?`По запросу — ${FIT[response.fit]}`:REASONS[response?.reason]||'');
  const controls=eveningControls(run,card.id,{
   modern:true,history:true,open:openDetails.has(`feedback:${pair}`),
   ratingOpen:openDetails.has(`rating:${pair}`),outcomeOpen:openDetails.has(`outcome:${pair}`),
   status:feedback.status(run.id),persistent:feedback.persistent,draft,
  });
  return `<details class="library-evening" data-detail="${esc(detail)}"${openDetails.has(detail)?' open':''}>
   <summary data-focus="${esc(detail)}">${media(cover)}<div class="evening-summary-copy">
    <span class="review-meta">${esc(date(run.at))} · ${esc(DOMAINS[run.domain])}</span><strong>${esc(title(card))}</strong>
    ${preview?`<span class="review-excerpt">${esc(preview)}</span>`:''}<small class="review-states">${labels.join(' · ')}</small>
   </div></summary>
   <div class="evening-content">${run.context.note?`<p class="review-wish"><strong>Запрос на подбор</strong>${esc(run.context.note)}</p>`:''}<article class="evening-card">${controls}</article></div>
  </details>`;
 }).join('');
 const filteredCount=(query.trim()||domain!=='all'||status!=='all')?resultCount(rows.length,scope.length):'';
 const emptyList=item?'<div class="library-empty"><h3>Пока нет записей об этом произведении</h3></div>':'<div class="library-empty"><h3>Пока нет отзывов</h3><p>Когда выберешь вариант в подборе или оценишь рекомендацию, запись появится здесь.</p>'+pickLink('Найти вариант')+'</div>';
 return `<section class="review-journal">${heading}${filteredCount}${entries?`<div class="library-evenings">${entries}</div>`:scope.length?noMatches():emptyList}</section>`;
}
let openedWork=null;
const workDialog=$('#work-dialog');
function closeWork(restore=true){
 const opener=openedWork?.opener;openedWork=null;
 if(workDialog?.open)workDialog.close();
 if(restore&&opener)document.querySelector(`[data-focus="${CSS.escape(opener)}"]`)?.focus({preventScroll:true});
}
function syncWorkDialog(shown){
 if(!openedWork)return;
 const row=shown?.find(row=>key(row)===openedWork.key);
 if(!row){closeWork(false);return;}
 workDialog.innerHTML=workPanel(row);
 if(!workDialog.open)workDialog.showModal();
}
workDialog?.addEventListener('cancel',event=>{event.preventDefault();closeWork();});
workDialog?.addEventListener('click',event=>{if(event.target===workDialog)closeWork();});
document.addEventListener('keydown',event=>{
 if(event.key!=='Escape'||workDialog?.open)return;
 const disclosure=event.target.closest?.('.saved-source-chooser[open]');
 if(disclosure){disclosure.open=false;disclosure.querySelector('summary').focus();event.preventDefault();}
});
document.addEventListener('pointerdown',event=>{
 const chooser=document.querySelector('.saved-source-chooser[open]');
 if(chooser&&!chooser.contains(event.target))chooser.open=false;
});
document.addEventListener('focusout',event=>{
 const chooser=event.target.closest?.('.saved-source-chooser[open]');
 if(chooser&&event.relatedTarget&&!chooser.contains(event.relatedTarget))chooser.open=false;
});
function render({feedbackFocus,focus:requestedFocus,reveal=false}={}) {
 const active=document.activeElement,focus=requestedFocus??active?.dataset.focus,feedbackKey=feedbackFocus??active?.dataset.fk,id=active?.id,selection=active?.tagName==='TEXTAREA'||active instanceof HTMLInputElement&&active.type==='search'?[active.selectionStart,active.selectionEnd]:null;
 const evenings=eveningRecords(),past=historyRecords();
 const rows=records(),counts={saved:rows.filter(row=>row.saved).length,liked:rows.filter(row=>row.rating==='liked').length,all:rows.length,history:past.length,evenings:evenings.length};
 const viewButton=view=>{
  const label=view==='evenings'?'Отзывы':VIEWS[view];
  const count=counts[view]===undefined?'':` <span class="view-count">${counts[view]}</span>`;
  return `<button type="button" data-act="view" data-view="${view}" data-focus="view:${view}" aria-pressed="${state.view===view}"${state.view===view?' aria-current="page"':''}>${wallIcon(view)}<span class="view-label">${label}</span>${count}</button>`;
 };
 const shelf=isCollection()?board(rows):null;
 const search=filters();
 $('#library-app').innerHTML=`<header class="wall-heading">
  <h1>Библиотека</h1>${shelf?.source?`<div class="wall-source">${shelf.source}</div>`:''}
  <nav class="collection-nav" aria-label="В библиотеке">${['saved','liked','history','all'].map(viewButton).join('')}</nav>
  <div class="wall-tools">${search.toggle}${viewButton('memory')}${viewButton('evenings')}</div>
 </header>`
  +(!library.persistent||state.view==='history'&&!archive.persistent||!familiar.persistent||Object.values(mediaHistories).some(h=>!h.persistent)||state.view==='evenings'&&(!feedback.persistent||!feedbackDrafts.persistent)?'<p class="library-storage-note" role="status">Браузер не разрешил сохранить часть изменений. Они останутся в этом окне до его закрытия.</p>':'')
  +search.fields
  +(state.view==='memory'?memoryView.html(activeFilters().domain,activeFilters().query):shelf?shelf.html:undoLine()+(state.view==='history'?historyView(past):eveningsView(evenings)))
  +'<p class="library-footnote">Библиотека хранится в этом браузере.</p>';
 $('#library-app').setAttribute('aria-busy','false');
 syncWorkDialog(shelf?.shown);
 if(workDialog?.open){
  const inside=focus&&workDialog.querySelector(`[data-focus="${CSS.escape(focus)}"]`);
  (inside||workDialog.querySelector('.work-close')).focus({preventScroll:true});return;
 }
 const target=focus?document.querySelector(`[data-focus="${CSS.escape(focus)}"]`):feedbackKey?document.querySelector(`[data-fk="${CSS.escape(feedbackKey)}"]`):id?document.getElementById(id):null;
 initCustomSelects(document);
 const fallback=(focus||feedbackKey)?$(`[data-focus="view:${state.view}"]`):null;
 focusCustomSelect(target??fallback,{preventScroll:true});
 if(reveal&&target)target.scrollIntoView({block:'nearest'});
 if(selection&&target?.setSelectionRange&&(target.type==='search'||target.tagName==='TEXTAREA'))target.setSelectionRange(...selection);
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
 state.undo=null;render({focus:`view:${state.view}`});notice(restored?'Изменение отменено.':'Отметку уже изменили. Сохранена последняя версия.');
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
   if(queuedAction.type==='explain')feedbackFocus=`evening-note:${rid}:${cid}`;
   if(['fit','outcome'].includes(queuedAction.type)){
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
 const act=el.dataset.act;
 if(state.view==='memory'&&act.startsWith('memory-')){void memoryView.act(el,activeFilters().domain);return;}
 const row=rowFor(el);
 if(act==='work'&&row){
  openedWork={key:key(row),opener:el.dataset.focus};syncWorkDialog([row]);workDialog.querySelector('.work-close').focus();return;
 }
 if(act==='close-work'){closeWork();return;}
 if(act==='saved-source-domain'&&state.view==='saved'&&savedPickerDomains.includes(el.dataset.domain)){
  openDetails.delete('saved-source');
  activeFilters().domain=el.dataset.domain;state.limit=24;writeNavigation(true);
  render({focus:'saved-source-start'});void enrichCovers();return;
 }
 if(act==='saved-source-start'&&state.view==='saved'){
  const {query}=activeFilters(),domain=el.dataset.domain??activeFilters().domain;
  if(checkingSavedNames(library.all().filter(row=>row.saved),domain,query))return;
  const url=createSavedSource(handoffStorage,domain,savedPreview,query,library.all());
  if(url)location.assign(url);
  else notice('Не удалось открыть подбор из сохранённого. Проверь, что браузер разрешает хранить данные сайта.');
  return;
 }
 if(act==='evening-retry'){
  el.disabled=true;
  void feedback.retry(el.dataset.feedbackRetry).finally(()=>{el.disabled=false;});
  return;
 }
 if(act==='view'){
  const view=el.dataset.view==='board'?'saved':el.dataset.view;if(!Object.hasOwn(VIEWS,view))return;
  if(view==='evenings'&&viewFilters.evenings.item)Object.assign(viewFilters.evenings,defaultFilters());
  else if(view===state.view)return;
  state.view=view;state.limit=24;writeNavigation(true);render({focus:'view:'+view});void enrichCovers();return;
 }
 if(act==='filters'){activeFilters().open=!activeFilters().open;writeNavigation();render();return;}
 if(act==='more'){state.limit+=24;render();void enrichCovers();return;}
 if(act==='clear'){
  if(state.view==='memory')activeFilters().query='';
  else Object.assign(activeFilters(),defaultFilters(),{open:activeFilters().open,item:activeFilters().item});
  state.limit=24;writeNavigation();render();void enrichCovers();
  const focusTarget=!activeFilters().open?$('[data-focus="filters-toggle"]'):$('#find-title');
  focusTarget?.focus();return;
 }
 if(act==='undo'){undo();return;}
 if(act==='saved'&&row){toggleSaved(row);return;}
 if(act==='forget'&&row){forgetRow(row);return;}
 if(act==='rate'&&row){if(!row.inLibrary)library.save(row,{domain:row.domain,lane:'known'});library.rate(row.domain,row.id,el.dataset.value==='none'?null:el.dataset.value);render({focus:el.dataset.value==='none'?`rate-liked:${key(row)}`:el.dataset.focus});notice(el.dataset.value==='none'?'Оценка убрана.':'Оценка сохранена.');return;}
 if(act==='card-reviews'&&row){state.view='evenings';Object.assign(activeFilters(),defaultFilters(),{item:key(row)});state.limit=24;writeNavigation(true);render({focus:'reviews-heading'});return;}
 if(act==='all-reviews'){Object.assign(activeFilters(),defaultFilters());writeNavigation(true);render({focus:'reviews-heading'});return;}
 if(act==='save-history'){const h=legacyHistory()[Number(el.dataset.index)];if(h&&library.setSaved({...h,id:h.topId},true,{domain:h.domain})){render();notice('Сохранено.');}else notice('Не удалось найти это название в старом подборе. Попробуй найти его по названию в новом.');return;}
 const actions={'evening-fit':{type:'fit',value:el.dataset.v},'evening-choose':{type:'choose',value:el.dataset.v==='on'},'evening-start':{type:'start',value:el.dataset.v==='on'},'evening-outcome':{type:'outcome',value:el.dataset.v}};
 if(actions[act])void editEvening(el,actions[act]);
});
document.addEventListener('change',event=>{
 const el=event.target;
 if(el.id==='memory-domain'&&state.view==='memory'){
  memoryView.close();activeFilters().domain=Object.hasOwn(DOMAINS,el.value)?el.value:'all';writeNavigation();render({focus:'memory-domain'});return;
 }
 if(state.view==='memory'&&el.closest?.('[data-form="memory"]')){memoryView.input(el);return;}
 if(el.id==='domain-filter')activeFilters().domain=el.value;
 else if(el.id==='reaction-filter'&&state.view==='all')activeFilters().reaction=el.value;
 else if(el.id==='status-filter'&&state.view==='evenings')activeFilters().status=el.value;
 else if(el.id==='sort')activeFilters().sort=el.value;
 else if(el.dataset.act==='blocked'){historyFor(el.dataset.domain)?.setBlocked(el.dataset.id,el.checked);notice(el.checked?'Не будем предлагать это название в следующих подборах.':'Это название снова можно предлагать.');}
 else return;
 state.limit=24;writeNavigation();render();void enrichCovers();
});
document.addEventListener('input',event=>{
 const el=event.target;
 if(state.view==='memory'&&el.closest?.('[data-form="memory"]')){memoryView.input(el);return;}
 if(el.id==='find-title'){activeFilters().query=el.value;state.limit=24;writeNavigation();render();void enrichCovers();}
 const form=el.closest?.('[data-form="evening-reason"]');if(form)feedbackDrafts.set(`${form.dataset.run}:${form.dataset.id}`,{reason:form.elements.reason.value,note:form.elements.note.value});
});
document.addEventListener('submit',event=>{
 const form=event.target;
 if(state.view==='memory'&&form.matches('[data-form="memory"]')){event.preventDefault();void memoryView.submit(form);return;}
 if(!form.matches('[data-form="evening-reason"]'))return;event.preventDefault();
 const submit=form.querySelector('button[type="submit"]');submit.dataset.run=form.dataset.run;submit.dataset.id=form.dataset.id;
 void editEvening(submit,{type:'explain',reason:form.elements.reason.value||null,note:form.elements.note.value});
});
document.addEventListener('toggle',event=>{
 const el=event.target;
 if(el.hasAttribute?.('data-memory-sources')&&el.isConnected&&!viewFilters.memory.query.trim())memoryView.rememberSources(el.open);
 if(el.dataset.detail&&el.isConnected){el.open?openDetails.add(el.dataset.detail):openDetails.delete(el.dataset.detail);}
 if(el.matches('[data-feedback-details]')){const k=`feedback:${el.dataset.run}:${el.dataset.id}`;el.open?openDetails.add(k):openDetails.delete(k);}
},true);
document.addEventListener('error',event=>{
 const image=event.target,cover=image instanceof HTMLImageElement?image.closest('.library-cover'):null;
 if(!cover||retryArtworkImage(image))return;
 cover.classList.remove('is-loaded');
 cover.classList.add('no-cover');
 image.remove();
},true);
document.addEventListener('load',event=>{
 const image=event.target;
 if(image instanceof HTMLImageElement&&image.naturalWidth>0){
  const cover=image.closest('.library-cover');
  if(cover){cover.classList.add('is-loaded');cover.classList.toggle('landscape',image.naturalWidth>image.naturalHeight);}
 }
},true);
addEventListener('storage',event=>{
 if(state.view==='memory'&&event.key?.includes(TASTE_MEMORY_PREFIX))render();
 if(event.key===LIBRARY_KEY||event.key===SELECTION_ARCHIVE_KEY||event.key?.startsWith(GAME_HISTORY_PREFIX)||event.key?.startsWith(MEDIA_HISTORY_PREFIX)||event.key===null){render();void enrichCovers();}
 if(event.key===FEEDBACK_KEY||event.key===null)void feedback.refresh().then(()=>{render();});
 if(event.key===FEEDBACK_DRAFTS_KEY)render();
});
addEventListener('popstate',()=>{closeWork(false);readNavigation();render({focus:'view:'+state.view});void enrichCovers();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();void feedback.refresh().then(()=>{render();});void enrichCovers();}});

// Resolve old records by ID. An active search includes the entire selected list, even offscreen rows.
async function enrichCovers() {
 const artwork=eveningArtwork();
 const visible=new Set([...document.querySelectorAll('.board-card[data-card]')].map(card=>card.dataset.card));
 const {query,domain}=activeFilters();
 const searching=isCollection()&&Boolean(query.trim());
 const rows=isCollection()?records().filter(inActiveCollection)
  :state.view==='evenings'?eveningRecords().map(({card,domain})=>({...card,domain})):[];
 const byDomain=new Map();
 let updated=false;
 for(const row of rows){
  const id=key(row);
  const cover=artwork.get(id);
  const needsCover=(visible.has(id)||state.view==='evenings')&&!row.poster&&!row.image;
  if(needsCover&&(cover?.poster||cover?.image)){
   metadata.set(id,{...metadata.get(id),poster:cover.poster,image:cover.image});updated=true;
  }
  const needsNames=searching&&(domain==='all'||inLibraryDomain(row,domain))&&!Array.isArray(row.aliases);
  if(!needsNames&&(!needsCover||cover?.poster||cover?.image))continue;
  if(requested.has(id))continue;
  requested.add(id);pendingMetadata.add(id);
  if(!byDomain.has(row.domain))byDomain.set(row.domain,[]);
  byDomain.get(row.domain).push(row.id);
 }
 if(state.view==='saved'&&query.trim()&&byDomain.size)render();
 for(const [domain,ids] of byDomain){
  for(let i=0;i<ids.length;i+=40){
   const batch=ids.slice(i,i+40),params=new URLSearchParams({domain});
   for(const id of batch)params.append('id',id);
   try {
    const response=await fetch('/api/search?'+params);
    if(!response.ok)throw Error('Catalog lookup failed');
    for(const card of await response.json()){
     if(!batch.includes(card.id))continue;
     const id=key({domain,id:card.id});
     metadata.set(id,{...metadata.get(id),...card});updated=true;
    }
   }catch{for(const id of batch)requested.delete(key({domain,id}));}
   finally{for(const id of batch)pendingMetadata.delete(key({domain,id}));}
  }
 }
 if(updated&&(isCollection()||state.view==='evenings')||state.view==='saved'&&activeFilters().query.trim()&&byDomain.size)render();
}
render();
// Refresh opens the authoritative IndexedDB snapshot. Viewing never observes, updates or flushes a run.
void feedback.refresh().then(()=>{render();void enrichCovers();});
