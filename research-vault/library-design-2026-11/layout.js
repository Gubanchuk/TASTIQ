import {inLibraryDomain} from '/shared/anime-pilot.js';

const mode = document.documentElement.dataset.concept;
const groups = {anime:'Аниме',game:'Игры',film:'Фильмы',series:'Сериалы',cartoon:'Мультфильмы'};
const icons = {
  back:'m12 5-7 7 7 7',next:'m9 5 7 7-7 7',close:'m6 6 12 12M18 6 6 18',
  search:'M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  bookmark:'M6 4h12v16l-6-4-6 4z', heart:'M20.5 6.5c-2.5-3-6.5-2-8.5 1-2-3-6-4-8.5-1-3 4 0 7 8.5 13.5 8.5-6.5 11.5-9.5 8.5-13.5z',
  history:'M4 11a8 8 0 1 1 2 7M4 5v6h6M12 7v5l4 2',marks:'m4 7 2 2 3-4M12 7h8M4 16l2 2 3-4M12 16h8',
  memory:'M9 19h6M10 22h4M8 15a7 7 0 1 1 8 0c-1 .8-1.2 1.1-1.2 2h-5.6c0-.9-.2-1.2-1.2-2z',
  more:'M4 12h2m5 0h2m5 0h2',filter:'M3 7h10m4 0h4M3 17h4m4 0h10M13 4v6M7 14v6',
  arrow:'M4 12h16m-6-6 6 6-6 6',gallery:'M3 4h8v7H3zM14 4h7v7h-7zM3 14h8v6H3zM14 14h7v6h-7z'
};
function icon(name) {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('aria-hidden','true');
  svg.innerHTML='<path d="'+icons[name]+'"/>'; return svg;
}
function make(tag,cls,text) { const el=document.createElement(tag); el.className=cls; if(text)el.textContent=text; return el; }
function act(label,cls,action,symbol) {
  const el=make('button',cls); el.type='button'; el.setAttribute('aria-label',label);
  if(symbol)el.append(icon(symbol)); else el.textContent=label;
  el.addEventListener('click',action); return el;
}
const screen = document.querySelector('main');
screen.id='library-content'; screen.className='studio-main';
document.querySelector('.board-heading')?.remove();
document.querySelector('.library-skip').href='#library-content';
const app=document.querySelector('#library-app');
const shell=document.querySelector('.app-shell');
shell.className='studio-shell';
shell.innerHTML='<a class="studio-brand" href="/" aria-label="TASTIQ — все макеты"><img src="/assets/brand/tastiq-logo-cobalt.svg" alt="TASTIQ"></a><nav aria-label="Разделы сайта"><a href="/pick/start/">Подбор</a><a class="here" aria-current="page" href="'+location.pathname+'">Библиотека</a></nav><a class="to-gallery" href="/">Все макеты</a>';
shell.querySelector('.to-gallery').prepend(icon('gallery'));
const dialog=make('dialog','work-dialog');dialog.setAttribute('aria-labelledby','dialog-work-title');document.body.append(dialog);
let openKey='',selected='',lastView='',activeCards=[],shelfOffsets=new Map(),returnControl;
const byKey=(key)=>activeCards.find(c=>c.dataset.card===key);
function closePanel(restore=true) {
  const key=openKey;openKey='';if(dialog.open)dialog.close();
  if(restore){
    const replacement=returnControl?.dataset.focus && document.querySelector('[data-focus="'+CSS.escape(returnControl.dataset.focus)+'"]');
    (returnControl?.isConnected?returnControl:replacement||byKey(key)?.querySelector('.poster-open'))?.focus({preventScroll:true});
  }
}
dialog.addEventListener('cancel',event=>{event.preventDefault();closePanel();});
dialog.addEventListener('click',event=>{if(event.target===dialog)closePanel();});
function showWork(card,initial=true) {
  if(!card)return;
  if(initial)returnControl=document.activeElement;
  const previousAction=dialog.contains(document.activeElement)?document.activeElement.dataset.focus:null;
  openKey=card.dataset.card;
  const source=card.querySelector('.card-details-content'), meta=card.querySelector('.library-meta').textContent;
  const panel=make('div','work-panel'),copy=make('div','work-copy');
  const heading=make('h2','',card.querySelector('h3').textContent);heading.id='dialog-work-title';
  const close=act('Закрыть карточку','icon-control dialog-close',()=>closePanel(),'close');
  const pic=card.querySelector('.library-cover').cloneNode(true);
  copy.append(make('p','work-meta',meta),heading);
  const save=card.querySelector('[data-act="saved"]').cloneNode(true);
  save.className='work-save'; save.textContent=save.getAttribute('aria-pressed')==='true'?'Убрать из сохранённого':'Сохранить';
  copy.append(save,source.cloneNode(true));panel.append(pic,copy,close);dialog.replaceChildren(panel);
  if(!dialog.open)dialog.showModal();
  const focus=previousAction&&dialog.querySelector('[data-focus="'+CSS.escape(previousAction)+'"]');
  (focus||close).focus({preventScroll:true});
}
const navIcons={saved:'bookmark',liked:'heart',history:'history',all:'marks',memory:'memory'};
function navigation(view) {
  const nav=app.querySelector('.library-views');nav.className='collection-nav';
  const more=make('details','more-views'),summary=make('summary','');summary.append(icon('more'),document.createTextNode('Ещё'));more.append(summary);
  const secondary=make('div','more-menu');
  for(const button of [...nav.querySelectorAll('button')]) {
    const id=button.dataset.view;button.prepend(icon(navIcons[id]));
    if(!['saved','liked'].includes(id))secondary.append(button);
  }
  more.append(secondary);nav.append(more);
  if(mode==='shelves'&&matchMedia('(min-width:801px)').matches){nav.append(...secondary.children);more.remove();}
  if(!['saved','liked'].includes(view)){
    summary.classList.add('selected');summary.textContent=({history:'Подборы',all:'Все отметки',memory:'Память',evenings:'Отзывы'})[view];
  }
  return nav;
}
function toolbar(api, sourceDom) {
  const current=api.activeFilters(), tools=make('div','browse-tools');
  const filter=act('Поиск и фильтры','search-toggle',()=>{current.open=!current.open;api.writeNavigation();api.render();if(current.open)document.querySelector('#find-title')?.focus();},'filter');
  filter.append(document.createTextNode(matchMedia('(max-width:600px)').matches?'Поиск':'Поиск и фильтры'));filter.setAttribute('aria-expanded',String(current.open));filter.dataset.focus='studio-search';
  const hasMore=current.query||current.domain!=='all'||current.sort!=='added'||current.reaction!=='all';
  if(hasMore)filter.classList.add('active-filter');
  tools.append(filter);
  const fields=make('div','filter-fields'); fields.id='studio-filter-fields';filter.setAttribute('aria-controls',fields.id);
  if(current.open) {
    for(const label of sourceDom.querySelectorAll('label.library-search,label.library-filter'))fields.append(label);
    const reset=sourceDom.querySelector('[data-act="clear"]');if(reset)fields.append(reset);
  } else if(hasMore){
    const active=[current.query,groups[current.domain],{title:'По названию',oldest:'Сначала старые'}[current.sort],{liked:'Нравится',disliked:'Не нравится',unrated:'Без оценки',mixed:'Смешанная'}[current.reaction]].filter(Boolean);
    const clear=make('button','clear-quick',active.join(' / ')+' ×');clear.type='button';clear.dataset.act='clear';clear.setAttribute('aria-label','Сбросить фильтры');tools.append(clear);
  }
  return {tools,fields};
}
function decorateCard(card) {
  const cover=card.querySelector('.library-cover'),copy=card.querySelector('.board-card-copy');
  const title=copy.querySelector('h3').textContent;
  const launch=act('Открыть карточку «'+title+'»','poster-open',()=>showWork(card));
  launch.removeAttribute('title');launch.dataset.focus='poster:'+card.dataset.card;
  cover.replaceWith(launch);launch.replaceChildren(cover);
  const titleButton=act(title,'title-open',()=>showWork(card));
  copy.querySelector('h3').replaceChildren(titleButton);
  const saved=card.querySelector('[data-act="saved"]');
  saved.className='poster-bookmark';saved.setAttribute('aria-label',(saved.getAttribute('aria-pressed')==='true'?'Убрать из сохранённого':'Сохранить')+' — '+title);
  saved.replaceChildren(icon('bookmark'));
  card.classList.add('poster-tile');
  card.querySelector('.card-details').hidden=true;
}
function groupShelves(list, cards, rows) {
  const map=new Map(rows.map(row=>[row.domain+':'+row.id,row]));
  for(const [domain,label] of Object.entries(groups)) {
    const items=cards.filter(c=>{const row=map.get(c.dataset.card);return row && (inLibraryDomain(row,'anime')?'anime':row.domain)===domain;});
    if(!items.length)continue;
    const section=make('section','media-shelf'),head=make('header','shelf-head'),heading=make('h2','',label);
    const count=make('span','shelf-count',String(items.length));heading.append(count);
    const track=make('div','shelf-track');track.setAttribute('aria-label',label);track.append(...items);
    const pager=make('div','shelf-pager');
    const step=d=>track.scrollBy({left:d*(track.firstElementChild.getBoundingClientRect().width+16),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    const prev=act('Предыдущие обложки: '+label,'icon-control',()=>step(-1),'back'),next=act('Следующие обложки: '+label,'icon-control',()=>step(1),'next');
    const update=()=>{const left=track.scrollLeft,max=track.scrollWidth-track.clientWidth;prev.disabled=left<2;next.disabled=left>=max-2;pager.hidden=max<3;shelfOffsets.set(domain,left);};
    pager.append(prev,next);head.append(heading,pager);section.append(head,track);list.append(section);
    track.scrollLeft=shelfOffsets.get(domain)||0;track.addEventListener('scroll',update,{passive:true});
    const observer=new ResizeObserver(()=>{if(!track.isConnected){observer.disconnect();return;}update();});observer.observe(track);
  }
}
function feature(list,cards,records) {
  if(!cards.length)return;
  const stage=make('section','feature-stage');stage.setAttribute('aria-label','Крупный план');
  const stripTitle=make('h2','strip-title','В коллекции');
  list.before(stage,stripTitle);
  function display(index,focusControl) {
    const card=cards[index],work=records.find(r=>r.domain+':'+r.id===card.dataset.card);
    selected=card.dataset.card;
    const art=card.querySelector('.library-cover');
    const meta=card.querySelector('.library-meta').textContent;
    const title=card.querySelector('h3').textContent;
    const backdrop=document.createElement('img');backdrop.className='stage-backdrop';backdrop.alt='';if(art.querySelector('img'))backdrop.src=art.querySelector('img').src;
    const large=act('Открыть карточку «'+title+'»','focus-poster',()=>showWork(card));large.replaceChildren(art.cloneNode(true));
    const body=make('div','feature-copy');const heading=make('h2','',title);
    body.append(make('p','feature-meta',meta),heading);
    if(work?.original&&work.original!==title)body.append(make('p','feature-original',work.original));
    large.dataset.focus='focus-poster';
    const open=act('Открыть карточку','open-work',()=>showWork(card));open.dataset.focus='focus-details';open.append(icon('arrow'));body.append(open);
    const controls=make('div','stage-controls');
    const prev=act('Предыдущее произведение','stage-btn',()=>display((index+cards.length-1)%cards.length,'back'),'back');
    const next=act('Следующее произведение','stage-btn',()=>display((index+1)%cards.length,'next'),'next');
    prev.disabled=next.disabled=cards.length===1;
    controls.append(prev,make('span','stage-position',(index+1)+' / '+cards.length),next);
    stage.replaceChildren(backdrop,large,body,controls);
    for(const c of cards)c.classList.toggle('in-focus',c===card);
    if(focusControl)(focusControl==='next'?next:prev).focus({preventScroll:true});
  }
  display(Math.max(0,cards.findIndex(c=>c.dataset.card===selected)));
  for(const [i,c] of cards.entries()) {
    const poster=c.querySelector('.poster-open');
    poster.addEventListener('click',event=>{event.stopImmediatePropagation();display(i);stage.scrollIntoView({block:'center'});stage.querySelector('.focus-poster').focus({preventScroll:true});},true);
    poster.setAttribute('aria-label','Показать крупно: '+c.querySelector('h3').textContent);
  }
}
function catalogue(list,cards,rows){
  if(!cards.length)return;
  list.classList.add('catalog-grid');const spread=make('div','catalog-spread');
  const pane=make('aside','inspector');pane.setAttribute('aria-label','Выбранное произведение');
  list.before(spread);spread.append(list,pane);
  function select(card,userAction=false){
    selected=card.dataset.card;
    const title=card.querySelector('h3').textContent,meta=card.querySelector('.library-meta').textContent;
    const row=rows.find(r=>r.domain+':'+r.id===selected);
    const caption=make('div','inspector-copy'),heading=make('h2','',title);
    caption.append(make('p','work-meta',meta),heading);
    if(row?.original&&row.original!==title)caption.append(make('p','inspector-original',row.original));
    const action=act('Оценка и отметки','inspector-open',()=>showWork(card));action.dataset.focus='inspector-open';action.append(icon('arrow'));caption.append(action);
    pane.replaceChildren(card.querySelector('.library-cover').cloneNode(true),caption);
    for(const c of cards)c.classList.toggle('inspected',c===card);
    if(userAction&&matchMedia('(max-width:800px)').matches)showWork(card);
  }
  select(cards.find(c=>c.dataset.card===selected)||cards[0]);
  for(const c of cards){
    const meta=c.querySelector('.board-card-copy');
    const title=c.querySelector('h3').textContent;
    const text=act('Подробнее','row-detail',()=>select(c,true));text.append(icon('arrow'));meta.append(text);
    const poster=c.querySelector('.poster-open');
    poster.setAttribute('aria-label','Посмотреть: '+title);
    poster.addEventListener('click',event=>{event.stopImmediatePropagation();select(c,true);},true);
  }
}
let currentApi;
for(const breakpoint of ['(max-width:600px)','(max-width:800px)'])matchMedia(breakpoint).addEventListener('change',()=>currentApi?.render());
export function layout(api) {
  currentApi=api;
  const view=api.state.view;
  if(lastView!==view){if(dialog.open)closePanel(false);shelfOffsets.clear();selected='';lastView=view;}
  const nav=navigation(view);
  const heading=make('header','collection-heading'),h1=make('h1','','Библиотека');
  heading.append(h1);
  const source=app.querySelector('.saved-source-chooser,.saved-source-actions:not(.saved-source-chooser .saved-source-actions)');
  if(source){ source.classList.add('choose-source');heading.append(source); }
  const board=app.querySelector('.library-board'), rows=api.records();
  app.querySelector('.collection-description')?.remove();
  const area=make('div','collection-area'),bar=make('div','collection-bar');
  const content=make('div','collection-content');
  bar.append(nav);
  const sourceDom=app.querySelector('.library-filters,.shelf-filters');
  if(board&&sourceDom){
    const {tools,fields}=toolbar(api,sourceDom);
    const mobileTools=make('div','mobile-tools');mobileTools.append(tools);bar.append(mobileTools);
    if(source&&matchMedia('(max-width:600px)').matches)mobileTools.append(source);
    if(fields.childElementCount)content.append(fields);sourceDom.remove();
  }
  app.querySelector('.short-shelf-tools')?.remove();
  activeCards=Array.from(app.querySelectorAll('.board-card'));
  if(board){
    const list=board.querySelector('.library-card-list');
    activeCards.forEach(decorateCard);
    if(mode==='wall'&&activeCards.length){
      list.classList.add('wall-grid');
    } else if(mode==='shelves'&&activeCards.length){
      list.classList.add('shelf-list');groupShelves(list,activeCards,rows);
    } else if(mode==='focus'&&activeCards.length){
      list.classList.add('filmstrip');feature(list,activeCards,rows);
    } else if(mode==='catalog'&&activeCards.length){
      catalogue(list,activeCards,rows);
    }
  }
  content.append(...Array.from(app.children));
  area.append(bar,content);app.append(heading,area);
  if(openKey){
    const c=byKey(openKey);
    if(c)showWork(c,false);else closePanel(false);
  }
}
