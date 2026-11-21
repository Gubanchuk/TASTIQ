let editorKey=null,editorScope=null,editorTrigger=null;
const keyOf=form=>form.dataset.key||'correction';

function pickerScrollHost(){
 const pane=document.querySelector('.picker-scroll');
 return pane&&getComputedStyle(pane).overflowY==='auto'?pane:window;
}
export function scrollPickerToStart(){
 pickerScrollHost().scrollTo({top:0,behavior:'instant'});
}
export function scrollToPickerContent(target){
 if(!target)return;
 const shell=document.querySelector('.app-shell');
 const rect=target.getBoundingClientRect(),viewport=window.visualViewport;
 const visibleTop=Math.max(0,shell?.getBoundingClientRect().bottom??0,viewport?.offsetTop??0)+12;
 const visibleBottom=(viewport?.offsetTop??0)+(viewport?.height??window.innerHeight);
 if(rect.top>=visibleTop&&rect.bottom<=visibleBottom)return;
 pickerScrollHost().scrollBy({top:rect.top-visibleTop,behavior:'instant'});
}

export function focusPickerContent(target){
 if(!target)return;
 target.tabIndex=-1;target.focus({preventScroll:true});scrollToPickerContent(target);
}

export function syncEditorSubmit(form,busy=false){
 const input=form?.querySelector('textarea'),submit=form?.querySelector('button[type="submit"]');
 if(input&&submit)submit.disabled=busy||!input.value.trim();
}

// The form's words are saved, while opening the editor is a transient UI action.
export function closeRequestEditor(form,{focus=true}={}){
 if(!form)return;
 const host=document.getElementById('request-editor');form.hidden=true;
 form._requestAnchor?.replaceWith(form);form._requestAnchor=null;
 if(host&&!host.querySelector('form')){host.hidden=true;host.replaceChildren();}
 const trigger=editorTrigger?.isConnected?editorTrigger:form.dataset.form==='clarification'
  ?[...document.querySelectorAll('[data-act="clarify"]')].find(el=>el.dataset.key===form.dataset.key)
  :document.querySelector('#action-controls [data-act="focus-correction"],#main [data-act="focus-correction"]');
 editorKey=null;editorTrigger=null;
 trigger?.setAttribute('aria-expanded','false');
 if(focus&&trigger){trigger.focus({preventScroll:true});trigger.scrollIntoView({block:'nearest',behavior:'instant'});}
}
export function openRequestEditor(form,{focus=true,trigger=null}={}){
 const host=document.getElementById('request-editor');if(!form||!host)return;
 for(const old of host.querySelectorAll('form'))if(old!==form)closeRequestEditor(old,{focus:false});
 if(!form._requestAnchor){const anchor=document.createElement('span');anchor.hidden=true;form.before(anchor);form._requestAnchor=anchor;}
 editorKey=keyOf(form);
 if(trigger)editorTrigger=trigger;
 editorTrigger?.setAttribute('aria-expanded','true');
 host.replaceChildren();
 if(form.dataset.form==='clarification'){
  const source=form.querySelector('textarea')?.getAttribute('aria-describedby')?.split(' ')[0];
  const text=source&&document.getElementById(source)?.textContent;
  if(text){const context=document.createElement('p');context.className='request-editor-context';context.textContent=text;host.append(context);}
 }
 host.append(form);host.hidden=false;form.hidden=false;syncEditorSubmit(form);
 if(focus){form.querySelector('textarea')?.focus({preventScroll:true});scrollToPickerContent(host);}
}
export function syncRequestEditor(scope){
 const host=document.getElementById('request-editor');if(!host)return;
 host.replaceChildren();host.hidden=true;
 if(editorScope!==scope){editorScope=scope;editorKey=null;editorTrigger=null;}
 if(!editorKey)return;
 const chosen=[...document.querySelectorAll('#understanding form.clarification-form')].find(form=>keyOf(form)===editorKey);
 if(chosen)openRequestEditor(chosen,{focus:false});
}

export function syncSessionActions({busy,canRestore,canSwitch}){
 const direct=document.getElementById('restart-direct'),restart=document.getElementById('restart');
 const restore=document.getElementById('restore'),menu=restart?.closest('.game-session-menu');
 if(!direct||!menu||!restore)return;
 const active=document.activeElement;
 const useMenu=canRestore||canSwitch;
 direct.hidden=useMenu;menu.hidden=!useMenu;
 restore.hidden=!canRestore;
 for(const button of [direct,restart,restore])button.disabled=busy;
 if(!useMenu){menu.open=false;if(menu.contains(active))direct.focus({preventScroll:true});}
 else if(active===direct)menu.querySelector('summary')?.focus({preventScroll:true});
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

const shortDomain=document.querySelector('.app-domain-short');if(shortDomain)shortDomain.textContent=({game:'Игра',film:'Фильм',series:'Сериал',cartoon:'Мультфильм',anime:'Аниме'})[shellDomain]||'Фильм';
