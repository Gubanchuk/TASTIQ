import {setupSelectionMode,checkpointHtml,selectionModeTitle} from '/shared/selection-mode.js';
import {bindFilmToGame} from '/shared/film-to-game.js';
import {questionFormHtml,canSubmitQuestion,focusOwnAnswer} from '/shared/question-form.js';
import {copyCardTitle} from '/shared/title-copy.js';
import {createSelectionReviewController} from '/shared/selection-review-controller.js';
import {resultBatchHelp,resultBatchNotice,resultRequestScreen,singleReplacementIndex} from '/shared/result-clarity.js';
import {currentFinalists,openComparison,resultDialog,syncResultDialog} from '/shared/result-comparison.js?v=2';
import {openShorter,shorterLimit} from './shorter-result.js';
import {requestOverviewHtml,requestPreviewHtml} from '/shared/request-overview.js';
import {openRequestEditor,closeRequestEditor,syncRequestEditor,syncSessionActions,syncEditorSubmit,focusPickerContent} from '/shared/workspace-ui.js';
import {initCustomSelects,focusCustomSelect} from '/shared/custom-select.js';
import {clarificationHtml,clarificationAction,shouldClearCorrection} from '/shared/clarification-view.js';
import {qaFetch as fetch,qaStorage,qaFeedbackOptions} from '/shared/qa-session.js';
import {createConversationClient} from '/shared/conversation-client.js';
import {createFeedbackStore,FEEDBACK_KEY} from '/shared/evening-feedback.js';
import {createVisitReviews} from '/shared/visit-reviews.js';
import {createTasteMemory,TASTE_MEMORY_PREFIX} from '/shared/taste-memory.js';
import {eveningControls,feedbackStatus} from '/shared/evening-view.js';
import {createFeedbackDrafts} from '/shared/feedback-drafts.js';
import {mediaCardHtml as gameCardHtml,toggleMediaLibrarySave as toggleGameLibrarySave,mediaLibraryState as gameLibraryState} from '/pick/watch/card-view.js';
import {mediaConfig,mediaJourneyStage as journeyStage,mediaLoadingPresentation as loadingPresentation,mediaContextDraftText as contextDraftText,mediaContextEditorValues as contextEditorValues,mediaTimeBudgetHtml as timeBudgetHtml} from '/pick/watch/view-state.js';
import {createMediaHistory,mediaHistoryPrefix} from '/shared/media-history.js';
import {carryFeedbackView,feedbackToggleFocus,acceptedFamiliarCard,captureTextSelection,restoreTextSelection} from '/pick/game/feedback-view-state.js';
import {chooseOption,answerAction,hasPendingAnswer,keyboardSubmit} from '/pick/game/answer-view-state.js';
import {timeEvidenceHtml,hasSessionTime} from '/pick/game/time-budget-view.js';
import {questionDraftKey,questionScreenKey,planLegacyQuestionDraftMigration,prepareBackDraft,finishBackDraft} from '/pick/game/question-drafts.js';
import {createLibraryStore} from '/shared/library-store.js';
import {aiErrorMessage,replacementNotice} from '/shared/ai-error-message.js';
import {bindResultArtwork} from '/shared/card-artwork.js';
import {savedPickerSession,bindSavedSourceBanner,resumeArchiveUrl,savedResultLimits,isArchivedResult} from '/shared/saved-picker-session.js';

const requestedDomain=new URLSearchParams(location.search).get('domain');
const domain=['film','series','cartoon','anime'].includes(requestedDomain)?requestedDomain:'film';
const animation=domain==='cartoon'||domain==='anime';
const config=mediaConfig(domain),GAME_HISTORY_PREFIX=mediaHistoryPrefix(domain);
document.title=`${config.title} — TASTIQ`;
document.querySelector('[data-selection-domain]').textContent=({film:'Подбираем фильм',series:'Подбираем сериал',cartoon:'Подбираем мультфильм',anime:'Подбираем аниме'})[domain];
document.querySelectorAll('.conversation-domains a').forEach(a=>{const selected=new URL(a.href).searchParams.get('domain')===domain;a.toggleAttribute('aria-current',selected);if(selected)a.setAttribute('aria-current','page');});
const $=selector=>document.querySelector(selector);
let storage,tabStorage;
try{storage=qaStorage(localStorage);}catch{}
try{tabStorage=qaStorage(sessionStorage);}catch{}
const session=savedPickerSession({params:new URLSearchParams(location.search),domain,storage,session:tabStorage});
const updateSourceBanner=bindSavedSourceBanner(session,domain,tabStorage);
if(!session.missing)await startPicker();

