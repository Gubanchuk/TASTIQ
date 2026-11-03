import test from 'node:test';
import assert from 'node:assert/strict';
import * as customSelect from '../src/server/public/shared/custom-select.js';
const {enabledOptionIndex,typeaheadOptionIndex,commitCustomSelect,initCustomSelects}=customSelect;

const source=(values=['Любое','Зашло','Не зашло','Без оценки'])=>{
 const select=new EventTarget();Object.assign(select,{options:values.map((text,i)=>({textContent:text,value:String(i),disabled:false,parentElement:{disabled:false}})),selectedIndex:0,disabled:false,dataset:{},ownerDocument:{},isConnected:true,focus(){select.focused=true;}});return select;
};
test('keyboard movement skips disabled choices and respects first/last boundaries',()=>{
 const s=source();s.options[1].disabled=true;
 assert.equal(enabledOptionIndex(s,0,'ArrowDown'),2);assert.equal(enabledOptionIndex(s,2,'ArrowUp'),0);
 assert.equal(enabledOptionIndex(s,3,'ArrowDown'),3);assert.equal(enabledOptionIndex(s,0,'ArrowUp'),0);
 assert.equal(enabledOptionIndex(s,2,'Home'),0);assert.equal(enabledOptionIndex(s,0,'End'),3);
});
test('Russian typeahead wraps around and does not choose a disabled matching option',()=>{
 const s=source(['Сначала новые','По названию','Сначала давние','Сбросить']);s.options[2].disabled=true;
 assert.equal(typeaheadOptionIndex(s,0,'с'),3);assert.equal(typeaheadOptionIndex(s,3,'СНАЧАЛА'),0);
 assert.equal(typeaheadOptionIndex(s,0,'нет'),-1);
});
test('committing a custom choice saves input drafts before change rerenders and focuses replacement',()=>{
 const s=source(),events=[],replacement={focus(){events.push('focus-replacement');}};s.id='reaction-filter';
 s.addEventListener('input',event=>{events.push(`input:${s.selectedIndex}:${event.bubbles}`);});
 s.addEventListener('change',event=>{events.push(`change:${s.selectedIndex}:${event.bubbles}`);s.isConnected=false;s.ownerDocument.getElementById=()=>replacement;});
 assert.equal(commitCustomSelect(s,2),true);assert.deepEqual(events,['input:2:true','change:2:true','focus-replacement']);
});
test('disabled controls/options and an unchanged value do not manufacture form edits',()=>{
 const s=source(),events=[];s.addEventListener('change',()=>events.push('change'));s.disabled=true;
 assert.equal(commitCustomSelect(s,2),false);s.disabled=false;s.options[2].disabled=true;
 assert.equal(commitCustomSelect(s,2),false);assert.equal(commitCustomSelect(s,0),false);assert.deepEqual(events,[]);assert.equal(s.selectedIndex,0);
});
test('a control disabled by its fieldset cannot accept a custom option',()=>{
 const s=source();s.matches=selector=>selector===':disabled';
 assert.equal(commitCustomSelect(s,1),false);assert.equal(s.selectedIndex,0);
});

// Only the DOM boundary is replaced. The production enhancement, invalid handler
// and disposal run unchanged; values/form membership remain on the same node.
function domSource(){
 let doc;
 class Node extends EventTarget{
  constructor(tag){super();this.tagName=tag.toUpperCase();this.attrs=new Map();this.dataset={};this.children=[];this.classList={add(){},remove(){},toggle(){}};this.disabled=false;this.ownerDocument=doc;this.textContent='';}
  setAttribute(k,v){this.attrs.set(k,String(v));}getAttribute(k){return this.attrs.get(k)??null;}removeAttribute(k){this.attrs.delete(k);}
  get hidden(){return this.attrs.has('hidden');}set hidden(v){v?this.setAttribute('hidden',''):this.removeAttribute('hidden');}
  get tabIndex(){return Number(this.getAttribute('tabindex')??0);}set tabIndex(v){this.setAttribute('tabindex',v);}
  get isConnected(){return this===doc.body||Boolean(this.parentElement?.isConnected);}
  append(...nodes){for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node);}}
  before(node){const parent=this.parentElement;node.remove();node.parentElement=parent;parent.children.splice(parent.children.indexOf(this),0,node);}
  remove(){if(this.parentElement){const p=this.parentElement;p.children.splice(p.children.indexOf(this),1);this.parentElement=null;}}
  matches(s){return s==='.product-page select'&&this.tagName==='SELECT';}
  querySelectorAll(s){const nodes=this.children.flatMap(child=>[child,...child.querySelectorAll('*')]);return s==='*'?nodes:s==='.product-page select'?nodes.filter(n=>n.tagName==='SELECT'):[];}
  focus(){doc.activeElement=this;}
 }
 doc={addEventListener(){},createElement:tag=>new Node(tag),createElementNS:(_,tag)=>new Node(tag),querySelectorAll:s=>doc.body.querySelectorAll(s),defaultView:{addEventListener(){}}};doc.body=new Node('body');
 const select=new Node('select');Object.assign(select,{id:'context-choice',name:'context',options:[{textContent:'Выбрать',value:'',parentElement:{}}],selectedIndex:0,labels:[],required:true,validity:{valid:false},form:new EventTarget()});doc.body.append(select);return {doc,select};
}
test('enhancement removes native source from accessibility and invalid keeps proxy focus and form state',()=>{
 const {doc,select}=domSource();const form=select.form;initCustomSelects(doc);
 assert.equal(select.hidden,true);assert.equal(select.getAttribute('aria-hidden'),'true');assert.equal(select.tabIndex,-1);
 assert.equal(select.form,form);assert.equal(select.required,true);assert.equal(select.disabled,false);
 const invalid=new Event('invalid',{cancelable:true});select.dispatchEvent(invalid);
 assert.equal(invalid.defaultPrevented,true);assert.equal(doc.activeElement.getAttribute('role'),'combobox');assert.equal(doc.activeElement.getAttribute('aria-invalid'),'true');
});
test('disposing enhancement restores native fallback semantics and original focus identity',()=>{
 const {doc,select}=domSource();select.setAttribute('aria-hidden','false');select.tabIndex=3;select.dataset.focus='stable-choice';initCustomSelects(doc);
 assert.equal(typeof customSelect.disposeCustomSelects,'function');customSelect.disposeCustomSelects(doc);
 assert.equal(select.hidden,false);assert.equal(select.getAttribute('aria-hidden'),'false');assert.equal(select.tabIndex,3);assert.equal(select.dataset.focus,'stable-choice');assert.equal(select.dataset.selectFocus,undefined);assert.equal(select.parentElement,doc.body);
});
