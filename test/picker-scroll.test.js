import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

test('question transitions scroll the active pane while keeping visible headings in place',async()=>{
 const source=await readFile(new URL('../src/server/public/shared/workspace-ui.js',import.meta.url),'utf8');
 const script=source.slice(0,source.indexOf('export function syncEditorSubmit')).replaceAll('export function','function');
 const calls=[],pane={scrollBy:({top})=>calls.push(['pane',top]),scrollTo:({top})=>calls.push(['pane-start',top])};
 const shell={getBoundingClientRect:()=>({bottom:114})};
 let overflowY='auto',top=700;
 const context=vm.createContext({
  document:{querySelector:s=>s==='.picker-scroll'?pane:shell},
  window:{innerHeight:680,scrollBy:({top})=>calls.push(['page',top])},
  getComputedStyle:()=>({overflowY}),
  heading:{focus:({preventScroll})=>assert.ok(preventScroll),getBoundingClientRect:()=>({top,bottom:top+44})}
 });
 vm.runInContext(script+';focusPickerContent(heading);scrollPickerToStart()',context);
 top=180;vm.runInContext('focusPickerContent(heading)',context);
 overflowY='visible';top=710;vm.runInContext('focusPickerContent(heading)',context);
 assert.deepEqual(calls,[['pane',574],['pane-start',0],['page',584]]);
});