async function startPicker(){
const CONVERSATION_KEY=session.key;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const nameOf=card=>card.ru||card.name||card.title||'Название';
const stanceLabel=fact=>fact.scope==='history'?'Прошлый опыт':({want:'Хочется',avoid:'Меньше',require:'Обязательно',exclude:'Исключить',indifferent:'Неважно',unknown:'Неясно',conditional:'При условии',history:'Прошлый опыт'}[fact.stance]??'Неясно');
const contextReady=screen=>Boolean(screen?.canBack);
const button=(label,act,extra='',primary=false)=>`<button type="button" class="btn ${primary?'btn-primary':'btn-secondary'}" data-act="${act}"${extra.includes('data-focus=')?'':` data-focus="${act}"`} ${extra}>${esc(label)}</button>`;
let uid=null;
try{uid=storage.getItem('tastiq.uid');if(!uid){uid=crypto.randomUUID();storage.setItem('tastiq.uid',uid);}}catch{ /* this visit can continue without persistence */ }
const mode=new URLSearchParams(location.search).get('mode')==='free'?'free':'guided';
let renderedKey=null,screenKey=null,navigationFocus=null,lastRemovedFactFocus=null,pendingFamiliar=null,pendingBack=null,localNotice='',currentRequest='resume',searchTimer=null,searchGeneration=0,activeEvening=null,activeEveningDialogue=null,observedKey=null,observingKey=null;
let pendingAction={type:'resume'},pendingOrigin=null,processingShown=false,lastVisibleError=null;
const feedbackOpen=new Map(),feedbackDrafts=createFeedbackDrafts({storage});
const disclosures=new Map();
const compactRequest=matchMedia('(max-width:760px)');
const history=createMediaHistory(domain,{storage});
const library=createLibraryStore({storage});
const memory=createTasteMemory({storage});
const showFilmToGame=bindFilmToGame($('#film-to-game'),tabStorage);
let selectionReviews,visitReviews;
const feedback=createFeedbackStore({storage,...qaFeedbackOptions(storage),send:async run=>{
 const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({run})});
 return response.ok?response.json():{ok:false,status:response.status};
},onChange:()=>{document.querySelectorAll('[data-feedback-status]').forEach(el=>{el.textContent=feedbackStatus(feedback.status(el.dataset.feedbackStatus),feedback.persistent);});selectionReviews?.refreshStatus();visitReviews?.refresh();}});
const client=createConversationClient({localStart:true,selectionId:session.selection,archiveVisit:Boolean(session.archivedId),savedSource:session.savedSource,savedListView:session.savedListView,fetch,domain,storage:session.draftStorage,storageKey:CONVERSATION_KEY,archiveStorage:storage,uid,mode,rememberedExclusions:()=>history.blockedIds(),qualityFeedback:()=>visitReviews.context(),tasteMemory:()=>visitReviews.tasteContext(),onChange:render});
visitReviews=createVisitReviews({client,memory,domain,entries:()=>feedback.learningEntries(domain)});
const selectionMode=setupSelectionMode({client,render,switchDepth:depth=>navigate({type:'setDepth',depth}),focusWorkspace:()=>focusPickerContent($('#main h1')),
 onRestart(){persistAnswer();activeEvening=null;activeEveningDialogue=null;observedKey=null;localNotice='';pendingBack=null;currentRequest='resume';}
});
resumeArchiveUrl(session);
selectionReviews=createSelectionReviewController({storage,feedback,getSnapshot:()=>client.snapshot,getRunId:()=>activeEvening,isBusy:()=>client.busy,onChange:refreshFeedback});
const knownQuestionDrafts=new Set();
try {const saved=JSON.parse(session.draftStorage?.getItem(CONVERSATION_KEY)??'null');for(const drafts of [saved?.drafts,saved?.previous?.drafts])for(const key of Object.keys(drafts??{}))knownQuestionDrafts.add(key);}catch { /* no saved keys in a memory-only visit */ }
const currentDraft=question=>client.draft(questionDraftKey(client.state,question));
const saveCurrentDraft=(question,draft)=>{const key=questionDraftKey(client.state,question);knownQuestionDrafts.add(key);client.saveDraft(key,draft);};
function hasQuestionDraft(key){
 if(knownQuestionDrafts.has(key))return true;
 try {const saved=JSON.parse(session.draftStorage?.getItem(CONVERSATION_KEY)??'null');if(Object.hasOwn(saved?.drafts??{},key)){knownQuestionDrafts.add(key);return true;}}catch { /* memory-only visits use the keys written in this page */ }
 const draft=client.draft(key);return Boolean(draft.text||draft.selected.length||draft.kind!=='answer');
}
function ensureQuestionDraftMigration(){
 if(!client.state||client.draft('__questionDraftV3').text===client.state.id)return;
 for(const [key,draft] of planLegacyQuestionDraftMigration(client.state,client.screen,key=>client.draft(key))){knownQuestionDrafts.add(key);client.saveDraft(key,draft);}
 client.saveDraft('__questionDraftV3',{text:client.state.id});
}

function preserveView() {
 document.querySelectorAll('details[data-disclosure]').forEach(el=>disclosures.set(el.dataset.disclosure,el.open));
 const el=document.activeElement;
 const token=el?.dataset.focus?{focus:el.dataset.focus}:el?.dataset.fk?{fk:el.dataset.fk,toggle:feedbackToggleFocus(el.dataset)}:el?.id?{id:el.id}:null;
 return token?{...token,selection:captureTextSelection(el)}:null;
}
function restoreView(focus) {
 document.querySelectorAll('details[data-disclosure]').forEach(el=>{if(el.dataset.disclosure==='request-details'&&!compactRequest.matches)el.open=true;else if(disclosures.has(el.dataset.disclosure))el.open=disclosures.get(el.dataset.disclosure);});
 if(!focus)return false;
 let el=focus.focus?document.querySelector(`[data-focus="${CSS.escape(focus.focus)}"]`):focus.fk?document.querySelector(`[data-fk="${CSS.escape(focus.fk)}"]`):document.getElementById(focus.id);
 if(!el&&focus.toggle)el=document.querySelector(`[data-act="${CSS.escape(focus.toggle.act)}"][data-id="${CSS.escape(focus.toggle.id)}"]`);
 if(el)focusCustomSelect(el,{preventScroll:true});if(el)restoreTextSelection(el,focus.selection);return Boolean(el);
}
function historyHtml() {
 const records=history.all();
 return `<details class="game-history" data-disclosure="history"><summary>Знакомые названия${records.length?` (${records.length})`:''}</summary><p class="game-help">Отметки хранятся в этом браузере. Знакомое название остаётся в подборе, пока ты отдельно его не исключишь.</p><p><a href="/library/?view=evenings">Отзывы о рекомендациях</a></p>`
  +(records.length?`<ul class="game-history-list">${records.map(record=>`<li><strong>${esc(record.title)}</strong><label class="game-check"><input type="checkbox" data-history-block="${esc(record.id)}" data-focus="history-block:${esc(record.id)}"${record.blocked?' checked':''}> Не предлагать в следующих подборах</label>${button('Удалить из списка','history-forget',`data-id="${esc(record.id)}" data-focus="history-forget:${esc(record.id)}"`)}</li>`).join('')}</ul>`:'<p class="game-help">Пока нет отметок. Их можно добавить прямо на карточке результата.</p>')
  +(!history.persistent?'<p class="game-help">Отметки сохранятся только до закрытия окна.</p>':'')+'</details>';
}

