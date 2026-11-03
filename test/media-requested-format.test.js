import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newMediaConversation,answerMediaConversation,applyMediaConversationProposal,normalizeMediaConversation} from '../src/core/media-conversation.js';
import {screenFixture} from './fixture.js';
import {makeCatalog} from '../src/core/catalog.js';
import {createMediaConversationService} from '../src/server/media-conversation-service.js';
const dict=screenFixture('cartoon').dict;
const empty={company:null,childAge:null,timeMode:null,commitment:null,onlyEnded:null,format:null};
const received=JSON.parse(readFileSync(new URL('./fixtures/cartoon-reference-format-2026-11-03.json',import.meta.url),'utf8'));
const real=()=>{const s=answerMediaConversation(received.state,received.action),out=applyMediaConversationProposal(s,received.proposal,dict);assert.equal(out.error,undefined);return out.state;};
const example=(answer,quote=answer,extra={})=>{
 let s=newMediaConversation({domain:'cartoon',id:'format-guard'});s=answerMediaConversation(s,{type:'answer',questionId:s.question.id,selected:[],text:answer});
 const fact={key:'format-wish',text:'Желаемый формат',scope:'today',stance:'want',feature:'format.animation',titleId:null,exposure:null,titleIntent:null,sourceId:s.turns[0].id,quote,...extra};
 const proposal={summary:answer,facts:[fact],uncertainties:[],action:'question',question:{id:'detail',title:'Какой тон?',why:'Уточним настроение',options:[],multiple:false,controls:['unknown','indifferent','none']},context:{...empty},sessionTime:null};
 return {s,fact,proposal};
};

test('the real omitted series slot is recovered from an explicit grounded animation request and survives restore',()=>{
 const s=real();assert.equal(s.context.format,'episodic');assert.equal(s.context.timeMode,'episode');assert.equal(s.sessionTime.minutes,30);assert.equal(s.context.company,'solo');
 assert.equal(s.contextEvidence.format.quote,'Хочу анимационный сериал');assert.equal(normalizeMediaConversation(s).context.format,'episodic');
});

test('format survives removing time; removing its own format fact clears both bindings and undo restores them',()=>{
 const s=real(),f=s.facts.find(f=>f.quote==='Хочу анимационный сериал');
 assert.equal(answerMediaConversation(s,{type:'remove_time'}).context.format,'episodic');
 for(const key of [f.key,'context:format']){
  const removed=answerMediaConversation(s,{type:'remove_fact',key});assert.equal(removed.context.format,null);assert.ok(!removed.facts.some(row=>row.key===f.key));
  assert.equal(normalizeMediaConversation(removed).context.format,null);assert.equal(answerMediaConversation(removed,{type:'undo_fact_removal'}).context.format,'episodic');
 }
});

test('direct movie and series wishes recover a missing format without deriving it from mere animation',()=>{
 for(const [text,want] of [['Хочу анимационный сериал','episodic'],['Нужен мультипликационный сериал','episodic'],['Хочу анимационный фильм','movie']]){
  const {s,proposal}=example(text),out=applyMediaConversationProposal(s,proposal,dict);assert.equal(out.error,undefined,text);assert.equal(out.state.context.format,want,text);
 }
 const {s,proposal}=example('Хочу смешную анимацию');assert.equal(applyMediaConversationProposal(s,proposal,dict).state.context.format,null);
});

test('history, alternatives, clipped negation and conditions cannot become a hard format',()=>{
 for(const [answer,quote,extra] of [
  ['Не хочу анимационный сериал','Хочу анимационный сериал',{}],
  ['Если будет время, хочу анимационный сериал','хочу анимационный сериал',{}],
  ['Хочу анимационный сериал или фильм','Хочу анимационный сериал',{}],
  ['Хочу анимационный фильм или сериал','Хочу анимационный фильм',{}],
  ['Раньше хотел анимационный сериал','анимационный сериал',{scope:'history'}],
 ]){
  const actual=answer.includes(quote)?quote:answer.slice(answer.indexOf('хочу'));
  const {s,proposal}=example(answer,actual,extra),out=applyMediaConversationProposal(s,proposal,dict);
  assert.equal(out.error,undefined,answer);assert.equal(out.state.context.format,null,answer);
 }
});

test('a quoted wish in a synopsis is not automatically promoted to the viewer format',()=>{
 const {s,proposal}=example('В синопсисе герой говорит: «Хочу анимационный сериал».','Хочу анимационный сериал');
 const out=applyMediaConversationProposal(s,proposal,dict);assert.equal(out.error,undefined);assert.equal(out.state.context.format,null);
});

test('recovered format filters the actual picker after time removal and cannot be restored from a removed source',async()=>{
 const original=real(),state=answerMediaConversation(original,{type:'remove_time'});
 const base=screenFixture('cartoon'),items=[...base.items,{...base.items[0],id:'series-allowed',name:'Series Allowed',kind:'series',runtime:20,work:'series-allowed'}];
 const catalog=makeCatalog({...base,items},'cartoon');
 const service=createMediaConversationService({domain:'cartoon',catalogs:{cartoon:catalog},plan:async()=>assert.fail('replay is free'),pick:async offered=>{
  assert.ok(offered.cartoon.items.every(item=>item.kind==='series'));return {picks:[{id:'t1',reason:'Wrong format'},{id:'series-allowed',reason:'Correct format'}]};
 }});
 const out=await service({domain:'cartoon',state,action:{type:'confirm'}});assert.equal(out.error,undefined);assert.equal(out.state.result.top.id,'series-allowed');
 const removed=answerMediaConversation(original,{type:'remove_fact',key:'context:format'});
 assert.ok(applyMediaConversationProposal(removed,received.proposal,dict).error);
});
