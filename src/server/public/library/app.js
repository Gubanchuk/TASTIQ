import {qaFetch as fetch,qaStorage,qaFeedbackOptions} from '/shared/qa-session.js';
import {createLibraryStore,LIBRARY_KEY,safeLibraryUrl} from '/shared/library-store.js';
import {createGameHistory,GAME_HISTORY_PREFIX} from '/shared/game-history.js';
import {createMediaHistory,MEDIA_HISTORY_PREFIX} from '/shared/media-history.js';
import {createFeedbackStore,FEEDBACK_KEY} from '/shared/evening-feedback.js';
import {eveningControls,feedbackStatus} from '/shared/evening-view.js';
import {initCustomSelects,focusCustomSelect} from '/shared/custom-select.js';
import {createFeedbackDrafts,FEEDBACK_DRAFTS_KEY} from '/shared/feedback-drafts.js';

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
const familiar=createGameHistory({storage});
const mediaHistories=Object.fromEntries(['film','series','cartoon'].map(domain=>[domain,createMediaHistory(domain,{storage})]));
const historyFor=domain=>domain==='game'?familiar:mediaHistories[domain];
const feedback=createFeedbackStore({storage,...qaFeedbackOptions(storage),send:async run=>{
 const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({run})});
 if(!response.ok)throw Error('Feedback unavailable');return response.json();
},onChange:()=>{
 document.querySelectorAll('[data-feedback-status]').forEach(el=>{el.textContent=feedbackStatus(feedback.status(el.dataset.feedbackStatus),feedback.persistent);});
}});
const state={view:'board',query:'',domain:'all',reaction:'all',sort:'added',lane:'want',limit:24,filtersOpen:false,undo:null};
const metadata=new Map(),requested=new Set(),failedImages=new Set(),openDetails=new Set(),feedbackDrafts=createFeedbackDrafts({storage});
let noticeTimer,feedbackQueue=Promise.resolve(),feedbackQueued=0,feedbackDirty=false;
const date=value=>{const at=new Date(value);return Number.isFinite(at.valueOf())?at.toLocaleDateString('ru',{day:'numeric',month:'short',year:'numeric'}):'Дата не сохранена';};
const button=(label,act,attrs='',primary=false)=>`<button type="button" class="library-button${primary?' primary':''}" data-act="${act}" ${attrs}>${label}</button>`;
const pickLink=(label='Подобрать')=>`<a class="library-button" href="/#doors">${label} ${icon('arrow')}</a>`;
function notice(text){$('#library-notice').textContent=text;$('#library-notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{$('#library-notice').hidden=true;},5000);}

function records() {
 const rows=library.all().map(row=>({...row,saved:true})),byId=new Map(rows.map(row=>[key(row),row]));
 for(const entry of familiar.all()) {
  const k=`game:${entry.id}`,prior=byId.get(k),extra=metadata.get(entry.id)??{};
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
function filtered(rows) {
 const query=state.query.trim().toLocaleLowerCase('ru');
 const reactionMatches=row=>state.reaction==='all'||(state.reaction==='unrated'?!['liked','disliked'].includes(row.status):row.status===state.reaction);
 return rows.filter(row=>(state.domain==='all'||row.domain===state.domain)
  &&reactionMatches(row)
  &&(!query||`${title(row)} ${row.original??''}`.toLocaleLowerCase('ru').includes(query)))
 .sort(state.sort==='title'?(a,b)=>title(a).localeCompare(title(b),'ru'):state.sort==='oldest'?(a,b)=>String(a.addedAt??'').localeCompare(String(b.addedAt??'')):(a,b)=>String(b.addedAt??'').localeCompare(String(a.addedAt??'')));
}
function media(row) {
 const src=[row.poster,row.image].map(safeLibraryUrl).find(url=>url&&!failedImages.has(url));
 return `<div class="library-cover${src?'':' no-cover'}" aria-hidden="true">${src?`<img src="${esc(src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`:`<span>${esc(title(row))}</span><small>Без обложки</small>`}</div>`;
}
const dataFor=row=>`data-domain="${esc(row.domain)}" data-id="${esc(row.id)}"`;
const focusKey=(act,row)=>esc(`${act}:${key(row)}`);
function card(row) {
 const attrs=dataFor(row),k=key(row),url=safeLibraryUrl(row.link),exposure=row.familiarity;
 const rating=row.status==='liked'?'Зашло':row.status==='disliked'?'Не зашло':'';
 const ratingButton=(status,label)=>`<button type="button" class="library-button rating-button" data-act="rate" ${attrs} data-value="${status}" data-focus="${focusKey(`rate-${status}`,row)}" aria-pressed="${row.status===status}">${label}</button>`;
 return `<article class="board-card" data-card="${esc(k)}">${media(row)}<div class="board-card-copy"><p class="library-meta">${esc([row.year,NOUNS[row.domain]].filter(Boolean).join(' · '))}</p><h3>${esc(title(row))}</h3>`
  +(rating?`<p class="rating-label ${row.status}">${rating}</p>`:'')
  +`<div class="board-card-actions"><label class="move-control"><span class="library-sr-only">Список для ${esc(title(row))}</span><select data-act="move" ${attrs} data-focus="${focusKey('move',row)}">${Object.entries(LANES).map(([id,label])=>`<option value="${id}"${row.lane===id?' selected':''}>${label}</option>`).join('')}</select></label>`
  +`<button type="button" class="library-remove" data-act="${row.saved?'remove':'forget'}" ${attrs} data-focus="${focusKey('remove',row)}" aria-label="${row.saved?'Убрать из библиотеки':'Забыть знакомство'}: ${esc(title(row))}" title="${row.saved?'Убрать из библиотеки':'Забыть знакомство'}">${icon('close')}</button></div>`
  +`</div><details class="card-details" data-detail="card:${esc(k)}"${openDetails.has(`card:${k}`)?' open':''}><summary data-focus="${focusKey('details',row)}">${exposure?'Отношение и знакомство':'Твоё отношение'}</summary><div class="card-details-content">`
  +`<p>Что думаешь об этом ${row.domain==='game'?'опыте':'названии'}? Оценка относится к вкусу, список — к планам.</p><div class="rating-actions">${ratingButton('liked','Зашло')}${ratingButton('disliked','Не зашло')}${rating?button('Убрать оценку','rate',`${attrs} data-value="none" data-focus="${focusKey('rate-none',row)}"`):''}</div>`
  +(row.answer?'<p class="library-meta">Твои прежние уточнения к оценке сохранены и учитываются в подборе.</p>':'')
  +(exposure?`<div class="familiarity-facts"><p>${esc(row.domain==='game'?(EXPOSURES[exposure.exposure]||'Уже знакомо'):({seen:'Уже смотрел',started:'Начал смотреть',finished:'Досмотрел',dropped:'Не досмотрел',paused:'Отложил'}[exposure.exposure]||'Уже знакомо'))} · ${esc(date(exposure.updatedAt))}</p><label class="library-check"><input type="checkbox" data-act="blocked" ${attrs} data-focus="${focusKey('blocked',row)}"${exposure.blocked?' checked':''}> Не предлагать в следующих подборах</label><p class="library-meta">Знакомство само по себе не означает положительную оценку.</p>${row.saved?button('Забыть знакомство','forget',`${attrs} data-focus="${focusKey('forget',row)}"`):'<p class="library-meta">Крестик убирает эту отметку знакомства. Перенос в другой список сохранит её отдельно.</p>'}</div>`:'')
  +(url?`<a class="library-source" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${row.domain==='game'?'Открыть игру':'Открыть страницу'} ${icon('arrow')}</a>`:'')+'</div></details></article>';
}
function filters() {
 const activeCount=Number(state.domain!=='all')+Number(state.reaction!=='all')+Number(state.sort!=='added');
 return `<div class="library-filters"><label class="library-search">${icon('search')}<span class="library-sr-only">Найти название</span><input id="find-title" type="search" placeholder="Найти название" autocomplete="off" value="${esc(state.query)}"></label>`
 +`<div class="library-filter-actions">${button(`Фильтры и порядок${activeCount?`<span class="filter-active-count">${activeCount}</span>`:''}<svg class="filter-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m6 8 4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,'filters',`data-focus="filters-toggle" aria-expanded="${state.filtersOpen}" aria-controls="library-filter-options"`)}${button('Сбросить','clear',`data-focus="filters-reset"${state.query||activeCount?'':' disabled'}`)}</div>`
 +`<div class="library-filter-panel" id="library-filter-panel" data-active-count="${activeCount}" data-filter-open="${state.filtersOpen}"><div class="library-filter-options" id="library-filter-options" data-filter-options>`
 +`<label class="library-filter"><span>Раздел</span><select id="domain-filter"><option value="all">Всё</option>${Object.entries(DOMAINS).map(([id,label])=>`<option value="${id}"${state.domain===id?' selected':''}>${label}</option>`).join('')}</select></label>`
 +`<label class="library-filter"><span>Отношение</span><select id="reaction-filter">${Object.entries({all:'Любое',liked:'Зашло',disliked:'Не зашло',unrated:'Без оценки'}).map(([id,label])=>`<option value="${id}"${state.reaction===id?' selected':''}>${label}</option>`).join('')}</select></label><label class="library-filter"><span>Порядок</span><select id="sort">${Object.entries({added:'Сначала новые',oldest:'Сначала давние',title:'По названию'}).map(([id,label])=>`<option value="${id}"${state.sort===id?' selected':''}>${label}</option>`).join('')}</select></label></div></div></div>`;
}
function empty(lane,hasFilters) {
 return `<div class="library-empty"><h3>${hasFilters?'Нет совпадений':lane==='tonight'?'Вечер ещё свободен':lane==='known'?'Здесь будет знакомое':'Здесь будут твои планы'}</h3><p>${hasFilters?'Попробуй другое название или сбрось фильтры.':lane==='tonight'?'Перенеси сюда сохранённое, к которому хочешь вернуться сегодня.':lane==='known'?'Знакомые названия и явные оценки будут видны здесь. Знакомство и вкус хранятся отдельно.':'Сохрани вариант из подбора — он появится здесь.'}</p>${hasFilters?button('Сбросить фильтры','clear'):lane==='want'?pickLink('Найти вариант'):''}</div>`;
}
function undoLine(){return state.undo?`<div class="library-undo" role="status"><span>${esc(state.undo.message)}</span>${button('Вернуть','undo','data-focus="undo"')}</div>`:'';}
function board() {
 const all=records(),rows=filtered(all),hasFilters=Boolean(state.query.trim()||state.domain!=='all'||state.reaction!=='all');
 const items=rows.filter(row=>row.lane===state.lane),shown=items.slice(0,state.limit);
 return filters()+undoLine()+`<p class="library-count" role="status">${hasFilters?`Найдено ${rows.length} из ${all.length}`:`В списках и отметках знакомства: ${all.length}`}</p>`
  +`<nav class="board-switch" aria-label="Списки библиотеки">${Object.entries(LANES).map(([id,label])=>`<button type="button" data-act="lane" data-lane="${id}" data-focus="lane:${id}" aria-pressed="${state.lane===id}" aria-controls="lane-${id}">${label}<span>${rows.filter(row=>row.lane===id).length}</span></button>`).join('')}</nav><div class="library-board">`
  +`<section class="library-lane lane-${state.lane}" id="lane-${state.lane}" data-active="true" aria-label="${LANES[state.lane]}"><header><div><h2>${LANES[state.lane]}</h2><p>${state.lane==='want'?'Варианты, к которым хочешь вернуться.':state.lane==='tonight'?'То, что выбрал на ближайший вечер.':'Знакомство не означает ни оценку, ни запрет в подборе.'}</p></div><span>${items.length}</span></header><div class="library-card-list">${shown.map(card).join('')||empty(state.lane,hasFilters)}</div>${items.length>shown.length?`<div class="library-more"><p>Показано ${shown.length} из ${items.length}</p>${button(`Показать ещё ${Math.min(24,items.length-shown.length)}`,'more','data-focus="library-more"')}</div>`:''}</section></div>`
  +'<p class="library-footnote">Списки, оценки и отметки о знакомых названиях сохранены в этом браузере. Перенос между списками не меняет твой вкус.</p>';
}
function historyView() {
 const rows=library.history().filter(row=>row&&typeof row==='object').reverse(),saved=library.all();
 const eveningsLink=button('Открыть вечера','view','data-view="evenings" data-focus="archive-evenings"');
 if(!rows.length)return '<div class="library-empty wide-empty"><h2>Прежних подборов нет</h2><p>Здесь хранятся прежние предложения. Новые выборы на вечер и отзывы об играх, фильмах, сериалах и мультфильмах — во «Вечерах».</p>'+eveningsLink+'</div>';
 return '<p class="view-description">Архив прежних предложений — в том виде, в котором они сохранились. Новые выборы и отзывы всех разделов — во «Вечерах». Открытие архива не начинает новый подбор.</p>'+eveningsLink+'<div class="library-history">'+rows.map((row,index)=>`<article class="history-row">${media({...row,id:row.topId})}<div><p class="library-meta">${esc([date(row.at),NOUNS[row.domain]].filter(Boolean).join(' · '))}</p><h2>${esc(title(row))}</h2>${Array.isArray(row.alternatives)&&row.alternatives.length?`<p>Ещё варианты: ${esc(row.alternatives.map(x=>x?.title).filter(Boolean).join(', '))}</p>`:''}</div>${saved.some(item=>item.domain===row.domain&&item.id===row.topId)?'<span class="history-saved">В библиотеке</span>':button('На потом','save-history',`data-index="${index}" data-focus="history:${index}"`)}</article>`).join('')+'</div>';
}
function eveningRows(){
 const drafts=new Set(feedbackDrafts.keys());return feedback.all().filter(run=>run.responses.length||run.cards.some(card=>drafts.has(`${run.id}:${card.id}`)));
}
function eveningsView() {
 const rows=eveningRows().reverse(),drafts=new Map(feedbackDrafts);
 if(!rows.length)return '<div class="library-empty wide-empty"><h2>Как прошёл твой вечер?</h2><p>Выбери вариант на сегодня или оставь отзыв в подборе. Здесь сможешь вернуться и рассказать, что получилось.</p>'+pickLink('Подобрать на вечер')+'</div>';
 return '<p class="view-description">Твой выбор, начало и впечатление хранятся отдельно от вкуса. Просмотр не меняет и не отправляет отзывы.</p><div class="library-evenings">'+rows.map((run,index)=>{
  const chosen=run.cards.filter(card=>run.responses.some(r=>r.cardId===card.id&&r.chosen)),rated=run.cards.filter(card=>run.responses.some(r=>r.cardId===card.id)||drafts.has(`${run.id}:${card.id}`));
  return `<details class="library-evening" data-detail="evening:${esc(run.id)}"${openDetails.has(`evening:${run.id}`)||index===0&&!openDetails.has(`closed:${run.id}`)?' open':''}><summary data-focus="evening:${esc(run.id)}"><svg class="evening-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m6 8 4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${esc(date(run.at))}</span><strong>${esc((chosen.length?chosen:rated).map(title).join(', '))}</strong></summary><div class="evening-content">${run.context.note?`<p class="evening-context">На этот вечер: ${esc(run.context.note)}</p>`:''}${rated.map(card=>`<article class="evening-card"><h2>${esc(card.title)}</h2>${eveningControls(run,card.id,{modern:true,history:true,open:openDetails.has(`feedback:${run.id}:${card.id}`),status:feedback.status(run.id),persistent:feedback.persistent,draft:feedbackDrafts.get(`${run.id}:${card.id}`)})}</article>`).join('')}</div></details>`;
 }).join('')+'</div>';
}
function render({feedbackFocus}={}) {
 const active=document.activeElement,focus=active?.dataset.focus,feedbackKey=feedbackFocus??active?.dataset.fk,id=active?.id,selection=active instanceof HTMLInputElement?[active.selectionStart,active.selectionEnd]:null;
 const counts={board:records().length,history:library.history().length,evenings:eveningRows().length};
 $('#library-app').innerHTML=`<nav class="library-views" aria-label="В библиотеке">${Object.entries({board:'Списки',history:'Архив',evenings:'Вечера'}).map(([view,label])=>`<button type="button" data-act="view" data-view="${view}" data-focus="view:${view}" aria-pressed="${state.view===view}">${label}<span>${counts[view]}</span></button>`).join('')}</nav>`
  +(!library.persistent||!familiar.persistent||Object.values(mediaHistories).some(h=>!h.persistent)||state.view==='evenings'&&(!feedback.persistent||!feedbackDrafts.persistent)?'<p class="library-storage-note" role="status">Браузер не разрешил сохранить часть изменений. Они останутся в этом окне до его закрытия.</p>':'')
  +(state.view==='board'?board():undoLine()+(state.view==='history'?historyView():eveningsView()));
 $('#library-app').setAttribute('aria-busy','false');
 const target=focus?document.querySelector(`[data-focus="${CSS.escape(focus)}"]`):feedbackKey?document.querySelector(`[data-fk="${CSS.escape(feedbackKey)}"]`):id?document.getElementById(id):null;
 initCustomSelects(document);focusCustomSelect(target,{preventScroll:true});if(target instanceof HTMLInputElement&&selection&&target.type==='search')target.setSelectionRange(...selection);
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
   }
   if(queuedAction.type==='choose'&&queuedAction.value){const run=feedback.get(rid),card=run.cards.find(card=>card.id===cid),prior=library.all().find(row=>row.domain===run.domain&&row.id===cid);if(card)library.save(prior??card,{domain:run.domain,lane:'tonight'});}
   const feedbackFocus=['choose','start'].includes(queuedAction.type)?`evening-${queuedAction.type}:${rid}:${cid}:${queuedAction.value?'off':'on'}`:focusKey;
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
 if(act==='view'){state.view=el.dataset.view;render();return;}
 if(act==='filters'){state.filtersOpen=!state.filtersOpen;render();return;}
 if(act==='lane'){state.lane=el.dataset.lane;state.limit=24;render();return;}
 if(act==='more'){state.limit+=24;render();return;}
 if(act==='clear'){state.query='';state.domain='all';state.reaction='all';state.sort='added';state.limit=24;render();$('#find-title')?.focus();return;}
 if(act==='undo'){undo();return;}
 if(act==='remove'&&row){removeRow(row);return;}
 if(act==='forget'&&row){forgetRow(row);return;}
 if(act==='rate'&&row){if(!row.saved)saveRow(row,row.lane);library.rate(row.domain,row.id,el.dataset.value==='none'?null:el.dataset.value);render();notice('Оценка сохранена. Список не изменился.');return;}
 if(act==='save-history'){const h=library.history().filter(row=>row&&typeof row==='object').reverse()[Number(el.dataset.index)];if(h&&library.save({...h,id:h.topId},{domain:h.domain})){render();notice('Сохранено на потом.');}else notice('У этой старой записи не сохранился раздел или идентификатор. Её нельзя добавить в планы.');return;}
 const actions={'evening-fit':{type:'fit',value:el.dataset.v},'evening-choose':{type:'choose',value:el.dataset.v==='on'},'evening-start':{type:'start',value:el.dataset.v==='on'},'evening-outcome':{type:'outcome',value:el.dataset.v}};
 if(actions[act])void editEvening(el,actions[act]);
});
document.addEventListener('change',event=>{
 const el=event.target;
 if(el.id==='domain-filter')state.domain=el.value;
 else if(el.id==='reaction-filter')state.reaction=el.value;
 else if(el.id==='sort')state.sort=el.value;
 else if(el.dataset.act==='move'){const row=rowFor(el);if(row){row.saved?library.move(row.domain,row.id,el.value):saveRow(row,el.value);state.lane=el.value;notice(`Перенесено в «${LANES[el.value]}».`);}}
 else if(el.dataset.act==='blocked'){historyFor(el.dataset.domain)?.setBlocked(el.dataset.id,el.checked);notice(el.checked?'Не будем предлагать это название в следующих подборах.':'Это название снова можно предлагать.');}
 else return;
 state.limit=24;render();
});
document.addEventListener('input',event=>{
 const el=event.target;
 if(el.id==='find-title'){state.query=el.value;state.limit=24;render();}
 const form=el.closest?.('[data-form="evening-reason"]');if(form)feedbackDrafts.set(`${form.dataset.run}:${form.dataset.id}`,{reason:form.elements.reason.value,note:form.elements.note.value});
});
document.addEventListener('submit',event=>{
 const form=event.target;if(!form.matches('[data-form="evening-reason"]'))return;event.preventDefault();
 const submit=form.querySelector('button[type="submit"]');submit.dataset.run=form.dataset.run;submit.dataset.id=form.dataset.id;
 void editEvening(submit,{type:'explain',reason:form.elements.reason.value||null,note:form.elements.note.value});
});
document.addEventListener('toggle',event=>{
 const el=event.target;
 if(el.dataset.detail){el.open?openDetails.add(el.dataset.detail):openDetails.delete(el.dataset.detail);if(el.dataset.detail.startsWith('evening:')){const closed=`closed:${el.dataset.detail.slice(8)}`;el.open?openDetails.delete(closed):openDetails.add(closed);}}
 if(el.matches('[data-feedback-details]')){const k=`feedback:${el.dataset.run}:${el.dataset.id}`;el.open?openDetails.add(k):openDetails.delete(k);}
},true);
document.addEventListener('error',event=>{const image=event.target;if(image instanceof HTMLImageElement&&image.closest('.library-cover')){failedImages.add(image.getAttribute('src'));image.closest('.library-cover').classList.add('no-cover');image.closest('.library-cover').innerHTML='<span>Обложка недоступна</span>'; }},true);
addEventListener('storage',event=>{
 if(event.key===LIBRARY_KEY||event.key?.startsWith(GAME_HISTORY_PREFIX)||event.key?.startsWith(MEDIA_HISTORY_PREFIX)||event.key===null){render();void enrichFamiliar();}
 if(event.key===FEEDBACK_KEY||event.key===null)void feedback.refresh().then(()=>{render();});
 if(event.key===FEEDBACK_DRAFTS_KEY)render();
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();void feedback.refresh().then(()=>{render();});void enrichFamiliar();}});

// Catalog lookup enriches only the same stable ID. It never creates a saved plan or a taste label.
async function enrichFamiliar() {
 const queue=familiar.all().filter(row=>!requested.has(row.id));
 const worker=async()=>{for(let entry;entry=queue.shift();) {
  requested.add(entry.id);
  const existing=library.all().find(row=>row.domain==='game'&&row.id===entry.id);if(existing?.poster||existing?.image)continue;
  try {const response=await fetch(`/api/search?domain=game&q=${encodeURIComponent(entry.title)}`);if(!response.ok)continue;const found=await response.json(),match=Array.isArray(found)?found.find(card=>card?.id===entry.id):null;
   if(match){metadata.set(entry.id,match);if(state.view==='board')render();}
  }catch{/* missing cover remains an honest text fallback */}
 }};
 await Promise.all([worker(),worker()]);
}
const firstRows=records();
state.lane=Object.keys(LANES).find(lane=>firstRows.some(row=>row.lane===lane))??'want';
render();
// Refresh opens the authoritative IndexedDB snapshot. Viewing never observes, updates or flushes a run.
void feedback.refresh().then(()=>{render();});
void enrichFamiliar();
