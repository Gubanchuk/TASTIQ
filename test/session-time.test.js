import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newConversation,answerConversation,applyConversationProposal,normalizeConversation,conversationToLegacy,conversationScreen} from '../src/core/conversation.js';
import {fixtureCatalog} from './fixture.js';
import {sessionOf} from '../src/core/dialogue.js';
import {feasibilityOf} from '../src/core/feasibility.js';

const catalog=fixtureCatalog();
function said(text) {
 let s=newConversation({id:'time-audit'});
 for(const id of ['rpg','windows','solo'])s=answerConversation(s,{type:'answer',questionId:s.question.id,selected:[id]});
 return answerConversation(s,{type:'correct',text});
}
const time=(s,minutes,quote=s.turns.at(-1).answer)=>({minutes,sourceId:s.turns.at(-1).id,quote});
const proposal=(sessionTime,extra={})=>({summary:'Сегодняшний запрос',facts:[],uncertainties:[],action:'review',question:null,sessionTime,...extra});
const apply=(s,value,extra={})=>applyConversationProposal(s,proposal(value,extra),catalog.dict);

test('explicit current session durations and upper budgets become checked minutes with interruption uncertainty',()=>{
 for(const [quote,minutes] of [['Сегодня есть 30 минут',30],['Могу поиграть полчаса',30],['Сегодня могу поиграть 1h 30m',90],['Сегодня не больше часа',60],['Есть максимум 30 мин',30],['Сегодня есть 5 минут',5],['Сегодня есть 24 часа',1440],['Сейчас есть30минут',30],['Сейчас могу поиграть полчаса',30],['Сейчас есть1h30m',90]]) {
  const s=said(quote),out=apply(s,time(s,minutes));
  assert.equal(out.error,undefined,quote);
  assert.deepEqual(out.state.sessionTime,{minutes,sourceId:s.turns.at(-1).id,quote});
  assert.equal(conversationScreen(out.state).sessionTime.minutes,minutes);
  const legacy=conversationToLegacy(out.state,catalog.dict,catalog),session=sessionOf(legacy);
  assert.equal(session.minutes,minutes);
  assert.deepEqual(legacy.conversation.sessionTime,out.state.sessionTime);
  assert.ok(feasibilityOf(catalog.byId.get('1'),session).some(c=>c.key==='minutes'&&c.status==='unknown'));
 }
});

test('history, total completion, uncertainty, negation, conditional time and ranges never become exact current budgets',()=>{
 for(const text of ['Прошёл за 10 часов','На всю игру 30 часов','Раньше играл по часу','Не знаю, сколько есть времени','Сегодня не могу играть 30 минут','Может, сегодня полчаса','Если останется 30 минут','Сегодня есть 30–60 минут','Сегодня от получаса до часа','Сегодня есть примерно 30 минут']) {
  const s=said(text),out=apply(s,time(s,text.includes('10 часов')?600:30));
  assert.ok(out.error,text);
  assert.equal(out.state.sessionTime??null,null);
 }
});

test('time value, active source, exact quote and shape are checked before applying any proposed fact snapshot',()=>{
 const s=said('Сегодня есть 30 минут');
 for(const patch of [{minutes:45},{minutes:4},{minutes:1441},{minutes:30.5},{sourceId:'foreign'},{quote:'Сегодня есть 45 минут'},{minutes:'30'}, {extra:'not allowed'}]) {
  const out=apply(s,{...time(s,30),...patch},{summary:'Нельзя принять эту новую сводку'});
  assert.ok(out.error,JSON.stringify(patch));
  assert.equal(out.state.summary,s.summary);
 }
 const retired=structuredClone(s);retired.turns.at(-1).superseded=true;
 assert.ok(apply(retired,time(s,30)).error);
});

test('bare duration is accepted only in a question explicitly about current available time',()=>{
 let s=said('Давай уточним время');
 s=apply(s,null,{action:'question',question:{id:'session-time',title:'Сколько времени есть сегодня на игру?',why:'Проверим сессию',options:[],multiple:false}}).state;
 s=answerConversation(s,{type:'answer',questionId:s.question.id,text:'полчаса'});
 assert.equal(apply(s,time(s,30)).state.sessionTime?.minutes,30);
 const broad=said('полчаса');
 assert.ok(apply(broad,time(broad,30)).error);
 for(const title of ['Сколько времени сегодня ушло на установку игры?','Сколько минут сегодня длилась твоя игра?']) {
  let past=said('Давай уточним время');past=apply(past,null,{action:'question',question:{id:'past-time',title,options:[],multiple:false}}).state;
  past=answerConversation(past,{type:'answer',questionId:past.question.id,text:'полчаса'});
  assert.ok(apply(past,time(past,30)).error,title);
 }
});

test('a time quote cannot omit uncertainty, a range or a negation from the same answer',()=>{
 for(const [text,quote] of [['Если сегодня есть 30 минут','сегодня есть 30 минут'],['Может, сегодня есть 30 минут','сегодня есть 30 минут'],['Сегодня есть 30 минут–час','Сегодня есть 30 минут'],['Сегодня есть 30 минут, если не позвонят','Сегодня есть 30 минут'],['Сегодня есть 30 минут, но это я вчера думал','Сегодня есть 30 минут'],['Сегодня есть 30 минут, но теперь уже нет','Сегодня есть 30 минут'],['Вчера я говорил: сегодня есть полчаса','сегодня есть полчаса'],['Сегодня есть 30 минут, или час','Сегодня есть 30 минут']]) {
  const s=said(text);assert.ok(apply(s,time(s,30,quote)).error,text);
 }
 let s=said('Уточним время');
 s=apply(s,null,{action:'question',question:{id:'session-time',title:'Сколько времени есть сегодня?',options:[],multiple:false}}).state;
 s=answerConversation(s,{type:'answer',questionId:s.question.id,text:'Не знаю, может полчаса'});
 assert.ok(apply(s,time(s,30,'полчаса')).error);
 const mixed=said('На всю игру 30 часов, сегодня есть 30 минут');
 assert.equal(apply(mixed,time(mixed,30,'сегодня есть 30 минут')).state.sessionTime?.minutes,30);
 for(const text of ['Сегодня есть 30 минут, а вчера играл час','Сегодня есть 30 минут. Хочу историю, если она не слишком сложная']) {
  const current=said(text);assert.equal(apply(current,time(current,30,'Сегодня есть 30 минут')).state.sessionTime?.minutes,30,text);
 }
});

