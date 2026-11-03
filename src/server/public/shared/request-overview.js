import {mediaRequestPresentation} from './request-conditions.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const factRows=(rows,busy)=>`<ul class="request-facts">${rows.map(f=>`<li><span>${esc(f.text)}</span>${f.key?`<button type="button" data-act="remove-fact" data-key="${esc(f.key)}" data-focus="remove-fact:${esc(f.key)}" aria-label="Убрать: ${esc(f.text)}" title="Убрать это условие"${busy?' disabled':''}><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m6 6 8 8M14 6l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>`:''}</li>`).join('')}</ul>`;
export function activeRequestText(state){
 const turn=state?.turns?.findLast(t=>!t.superseded&&t.kind==='answer'&&typeof t.text==='string'&&t.text.trim());
 if(!turn)return '';
 if(state.retractions?.some(row=>row.sourceId===turn.id&&typeof row.quote==='string'&&row.quote&&turn.text.includes(row.quote)))return '';
 return turn.text;
}
export function requestSummaryText(screen={},state={}){
 const own=activeRequestText(state),localSummary=/^(Хочется|Меньше|Обязательно|Исключить):/.test(screen.summary??'');
 return localSummary&&own?own:screen.summary||own;
}
export function requestPreviewHtml({screen={},state={},busy=false}={}){
 const first=screen.uncertainties?.[0],raw=requestSummaryText(screen,state);
 return (raw?`<p>${esc(raw)}</p>`:'')+(first?`<button type="button" class="btn btn-secondary btn-s" data-act="preview-clarify"${busy?' disabled':''}>Уточнить один момент</button>`:'');
}
export function requestOverviewHtml({screen={},state={},contextHtml='',timeHtml='',toolsHtml='',clarification='',correction='',restore='',busy=false}={}){
 const summary=requestSummaryText(screen,state),media=['film','series','cartoon'].includes(screen.domain??state.domain),presentation=media?mediaRequestPresentation(screen):null,facts=presentation?.facts??screen.facts??[];
 if(presentation)contextHtml=presentation.conditions.length?`<h3>Условия</h3>${factRows(presentation.conditions,busy)}`:'';
 const labels={want:'Хочется',avoid:'Не хочется',require:'Обязательно',exclude:'Исключено',indifferent:'Не принципиально',unknown:'Нужно уточнить',conditional:'При условии',history:'Прошлый опыт'};
 const groups=new Map();for(const fact of facts){const group=fact.scope==='history'?'history':fact.stance;if(!groups.has(group))groups.set(group,[]);groups.get(group).push(fact);}
 return `<div class="request-overview"><p class="request-summary${summary?'':' is-empty'}">${esc(summary||'Здесь появится то, что важно для твоего выбора.')}</p>`
 +(contextHtml.replace(/<[^>]+>/g,'').trim()||timeHtml?`<section class="request-conditions" aria-label="Условия выбора">${contextHtml}${timeHtml}</section>`:'')
 +[...groups].map(([group,rows])=>`<section class="request-fact-group"><h3>${esc(labels[group]??'Пожелания')}</h3>${factRows(rows,busy)}</section>`).join('')
 +(toolsHtml?`<div class="request-tools">${toolsHtml}</div>`:'')+clarification+correction+restore+'</div>';
}
