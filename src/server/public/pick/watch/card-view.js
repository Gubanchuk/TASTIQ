import {feasibilityHtml} from '../game/feasibility.js';
import {titleCopyHtml} from '../../shared/title-copy.js';
import {resultSectionHeading} from '../../shared/result-clarity.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const nameOf=card=>card.ru||card.name||card.title||'Название';
const safeUrl=value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:null;}catch{return null;}};
const button=(label,act,id,focus=act)=>`<button type="button" class="btn btn-secondary" data-act="${act}" data-id="${esc(id)}" data-focus="${focus}:${esc(id)}">${label}</button>`;

function poster(card,{eager=false}={}) {
 const image=safeUrl(card.poster)||safeUrl(card.image);
 return `<div class="game-poster${image?'':' game-poster-fallback'}" data-title="${esc(nameOf(card))}" aria-hidden="true">${image?`<span>${esc(nameOf(card))}</span><picture><img src="${esc(image)}" alt="" loading="${eager?'eager':'lazy'}" referrerpolicy="no-referrer"></picture>`:`<span>${esc(nameOf(card))}</span>`}</div>`;
}

// A plan is separate from taste, familiarity and evening feedback.
export function saveMediaToLibrary(library,card,{lane='want',domain='film'}={}) {
 if(!card?.id)return null;
 return library.save({...card,title:nameOf(card)},{lane,domain});
}

// Familiarity can be displayed from a library plan/rating without creating an exclusion.
export function mediaLibraryState(card,items=[],domain='film') {
 const item=items.find(row=>row.domain===domain&&row.id===card?.id);
 return {saved:Boolean(item),libraryLane:item?.lane??'want',known:Boolean(item&&(item.lane==='known'||['liked','disliked','known'].includes(item.status)))};
}

export function mediaCardHtml(card,{domain='film',index=0,marked=false,kept=false,known=false,blocked=false,saved=false,libraryLane='want'}={}) {
 const title=nameOf(card),heading='h2',id=esc(card.id);
 if(marked)return resultSectionHeading(index)+`<article class="game-card game-card-pending" data-card-id="${id}" aria-label="${esc(title)}">`
  +`<div class="game-pending-identity">${poster(card)}<div><${heading}>${esc(title)}</${heading}><p class="game-pending-label">Отмечено для замены</p><p class="game-help">Остальные варианты сохранятся.</p></div></div>`
  +`<div class="game-pending-controls"><div class="game-card-actions">${button('Отменить','familiar-unmark',card.id,'familiar')}${button('Оставить — хочу пересмотреть','familiar-keep',card.id,'keep')}</div>`
  +`<label class="game-check"><input type="checkbox" data-history-block="${id}" data-focus="block:${id}"${blocked?' checked':''}> Не предлагать в следующих подборах</label></div></article>`;
 const url=safeUrl(card.link),reason=card.ai?.reason||card.reason||'',caveat=card.ai?.caveat||card.caveat||'';
 return resultSectionHeading(index)+`<article class="game-card game-proposal${index===0?' game-proposal-featured':''}" data-card-id="${id}" aria-label="${esc(title)}"><div class="game-card-layout">${poster(card,{eager:index===0})}<div class="game-card-copy">`
  +`<div class="game-card-heading"><${heading} aria-label="${esc(title)}">${titleCopyHtml(title,card.year)}</${heading}><div class="game-copy-status" data-copy-status role="status" aria-live="polite"></div><p class="game-meta">${esc([card.year,card.runtime?`${card.runtime} мин${card.kind==='series'?' · эпизод':''}`:null,...(card.kind==='series'?[card.seasons?`${card.seasons} сез.`:null,card.episodes?`${card.episodes} эп.`:null]:[]),...(card.genres??[]).slice(0,2)].filter(Boolean).join(' · '))}</p>`
  +(kept?'<p class="game-kept">Знакомое название — оставлено на сегодня.</p>':known?'<p class="game-kept">Уже знакомо · отметка в этом браузере</p>':'')
  +'</div>'
  +(reason?`<p class="game-model-label">Почему предложено · ${card.ai?.reason?'мнение модели':'данные каталога'}</p><p class="game-card-reason">${esc(reason)}</p>`:'<p class="game-help">Вариант по каталогу. Личное совпадение ещё предстоит проверить.</p>')
  +(caveat?`<p class="game-caveat"><span>Учти</span>${esc(caveat)}</p>`:'')
  +feasibilityHtml(card.feasibility,{label:'Условия просмотра'})
  +`</div></div><div class="game-card-footer"><div data-card-feedback="${id}"></div><div class="game-card-actions game-plan-actions"><button type="button" class="btn btn-secondary game-library-save" data-act="library-save" data-id="${id}" data-focus="library-save:${id}" aria-pressed="${Boolean(saved)}">${saved?'Сохранено':'Сохранить'}</button>${button('Знакомо — заменить','familiar-mark',card.id,'familiar')}</div>`
  +(saved?`<p class="game-library-state">В библиотеке · ${esc({want:'На потом',tonight:'На этот вечер',known:'Уже знакомо'}[libraryLane]??'На потом')}</p>`:'')+'</div>'
  +(url?`<a class="game-store-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="Открыть страницу ${esc(title)}">Открыть страницу<span aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="M6 5h9v9M15 5 5 15" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a>`:'')+'</article>';
}
