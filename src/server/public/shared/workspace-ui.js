// Central editors keep the existing forms, names and draft keys used by the controllers.
export function closeRequestEditor(form,{focus=true}={}){
 if(!form)return;
 const host=document.getElementById('request-editor');form.hidden=true;
 form._requestAnchor?.replaceWith(form);form._requestAnchor=null;
 if(host&&!host.querySelector('form')){host.hidden=true;host.replaceChildren();}
 const trigger=form.dataset.form==='clarification'?[...document.querySelectorAll('[data-act="clarify"]')].find(el=>el.dataset.key===form.dataset.key):document.querySelector('[data-act="focus-correction"]');
 trigger?.setAttribute('aria-expanded','false');if(focus)trigger?.focus({preventScroll:true});
}
export function openRequestEditor(form,{focus=true}={}){
 const host=document.getElementById('request-editor');if(!form||!host)return;
 for(const old of host.querySelectorAll('form'))if(old!==form)closeRequestEditor(old,{focus:false});
 if(!form._requestAnchor){const anchor=document.createElement('span');anchor.hidden=true;form.before(anchor);form._requestAnchor=anchor;}
 host.replaceChildren();const heading=document.createElement('h2');heading.textContent=form.dataset.form==='clarification'?'Уточним этот момент':'Измени пожелание';
 const description=document.createElement('p');description.className='request-editor-context';description.textContent=form.dataset.form==='clarification'?document.getElementById(form.querySelector('textarea')?.getAttribute('aria-describedby')?.split(' ')[0])?.textContent??'Добавь то, чего не хватает в понимании.':'Напиши, что добавить или изменить. После поправки проверим понимание ещё раз.';
 host.append(heading,description,form);host.hidden=false;form.hidden=false;
 if(focus){host.scrollIntoView({block:'start',behavior:'auto'});form.querySelector('textarea,input,select')?.focus({preventScroll:true});}
}
export function syncRequestEditor(preferred=''){
 const host=document.getElementById('request-editor');if(!host)return;
 host.replaceChildren();host.hidden=true;
 const forms=[...document.querySelectorAll('#understanding form.clarification-form')].filter(form=>!form.hidden);
 const chosen=forms.find(form=>(form.dataset.key||'correction')===preferred)??forms.at(-1);
 for(const form of forms)if(form!==chosen){form.hidden=true;const trigger=[...document.querySelectorAll('[data-act="clarify"]')].find(el=>el.dataset.key===form.dataset.key);trigger?.setAttribute('aria-expanded','false');}
 if(chosen)openRequestEditor(chosen,{focus:false});
}
const switcher=document.getElementById('domain-switch'),menu=document.getElementById('domain-menu');
if(switcher&&menu){
 const setOpen=open=>{menu.hidden=!open;switcher.setAttribute('aria-expanded',String(open));};
 switcher.addEventListener('click',()=>setOpen(menu.hidden));
 switcher.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();setOpen(true);menu.querySelector('a')?.focus();}});
 menu.addEventListener('keydown',event=>{const items=[...menu.querySelectorAll('a')],at=items.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();items[event.key==='Home'?0:event.key==='End'?items.length-1:(at+(event.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();}});
 document.addEventListener('click',event=>{if(!menu.hidden&&!menu.contains(event.target)&&!switcher.contains(event.target))setOpen(false);});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){event.preventDefault();setOpen(false);switcher.focus();}});
}

const shellDomain=location.pathname.includes('/pick/game')?'game':new URLSearchParams(location.search).get('domain')||'film';
for(const link of document.querySelectorAll('[data-shell-domain]'))if(link.dataset.shellDomain===shellDomain)link.setAttribute('aria-current','page');

const shortDomain=document.querySelector('.app-domain-short');if(shortDomain)shortDomain.textContent=({game:'Игра',film:'Фильм',series:'Сериал',cartoon:'Мультфильм'})[shellDomain]||'Фильм';