function correctionForm({id='correction-form'}={}) {
 const draft=client.draft('__correction');
 return `<div class="clarification-tools"><form id="${id}" class="clarification-form" data-form="correction" hidden><label class="game-field">Что изменить в запросе?<textarea id="correction-text" class="input" name="correction" maxlength="1600" rows="3" required>${esc(draft.text)}</textarea></label><div class="clarification-actions"><button class="btn btn-primary" type="submit"${client.busy||!draft.text.trim()?' disabled':''}>Применить</button><button type="button" class="btn btn-plain" data-act="cancel-correction">Отмена</button></div></form></div>`;
}
function contextForm(context) {
 context=contextEditorValues(context,client.draft('__context').text,client.state.id);
 const select=(name,label,values)=>`<label class="game-field"${['commitment','onlyEnded'].includes(name)?' data-episodic-field'+(animation&&context.format==='movie'?' hidden':''):''}>${label}<select class="input" name="${name}"><option value="">Не уточняли</option>${Object.entries(values).map(([value,label])=>`<option value="${value}"${String(context[name])===value?' selected':''}>${label}</option>`).join('')}</select></label>`;
 return '<details class="game-context-editor" data-disclosure="context"><summary>Изменить условия</summary><form data-form="context" id="context-form"><p class="request-field-note">Все поля необязательны.</p>'
  +select('company','С кем смотришь',{solo:'Один',adults:'Со взрослыми',children:'С детьми'})
  +`<label class="game-field" data-child-field${context.company==='children'?'':' hidden'}>Возраст младшего зрителя<input class="input" name="childAge" type="number" min="0" max="17" value="${context.childAge??''}"></label>`
  +`<label class="game-field">Есть минут на сегодня<input class="input" name="minutes" type="number" min="5" max="1440" value="${context.minutes??''}" placeholder="Без указанного ограничения"></label>`
  +(domain==='film'?'<input type="hidden" name="timeMode" value="runtime">':select('timeMode','Ограничение относится к',domain==='series'?{episode:'Одному эпизоду',session:'Просмотру сегодня'}:{runtime:'Всему фильму',episode:'Одному эпизоду',session:'Просмотру сегодня'}))
  +(animation?select('format','Формат',{movie:domain==='anime'?'Полнометражное аниме':'Один мультфильм',episodic:'Эпизоды'}):'')
  +(domain!=='film'?select('commitment','Готовность к длинной истории',{single:'Один просмотр',short:'Короткая история',long:'Можно надолго',open:'Не принципиально'}):'')
  +(domain!=='film'?select('onlyEnded','Завершённость сериала',{'true':'Только завершённые','false':'Можно продолжающиеся'}):'')
  +'<button type="submit" class="btn btn-secondary">Сохранить условия</button></form></details>';
}
function readContextForm(form) {
 const value=name=>form.elements[name]?.value||null;
 return {company:value('company'),childAge:value('company')==='children'&&value('childAge')!==null?Number(value('childAge')):null,minutes:value('minutes')!==null?Number(value('minutes')):null,timeMode:value('minutes')!==null?value('timeMode'):null,format:domain==='film'?'movie':domain==='series'?'episodic':value('format'),commitment:domain==='film'||animation&&value('format')==='movie'?null:value('commitment'),onlyEnded:domain==='film'||animation&&value('format')==='movie'||value('onlyEnded')===null?null:value('onlyEnded')==='true'};
}

