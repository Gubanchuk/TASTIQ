import {mediaRequestPresentation} from './request-conditions.js';
import {questionDraftKey} from '../pick/game/question-drafts.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const factRows=(rows,busy)=>`<ul class="request-facts">${rows.map(f=>`<li><span>${esc(f.text)}</span>${f.key?`<button type="button" data-act="remove-fact" data-key="${esc(f.key)}" data-focus="remove-fact:${esc(f.key)}" aria-label="Убрать: ${esc(f.text)}" title="Убрать это условие"${busy?' disabled':''}><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m6 6 8 8M14 6l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>`:''}</li>`).join('')}</ul>`;
export function activeRequestText(state){
 const turn=state?.turns?.findLast(t=>!t.superseded&&t.kind==='answer'&&typeof t.text==='string'&&t.text.trim());
 if(!turn)return '';
 if(state.retractions?.some(row=>row.sourceId===turn.id&&typeof row.quote==='string'&&row.quote&&turn.text.includes(row.quote)))return '';
 return turn.text;
}
const readerIcon='<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><path d="m7.5 5 5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const isOriginalTurn=turn=>turn.question?.id==='direction'&&turn.kind==='answer'&&!turn.superseded;
const wishOf=turn=>turn?.text?.trim()||turn?.selected?.map(option=>option.label).filter(Boolean).join(', ');
export function originalWishHtml(state,readDraft){
 const index=state?.turns?.findIndex(isOriginalTurn)??-1;
 if(index<0)return '';
 const turn=state.turns[index];
 let wish=wishOf(turn);
 if(!wish)return '';
 // The accepted answer normalizes whitespace. Its matching local draft retains the paragraphs.
 if(turn.text&&readDraft){
  const key=questionDraftKey({...state,turns:state.turns.slice(0,index)},turn.question);
  const typed=readDraft(key)?.text?.trim();
  if(typed&&typed.replace(/\s+/gu,' ')===wish)wish=typed;
 }
 const label='<span class="original-wish-label">Исходный запрос</span>';
 if(wish.length<=72&&!/[\r\n]/u.test(wish))return `<div class="original-wish">${label}<p>${esc(wish)}</p></div>`;
 return `<button type="button" class="original-wish" data-act="read-request" data-focus="original-wish" aria-haspopup="dialog" aria-label="Прочитать исходный запрос">${label}<span class="original-wish-preview" data-reader-text aria-hidden="true">${esc(wish)}</span>${readerIcon}</button>`;
}

export function openRequestReader(trigger){
 const dialog=document.createElement('dialog');
 dialog.className='request-reader';
 dialog.setAttribute('aria-labelledby','request-reader-title');
 dialog.innerHTML='<header><h2 id="request-reader-title"></h2><form method="dialog"><button type="submit" aria-label="Закрыть" autofocus><svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button></form></header><p tabindex="0"></p>';
 dialog.querySelector('h2').textContent=trigger.dataset.readerTitle||'Исходный запрос';
 dialog.querySelector('p').textContent=trigger.querySelector('[data-reader-text]').textContent;
 dialog.addEventListener('close',()=>{
  dialog.remove();
  const target=trigger.isConnected?trigger:document.querySelector(`[data-focus="${CSS.escape(trigger.dataset.focus)}"]`);
  target?.focus({preventScroll:true});
 },{once:true});
 document.body.append(dialog);
 dialog.showModal();
}
export function requestSummaryText(screen={},state={}){
 const own=activeRequestText(state),localSummary=/^(Хочется|Меньше|Обязательно|Исключить):/.test(screen.summary??'')
   ||!state.summary&&state.turns?.some(turn=>turn.avoidText)&&screen.summary===state.facts?.filter(f=>f.scope==='today').map(f=>f.text).join('; ');
 return localSummary&&own?own:screen.summary||own;
}
export function requestPreviewHtml({screen={},state={},busy=false}={}){
 const first=screen.uncertainties?.[0],raw=requestSummaryText(screen,state);
 const repeated=screen.type==='question'&&screen.question?.id!=='direction'&&raw===wishOf(state.turns?.find(isOriginalTurn));
 return (raw&&!repeated?`<p>${esc(raw)}</p>`:'')+(first?`<button type="button" class="btn btn-secondary btn-s" data-act="preview-clarify"${busy?' disabled':''}>Уточнить один момент</button>`:'');
}
export function requestOverviewHtml({screen={},state={},contextHtml='',timeHtml='',toolsHtml='',clarification='',correction='',restore='',busy=false}={}){
 const summary=requestSummaryText(screen,state),media=['film','series','cartoon','anime'].includes(screen.domain??state.domain),presentation=media?mediaRequestPresentation(screen):null,facts=presentation?.facts??screen.facts??[];
 if(presentation)contextHtml=presentation.conditions.length?`<h3>Условия</h3>${factRows(presentation.conditions,busy)}`:'';
 const labels={want:'Хочется',avoid:'Не хочется',require:'Обязательно',exclude:'Исключено',indifferent:'Не принципиально',unknown:'Нужно уточнить',conditional:'При условии',history:'Прошлый опыт'};
 const groups=new Map();for(const fact of facts){const group=fact.scope==='history'?'history':fact.stance;if(!groups.has(group))groups.set(group,[]);groups.get(group).push(fact);}
 const summaryHtml=summary.length>240||summary.split(/\r?\n/u).length>3
  ? `<button type="button" class="request-summary-read" data-act="read-request" data-focus="summary-reader" data-reader-title="Твой запрос" aria-haspopup="dialog" aria-label="Прочитать сводку запроса"><span data-reader-text aria-hidden="true">${esc(summary)}</span><span>Читать целиком ${readerIcon}</span></button>`
  : `<p class="request-summary${summary?'':' is-empty'}">${esc(summary||'Здесь появятся твои ответы.')}</p>`;
 return `<div class="request-overview">${summaryHtml}`
 +(contextHtml.replace(/<[^>]+>/g,'').trim()||timeHtml?`<section class="request-conditions" aria-label="Условия выбора">${contextHtml}${timeHtml}</section>`:'')
 +[...groups].map(([group,rows])=>`<section class="request-fact-group"><h3>${esc(labels[group]??'Пожелания')}</h3>${factRows(rows,busy)}</section>`).join('')
 +(toolsHtml?`<div class="request-tools">${toolsHtml}</div>`:'')+clarification+correction+restore+'</div>';
}
