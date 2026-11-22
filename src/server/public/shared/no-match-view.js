export function noMatchHtml(screen,escape){
 const empty=screen.noMatch;
 if(!empty)return '';
 const heading=screen.type==='result'?'h2':'h1';
 const title=screen.type==='result'?'Больше совпадений пока нет':'Точного совпадения пока нет';
 const choices=(empty.choices??[]).map(({label,action})=>{
   if(action?.type==='remove_time')return `<button type="button" class="btn btn-secondary" data-act="remove-time">${escape(label)}</button>`;
   if(action?.type==='allow_unverified_rating')return `<button type="button" class="btn btn-secondary" data-act="allow-unverified-rating">${escape(label)}</button>`;
   if(action?.type==='extend_runtime'&&Number.isInteger(action.minutes))return `<button type="button" class="btn btn-secondary" data-act="extend-runtime" data-minutes="${action.minutes}">${escape(label)}</button>`;
   if(action?.type==='remove_fact')return `<button type="button" class="btn btn-secondary" data-act="remove-fact" data-key="${escape(action.key)}">${escape(label)}</button>`;
   return '';
 }).join('');
 const domain=screen.savedSource?.domain;
 const savedLink=['game','film','series','anime','cartoon'].includes(domain)
   ?`<a class="btn btn-secondary" href="/library/?view=saved&amp;saved.domain=${domain}">Открыть сохранённое</a>`:'';
 return `<section class="no-match" aria-labelledby="no-match-title"><${heading} id="no-match-title" tabindex="-1">${title}</${heading}><p>${escape(empty.message)}</p>`
   +(choices?'<p>Выбери, какое условие изменить. При следующем поиске проверим варианты по остальным пожеланиям.</p><div class="no-match-choices">'+choices+'</div>':'')
   +(empty.hint?`<p>${escape(empty.hint)}</p>`:'')
   +savedLink
   +'</section>';
}
