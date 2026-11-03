import {questionFormHtml,neutralAnswerLabels,focusOwnAnswer} from '/shared/question-form.js';
import {requestOverviewHtml,requestPreviewHtml} from '/shared/request-overview.js';
import {openRequestEditor,closeRequestEditor,syncRequestEditor} from '/shared/workspace-ui.js';
import {initCustomSelects,focusCustomSelect} from '/shared/custom-select.js';
import {clarificationHtml,clarificationAction,shouldClearCorrection} from '/shared/clarification-view.js';
import {qaFetch as fetch,qaStorage,qaFeedbackOptions} from '/shared/qa-session.js';
import {createConversationClient,CONVERSATION_KEY} from '/shared/conversation-client.js';
import {createFeedbackStore,FEEDBACK_KEY} from '/shared/evening-feedback.js';
import {eveningControls,feedbackStatus} from '/shared/evening-view.js';
import {createFeedbackDrafts} from '/shared/feedback-drafts.js';
import {gameCardHtml,journeyStage,saveGameToLibrary,gameLibraryState} from '/pick/game/card-view.js';
import {loadingPresentation} from '/pick/game/pending-view.js';
import {createGameHistory,GAME_HISTORY_PREFIX} from '/shared/game-history.js';
import {carryFeedbackView,feedbackToggleFocus,acceptedFamiliarCard,captureTextSelection,restoreTextSelection} from '/pick/game/feedback-view-state.js';
import {chooseNeutral,chooseOption,answerAction,hasPendingAnswer,keyboardSubmit,contextDraftText,contextEditorValues} from '/pick/game/answer-view-state.js';
import {timeBudgetHtml,timeEvidenceHtml,hasSessionTime} from '/pick/game/time-budget-view.js';
import {questionDraftKey,questionScreenKey,planLegacyQuestionDraftMigration,prepareBackDraft,finishBackDraft} from '/pick/game/question-drafts.js';
import {createLibraryStore} from '/shared/library-store.js';
import {aiErrorMessage} from '/shared/ai-error-message.js';

const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const nameOf=card=>card.ru||card.name||card.title||'Игра';
const stanceLabel=fact=>fact.scope==='history'?'Прошлый опыт':({want:'Хочется',avoid:'Меньше',require:'Обязательно',exclude:'Исключить',indifferent:'Неважно',unknown:'Неясно',conditional:'При условии',history:'Прошлый опыт'}[fact.stance]??'Неясно');
const neutralLabels=neutralAnswerLabels;
const contextReady=screen=>Boolean(screen?.context?.platform&&screen.context.company&&(screen.context.company!=='group'||screen.context.partySize));
const button=(label,act,extra='',primary=false)=>`<button type="button" class="btn ${primary?'btn-primary':'btn-secondary'}" data-act="${act}"${extra.includes('data-focus=')?'':` data-focus="${act}"`} ${extra}>${esc(label)}</button>`;
let storage,uid=null;
try{storage=qaStorage(localStorage);uid=storage.getItem('tastiq.uid');if(!uid){uid=crypto.randomUUID();storage.setItem('tastiq.uid',uid);}}catch{ /* this visit can continue without persistence */ }
const mode=new URLSearchParams(location.search).get('mode')==='free'?'free':'guided';
let renderedKey=null,screenKey=null,navigationFocus=null,lastRemovedFactFocus=null,pendingFamiliar=null,pendingBack=null,localNotice='',currentRequest='resume',searchTimer=null,searchGeneration=0,activeEvening=null,activeEveningDialogue=null,observedKey=null,observingKey=null;
let pendingAction={type:'resume'},pendingOrigin=null,processingShown=false,lastVisibleError=null;
const feedbackOpen=new Map(),feedbackDrafts=createFeedbackDrafts({storage});
const disclosures=new Map();
const compactRequest=matchMedia('(max-width:760px)');
const history=createGameHistory({storage});
const library=createLibraryStore({storage});
const feedback=createFeedbackStore({storage,...qaFeedbackOptions(storage),send:async run=>{
 const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({run})});
 return response.ok?response.json():null;
},onChange:()=>{document.querySelectorAll('[data-feedback-status]').forEach(el=>{el.textContent=feedbackStatus(feedback.status(el.dataset.feedbackStatus),feedback.persistent);});}});
const client=createConversationClient({localStart:true,fetch,storage,uid,mode,rememberedExclusions:()=>history.blockedIds(),onChange:render});
const knownQuestionDrafts=new Set();
try {const saved=JSON.parse(storage?.getItem(CONVERSATION_KEY)??'null');for(const drafts of [saved?.drafts,saved?.previous?.drafts])for(const key of Object.keys(drafts??{}))knownQuestionDrafts.add(key);}catch { /* no saved keys in a memory-only visit */ }
const currentDraft=question=>client.draft(questionDraftKey(client.state,question));
const saveCurrentDraft=(question,draft)=>{const key=questionDraftKey(client.state,question);knownQuestionDrafts.add(key);client.saveDraft(key,draft);};
function hasQuestionDraft(key){
 if(knownQuestionDrafts.has(key))return true;
 try {const saved=JSON.parse(storage?.getItem(CONVERSATION_KEY)??'null');if(Object.hasOwn(saved?.drafts??{},key)){knownQuestionDrafts.add(key);return true;}}catch { /* memory-only visits use the keys written in this page */ }
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
 return `<details class="game-history" data-disclosure="history"><summary>Знакомые игры${records.length?` (${records.length})`:''}</summary><p class="game-help">Отметки хранятся в этом браузере. Знакомая игра остаётся в подборе, пока ты отдельно её не исключишь.</p><p><a href="/library/">История выборов и вечеров</a></p>`
  +(records.length?`<ul class="game-history-list">${records.map(record=>`<li><strong>${esc(record.title)}</strong><label class="game-check"><input type="checkbox" data-history-block="${esc(record.id)}" data-focus="history-block:${esc(record.id)}"${record.blocked?' checked':''}> Не предлагать в следующих подборах</label>${button('Удалить из списка','history-forget',`data-id="${esc(record.id)}" data-focus="history-forget:${esc(record.id)}"`)}</li>`).join('')}</ul>`:'<p class="game-help">Пока нет отметок. Их можно добавить прямо на карточке результата.</p>')
  +(!history.persistent?'<p class="game-help">Отметки сохранятся только до закрытия окна.</p>':'')+'</details>';
}

