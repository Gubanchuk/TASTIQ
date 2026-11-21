import {cardMetadataHtml} from '../../shared/card-metadata.js';
import {feasibilityHtml} from '../game/feasibility.js';
import {titleCopyHtml} from '../../shared/title-copy.js';
import {resultSectionHeading,resultCardReason} from '../../shared/result-clarity.js';
import {isLibrarySaved} from '../../shared/library-store.js';
import {animeStyleLabel,mediaLibraryDomain} from '../../shared/anime-pilot.js';
import {animeArtwork} from '../../shared/anime-artwork.js';
import {resultArtworkHtml} from '../../shared/card-artwork.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const nameOf=card=>card.ru||card.name||card.title||'Название';
const safeUrl=value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:null;}catch{return null;}};
const button=(label,act,id,focus=act)=>`<button type="button" class="btn btn-secondary" data-act="${act}" data-id="${esc(id)}" data-focus="${focus}:${esc(id)}">${label}</button>`;

// A plan is separate from taste, familiarity and evening feedback.
export function saveMediaToLibrary(library,card,{lane='want',domain='film'}={}) {
 if(!card?.id)return null;
 return library.save({...card,title:nameOf(card)},{lane,domain});
}

export function toggleMediaLibrarySave(library,card,{domain='film'}={}) {
 if(!card?.id)return null;
 const prior=library.all().find(row=>row.domain===mediaLibraryDomain(domain,card.id)&&row.id===card.id);
 return library.setSaved({...card,title:nameOf(card)},!isLibrarySaved(prior),{domain});
}

// Familiarity can be displayed from a library plan/rating without creating an exclusion.
export function mediaLibraryState(card,items=[],domain='film') {
 const item=items.find(row=>row.domain===mediaLibraryDomain(domain,card?.id)&&row.id===card?.id);
 return {saved:isLibrarySaved(item),libraryLane:item?.lane??'want',known:Boolean(item&&(item.lane==='known'||['liked','disliked','known'].includes(item.status)))};
}

export function mediaCardHtml(card,{domain='film',index=0,marked=false,kept=false,inlineUndo=false,known=false,blocked=false,saved=false,libraryLane='want'}={}) {
 const title=nameOf(card),heading='h2',id=esc(card.id),later=saved;
 const artwork=domain==='anime'?animeArtwork(card.id):null;
 const image=safeUrl(card.poster)||safeUrl(card.image)||artwork?.url;
 const credit=artwork&&image===artwork.url?`<p class="game-help game-artwork-credit"><a href="${esc(artwork.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(artwork.source)}</a></p>`:'';
 const poster=eager=>resultArtworkHtml(card,{domain,title,eager,extra:artwork?.url});
 const style=domain==='anime'&&animeStyleLabel(card.id)?'<p class="game-kept">В аниме-стиле</p>':'';
 if(marked)return resultSectionHeading(index)+`<article class="game-card game-card-pending${index===0?'':' game-alternative'}" data-card-id="${id}" aria-label="${esc(title)}">`
  +`<div class="game-pending-identity">${poster(false)}<div><${heading}>${esc(title)}</${heading}>${style}<p class="game-pending-label">Отмечено для замены</p><p class="game-help">Если передумаешь, можно снять отметку замены. Знакомство сохранится.</p>${credit}</div></div>`
  +`<div class="game-pending-controls"><div class="game-card-actions">${button('Заменить только этот вариант','replace-one',card.id)}${button('Снять отметку замены','familiar-unmark',card.id,'familiar')}${button('Оставить — хочу пересмотреть','familiar-keep',card.id,'keep')}</div>`
  +`<label class="game-check"><input type="checkbox" data-history-block="${id}" data-focus="block:${id}"${blocked?' checked':''}> Не предлагать в следующих подборах</label></div></article>`;
 const url=safeUrl(card.link),reason=resultCardReason(card),caveat=card.ai?.caveat||card.caveat||'';
 return resultSectionHeading(index)+`<article class="game-card game-proposal ${index===0?'game-proposal-featured':'game-alternative'}" data-card-id="${id}"${title.length>42?' data-long-title':''} aria-label="${esc(title)}"><div class="game-card-layout">${poster(index===0)}<div class="game-card-copy">`
  +`<div class="game-card-heading"><${heading} aria-label="${esc(title)}">${titleCopyHtml(title,card.year)}</${heading}><div class="game-copy-status" data-copy-status role="status" aria-live="polite"></div>${style}${cardMetadataHtml(card,{domain})}`
  +(kept?'<p class="game-kept">Хочешь пересмотреть.</p>':known?'<p class="game-kept">Уже знакомо</p>':'')
  +'</div>'
  +(inlineUndo?'<div class="game-replacement-inline"><p role="status">Вариант заменён</p><button type="button" class="btn btn-secondary" data-act="undo-replacement" data-inline-undo>Отменить замену</button></div>':'')
  +(reason?`<p class="game-model-label">Почему может подойти</p><p class="game-card-reason">${esc(reason)}</p>`:'')
  +(caveat?`<p class="game-caveat"><span>Учти</span>${esc(caveat)}</p>`:'')
  +feasibilityHtml(card.feasibility,{label:'Условия просмотра'})+credit
  +`</div></div><div class="game-card-footer"><div class="game-card-actions game-plan-actions"><div data-card-decision></div><button type="button" class="btn btn-secondary game-library-save" data-act="library-save" data-id="${id}" data-focus="library-save:${id}" aria-pressed="${later}"><svg viewBox="0 0 20 20" aria-hidden="true" fill="none"><path d="M5.5 4.5h9v12l-4.5-3-4.5 3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>${later?'Сохранено':'Сохранить'}</button></div><details class="game-card-secondary" data-disclosure="tools:${id}"><summary data-focus="tools:${id}">Ещё действия</summary><div class="game-card-links">${button('Уже смотрел — заменить','familiar-mark',card.id,'familiar')}`

  +(url?`<a class="game-store-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="Открыть страницу ${esc(title)}">Открыть<span aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="M6 5h9v9M15 5 5 15" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a>` : '') + `</div><div data-card-feedback="${id}"></div></details></div></article>`;
}
