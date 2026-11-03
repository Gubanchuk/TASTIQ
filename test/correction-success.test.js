import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createConversationClient} from '../src/server/public/shared/conversation-client.js';
import {shouldClearCorrection} from '../src/server/public/shared/clarification-view.js';

// Replace only the DOM boundary. The real client, navigate function, open/close
// helpers and click branch run in their production order, including onChange.
class Node {
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.hidden=false;}
 remove(){if(this.parentElement){const parent=this.parentElement;parent.children.splice(parent.children.indexOf(this),1);this.parentElement=null;}}
 append(...nodes){for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node);}}
 before(node){const parent=this.parentElement,index=parent.children.indexOf(this);node.remove();node.parentElement=parent;parent.children.splice(index,0,node);}
 replaceWith(node){const parent=this.parentElement,index=parent.children.indexOf(this);this.remove();node.remove();node.parentElement=parent;parent.children.splice(index,0,node);}
 replaceChildren(...nodes){for(const child of [...this.children])child.remove();this.append(...nodes);}
 querySelectorAll(selector){return this.children.flatMap(child=>[...(selector==='form'&&child.tagName==='FORM'?[child]:[]),...child.querySelectorAll(selector)]);}
 querySelector(selector){if(selector==='form')return this.querySelectorAll(selector)[0]??null;return this.children.find(child=>['TEXTAREA','INPUT','SELECT'].includes(child.tagName))??null;}
 setAttribute(){}
 scrollIntoView(){}
 focus(){}
}

for(const picker of ['game','watch'])test(`${picker}: a successful correction reopens as a blank new edit without reload`,async()=>{
 const source=await readFile(new URL(`../src/server/public/pick/${picker}/app.js`,import.meta.url),'utf8');
 const uiSource=await readFile(new URL('../src/server/public/shared/workspace-ui.js',import.meta.url),'utf8');
 const navigateSource=source.slice(source.indexOf('async function navigate('),source.indexOf('\nfunction completeBackDraft('));
 const clickLine=source.split(/\r?\n/).find(line=>line.includes("if(act==='focus-correction')"));
 const clickBody=clickLine.slice(clickLine.indexOf('{')+1,clickLine.lastIndexOf('}'));
 const uiFunctions=uiSource.slice(uiSource.indexOf('export function closeRequestEditor'),uiSource.indexOf('export function syncRequestEditor')).replaceAll('export function','function');
 const host=new Node('section'),sidebar=new Node('aside'),trigger=new Node('button');let form,input,client,revision=1;
 const document={getElementById:id=>id==='request-editor'?host:null,querySelector:()=>trigger,querySelectorAll:()=>[],createElement:tag=>new Node(tag)};
 const context=vm.createContext({document,shouldClearCorrection,localNotice:'',navigationFocus:null,lastRemovedFactFocus:null,pendingAction:null,pendingOrigin:null,pendingBack:null,pendingFamiliar:null,activeEvening:null,activeEveningDialogue:null,observedKey:null,currentRequest:null,preserveView:()=>null,persistAnswer:()=>null,rememberAcceptedFamiliar:()=>{},completeBackDraft:()=>{},prepareBackDraft:()=>null,$:selector=>selector==='#correction-form'?form:selector==='#correction-text'?input:null,render:()=>{}});
 vm.runInContext(uiFunctions+';globalThis.openEditor=openRequestEditor;',context);
 const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 client=createConversationClient({storage,domain:picker==='watch'?'film':'game',fetch:async()=>({ok:true,json:async()=>({state:{version:1,id:'correction-success-probe',domain:picker==='watch'?'film':'game',revision:revision++,turns:[]},screen:{type:'review'}})}),onChange:()=>{
  // The production render creates the new form from the not-yet-cleared draft.
  const draft=client.draft('__correction');form=new Node('form');form.dataset.form='correction';form.hidden=draft.kind!=='none';input=new Node('textarea');input.value=draft.text;form.append(input);sidebar.replaceChildren(form);host.replaceChildren();
  if(!form.hidden)context.openEditor(form,{focus:false});
 }});
 context.client=client;vm.runInContext(navigateSource+';globalThis.navigateProbe=navigate;globalThis.reopen=function(){'+clickBody+'};',context);
 await client.start();client.saveDraft('__correction',{kind:'none',text:'Хочу спокойнее и без PvP'});
 await context.navigateProbe({type:'correct',text:'Хочу спокойнее и без PvP'},{origin:'correction'});
 assert.equal(client.draft('__correction').text,'');assert.equal(form.hidden,true);
 context.reopen();assert.equal(form.hidden,false);
 assert.equal(input.value,'','A new edit must not resubmit the already accepted correction.');
});
