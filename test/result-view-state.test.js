import test from 'node:test';
import assert from 'node:assert/strict';
import {createResultViewState} from '../src/server/public/shared/result-view-state.js';

function input(key,value){return {dataset:{resultKey:key},value,selectionStart:3,selectionEnd:7,focused:false,focus(){this.focused=true;},setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}};}
function root(field,details=[]){return {querySelector:()=>field,querySelectorAll:()=>details};}

test('an unsent result wish survives redraw with its caret and disclosure while sent wish remains separate',()=>{
 const state=createResultViewState(),sent='прошлая отправленная поправка',field=input('dialogue:film','посвежее, но без хоррора');
 const snapshot=state.capture(root(field,[{dataset:{resultDisclosure:'tt1'},open:true}]),field);
 const next=input('dialogue:film',sent),detail={dataset:{resultDisclosure:'tt1'},open:false};
 state.restore(snapshot,root(next,[detail]));
 assert.equal(next.value,field.value);assert.equal(state.value('dialogue:film',sent),field.value);assert.equal(sent,'прошлая отправленная поправка');
 assert.deepEqual([next.selectionStart,next.selectionEnd,next.focused],[3,7,true]);assert.equal(detail.open,true);
});
test('a new dialogue never receives the old dialogue wish or focus',()=>{
 const state=createResultViewState(),field=input('old:film','старое пожелание'),snapshot=state.capture(root(field),field),next=input('new:series','');
 state.restore(snapshot,root(next));assert.equal(next.value,'');assert.equal(next.focused,false);assert.equal(state.value('new:series','отправлено'),'отправлено');
});
test('typing remembers the pending text independently and a click elsewhere does not steal focus on redraw',()=>{
 const state=createResultViewState();state.remember('d:film','новая поправка');assert.equal(state.value('d:film','отправленная'),'новая поправка');
 const field=input('d:film','новая поправка'),snapshot=state.capture(root(field),{}),next=input('d:film','отправленная');
 state.restore(snapshot,root(next));assert.equal(next.value,'новая поправка');assert.equal(next.focused,false);
});
