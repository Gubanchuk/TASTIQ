// The native select owns value, validation and form submission. This is its visual control.
const controls=new WeakMap(),live=new Set(),documents=new WeakSet();
let serial=0,opened=null;
const optionsOf=select=>Array.from(select.options??[]);
const available=option=>option&&!option.disabled&&!option.parentElement?.disabled&&!option.hidden;
const disabled=select=>Boolean(select.disabled||select.matches?.(':disabled'));
const normalized=value=>String(value??'').trim().toLocaleLowerCase('ru');
export function enabledOptionIndex(select,current,key){
 const options=optionsOf(select),enabled=options.map((o,i)=>available(o)?i:-1).filter(i=>i>=0);
 if(!enabled.length)return -1;
 if(key==='Home')return enabled[0];if(key==='End')return enabled.at(-1);
 const direction=key==='ArrowUp'?-1:1;
 for(let i=current+direction;i>=0&&i<options.length;i+=direction)if(available(options[i]))return i;
 return available(options[current])?current:direction>0?enabled[0]:enabled.at(-1);
}
export function typeaheadOptionIndex(select,current,query){
 const options=optionsOf(select),term=normalized(query);if(!term)return -1;
 for(let step=1;step<=options.length;step++){const i=(Math.max(-1,current)+step)%options.length;if(available(options[i])&&normalized(options[i].textContent).startsWith(term))return i;}
 return -1;
}
const identity=select=>({id:select.id,focus:select.dataset?.selectFocus??select.dataset?.focus,fk:select.dataset?.selectFk??select.dataset?.fk});
function replacement(select,key){
 const doc=select.ownerDocument,escape=globalThis.CSS?.escape??(v=>String(v).replace(/["\\]/g,'\\$&'));
 return (key.focus&&doc?.querySelector?.(`[data-focus="${escape(key.focus)}"]`))||(key.fk&&doc?.querySelector?.(`[data-fk="${escape(key.fk)}"]`))||(key.id&&doc?.getElementById?.(key.id))||(select.isConnected?select:null);
}
export function focusCustomSelect(target,options={preventScroll:true}){
 if(!target)return;
 if(target.tagName==='SELECT'){initCustomSelects(target.ownerDocument);const control=controls.get(target);if(control){control.trigger.focus(options);return;}}
 target.focus?.(options);
}
export function commitCustomSelect(select,index){
 if(disabled(select)||!available(optionsOf(select)[index])||index===select.selectedIndex)return false;
 const key=identity(select);select.selectedIndex=index;
 controls.get(select)?.sync();closeMenu(false);
 const EventClass=select.ownerDocument?.defaultView?.Event??globalThis.Event;
 select.dispatchEvent(new EventClass('input',{bubbles:true}));
 select.dispatchEvent(new EventClass('change',{bubbles:true}));
 initCustomSelects(select.ownerDocument);focusCustomSelect(replacement(select,key));return true;
}
function closeMenu(focus=false){
 if(!opened)return;const control=opened;opened=null;control.menu?.remove();control.menu=null;
 control.trigger.setAttribute('aria-expanded','false');control.trigger.removeAttribute('aria-activedescendant');
 if(focus&&control.select.isConnected)control.trigger.focus({preventScroll:true});
}
function labelOf(select){
 if(select.getAttribute('aria-label'))return select.getAttribute('aria-label');
 const label=select.labels?.[0];if(!label)return select.name||'Выбрать вариант';
 const copy=label.cloneNode(true);copy.querySelectorAll('select,.custom-select').forEach(node=>node.remove());
 return copy.textContent.trim()||select.name||'Выбрать вариант';
}
function position(control){
 if(!control.menu)return;
 const {select,trigger,menu}=control;if(!select.isConnected){closeMenu();return;}
 const view=select.ownerDocument.defaultView,rect=trigger.getBoundingClientRect(),viewport=view.visualViewport;
 const width=viewport?.width??view.innerWidth,height=viewport?.height??view.innerHeight,leftEdge=viewport?.offsetLeft??0,topEdge=viewport?.offsetTop??0;
 const availableBelow=topEdge+height-rect.bottom-12,availableAbove=rect.top-topEdge-12,above=availableBelow<180&&availableAbove>availableBelow;
 const menuWidth=Math.min(Math.max(rect.width,220),width-24),maxHeight=Math.max(44,Math.min(320,above?availableAbove:availableBelow));
 Object.assign(menu.style,{width:`${menuWidth}px`,maxHeight:`${maxHeight}px`,left:`${Math.max(leftEdge+12,Math.min(rect.left,leftEdge+width-menuWidth-12))}px`,top:above?'auto':`${rect.bottom+6}px`,bottom:above?`${Math.max(0,view.innerHeight-rect.top+6)}px`:'auto'});
}
function highlight(control,index){
 if(index<0)return;control.active=index;
 control.menu?.querySelectorAll('[role="option"]').forEach(node=>{node.classList.toggle('is-active',Number(node.dataset.index)===index);});
 const option=control.menu?.querySelector(`[data-index="${index}"]`);
 if(option){control.trigger.setAttribute('aria-activedescendant',option.id);option.scrollIntoView?.({block:'nearest'});}
}
function openMenu(control){
 if(disabled(control.select))return false;
 control.sync();
 if(opened===control)return true;closeMenu();opened=control;
 const {select,trigger}=control,doc=select.ownerDocument,menu=doc.createElement('div');control.menu=menu;
 menu.className='custom-select-menu';menu.id=control.menuId;menu.setAttribute('role','listbox');menu.setAttribute('aria-label',labelOf(select));
 optionsOf(select).forEach((option,index)=>{
  const item=doc.createElement('div');item.className='custom-select-option';item.id=`${control.menuId}-${index}`;item.dataset.index=index;
  item.setAttribute('role','option');item.setAttribute('aria-selected',String(index===select.selectedIndex));item.setAttribute('aria-disabled',String(!available(option)));item.textContent=option.textContent;
  if(option.hidden)item.hidden=true;
  item.addEventListener('pointermove',()=>{if(available(option))highlight(control,index);});
  item.addEventListener('pointerdown',event=>event.preventDefault());
  item.addEventListener('click',event=>{event.preventDefault();if(!available(option))return;if(!commitCustomSelect(select,index))closeMenu(true);});
  menu.append(item);
 });
 doc.body.append(menu);trigger.setAttribute('aria-expanded','true');position(control);
 highlight(control,available(optionsOf(select)[select.selectedIndex])?select.selectedIndex:enabledOptionIndex(select,-1,'ArrowDown'));return true;
}
function enhance(select){
 if(controls.has(select)||select.hidden||select.multiple||Number(select.size)>1||select.dataset.nativeSelect==='true')return;
 const original={hidden:select.getAttribute('hidden'),tabindex:select.getAttribute('tabindex'),ariaHidden:select.getAttribute('aria-hidden')};
 const doc=select.ownerDocument,wrap=doc.createElement('span'),trigger=doc.createElement('button'),value=doc.createElement('span'),chevron=doc.createElementNS('http://www.w3.org/2000/svg','svg');
 wrap.className='custom-select';select.before(wrap);wrap.append(select,trigger);select.classList.add('custom-select-source');select.tabIndex=-1;select.setAttribute('aria-hidden','true');select.hidden=true;
 trigger.type='button';trigger.className='custom-select-trigger';trigger.setAttribute('role','combobox');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
 if(select.id)trigger.id=`${select.id}--trigger`;
 for(const [key,stored] of [['focus','selectFocus'],['fk','selectFk']])if(select.dataset[key]){trigger.dataset[key]=select.dataset[key];select.dataset[stored]=select.dataset[key];delete select.dataset[key];}
 value.className='custom-select-value';chevron.setAttribute('viewBox','0 0 20 20');chevron.setAttribute('aria-hidden','true');
 const path=doc.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','m6 8 4 4 4-4');chevron.append(path);trigger.append(value,chevron);
 const control={select,wrap,trigger,value,original,cleanup:[],active:select.selectedIndex,menu:null,menuId:`custom-select-menu-${++serial}`,term:'',typedAt:0,sync(){
  const text=optionsOf(select)[select.selectedIndex]?.textContent??'Выбрать';if(value.textContent!==text)value.textContent=text;
  if(trigger.disabled!==disabled(select))trigger.disabled=disabled(select);
  trigger.setAttribute('aria-label',`${labelOf(select)}: ${text}`);trigger.setAttribute('aria-required',String(select.required));
  const described=select.getAttribute('aria-describedby');if(described)trigger.setAttribute('aria-describedby',described);
  if(select.validity?.valid)trigger.removeAttribute('aria-invalid');
  if(disabled(select)&&opened===control)closeMenu();
 }};
 controls.set(select,control);live.add(control);trigger.setAttribute('aria-controls',control.menuId);control.sync();
 const listen=(target,type,handler)=>{target.addEventListener(type,handler);control.cleanup.push(()=>target.removeEventListener(type,handler));};
 listen(select,'input',()=>control.sync());listen(select,'change',()=>control.sync());
 listen(select,'focus',()=>trigger.focus({preventScroll:true}));
 listen(select,'invalid',event=>{event.preventDefault();trigger.setAttribute('aria-invalid','true');trigger.focus();});
 trigger.addEventListener('click',event=>{event.preventDefault();opened===control?closeMenu(true):openMenu(control);});
 trigger.addEventListener('keydown',event=>{
  if(event.key==='Tab'){closeMenu();return;}
  if(event.key==='Escape'){if(opened===control){event.preventDefault();closeMenu(true);}return;}
  if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();if(openMenu(control))highlight(control,enabledOptionIndex(select,control.active,event.key));return;}
  if(event.key==='Enter'||event.key===' '&&(!control.term||Date.now()-control.typedAt>700)){event.preventDefault();if(opened!==control)openMenu(control);else if(!commitCustomSelect(select,control.active))closeMenu(true);return;}
  if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();const now=Date.now();control.term=now-control.typedAt<700?control.term+event.key:event.key;control.typedAt=now;
   if(new Set(control.term.toLocaleLowerCase('ru')).size===1)control.term=event.key;
   if(openMenu(control))highlight(control,typeaheadOptionIndex(select,control.active,control.term));
  }
 });
 if(select.form)listen(select.form,'reset',()=>queueMicrotask(()=>{if(controls.has(select)){control.sync();trigger.removeAttribute('aria-invalid');}}));
}
function dispose(control,nativeFallback=false){
 const {select,wrap,original}=control;if(opened===control)closeMenu();
 control.cleanup.forEach(remove=>remove());
 for(const [attribute,value] of [['hidden',original.hidden],['tabindex',original.tabindex],['aria-hidden',original.ariaHidden]])value===null?select.removeAttribute(attribute):select.setAttribute(attribute,value);
 select.classList.remove('custom-select-source');
 for(const [key,stored] of [['focus','selectFocus'],['fk','selectFk']])if(select.dataset[stored]){select.dataset[key]=select.dataset[stored];delete select.dataset[stored];}
 if(wrap.parentElement){wrap.before(select);wrap.remove();}else{select.remove();control.trigger.remove();}
 if(nativeFallback)select.dataset.nativeSelect='true';controls.delete(select);live.delete(control);
}
// Explicit disposal opts this source into the native fallback; remove
// data-native-select before calling initCustomSelects to enhance it again.
export function disposeCustomSelects(root=globalThis.document){
 for(const control of [...live])if(root===control.select.ownerDocument||root===control.select||root===control.wrap||root?.contains?.(control.select))dispose(control,true);
}
export function initCustomSelects(root=globalThis.document){
 if(!root?.querySelectorAll)return;
 if(root.matches?.('.product-page select'))enhance(root);
 root.querySelectorAll('.product-page select').forEach(enhance);
 for(const control of [...live]){if(!control.select.isConnected)dispose(control);else if(control.select.dataset.nativeSelect==='true')dispose(control,true);else control.sync();}
 const doc=root.ownerDocument??root;if(documents.has(doc)||!doc.body)return;documents.add(doc);
 doc.addEventListener('pointerdown',event=>{if(opened&&!opened.wrap.contains(event.target)&&!opened.menu?.contains(event.target))closeMenu();},true);
 doc.addEventListener('focusin',event=>{if(opened&&!opened.wrap.contains(event.target)&&!opened.menu?.contains(event.target))closeMenu();});
 const reposition=()=>{if(opened)position(opened);};doc.defaultView?.addEventListener('resize',reposition);doc.addEventListener('scroll',reposition,true);
 doc.defaultView?.visualViewport?.addEventListener('resize',reposition);doc.defaultView?.visualViewport?.addEventListener('scroll',reposition);
 if(globalThis.MutationObserver)new MutationObserver(records=>{
  const changedOptions=opened&&records.some(record=>['OPTION','OPTGROUP'].includes(record.target.tagName)||record.target===opened.select&&record.type==='childList');
  if(records.some(record=>record.type==='childList'||['SELECT','OPTION','OPTGROUP','FIELDSET'].includes(record.target.tagName)))initCustomSelects(doc);
  if(changedOptions&&opened){const control=opened,active=control.active;closeMenu();openMenu(control);highlight(control,available(optionsOf(control.select)[active])?active:enabledOptionIndex(control.select,-1,'ArrowDown'));}
 }).observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','required','selected','label','value','aria-label','aria-describedby']});
}
if(globalThis.document){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>initCustomSelects());else initCustomSelects();}