function correctionForm({id='correction-form'}={}) {
 const draft=client.draft('__correction');
 return `<div class="clarification-tools"><form id="${id}" class="clarification-form" data-form="correction"${draft.kind==='none'?'':' hidden'}><label class="game-field">Что добавить или изменить?<textarea id="correction-text" class="input" name="correction" maxlength="1600" rows="3" required>${esc(draft.text)}</textarea></label><div class="clarification-actions"><button class="btn btn-secondary" type="submit"${client.busy?' disabled':''}>Применить поправку</button><button type="button" class="btn btn-plain" data-act="cancel-correction">Отмена</button></div></form></div>`;
}
function contextForm(context) {
 context=contextEditorValues(context,client.draft('__context').text,client.state.id);
 const options=(values,current)=>Object.entries(values).map(([value,label])=>`<option value="${esc(value)}"${current===value?' selected':''}>${esc(label)}</option>`).join('');
 return '<details class="game-context-editor" data-disclosure="context"><summary>Изменить условия</summary><form data-form="context">'
  +`<label class="game-field">Платформа<select id="context-platform" class="input" name="platform" required><option value="">Выбрать платформу</option>${options({windows:'Windows',mac:'macOS',linux:'Linux',deck:'Steam Deck'},context.platform)}</select></label>`
  +`<label class="game-field">С кем играешь<select id="context-company" class="input" name="company" required><option value="">Выбрать компанию</option>${options({solo:'Один',friend:'Вдвоём',group:'Компанией'},context.company)}</select></label>`
  +`<label class="game-field" data-group-field${context.company==='group'?'':' hidden'}>Количество игроков<select id="context-party" class="input" name="partySize"${context.company==='group'?' required':''}>${options({'2':'2 игрока','3':'3 игрока','4':'4 игрока','5+':'5 и больше'},context.partySize??'2')}</select></label>`
  +'<button type="submit" class="btn btn-secondary">Сохранить условия</button></form></details>';
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
 const labels={windows:'Windows',mac:'macOS',linux:'Linux',deck:'Steam Deck',pc:'ПК',ps:'PlayStation',xbox:'Xbox',switch:'Nintendo Switch',any:'Любая платформа',solo:'Один',friend:'Вдвоём',group:'Компания',kids:'С детьми'};
 const contextHtml=`<div class="game-context">${Object.entries(context).filter(([,v])=>v).map(([key,v])=>`<span>${esc(key==='partySize'?`${v} игроков`:labels[v]??v)}</span>`).join('')}</div>`;
 $('#understanding').innerHTML=requestOverviewHtml({screen,state:client.state,contextHtml,timeHtml:timeBudgetHtml(time),busy:client.busy,
  toolsHtml:(contextReady(screen)?contextForm(context):'')+historyHtml()+(time?'<details class="request-time-details"><summary>Откуда ограничение времени</summary><ul>'+timeEvidenceHtml(time)+'</ul></details>':''),
  clarification:clarificationHtml({state:client.state,uncertainties:screen.uncertainties,draft:key=>client.draft(key),busy:client.busy}),correction:correctionForm(),
  restore:client.canRestoreCorrection?'<div class="clarification-restore"><p>Предыдущий запрос и варианты можно вернуть.</p><button type="button" class="btn btn-secondary" data-act="restore-correction">Вернуть предыдущие варианты</button></div>':''});
 syncRequestEditor(client.draft('__activeRequestEditor').text);
 initCustomSelects(document);
}
function questionHtml(question) {
 const draft=currentDraft(question);
 return questionFormHtml(question,draft,{busy:client.busy,neutralStatus:neutralStatusHtml(draft)});
}
function auxiliaryHtml(screen) {
 if(screen.type!=='question'||screen.question.allowText===false)return '';
 return '<details class="game-example"><summary>Добавить пример знакомой игры</summary><p class="game-help">Добавь название и расскажи, что оно значит для сегодняшнего запроса: вернуться, найти похожее или избежать.</p><label for="game-search">Найти игру в каталоге</label><input class="input" id="game-search" type="search" autocomplete="off" placeholder="Название игры"><div id="search-results" class="game-search-results" aria-live="polite"></div></details>';
}
function neutralStatusHtml(draft) {
 if(draft.kind==='answer')return '';
 return `<p class="game-help">Отправится ответ «${esc(neutralLabels[draft.kind])}».${draft.text.trim()||draft.selected.length?' Предыдущий ответ сохранён как черновик.':''}</p>${button('Вернуться к своему ответу','resume-answer')}`;
}
function reviewHtml(screen) {
 return '<h1>Такой выбор тебе нужен сегодня?</h1>'
  +`<p>${esc(screen.summary||'Пока запрос широкий. Можно получить предварительный подбор или уточнить его своими словами.')}</p>`
  +timeBudgetHtml(screen.sessionTime,{scope:'review'})
  +(screen.provisional?'<p class="game-help">Это предварительное понимание. Уточни его, если упущено что-то важное.</p>':'')
  +'<p class="game-help">Если всё верно, можно подбирать игры. Детали и условия запроса доступны в сводке.</p>';
}
function cardHtml(card,index) {
 const familiar=client.state?.familiar??{},marked=familiar.marked?.includes(card.id),kept=familiar.keep?.includes(card.id);
 const known=history.all().find(record=>record.id===card.id),blocked=Boolean(known?.blocked);
 const planned=gameLibraryState(card,library.all());
 return gameCardHtml(card,{index,marked,kept,...planned,known:Boolean(known)||planned.known,blocked});
}
function resultHtml(screen) {
 const result=screen.result??client.state?.result;
 const replacement=client.state.replacement,notice=replacement?.notice||(client.state.familiar?.marked?.length?'':'Отмеченные игры заменены. Остальные варианты сохранены.');
 if(!result?.top)return '<h1>Пока не нашёл подходящего варианта</h1><p>Поправь запрос или вернись к вопросу.</p>'+button('Изменить пожелание','focus-correction');
 return '<div class="game-result-heading"><h1>Твои варианты на этот вечер</h1><p class="game-help">Сохрани на потом, выбери на вечер или замени знакомую игру.</p></div>'
  +(screen.provisional||result.ai?.error?'<p class="game-help">Предварительный подбор по каталогу. Уточнение моделью сейчас недоступно.</p>':'')
  +(result.ai?.wish?`<p class="game-help">${esc(result.ai.wish)}</p>`:'')
  +(replacement&&notice?`<p class="game-replacement-notice" role="status">${esc(notice)}</p>`:'')
  +'<section class="game-proposals" aria-label="Предложенные игры">'+[result.top,...(result.alternatives??[]).slice(0,3)].map(cardHtml).join('')+'</section>';
}
function render() {
 ensureQuestionDraftMigration();
 const screen=client.screen;
 const focus=preserveView();
 $('#back').disabled=client.busy||!screen?.canBack;
 $('#restart').disabled=client.busy;
 $('#restore').hidden=!client.canRestorePrevious;
 $('#restore').disabled=client.busy;
 const pending=loadingPresentation(pendingAction,pendingOrigin??client.state),prominent=client.busy&&pending.prominent;
 $('#notice').textContent=client.busy?(prominent?'':pending.title):localNotice||(!client.persistent?'Этот подбор сохранится только до закрытия окна.':'');
 $('#processing-title').textContent=pending.title;
 $('#processing-description').textContent=pending.description;
 $('#processing').hidden=!prominent;
 $('#main').hidden=prominent;$('#main').inert=prominent;
 $('#auxiliary').hidden=prominent;$('#auxiliary').inert=client.busy;
 $('#stage').classList.toggle('is-processing',prominent);
 $('#error').hidden=!client.error;
 const retryAllowed=!(client.snapshot?.retryable===false&&client.snapshot?.error===client.error);
 $('#error').innerHTML=client.error?`<span>${esc(aiErrorMessage(client.error))}</span>${retryAllowed?` ${button('Повторить','retry',client.busy?'disabled':'')}`:''}`:'';
 if(!screen)return;
 document.body.dataset.view=screen.type;
 document.body.dataset.early=String(screen.type==='question'&&['direction','platform','company','party'].includes(screen.question?.id));
 document.body.dataset.hasSummary=String(Boolean(screen.summary||screen.facts?.length||Object.values(screen.context??{}).some(Boolean)));
 const stage=journeyStage(client.state,screen);
 document.querySelectorAll('[data-journey-stage]').forEach(el=>{const at=Number(el.dataset.journeyStage);el.dataset.status=at<stage?'done':at===stage?'current':'next';if(at===stage)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
 $('#request-link').hidden=document.body.dataset.hasSummary!=='true';
 const key=JSON.stringify([client.state.id,client.state.revision,screen,history.all(),library.all()]);
 const nextScreenKey=questionScreenKey(client.state,screen);
 const newScreen=nextScreenKey!==screenKey,firstScreen=screenKey===null;
 if(key!==renderedKey) {
  renderedKey=key;screenKey=nextScreenKey;searchGeneration++;clearTimeout(searchTimer);
  $('#main').innerHTML=screen.type==='question'?questionHtml(screen.question):screen.type==='review'?reviewHtml(screen):resultHtml(screen);
  $('#auxiliary').innerHTML=auxiliaryHtml(screen);
  understanding(screen);
  restoreView(null);
  if(newScreen&&!client.busy){
   const heading=$('#main h1')??$('#main');heading.tabIndex=-1;heading.focus({preventScroll:true});
   if(firstScreen)window.scrollTo({top:0,behavior:'auto'});
   else (matchMedia('(max-width:760px)').matches?$('#request-panel'):$('#stage')).scrollIntoView({block:'start',behavior:'auto'});
  }
 }
 document.querySelectorAll('#main button,#main input,#main textarea,#request-editor button,#request-editor input,#request-editor textarea,#request-editor select,#request-panel button,#request-panel input,#request-panel textarea,#request-panel select').forEach(el=>el.disabled=client.busy);
 const disabled=client.busy?' disabled':'';
 const needsChoice=screen.type==='question'&&screen.question.allowText===false&&!currentDraft(screen.question).selected.length;
 const reviewBlocked=screen.type==='question'&&hasPendingAnswer(currentDraft(screen.question));
 const marked=client.state.familiar?.marked??[];
 $('#action-controls').innerHTML=screen.type==='question'
  ?`${contextReady(screen)?button('Проверить запрос','review',client.busy||reviewBlocked?' disabled':''):''}<button type="submit" form="answer-form" class="btn btn-primary"${client.busy||needsChoice?' disabled':''}>${client.busy?'Продолжаю…':'Дальше'}<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m8 5 5 5-5 5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg></button>${contextReady(screen)?`<p class="game-draft-hint" id="review-draft-hint"${reviewBlocked?'':' hidden'}>Чтобы учесть этот ответ, нажми «Дальше».</p>`:''}`
  :screen.type==='review'?button('Изменить пожелание','focus-correction',disabled)+button('Подобрать игры','confirm',disabled,true)
  :(marked.length?button(`Заменить отмеченные (${marked.length})`,'replace-familiar',disabled,true):'')
   +button('Показать ещё','more',disabled,!marked.length)+button('Уточнить запрос','focus-correction',disabled)
   +(client.state.familiar?.undo?button('Вернуть предыдущие варианты','undo-replacement',disabled):'');
 if(screen.canUndoFactRemoval)$('#action-controls').insertAdjacentHTML('beforeend',button('Отменить удаление','undo-fact-removal',disabled));
 $('#actions').hidden=prominent;
 $('#main').setAttribute('aria-busy',String(client.busy));
 if(!client.busy&&navigationFocus?.focus?.startsWith('remove-fact:')&&screen.canUndoFactRemoval)$('#action-controls [data-act="undo-fact-removal"]')?.focus({preventScroll:true});
 else if(!newScreen&&!client.busy&&!restoreView(navigationFocus??focus)&&navigationFocus)$('#action-controls button')?.focus({preventScroll:true});
 if(screen.type==='result'){
  observeResult();
  // Library writes redraw the cards; restore a feedback control after its HTML exists again.
  if(!newScreen&&!client.busy&&focus?.fk)restoreView(navigationFocus??focus);
 }
 if(prominent&&!processingShown){$('#processing').focus({preventScroll:true});$('#stage').scrollIntoView({block:'start',behavior:'auto'});}
 if(client.error&&!client.busy&&client.error!==lastVisibleError){$('#error').focus({preventScroll:true});$('#error').scrollIntoView({block:'center',behavior:'auto'});}
 processingShown=prominent;lastVisibleError=client.error;
}
function refreshFeedback() {
 const focus=preserveView();
 const outcomes=new Map();document.querySelectorAll('[data-card-feedback]').forEach(el=>outcomes.set(el.dataset.cardFeedback,Boolean(el.querySelector('.evening-outcome')?.open)));
 const run=activeEvening?feedback.get(activeEvening):null;
 document.querySelectorAll('[data-card-feedback]').forEach(el=>{
  const id=el.dataset.cardFeedback,key=`${activeEvening}:${id}`;
  el.innerHTML=eveningControls(run,id,{open:feedbackOpen.get(key)??false,status:feedback.status(activeEvening),persistent:feedback.persistent,draft:feedbackDrafts.get(key),modern:true});
  el.querySelectorAll('[data-form="evening-reason"] [name]').forEach(field=>field.dataset.focus=`feedback-field:${id}:${field.name}`);
  if(el.closest('.game-card-alternative'))el.querySelectorAll('.btn-primary').forEach(button=>{button.classList.remove('btn-primary');button.classList.add('btn-secondary');});
  const outcome=el.querySelector('.evening-outcome');if(outcome){const disclosure=`outcome:${activeEvening}:${id}`;outcome.dataset.disclosure=disclosure;if(disclosures.has(disclosure))outcome.open=disclosures.get(disclosure);else if(outcomes.get(id))outcome.open=true;}
  el.querySelectorAll('button,input,textarea,select').forEach(control=>control.disabled=client.busy);
 });
 initCustomSelects(document);
 restoreView(focus);
}
function observeResult() {
 const snapshot=client.snapshot,result=snapshot.screen.result??snapshot.state.result;
 const projection=snapshot.feedbackState;if(!result?.top||!projection)return;
 const key=JSON.stringify([snapshot.state.id,result]);
 if(observedKey===key){refreshFeedback();return;}if(observingKey===key)return;
 observingKey=key;
 const inheritFrom=snapshot.feedbackCarry&&activeEveningDialogue===snapshot.state.id?activeEvening:null;
 void feedback.observe(snapshot.state.id,projection,result,...(inheritFrom?[{inheritFrom,carryIntoExisting:true,retainedIds:snapshot.feedbackCarry.retainedIds}]:[])).then(run=>{
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
function focusResultStart(){const heading=$('#main h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}$('#stage').scrollIntoView({block:'start',behavior:'auto'});}
async function navigate(action,{origin=null}={}) {
 if(client.busy)return null;
 const browseNavigation=['more','undo_replacement'].includes(action.type)||action.type==='retry'&&client.state?.failedAction==='more';
 if(action.type==='review'&&client.screen?.type==='question'&&hasPendingAnswer(currentDraft(client.screen.question)))return null;
 currentRequest=action.type;
 pendingAction=action;pendingOrigin=client.state;
 localNotice='';
 navigationFocus=action.type==='undo_fact_removal'?{focus:lastRemovedFactFocus??'fact-details'}:preserveView();
 pendingBack=action.type==='back'?prepareBackDraft(client.state):null;
 persistAnswer();
 if(!['familiar_mark','familiar_keep'].includes(action.type))pendingFamiliar=null;
 if(['back','restart','context'].includes(action.type))client.invalidate();
 if(action.type==='restart'){activeEvening=null;activeEveningDialogue=null;observedKey=null;}
 const result=await client.send(action);
 rememberAcceptedFamiliar(result);
 completeBackDraft(result);
 if(result&&!client.error&&shouldClearCorrection(action,origin,client.draft('__correction').text)){client.saveDraft('__correction',{text:''});client.saveDraft('__activeRequestEditor',{text:''});const input=$('#correction-text');if(input)input.value='';closeRequestEditor($('#correction-form'),{focus:false});}
 if(action.type==='context'&&result&&!client.error){
  client.saveDraft('__context',{text:''});
  if(client.screen?.type==='question'){localNotice='Условия изменены. Проверь ответ на этот вопрос перед отправкой.';render();}
 }
 if(action.type==='remove_fact'&&result&&!client.error){localNotice='Убрал из понимания запроса.';render();}
 if(action.type==='undo_fact_removal'&&result&&!client.error){localNotice='Удаление отменено.';render();}
 if(result&&!client.error&&client.screen?.type==='result'&&browseNavigation)focusResultStart();
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
 history.remember(card,{exposure:'played'});pendingFamiliar=null;render();
}
function paintSelections(draft) {
 document.querySelectorAll('[data-act="option"]').forEach(el=>el.setAttribute('aria-pressed',String(draft.kind==='answer'&&draft.selected.includes(el.dataset.id))));
 document.querySelectorAll('[data-act="neutral"]').forEach(el=>el.setAttribute('aria-pressed',String(draft.kind===el.dataset.kind)));
 const next=$('#actions [form="answer-form"]');if(next)next.disabled=client.busy||client.screen?.question?.allowText===false&&!draft.selected.length;
 const field=$('#answer-field');if(field)field.hidden=draft.kind!=='answer';
 const status=$('#neutral-status');if(status)status.innerHTML=neutralStatusHtml(draft);
 const review=$('[data-act="review"]');if(review)review.disabled=client.busy||hasPendingAnswer(draft);
 const hint=$('#review-draft-hint');if(hint)hint.hidden=!hasPendingAnswer(draft);
}
function expandRequestDetails() {
 const details=$('.game-request-details');if(details){details.open=true;disclosures.set('request-details',true);}
}
async function updateEvening(element,action) {
 const {run,id}=element.dataset;
 const card=[client.state?.result?.top,...(client.state?.result?.alternatives??[])].find(item=>item?.id===id);
 if(!await feedback.update(run,id,action))return;
 if(action.type==='choose'&&action.value===true&&card){
  const saved=saveGameToLibrary(library,card,{lane:'tonight'});
  localNotice=saved?(library.persistent?'Сохранено в библиотеке на этот вечер.':'На этот вечер — в библиотеке до закрытия окна.'):'';
  render();
 }
 if(action.type==='explain')feedbackDrafts.delete(`${run}:${id}`);
 refreshFeedback();void feedback.flush();
}
document.addEventListener('click',event=>{
 const menu=$('.game-session-menu');if(menu?.open&&!menu.contains(event.target)){menu.open=false;disclosures.set('session',false);}
 const el=event.target.closest('[data-act]');if(!el||el.disabled)return;
 const act=el.dataset.act;
 if(el.closest('.game-session-menu'))el.closest('.game-session-menu').open=false;
 if(act==='focus-request'){$('#request-panel').scrollIntoView({block:'start',behavior:'auto'});$('#request-panel h2').focus({preventScroll:true});return;}
 if(act==='focus-history'){
  expandRequestDetails();
  const details=$('.game-history');if(details){details.open=true;disclosures.set('history',true);details.querySelector('summary')?.focus();}return;
 }
 if(act==='history-forget'){history.forget(el.dataset.id);render();$('.game-history summary')?.focus({preventScroll:true});return;}
 if(act==='library-save'){
  if(client.busy)return;
  const id=el.dataset.id,existing=library.all().find(item=>item.domain==='game'&&item.id===id);
  if(existing){localNotice=library.persistent?'Уже сохранено в библиотеке.':'Сохранено в библиотеке до закрытия окна.';render();return;}
  const card=[client.state?.result?.top,...(client.state?.result?.alternatives??[])].find(item=>item?.id===id);
  if(saveGameToLibrary(library,card)){localNotice=library.persistent?'Сохранено в библиотеке на потом.':'На потом — в библиотеке до закрытия окна.';render();}return;
 }
 if(act==='restore-previous'){if(!client.busy){currentRequest='resume';pendingAction={type:'resume'};pendingOrigin=client.state;localNotice='';pendingBack=null;activeEvening=null;activeEveningDialogue=null;observedKey=null;void client.restorePrevious();}return;}
 if(act==='option'||act==='neutral'){
  const question=client.screen?.question;if(!question)return;const current=persistAnswer();
  const draft=act==='option'?chooseOption(current,el.dataset.id,question.multiple):chooseNeutral(current,el.dataset.kind);
  saveCurrentDraft(question,draft);paintSelections(draft);return;
 }
 if(act==='own-answer'){
  if(client.busy){event.preventDefault();return;}
  const question=client.screen?.question;if(!question)return;
  const draft=currentDraft(question);if(draft.kind==='answer')return;
  event.preventDefault();saveCurrentDraft(question,{...draft,kind:'answer'});paintSelections({...draft,kind:'answer'});focusOwnAnswer($('#answer-text'));return;
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
 if(act==='preview-clarify'){setContextOpen(true);$('#understanding [data-act="clarify"]')?.click();return;}
 if(act==='focus-correction'){const draft=client.draft('__correction');client.saveDraft('__correction',{...draft,kind:'none'});client.saveDraft('__activeRequestEditor',{text:'correction'});openRequestEditor($('#correction-form'));return;}
 if(act==='cancel-correction'){const draft=client.draft('__correction');client.saveDraft('__correction',{...draft,kind:'answer'});client.saveDraft('__activeRequestEditor',{text:''});closeRequestEditor($('#correction-form'));return;}
 if(act==='clarify'){const form=document.getElementById(el.getAttribute('aria-controls'));if(!form)return;const draft=client.draft(form.dataset.key);client.saveDraft(form.dataset.key,{...draft,kind:'none'});client.saveDraft('__activeRequestEditor',{text:form.dataset.key});el.setAttribute('aria-expanded','true');openRequestEditor(form);return;}
 if(act==='cancel-clarification'){const form=el.closest('form'),draft=client.draft(form.dataset.key);client.saveDraft(form.dataset.key,{...draft,kind:'answer'});client.saveDraft('__activeRequestEditor',{text:''});closeRequestEditor(form);return;}
 if(act==='restore-correction'){persistAnswer();if(client.restoreCorrection()){const general=client.draft('__correction');client.saveDraft('__correction',{...general,kind:'answer'});client.saveDraft('__activeRequestEditor',{text:''});for(const text of client.screen.uncertainties??[]){const key=`__clarification:${client.state.id}:${encodeURIComponent(text)}`;client.saveDraft(key,{...client.draft(key),kind:'answer'});}observedKey=null;activeEvening=null;activeEveningDialogue=null;renderedKey=null;render();}return;}
 if(['familiar-mark','familiar-unmark','familiar-keep'].includes(act)){
  const id=el.dataset.id,card=[client.state?.result?.top,...(client.state?.result?.alternatives??[])].find(card=>card?.id===id);
  const type={'familiar-mark':'familiar_mark','familiar-unmark':'familiar_unmark','familiar-keep':'familiar_keep'}[act];
  pendingFamiliar=card&&act!=='familiar-unmark'?{dialogueId:client.state.id,type,card}:null;
  void navigate({type,id}).then(()=>{
   if(act==='familiar-keep')document.querySelector(`[data-focus="familiar:${CSS.escape(id)}"]`)?.focus({preventScroll:true});
  });return;
 }
 if(act==='more')return void navigate({type:'more'});
 if(act==='replace-familiar')return void navigate({type:'replace_familiar'});
 if(act==='undo-replacement')return void navigate({type:'undo_replacement'});
 if(act==='evening-fit')return void updateEvening(el,{type:'fit',value:el.dataset.v});
 if(act==='evening-choose')return void updateEvening(el,{type:'choose',value:el.dataset.v==='on'});
 if(act==='evening-start')return void updateEvening(el,{type:'start',value:el.dataset.v==='on'});
 if(act==='evening-outcome')return void updateEvening(el,{type:'outcome',value:el.dataset.v});
 if(act==='remove-fact'){lastRemovedFactFocus=el.dataset.focus;return void navigate({type:'remove_fact',key:el.dataset.key});}
 if(act==='undo-fact-removal')return void navigate({type:'undo_fact_removal'});
 if(act==='remove-time')return void navigate({type:'remove_time'});
 if(act==='retry'){const browseRetry=client.state?.failedAction==='more'||pendingAction.type==='more';currentRequest='retry';if(client.state?.failedAction||pendingAction.type==='resume'){pendingAction={type:'retry'};pendingOrigin=client.state;}localNotice='';navigationFocus=preserveView();persistAnswer();void client.retry().then(result=>{rememberAcceptedFamiliar(result);completeBackDraft(result);if(browseRetry&&result&&!client.error&&client.screen?.type==='result')focusResultStart();}).finally(()=>{navigationFocus=null;});return;}
 if(['back','restart','review','confirm','continue'].includes(act))void navigate({type:act});
});
document.addEventListener('submit',event=>{
 const form=event.target;if(!form.dataset.form)return;event.preventDefault();
 if(client.busy)return;
 if(form.dataset.form==='evening-reason')return void updateEvening(form,{type:'explain',reason:form.elements.reason.value||null,note:form.elements.note.value});
 if(form.dataset.form==='context')return void navigate({type:'context',platform:form.elements.platform.value,company:form.elements.company.value,partySize:form.elements.company.value==='group'?form.elements.partySize.value:form.elements.company.value==='friend'?'2':null});
 if(form.dataset.form==='answer'){
  const question=client.screen?.question,draft=persistAnswer();if(!question||!draft)return;
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
 const primary=$('#action-controls .btn-primary');if(primary&&!primary.disabled){event.preventDefault();primary.click();}
});
document.addEventListener('change',event=>{
 const el=event.target;
 if(el.matches('[data-history-block]')){
  const id=el.dataset.historyBlock,card=[client.state?.result?.top,...(client.state?.result?.alternatives??[])].find(card=>card?.id===id);
  if(!history.all().some(record=>record.id===id)&&card)history.remember(card,{exposure:'played'});
  history.setBlocked(id,el.checked);render();return;
 }
 const form=el.closest('[data-form="context"]');if(!form)return;
 if(el.name==='company'){const group=form.querySelector('[data-group-field]');group.hidden=el.value!=='group';form.elements.partySize.required=el.value==='group';}
 client.saveDraft('__context',{text:contextDraftText(client.screen.context,{platform:form.elements.platform.value,company:form.elements.company.value,partySize:form.elements.partySize.value},client.state.id)});
});
document.addEventListener('input',event=>{
 const el=event.target;
 if(el.id==='answer-text'){const draft=persistAnswer();if(draft?.text.trim()&&draft.kind!=='answer'){draft.kind='answer';saveCurrentDraft(client.screen.question,draft);}if(draft)paintSelections(draft);return;}
 if(el.name==='clarification'){const form=el.closest('form');client.saveDraft(form.dataset.key,{text:el.value,kind:'none'});return;}
 if(el.name==='correction'){client.saveDraft('__correction',{text:el.value,kind:'none'});document.querySelectorAll('textarea[name="correction"]').forEach(other=>{if(other!==el)other.value=el.value;});return;}
 const form=el.closest('[data-form="evening-reason"]');if(form)feedbackDrafts.set(`${form.dataset.run}:${form.dataset.id}`,{reason:form.elements.reason.value,note:form.elements.note.value});
 if(el.id==='game-search'){
  clearTimeout(searchTimer);const ticket=++searchGeneration,query=el.value.trim(),question=client.screen?.question?.id;
  if(query.length<2){$('#search-results').innerHTML='';return;}
  searchTimer=setTimeout(async()=>{
   try{
    const response=await fetch(`/api/search?domain=game&q=${encodeURIComponent(query)}`);if(!response.ok)throw Error();const data=await response.json();
    if(ticket!==searchGeneration||client.screen?.question?.id!==question||!$('#search-results'))return;
    const cards=Array.isArray(data)?data:data.items??data.results??[];
    $('#search-results').innerHTML=cards.length?cards.slice(0,6).map(card=>`<button type="button" class="btn btn-secondary" data-act="example" data-title="${esc(nameOf(card))}">${esc(nameOf(card))}${card.year?`<small>${esc(card.year)}</small>`:''}</button>`).join(''):'<p class="game-help">Не нашёл. Название можно написать в ответе.</p>';
   }catch{if(ticket===searchGeneration&&$('#search-results'))$('#search-results').innerHTML='<p class="game-help">Поиск недоступен. Название можно написать в ответе.</p>';}
  },250);
 }
});
document.addEventListener('toggle',event=>{const el=event.target;if(el.matches('[data-feedback-details]'))feedbackOpen.set(`${el.dataset.run}:${el.dataset.id}`,el.open);},true);
document.addEventListener('load',event=>{const img=event.target;if(img.matches?.('.game-poster img'))img.closest('.game-poster').classList.add('is-loaded');},true);
document.addEventListener('error',event=>{const img=event.target;if(img.matches?.('.game-poster img')){const poster=img.closest('.game-poster'),tile=document.createElement('span');tile.textContent=poster.dataset.title||'Игра';poster.classList.add('game-poster-fallback');poster.replaceChildren(tile);}},true);
window.addEventListener('online',()=>void feedback.flush());
window.addEventListener('storage',event=>{if(event.key===FEEDBACK_KEY)void feedback.refresh().then(refreshFeedback);else if(event.key===null||event.key==='tastiq.site.library'||event.key.startsWith(GAME_HISTORY_PREFIX)){history.refresh();render();}});
compactRequest.addEventListener('change',event=>{const details=$('.game-request-details');if(details){details.open=!event.matches;disclosures.set('request-details',details.open);}});
render();
await client.start();
void feedback.flush();
