import test from 'node:test';
import assert from 'node:assert/strict';
import {carryFeedbackView,feedbackToggleFocus,acceptedFamiliarCard,captureTextSelection,restoreTextSelection} from '../src/server/public/pick/game/feedback-view-state.js';

test('replacement carries unsaved feedback and disclosure only for actual retained games',()=>{
 const view={drafts:new Map([['old:kept',{reason:'time',note:'Мой несохранённый текст'}],['old:replaced',{note:'Не переносить'}]]),open:new Map([['old:kept',true],['old:replaced',true]]),disclosures:new Map([['outcome:old:kept',true],['outcome:old:replaced',true]])};
 carryFeedbackView(view,'old','new',['kept','kept']);
 assert.deepEqual(view.drafts.get('new:kept'),{reason:'time',note:'Мой несохранённый текст'});
 assert.equal(view.open.get('new:kept'),true);assert.equal(view.disclosures.get('outcome:new:kept'),true);
 for(const map of Object.values(view))assert.equal([...map.keys()].some(key=>key.includes('new:replaced')),false);
 view.drafts.get('new:kept').note='Изменение';assert.equal(view.drafts.get('old:kept').note,'Мой несохранённый текст');
});
test('undo and repeated observation preserve existing destination draft and closed disclosures',()=>{
 const view={drafts:new Map([['old:g',{note:'Ранний черновик'}],['new:g',{note:'Поздний черновик'}]]),open:new Map([['old:g',false],['new:g',true]]),disclosures:new Map([['outcome:old:g',false],['outcome:new:g',true]])};
 carryFeedbackView(view,'new','old',['g']);carryFeedbackView(view,'old','old',['g']);carryFeedbackView(view,null,'other',['g']);
 assert.equal(view.drafts.get('old:g').note,'Ранний черновик');assert.equal(view.open.get('old:g'),false);assert.equal(view.disclosures.get('outcome:old:g'),false);assert.equal(view.drafts.has('other:g'),false);
});
test('explicit undo keeps the latest retained draft, including an intentional blank, and drops stale submitted drafts',()=>{
 const view={drafts:new Map([['old:kept',{note:'Старое'}],['new:kept',{reason:'',note:''}],['old:submitted',{note:'Уже отправлено'}],['old:replaced',{note:'Не трогать'}]]),open:new Map([['old:kept',true],['new:kept',false]]),disclosures:new Map([['outcome:old:kept',true],['outcome:new:kept',false]])};
 carryFeedbackView(view,'new','old',['kept','submitted'],{overwrite:true});
 assert.deepEqual(view.drafts.get('old:kept'),{reason:'',note:''});assert.equal(view.drafts.has('old:submitted'),false);
 assert.equal(view.open.get('old:kept'),false);assert.equal(view.disclosures.get('outcome:old:kept'),false);
 assert.equal(view.drafts.get('old:replaced').note,'Не трогать');
});
test('choose and start focus identify their own game and action across on/off and run changes',()=>{
 assert.deepEqual(feedbackToggleFocus({act:'evening-choose',id:'g',run:'one',v:'on'}),feedbackToggleFocus({act:'evening-choose',id:'g',run:'two',v:'off'}));
 assert.notDeepEqual(feedbackToggleFocus({act:'evening-choose',id:'g'}),feedbackToggleFocus({act:'evening-start',id:'g'}));
 assert.notDeepEqual(feedbackToggleFocus({act:'evening-choose',id:'g'}),feedbackToggleFocus({act:'evening-choose',id:'other'}));
 assert.equal(feedbackToggleFocus({act:'evening-fit',id:'g',v:'accept'}),null);
});
test('retried mark and keep remember only an explicitly accepted game in the same dialogue',()=>{
 const card={id:'g',name:'Game'},pending={dialogueId:'dialogue',type:'familiar_mark',card};
 assert.equal(acceptedFamiliarCard({id:'dialogue',familiar:{marked:[]}},pending),null);
 assert.equal(acceptedFamiliarCard({id:'other',familiar:{marked:['g']}},pending),null);
 assert.deepEqual(acceptedFamiliarCard({id:'dialogue',familiar:{marked:['g']}},pending),card);
 assert.deepEqual(acceptedFamiliarCard({id:'dialogue',familiar:{keep:['g']}},{...pending,type:'familiar_keep'}),card);
 assert.equal(acceptedFamiliarCard({id:'dialogue',familiar:{marked:['g']}},{...pending,type:'familiar_keep'}),null);
});
test('replacing a focused textarea preserves a middle-of-note selection and its internal scroll position',()=>{
 const original={selectionStart:4,selectionEnd:11,selectionDirection:'backward',scrollTop:26},selection=captureTextSelection(original);
 const replacement={selectionStart:0,selectionEnd:0,selectionDirection:'none',scrollTop:0,setSelectionRange(start,end,direction){Object.assign(this,{selectionStart:start,selectionEnd:end,selectionDirection:direction});}};
 restoreTextSelection(replacement,selection);
 assert.equal(replacement.selectionStart,4);assert.equal(replacement.selectionEnd,11);assert.equal(replacement.selectionDirection,'backward');assert.equal(replacement.scrollTop,26);
 assert.equal(captureTextSelection({selectionStart:null,selectionEnd:null}),null);
 assert.doesNotThrow(()=>restoreTextSelection({},selection));
});