function setContextOpen(open) {
 const panel=$('.game-context-panel'),toggle=$('[data-act="toggle-context"]');
 panel.dataset.contextOpen=String(open);toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'Свернуть':'Показать';
}
function renderRequestPreview(screen) {
 const first=screen.uncertainties?.[0];
 const preview=$('#request-preview');preview.dataset.hasUncertainty=String(Boolean(first));
 preview.innerHTML=requestPreviewHtml({screen,state:client.state,busy:client.busy});
 preview.hidden=!preview.innerHTML;
}
function understanding(screen) {
 renderRequestPreview(screen);
 const context=screen.context??{},time=hasSessionTime(screen.sessionTime)?screen.sessionTime:null;
 $('#understanding').innerHTML=requestOverviewHtml({screen,state:client.state,timeHtml:timeBudgetHtml(time,{timeMode:context.timeMode}),busy:client.busy,
  toolsHtml:(contextReady(screen)?contextForm(context):'')+(screen.type==='review'?'':'<div data-visit-reviews></div>')+historyHtml()+(time?'<details class="request-time-details"><summary>Откуда ограничение времени</summary><ul>'+timeEvidenceHtml(time)+'</ul></details>':''),
  clarification:clarificationHtml({state:client.state,uncertainties:screen.uncertainties,draft:key=>client.draft(key),busy:client.busy}),correction:correctionForm(),
  restore:client.canRestoreCorrection?'<div class="clarification-restore"><p>Предыдущий запрос и варианты можно вернуть.</p><button type="button" class="btn btn-secondary" data-act="restore-correction">Вернуть предыдущие варианты</button></div>':''});
 syncRequestEditor(JSON.stringify([client.state.id,client.state.revision,screen.type]));
 initCustomSelects(document);
}
function questionHtml(screen) {
 const question=screen.question,optional=question.id!=='direction'&&question.allowText!==false;
 const exampleHtml=question.allowText!==false
  ?'<div class="game-example"><label for="game-search">Найти знакомое название</label><input class="input" id="game-search" type="search" autocomplete="off" placeholder="Название"><div id="search-results" class="game-search-results" aria-live="polite"></div></div>':'';
 return questionFormHtml(question,currentDraft(question),{busy:client.busy,canReview:!screen.checkpoint&&optional&&contextReady(screen),canChange:screen.canChangeQuestion,exampleHtml})+checkpointHtml(screen.checkpoint);
}
function reviewHtml(screen) {
 return '<h1>Такой выбор тебе нужен сегодня?</h1>'
  +`<p>${esc(screen.summary||'Пока запрос широкий. Можно получить предварительный подбор или уточнить его своими словами.')}</p>`
  +timeBudgetHtml(screen.sessionTime,{scope:'review',timeMode:screen.context?.timeMode})
  +'<div data-visit-reviews></div>'
  +(screen.provisional?'<p class="game-help">Это предварительное понимание. Уточни его, если упущено что-то важное.</p>':'')
  +'<p class="game-help">Если всё верно, можно подбирать варианты. Детали и условия запроса доступны в сводке.</p>';
}
function cardHtml(card,index) {
 const familiar=client.state?.familiar??{},marked=familiar.marked?.includes(card.id),kept=familiar.keep?.includes(card.id);
 const known=history.all().find(record=>record.id===card.id),blocked=Boolean(known?.blocked);
 const planned=gameLibraryState(card,library.all(),domain);
 const inlineUndo=index===singleReplacementIndex(client.state);
 return gameCardHtml(card,{domain,index,marked,kept,inlineUndo,...planned,known:Boolean(known)||planned.known,blocked});
}
function resultHtml(screen) {
 const result=screen.result??client.state?.result;
 const replacement=client.state.replacement,notice=replacementNotice(replacement?.notice)||(client.state.familiar?.marked?.length?'':'Отмеченные варианты заменены. Остальные варианты сохранены.');
 const batchNotice=result?.top&&!replacement?resultBatchNotice(1+(result.alternatives??[]).length):'';
 if(!result?.top)return '<h1>Пока не нашёл подходящего варианта</h1><p>Поправь запрос или вернись к вопросу.</p>'+button('Изменить пожелание','focus-correction');
 return '<div class="game-result-heading"><h1>'+(isArchivedResult(session,client.state)?'Подбор из истории':'Рекомендации для тебя')+'</h1>'
  +'<div class="game-result-browse">'+(currentFinalists(client.state,screen).length>=2?button('Сравнить два варианта','compare-results','aria-haspopup="dialog"'):'')
  +`<details class="game-result-tools" data-disclosure="result-tools"><summary data-focus="result-tools">О подборе</summary><div>${selectionModeTitle(client.state.interview?.depth)?`<p>${selectionModeTitle(client.state.interview.depth)}</p>`:''}<p id="result-batch-help">${resultBatchHelp}</p><a class="btn btn-secondary" href="/library/?view=history">Все подборы</a></div></details></div></div>`
  +'<div class="game-result-notes">'+(screen.provisional||result.ai?.error?'<p>Предварительный подбор по каталогу. Часть пожеланий могла остаться без проверки.</p>':'')
  +(result.ai?.wish?`<p class="game-help">${esc(result.ai.wish)}</p>`:'')
  +((replacement&&notice)||batchNotice?`<p class="game-replacement-notice" role="status">${esc(replacement?notice:batchNotice)}</p>`:'')
  +(!client.archivePersistent?'<p>Браузер не разрешил сохранить подбор. Он доступен до закрытия окна.</p>':'')+'</div>'
  +'<section class="game-proposals" aria-label="Предложенные варианты">'+[result.top,...(result.alternatives??[]).slice(0,3)].map(cardHtml).join('')+'</section>';
}
function render() {
 ensureQuestionDraftMigration();
 const screen=client.screen;
 showFilmToGame(client.state,domain==='film'&&screen?.type==='result'&&Boolean(screen.result?.top)&&!selectionMode.choosing,client.busy);
 syncResultDialog(client.state,screen,client.busy);
 if(session.savedSource)updateSourceBanner(client.state,library.all());
 if(selectionMode.draw(screen))return;
 const focus=preserveView();
 $('#back').disabled=client.busy||!screen?.canBack;
 syncSessionActions({busy:client.busy,canRestore:client.canRestorePrevious,canSwitch:!$('#selection-mode-control').hidden});
 const pending=loadingPresentation(pendingAction,pendingOrigin??client.state),prominent=client.busy&&pending.prominent&&!pendingAction.targetId;
 $('#notice').textContent=client.busy?(prominent?'':pending.title):localNotice||(!client.persistent?'Этот подбор сохранится только до закрытия окна.':'');
 $('#processing-title').textContent=pending.title;
 $('#processing-description').textContent=pending.description;
 $('#processing').hidden=!prominent;
 $('#main').hidden=prominent;$('#main').inert=prominent;
 $('#selection-review-slot').hidden=prominent||screen?.type!=='result';
 $('#selection-review-slot').inert=client.busy;
 $('#stage').classList.toggle('is-processing',prominent);
 $('#error').hidden=!client.error;
 const retryAllowed=!(client.snapshot?.retryable===false&&client.snapshot?.error===client.error);
 const errorText=aiErrorMessage(client.error);
 $('#error').innerHTML=client.error?`<span>${esc(errorText)}</span>${retryAllowed?` ${button('Повторить','retry',client.busy?'disabled':'')}`:''}`:'';
 if(!screen)return;
 document.body.dataset.view=screen.type;
 document.body.dataset.early='false';
 document.body.dataset.hasSummary=String(Boolean(screen.summary||screen.facts?.length||Object.values(screen.context??{}).some(Boolean)));
 const stage=journeyStage(client.state,screen);
 document.querySelectorAll('[data-journey-stage]').forEach(el=>{const at=Number(el.dataset.journeyStage);el.dataset.status=at<stage?'done':at===stage?'current':'next';if(at===stage)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
 $('#request-link').hidden=document.body.dataset.hasSummary!=='true';
 const key=JSON.stringify([client.state.id,client.state.revision,screen,history.all(),library.all()]);
 const nextScreenKey=questionScreenKey(client.state,screen);
 const newScreen=nextScreenKey!==screenKey,firstScreen=screenKey===null;
 if(key!==renderedKey) {
  renderedKey=key;screenKey=nextScreenKey;searchGeneration++;clearTimeout(searchTimer);
  $('#main').innerHTML=screen.type==='question'?questionHtml(screen):screen.type==='review'?reviewHtml(screen):resultHtml(screen);
  $('#selection-review-slot').replaceChildren();
  understanding(resultRequestScreen(screen));
  restoreView(null);
  if(newScreen&&!client.busy){
   const heading=$('#main h1')??$('#main');
   if(firstScreen){heading.tabIndex=-1;heading.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
   else focusPickerContent(heading);
  }
 }
 document.querySelectorAll('#main button,#main input,#main textarea,#request-editor button,#request-editor input,#request-editor textarea,#request-editor select,#request-panel button,#request-panel input,#request-panel textarea,#request-panel select').forEach(el=>el.disabled=client.busy);
 syncEditorSubmit($('#request-editor form'),client.busy);
 const targetButton=pendingAction.targetId?document.querySelector(`[data-act="replace-one"][data-id="${CSS.escape(pendingAction.targetId)}"]`):null;
 if(targetButton){
  targetButton.innerHTML=client.busy?'<span class="game-processing-mark inline" aria-hidden="true"><img src="/assets/brand/tastiq-symbol-cobalt.svg" width="13" height="13" alt=""></span> Ищу замену…':'Заменить только этот вариант';
  targetButton.setAttribute('aria-busy',String(client.busy));
 }
 const disabled=client.busy?' disabled':'';
 visitReviews.refresh();
 if(screen.type==='question')paintSelections(currentDraft(screen.question));
 const marked=client.state.familiar?.marked??[];
 const {noFirstMatch,noMore}=savedResultLimits(client.snapshot);
 $('#action-controls').innerHTML=screen.type==='question'
  ?''
  :screen.type==='review'?(noFirstMatch?'':button('Подобрать варианты','confirm',disabled,true))+button('Изменить пожелание','focus-correction',disabled,Boolean(noFirstMatch))
   +(client.state.depth==='deep'&&screen.canContinue!==false&&!client.state.interviewComplete?button('Уточнить ещё','continue',disabled):'')
  :(marked.length?button(`Заменить отмеченные (${marked.length})`,'replace-familiar',disabled,true):'')
   +(noMore?'':button('Показать ещё','more',`aria-describedby="result-batch-help" ${disabled}`,!marked.length))+button('Уточнить запрос','focus-correction',disabled,Boolean(noMore))
   +(shorterLimit(client.state,domain)?button('Покороче','shorter-result','aria-haspopup="dialog" '+disabled):'')
   +(client.state.familiar?.undo&&singleReplacementIndex(client.state)<0?button('Вернуть предыдущие варианты','undo-replacement',disabled):'');
 if(screen.canUndoFactRemoval)$('#action-controls').insertAdjacentHTML('beforeend',button('Отменить удаление','undo-fact-removal',disabled));
 $('#actions').hidden=prominent||(screen.type==='question'&&!screen.canUndoFactRemoval);
 $('#main').setAttribute('aria-busy',String(client.busy));
 if(!client.busy&&navigationFocus?.focus?.startsWith('remove-fact:')&&screen.canUndoFactRemoval)$('#action-controls [data-act="undo-fact-removal"]')?.focus({preventScroll:true});
 else if(!newScreen&&!client.busy&&!restoreView(navigationFocus??focus)&&navigationFocus)$('#action-controls button')?.focus({preventScroll:true});
 if(screen.type==='result'){
  observeResult();
  // Library writes redraw the cards; restore a feedback control after its HTML exists again.
  if(!newScreen&&!client.busy&&focus?.fk)restoreView(navigationFocus??focus);
 }
 if(prominent&&!processingShown)focusPickerContent($('#processing'));
 if(client.error&&!client.busy&&client.error!==lastVisibleError)focusPickerContent($('#error'));
 processingShown=prominent;lastVisibleError=client.error;
}
function refreshFeedback(cardId) {
 const focus=preserveView();
 const run=activeEvening?feedback.get(activeEvening):null;
 document.querySelectorAll('[data-card-feedback]').forEach(el=>{
  const id=el.dataset.cardFeedback;
  if(typeof cardId==='string'&&id!==cardId)return;
  const key=`${activeEvening}:${id}`;
  el.innerHTML=eveningControls(run,id,{open:feedbackOpen.get(key)??false,status:feedback.status(activeEvening),persistent:feedback.persistent,draft:feedbackDrafts.get(key),modern:true});
  el.querySelectorAll('[data-form="evening-reason"] [name]').forEach(field=>field.dataset.focus=`feedback-field:${id}:${field.name}`);
  const card=el.closest('.game-proposal');
  const decision=el.querySelector('.evening-decision'),plan=card?.querySelector('[data-card-decision]');
  if(plan)plan.replaceChildren(...(decision?[decision]:[]));
  plan?.querySelectorAll('button').forEach(control=>control.disabled=client.busy);
  el.querySelectorAll('button,input,textarea,select').forEach(control=>control.disabled=client.busy);
 });
 selectionReviews?.render();initCustomSelects(document);
 restoreView(focus);
}
function observeResult() {
 const snapshot=client.snapshot,result=snapshot.screen.result??snapshot.state.result;
 const projection=snapshot.feedbackState;if(!result?.top||!projection)return;
 const key=JSON.stringify([snapshot.state.id,result]);
 if(observedKey===key){refreshFeedback();return;}if(observingKey===key)return;
 observingKey=key;
 const inheritFrom=snapshot.feedbackCarry&&activeEveningDialogue===snapshot.state.id?activeEvening:null;
 void feedback.observe(snapshot.state.id,projection,result,{interview:snapshot.state.interview,...(inheritFrom?{inheritFrom,carryIntoExisting:true,retainedIds:snapshot.feedbackCarry.retainedIds}:{})}).then(run=>{
  if(client.state?.id!==snapshot.state.id||JSON.stringify(client.screen?.result??client.state?.result)!==JSON.stringify(result)||client.screen?.type!=='result')return;
  if(inheritFrom&&run?.id)carryFeedbackView({drafts:feedbackDrafts,open:feedbackOpen,disclosures},inheritFrom,run.id,snapshot.feedbackCarry.retainedIds,{overwrite:true});
  activeEvening=run?.id??null;activeEveningDialogue=snapshot.state.id;observedKey=key;refreshFeedback();void feedback.flush();
 }).finally(()=>{if(observingKey===key)observingKey=null;});
}
function persistAnswer() {
 const question=client.screen?.question;if(!question)return null;
 const draft=currentDraft(question),input=$('#answer-text');if(input)draft.text=input.value;
 saveCurrentDraft(question,draft);return draft;
}
function focusResultStart(){focusPickerContent($('#main h1'));}
async function navigate(action,{origin=null}={}) {
 if(client.busy)return null;
 const singleTarget=action.type==='replace_familiar'?action.id:action.type==='retry'&&client.state?.failedAction==='replace'&&client.state.replacement?.pendingIds?.length===1?client.state.replacement.pendingIds[0]:null;
 const undoSlot=action.type==='undo_replacement'&&origin==='card-undo'?singleReplacementIndex(client.state):-1;
 const singleSlot=undoSlot>=0?undoSlot:singleTarget?Array.from(document.querySelectorAll('[data-card-id]')).findIndex(card=>card.dataset.cardId===singleTarget):-1;
 const browseNavigation=['more','undo_replacement'].includes(action.type)&&undoSlot<0||action.type==='retry'&&client.state?.failedAction==='more';
 if(action.type==='review'&&client.screen?.type==='question'){
  const draft=currentDraft(client.screen.question);
  if(draft.kind==='answer'&&hasPendingAnswer(draft))return null;
 }
 currentRequest=action.type;
 pendingAction=singleTarget?{...action,targetId:singleTarget}:action;pendingOrigin=client.state;
 localNotice='';
 navigationFocus=action.type==='undo_fact_removal'?{focus:lastRemovedFactFocus??'fact-details'}:preserveView();
 pendingBack=action.type==='back'?prepareBackDraft(client.state):null;
 persistAnswer();
 if(!['familiar_mark','familiar_keep'].includes(action.type))pendingFamiliar=null;
 if(['back','restart','set_context'].includes(action.type))client.invalidate();
 if(action.type==='restart'){activeEvening=null;activeEveningDialogue=null;observedKey=null;}
 const result=await client.send(action);
 rememberAcceptedFamiliar(result);
 completeBackDraft(result);
 if(result&&!client.error&&shouldClearCorrection(action,origin,client.draft('__correction').text)){client.saveDraft('__correction',{text:''});const input=$('#correction-text');if(input)input.value='';closeRequestEditor($('#correction-form'),{focus:false});}
 if(action.type==='set_context'&&result&&!client.error){
  client.saveDraft('__context',{text:''});
  if(client.screen?.type==='question'){localNotice='Условия изменены. Проверь ответ на этот вопрос перед отправкой.';render();}
 }
 if(action.type==='remove_fact'&&result&&!client.error){localNotice='Убрал из понимания запроса.';render();}
 if(action.type==='undo_fact_removal'&&result&&!client.error){localNotice='Удаление отменено.';render();}
 if(result&&!client.error&&client.screen?.type==='result'&&browseNavigation)focusResultStart();
 if(singleSlot>=0&&result&&!client.error&&client.screen?.type==='result'){
  const heading=document.querySelectorAll('[data-card-id]')[singleSlot]?.querySelector('h2');
  if(heading){
   heading.tabIndex=-1;heading.focus({preventScroll:true});
   const rect=heading.getBoundingClientRect(),header=$('.app-shell').getBoundingClientRect().bottom;
   if(rect.top<header+8||rect.bottom>innerHeight)window.scrollBy(0,rect.top-header-12);
  }
 }
 navigationFocus=null;return result;
}
function completeBackDraft(result) {
 const question=client.screen?.type==='question'?client.screen.question:null,key=question?questionDraftKey(client.state,question):null;
 const completed=finishBackDraft(pendingBack,client.state,client.screen,{successful:Boolean(result),error:client.error,hasDraft:key?hasQuestionDraft(key):false});
 pendingBack=completed.pending;
 if(completed.seed&&question){saveCurrentDraft(question,completed.seed);const draft=currentDraft(question),input=$('#answer-text');if(input)input.value=draft.text;paintSelections(draft);}
}
function rememberAcceptedFamiliar(result) {
 if(!result||client.error)return;
 const card=acceptedFamiliarCard(client.state,pendingFamiliar);if(!card)return;
 history.remember(card,{exposure:'seen'});pendingFamiliar=null;render();
}
function paintSelections(draft) {
 document.querySelectorAll('[data-act="option"]').forEach(el=>el.setAttribute('aria-pressed',String(draft.kind==='answer'&&draft.selected.includes(el.dataset.id))));
 const next=$('[data-answer-next]');if(next)next.disabled=client.busy||!canSubmitQuestion(client.screen?.question,draft);
 const status=$('#neutral-status');if(status)status.hidden=draft.kind==='answer';
 const pending=draft.kind==='answer'&&hasPendingAnswer(draft);
 const skip=$('[data-act="review"]');if(skip)skip.disabled=client.busy||pending;
 const hint=$('#review-draft-hint');if(hint)hint.hidden=!pending;
 const genres=$('[data-genre-count]');if(genres){
  const labels=[...document.querySelectorAll('[data-disclosure="answer-genres"] [aria-pressed="true"] span')].map(el=>el.textContent);
  genres.textContent=labels.length>1?'Выбрано '+labels.length:labels[0]??'';
  genres.hidden=!labels.length;
 }
}
function expandRequestDetails() {
 const details=$('.game-request-details');if(details){details.open=true;disclosures.set('request-details',true);}
}
async function updateEvening(element,action) {
 const {run,id}=element.dataset;
 const card=[client.state?.result?.top,...(client.state?.result?.alternatives??[])].find(item=>item?.id===id);
 if(!await feedback.update(run,id,action))return;
 if(action.type==='explain'){
  const key=`${run}:${id}`,draft=feedbackDrafts.get(key);
  if(draft?.note===action.note&&(draft.reason||null)===action.reason)feedbackDrafts.delete(key);
  feedbackOpen.set(key,false);
 }
 if(run===activeEvening){
  const editor=['fit','explain'].includes(action.type)?element.closest('.evening-rating'):null;
  const focusKey=editor&&element.contains(document.activeElement)?editor.querySelector('summary').dataset.fk:null;
  if(editor)editor.open=false;
  refreshFeedback(id);
  if(focusKey)document.querySelector(`[data-fk="${CSS.escape(focusKey)}"]`)?.focus({preventScroll:true});
 }
 void feedback.flush();
}
document.addEventListener('click',event=>{
 const menu=$('.game-session-menu');if(menu?.open&&!menu.contains(event.target)){menu.open=false;disclosures.set('session',false);}
 const el=event.target.closest('[data-act]');if(!el||el.disabled)return;
 const act=el.dataset.act;
 if(act==='copy-title')return void copyCardTitle(el);
 if(act==='compare-results'&&!client.busy){
  const cards=currentFinalists(client.state,client.screen);
  if(cards.length>=2)openComparison(resultDialog(client.state,client.screen),cards,domain,id=>{
   focusPickerContent(document.querySelector('[data-card-id="'+CSS.escape(id)+'"] h2'));
  });
  return;
 }
 if(el.closest('.game-session-menu'))el.closest('.game-session-menu').open=false;
 if(act==='focus-request'){focusPickerContent($('#request-panel h2'));return;}
 if(act==='focus-history'){
  expandRequestDetails();
  const details=$('.game-history');if(details){details.open=true;disclosures.set('history',true);details.querySelector('summary')?.focus();}return;
 }
 if(act==='history-forget'){history.forget(el.dataset.id);render();$('.game-history summary')?.focus({preventScroll:true});return;}
 if(act==='library-save'){
  if(client.busy)return;
  const id=el.dataset.id;
  const card=[client.state?.result?.top,...(client.state?.result?.alternatives??[])].find(item=>item?.id===id);
  const saved=toggleGameLibrarySave(library,card,{domain});
  if(saved){localNotice=saved.saved?(library.persistent?'Добавлено в «Сохранённое».':'Сохранено до закрытия окна.'):'Сохранение снято. Оценка и отзывы остались.';render();}return;
 }
 if(act==='restore-previous'){if(!client.busy){currentRequest='resume';pendingAction={type:'resume'};pendingOrigin=client.state;localNotice='';pendingBack=null;activeEvening=null;activeEveningDialogue=null;observedKey=null;void client.restorePrevious();}return;}
 if(act==='option'){
  const question=client.screen?.question;if(!question)return;
  const draft=chooseOption(persistAnswer(),el.dataset.id,question.multiple);
  saveCurrentDraft(question,draft);paintSelections(draft);return;
 }
 if(act==='another-question'){
  const question=client.screen?.question;
  if(question&&client.screen.canChangeQuestion)void navigate({type:'another_question',questionId:question.id});
  return;
 }
 if(act==='resume-answer'){
  const question=client.screen?.question;if(!question)return;const draft={...currentDraft(question),kind:'answer'};
  saveCurrentDraft(question,draft);paintSelections(draft);focusOwnAnswer($('#answer-text'));return;
 }
 if(act==='example'){
  const draft=persistAnswer(),question=client.screen?.question;if(!draft||!question)return;
  const addition=`${draft.text.trim()?'\n':''}Пример: «${el.dataset.title}». `;draft.text=(draft.text+addition).slice(0,1600);draft.kind='answer';
  saveCurrentDraft(question,draft);$('#answer-text').value=draft.text;paintSelections(draft);focusOwnAnswer($('#answer-text'));return;
 }
 if(act==='toggle-context'){setContextOpen($('.game-context-panel').dataset.contextOpen!=='true');return;}
 if(act==='edit-time'){
  const editor=$('.game-context-editor');if(!editor)return;
  setContextOpen(true);expandRequestDetails();editor.open=true;disclosures.set('context',true);
  editor.querySelector('input[name="minutes"]').focus();return;
 }
 if(act==='preview-clarify'){setContextOpen(true);$('#understanding [data-act="clarify"]')?.click();return;}
 if(act==='focus-correction'){openRequestEditor($('#correction-form'),{trigger:el});return;}
 if(act==='shorter-result'&&!client.busy&&client.screen?.type==='result'){
  const limit=shorterLimit(client.state,domain);
  if(limit)openShorter(resultDialog(client.state,client.screen),limit,action=>void navigate(action));
  return;
 }
 if(act==='cancel-correction'){closeRequestEditor($('#correction-form'));return;}
 if(act==='clarify'){openRequestEditor(document.getElementById(el.getAttribute('aria-controls')),{trigger:el});return;}
 if(act==='cancel-clarification'){closeRequestEditor(el.closest('form'));return;}
 if(act==='restore-correction'){persistAnswer();if(client.restoreCorrection()){const general=client.draft('__correction');client.saveDraft('__correction',{...general,kind:'answer'});for(const text of client.screen.uncertainties??[]){const key=`__clarification:${client.state.id}:${encodeURIComponent(text)}`;client.saveDraft(key,{...client.draft(key),kind:'answer'});}observedKey=null;activeEvening=null;activeEveningDialogue=null;renderedKey=null;render();}return;}
 if(['familiar-mark','familiar-unmark','familiar-keep'].includes(act)){
  const id=el.dataset.id,card=[client.state?.result?.top,...(client.state?.result?.alternatives??[])].find(card=>card?.id===id);
  const type={'familiar-mark':'familiar_mark','familiar-unmark':'familiar_unmark','familiar-keep':'familiar_keep'}[act];
  pendingFamiliar=card&&act!=='familiar-unmark'?{dialogueId:client.state.id,type,card}:null;
  void navigate({type,id}).then(()=>{
   if(act==='familiar-keep')document.querySelector(`[data-focus="familiar:${CSS.escape(id)}"]`)?.focus({preventScroll:true});
  });return;
 }
 if(act==='more')return void navigate({type:'more'});
 if(act==='replace-one')return void navigate({type:'replace_familiar',id:el.dataset.id});
 if(act==='replace-familiar')return void navigate({type:'replace_familiar'});
 if(act==='undo-replacement')return void navigate({type:'undo_replacement'},{origin:el.hasAttribute('data-inline-undo')?'card-undo':null});
 if(act==='evening-fit')return void updateEvening(el,{type:'fit',value:el.dataset.v});
 if(act==='evening-choose')return void updateEvening(el,{type:'choose',value:el.dataset.v==='on'});
 if(act==='remove-fact'){lastRemovedFactFocus=el.dataset.focus;return void navigate({type:'remove_fact',key:el.dataset.key});}
 if(act==='undo-fact-removal')return void navigate({type:'undo_fact_removal'});
 if(act==='remove-time')return void navigate({type:'remove_time'});
 if(act==='retry'){const browseRetry=client.state?.failedAction==='more'||pendingAction.type==='more';currentRequest='retry';if(client.state?.failedAction||pendingAction.type==='resume'){pendingAction={type:'retry'};pendingOrigin=client.state;}localNotice='';navigationFocus=preserveView();persistAnswer();void client.retry().then(result=>{rememberAcceptedFamiliar(result);completeBackDraft(result);if(browseRetry&&result&&!client.error&&client.screen?.type==='result')focusResultStart();}).finally(()=>{navigationFocus=null;});return;}
 if(act==='restart'){selectionMode.newSelection();return;}
 if(['back','review','confirm','continue'].includes(act))void navigate({type:act});
});
document.addEventListener('submit',event=>{
 const form=event.target;if(!form.dataset.form)return;event.preventDefault();
 if(client.busy)return;
 if(form.dataset.form==='evening-reason')return void updateEvening(form,{type:'explain',reason:form.elements.reason.value||null,note:form.elements.note.value});
 if(form.dataset.form==='context')return void navigate({type:'set_context',context:readContextForm(form)});
 if(form.dataset.form==='answer'){
  const question=client.screen?.question,draft=persistAnswer();if(!question||!draft||!canSubmitQuestion(question,draft))return;
  const action=answerAction(question,draft);if(action)return void navigate(action);return;
 }
 if(form.dataset.form==='clarification'){
  const action=clarificationAction(form.dataset,client.state,form.elements.clarification.value);
  if(action)void navigate(action);else {localNotice='Запрос уже изменился. Проверь уточнение в текущей сводке.';render();}return;
 }
 if(form.dataset.form==='correction'){
  const text=form.elements.correction.value.trim();if(text)void navigate({type:'correct',text},{origin:'correction'});
 }
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&$('.game-session-menu')?.open){event.preventDefault();$('.game-session-menu').open=false;disclosures.set('session',false);$('.game-session-menu summary')?.focus();return;}
 const target=event.target,form=target.closest?.('[data-form]');
 const intent=keyboardSubmit({key:event.key,control:Boolean(target.closest?.('button,a,input,textarea,select,summary,[contenteditable="true"]')),busy:client.busy,composing:event.isComposing,modified:event.ctrlKey||event.metaKey,form:form?.dataset.form,prevented:event.defaultPrevented,dialog:Boolean(document.querySelector('dialog[open]'))});
 if(!intent)return;
 if(intent!=='primary'){event.preventDefault();form.requestSubmit();return;}
 const primary=$('[data-answer-next],#action-controls .btn-primary');if(primary&&!primary.disabled){event.preventDefault();primary.click();}
});
document.addEventListener('change',event=>{
 const el=event.target;
 if(el.matches('[data-history-block]')){
  const id=el.dataset.historyBlock,card=[client.state?.result?.top,...(client.state?.result?.alternatives??[])].find(card=>card?.id===id);
  if(!history.all().some(record=>record.id===id)&&card)history.remember(card,{exposure:'seen'});
  history.setBlocked(id,el.checked);render();return;
 }
 const form=el.closest('[data-form="context"]');if(!form)return;
 if(el.name==='company'){const child=form.querySelector('[data-child-field]');child.hidden=el.value!=='children';}
 if(el.name==='format'&&animation)form.querySelectorAll('[data-episodic-field]').forEach(field=>field.hidden=el.value==='movie');
 client.saveDraft('__context',{text:contextDraftText(client.screen.context,readContextForm(form),client.state.id)});
});
document.addEventListener('input',event=>{
 const el=event.target;
 if(el.id==='answer-text'){const draft=persistAnswer();if(draft?.text.trim()&&draft.kind!=='answer'){draft.kind='answer';saveCurrentDraft(client.screen.question,draft);}if(draft)paintSelections(draft);return;}
 if(el.name==='clarification'){const form=el.closest('form');client.saveDraft(form.dataset.key,{text:el.value});syncEditorSubmit(form,client.busy);return;}
 if(el.name==='correction'){client.saveDraft('__correction',{text:el.value});syncEditorSubmit(el.closest('form'),client.busy);return;}
 const form=el.closest('[data-form="evening-reason"]');if(form)feedbackDrafts.set(`${form.dataset.run}:${form.dataset.id}`,{reason:form.elements.reason.value,note:form.elements.note.value});
 if(el.id==='game-search'){
  clearTimeout(searchTimer);const ticket=++searchGeneration,query=el.value.trim(),question=client.screen?.question?.id;
  if(query.length<2){$('#search-results').innerHTML='';return;}
  searchTimer=setTimeout(async()=>{
   try{
    const response=await fetch(`/api/search?domain=${domain}&q=${encodeURIComponent(query)}`);if(!response.ok)throw Error();const data=await response.json();
    if(ticket!==searchGeneration||client.screen?.question?.id!==question||!$('#search-results'))return;
    const cards=Array.isArray(data)?data:data.items??data.results??[];
    $('#search-results').innerHTML=cards.length?cards.slice(0,6).map(card=>`<button type="button" class="btn btn-secondary" data-act="example" data-title="${esc(nameOf(card))}">${esc(nameOf(card))}${card.year?`<small>${esc(card.year)}</small>`:''}</button>`).join(''):'<p class="game-help">Не нашёл. Название можно написать в ответе.</p>';
   }catch{if(ticket===searchGeneration&&$('#search-results'))$('#search-results').innerHTML='<p class="game-help">Поиск недоступен. Название можно написать в ответе.</p>';}
  },250);
 }
});
document.addEventListener('toggle',event=>{const el=event.target;if(el.matches('[data-feedback-details]'))feedbackOpen.set(`${el.dataset.run}:${el.dataset.id}`,el.open);},true);
bindResultArtwork(document);
window.addEventListener('online',()=>void feedback.flush());
window.addEventListener('storage',event=>{
 if(event.key===FEEDBACK_KEY||event.key?.endsWith(':'+FEEDBACK_KEY))void feedback.refresh().then(()=>{refreshFeedback();visitReviews.refresh();});
 else if(event.key===null||event.key.includes(TASTE_MEMORY_PREFIX)||event.key==='tastiq.site.library'||event.key?.endsWith(':tastiq.site.library')||event.key?.startsWith(GAME_HISTORY_PREFIX)
   ||domain==='anime'&&event.key?.startsWith(mediaHistoryPrefix('cartoon'))){history.refresh();render();}
});
compactRequest.addEventListener('change',event=>{const details=$('.game-request-details');if(details){details.open=!event.matches;disclosures.set('request-details',details.open);}});
render();
if(!selectionMode.choosing)await client.start();
void feedback.flush();
}