test('removing the current budget also prevents an older superseded budget from returning, but allows a new answer',()=>{
 let s=said('Сегодня есть 30 минут');const old=time(s,30);s=apply(s,old).state;
 s=answerConversation(s,{type:'correct',text:'Теперь сегодня есть 45 минут'});
 s=apply(s,time(s,45,'сегодня есть 45 минут')).state;
 s=answerConversation(s,{type:'remove_time'});
 assert.ok(apply(s,old).error);
 s=answerConversation(s,{type:'correct',text:'Теперь сегодня есть 60 минут'});
 const next=apply(s,time(s,60,'сегодня есть 60 минут'));
 assert.equal(next.error,undefined);assert.equal(next.state.sessionTime.minutes,60);
});

test('back over an unrelated answer cannot undo an explicit time removal anchored after it',()=>{
 let s=said('Сегодня есть 30 минут');const original=time(s,30);
 s=apply(s,original,{action:'question',question:{id:'other-topic',title:'Что хочется от игры?',options:[],multiple:true}}).state;
 s=answerConversation(s,{type:'answer',questionId:s.question.id,text:'Хочу историю'});
 s=apply(s,original).state;
 s=answerConversation(s,{type:'remove_time'});
 s=answerConversation(s,{type:'back'});
 assert.ok(apply(s,original).error);
 assert.ok(s.retractions.some(r=>r.kind==='session_time'&&r.at===s.turns.at(-1).id));
});

test('remove time is free, preserves the active question and retracts only time from that source',()=>{
 let s=said('Сегодня есть 30 минут');const original=time(s,30);
 const f={key:'short-session',text:'Сегодня важна короткая сессия',scope:'today',stance:'want',sourceId:original.sourceId,quote:original.quote,feature:'session.short',gameId:null,exposure:null};
 const oldTimeFact={...f,key:'old-time-only',text:'Сегодня 30 минут',feature:null};
 const question={id:'experience-now',title:'Что хочется получать от игры?',options:[],multiple:true};
 s=apply(s,original,{facts:[f,oldTimeFact],action:'question',question}).state;
 s=answerConversation(s,{type:'remove_time'});
 assert.equal(s.sessionTime,null);assert.equal(s.phase,'talk');assert.equal(s.question.id,question.id);assert.equal(s.needsPlan,false);
 assert.ok(s.retractions.some(r=>r.kind==='session_time'&&r.sourceId===original.sourceId));
 assert.deepEqual(s.facts.map(x=>x.key),['short-session']);
 assert.ok(!conversationScreen(s).summary.includes('30'));
 assert.ok(apply(s,original,{facts:[f]}).error);
 assert.ok(apply(s,null,{facts:[f,oldTimeFact]}).error);
 const withoutTime=apply(s,null,{facts:[f]});assert.equal(withoutTime.error,undefined);assert.equal(withoutTime.state.facts.length,1);
});

test('a time-only fact cannot retain a removed budget through a mixed-purpose source quote',()=>{
 let s=said('Сегодня есть 30 минут, хочу историю');const budget=time(s,30,'Сегодня есть 30 минут');
 const f={key:'time-only',text:'Сегодня есть 30 минут',scope:'today',stance:'want',sourceId:budget.sourceId,quote:s.turns.at(-1).answer,feature:null,gameId:null,exposure:null};
 const story={...f,key:'story',text:'Хочется истории',feature:'story.central'};
 s=apply(s,budget,{facts:[f,story]}).state;s=answerConversation(s,{type:'remove_time'});
 assert.deepEqual(s.facts.map(x=>x.key),['story']);
 assert.ok(apply(s,null,{facts:[f,story]}).error);
 assert.equal(apply(s,null,{facts:[story]}).error,undefined);
});

test('a new time source can replace retracted time while correction and back remove obsolete budgets',()=>{
 let s=said('Сегодня есть 30 минут');s=apply(s,time(s,30)).state;
 s=answerConversation(s,{type:'remove_time'});
 s=answerConversation(s,{type:'correct',text:'Сегодня есть 20 минут'});
 assert.equal(s.sessionTime,null);
 s=apply(s,time(s,20)).state;assert.equal(s.sessionTime.minutes,20);
 s=answerConversation(s,{type:'back'});assert.equal(s.sessionTime,null);
});

test('old v1 states have no budget; malformed saved time is dropped visibly without losing the conversation',()=>{
 const old=said('Сегодня есть 30 минут');delete old.sessionTime;
 const restored=normalizeConversation(old);assert.equal(restored.sessionTime,null);assert.equal(restored.uncertainties.length,0);
 const malformed=normalizeConversation({...old,sessionTime:time(old,45)});
 assert.equal(malformed.sessionTime,null);assert.equal(malformed.turns.length,old.turns.length);
 assert.ok(malformed.uncertainties.some(x=>x.includes('время')));
});
