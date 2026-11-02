import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseNeutral,chooseOption,answerAction,hasPendingAnswer,keyboardSubmit,contextDraftText,contextEditorValues} from '../src/server/public/pick/game/answer-view-state.js';

const question={id:'today',multiple:true,allowText:true};
test('a neutral answer suspends an own answer without sending its old words or choices',()=>{
 const own={text:'Хочу хоррор без боёв',selected:['horror'],kind:'answer'};
 const neutral=chooseNeutral(own,'indifferent');
 assert.equal(neutral.text,own.text);assert.deepEqual(neutral.selected,own.selected);
 assert.deepEqual(answerAction(question,neutral),{type:'answer',questionId:'today',kind:'indifferent',selected:[],text:''});
 assert.deepEqual(chooseNeutral(neutral,'indifferent'),own);
});
test('a new chip exits neutral mode without reactivating suspended old chip choices',()=>{
 const draft=chooseOption({text:'Мой текст',selected:['horror'],kind:'none'},'strategy',true);
 assert.deepEqual(draft,{text:'Мой текст',selected:['strategy'],kind:'answer'});
 assert.equal(answerAction(question,draft).kind,'answer');
});
test('empty own answer becomes unknown; required context cannot be submitted without an option',()=>{
 assert.equal(answerAction(question,{text:' ',selected:[],kind:'answer'}).kind,'unknown');
 assert.equal(answerAction({...question,allowText:false},{text:'windows',selected:[],kind:'answer'}),null);
 assert.deepEqual(answerAction({...question,allowText:false},{text:'Ignored',selected:['windows'],kind:'none'}),{type:'answer',questionId:'today',selected:['windows'],text:'',kind:'answer'});
});
test('early review never silently bypasses a typed, selected, or explicit neutral answer',()=>{
 assert.equal(hasPendingAnswer({text:'',selected:[],kind:'answer'}),false);
 for(const draft of [{text:'Желание',selected:[],kind:'answer'},{text:'',selected:['a'],kind:'answer'},{text:'',selected:[],kind:'unknown'}])assert.equal(hasPendingAnswer(draft),true);
});
test('keyboard submit respects IME, busy, local forms, and ordinary Enter in text fields',()=>{
 const plain={key:'Enter',control:false,busy:false,composing:false,modified:false};
 assert.equal(keyboardSubmit(plain),'primary');
 assert.equal(keyboardSubmit({...plain,control:true,form:'answer'}),null);
 assert.equal(keyboardSubmit({...plain,control:true,modified:true,form:'correction'}),'correction');
 assert.equal(keyboardSubmit({...plain,control:true,modified:true,form:'context'}),'context');
 assert.equal(keyboardSubmit({...plain,control:true,modified:true,form:'evening-reason'}),'evening-reason');
 for(const extra of [{busy:true},{composing:true},{prevented:true},{dialog:true},{key:'a'}])assert.equal(keyboardSubmit({...plain,...extra}),null);
});
test('unsubmitted conditions survive unrelated renders and reload only while their base context still applies',()=>{
 const base={platform:'windows',company:'solo',partySize:null},edited={platform:'linux',company:'group',partySize:'4'};
 const text=contextDraftText(base,edited,'this-dialogue');
 assert.deepEqual(contextEditorValues(base,text,'this-dialogue'),edited);
 assert.deepEqual(contextEditorValues({...base,company:'friend',partySize:'2'},text,'this-dialogue'),{platform:'windows',company:'friend',partySize:'2'});
 assert.deepEqual(contextEditorValues(base,text,'other-dialogue'),base);
});
test('corrupt, unrelated, and impossible condition drafts do not replace server conditions',()=>{
 const base={platform:'deck',company:'group',partySize:'3'};
 for(const text of ['broken',JSON.stringify({values:{platform:'x'}}),contextDraftText(base,{platform:'atari',company:'crowd',partySize:'999'},'dialogue')])assert.deepEqual(contextEditorValues(base,text,'dialogue'),base);
});
