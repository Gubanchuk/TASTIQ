import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newConversation, normalizeConversation, answerConversation, applyConversationProposal, conversationScreen, conversationToLegacy } from '../src/core/conversation.js';
import { fixtureCatalog, game } from './fixture.js';
import { makeCatalog } from '../src/core/catalog.js';
import { computeIdf } from '../src/core/idf.js';
import { rankAll } from '../src/core/recommend.js';
import { profileOf, sessionOf } from '../src/core/dialogue.js';
import { describePerson, systemFor } from '../src/ai/prompt.js';

const catalog = fixtureCatalog();
const reply = (s, selected = [], text = '', kind = 'answer') => answerConversation(s, {type:'answer',questionId:s.question.id,selected,text,kind});
function ready(mode='guided') {
  let s = newConversation({id:'test-evening',mode});
  s=reply(s,['rpg','open_world']); s=reply(s,['windows']); s=reply(s,['solo']);
  return s;
}
const q = (id='experience') => ({id,title:'Что хочется получать от игры?',why:'Уточним желаемый опыт',options:[{id:'story',label:'Истории'},{id:'builds',label:'Развивать героя'}],multiple:true,controls:['unknown','indifferent','none']});
const proposal = (facts=[], question=q()) => ({summary:'Ищем игру на сегодняшний вечер',facts,uncertainties:[],action:question?'question':'review',question});
const fact = (s, patch={}) => ({key:'goal',text:'Нужна история',stance:'want',scope:'today',sourceId:s.turns.at(-1).id,quote:s.turns.at(-1).answer,feature:'story.central',gameId:null,exposure:null,...patch});
function said(text,kind='answer') {
  let s=ready(); s=applyConversationProposal(s,proposal(),catalog.dict).state;
  return reply(s,[],text,kind);
}

test('game entry asks direction first, preserves both choices and offers own words',()=>{
  let s=newConversation({id:'entry'});
  assert.equal(s.phase,'direction'); assert.ok(s.question.options.some(o=>o.id==='rpg'));
  s=reply(s,['rpg','open_world'],'Можно с необычными историями');
  assert.equal(s.phase,'platform'); assert.equal(s.turns[0].selected.length,2);
  assert.match(s.turns[0].answer,/RPG/); assert.match(s.turns[0].answer,/необычными историями/);
});

test('unknown, indifferent and none are not translated into negative preferences',()=>{
  for(const kind of ['unknown','indifferent','none']) {
    const s=said('',kind);
    const out=applyConversationProposal(s,proposal([fact(s,{stance:'avoid'})],null),catalog.dict);
    assert.ok(out.error,kind); assert.deepEqual(out.state.facts,s.facts);
  }
});

test('invalid evidence rejects interpretation and its dependent question atomically',()=>{
  const s=said('Хочу историю');
  const out=applyConversationProposal(s,proposal([fact(s,{quote:'люблю спутников'})],q('companions')),catalog.dict);
  assert.ok(out.error); assert.equal(out.state.revision,s.revision); assert.notEqual(out.state.question?.id,'companions');
});

test('stale planner reply and retracted facts cannot revive discarded meaning',()=>{
  let s=said('Хочу историю');
  const f=fact(s); s=applyConversationProposal(s,proposal([f],null),catalog.dict).state;
  const oldRevision=s.revision;
  s=answerConversation(s,{type:'remove_fact',key:f.key});
  assert.equal(s.facts.length,0); assert.ok(s.revision>oldRevision);
  assert.ok(applyConversationProposal(s,proposal([f],null),catalog.dict).error);
  assert.ok(applyConversationProposal(s,proposal([],q()),catalog.dict,oldRevision).error);
});

test('back removes answer and dependent facts, monotonic version invalidates late responses',()=>{
  let s=said('Хочу историю'); const last=s.turns.at(-1).id;
  s=applyConversationProposal(s,proposal([fact(s)],null),catalog.dict).state;
  const rev=s.revision; s=answerConversation(s,{type:'back'});
  assert.ok(s.revision>rev); assert.ok(!s.turns.some(t=>t.id===last)); assert.ok(!s.facts.some(f=>f.sourceId===last));
  assert.equal(conversationScreen(s).type,'question'); assert.equal(s.question.id,'experience');
});

test('guided mode rejects a resolved repeated question, free baseline leaves sequencing to model',()=>{
  const s=said('Хочу историю');
  assert.ok(applyConversationProposal(s,proposal([fact(s)],q()),catalog.dict).error);
  assert.ok(!applyConversationProposal({...s,mode:'free'},proposal([fact(s)],q()),catalog.dict).error);
});

test('a single genre is insufficient to declare understanding; preview remains available',()=>{
  const s=ready(); const out=applyConversationProposal(s,proposal([],null),catalog.dict);
  assert.ok(out.error); const preview=answerConversation(s,{type:'review'});
  assert.equal(conversationScreen(preview).type,'review'); assert.equal(conversationScreen(preview).provisional,true);
});

test('early preview keeps a reachable required context question instead of a dead review',()=>{
  const s=newConversation({id:'early'}), next=answerConversation(s,{type:'review'});
  assert.equal(conversationScreen(next).type,'question');assert.equal(next.question.id,'direction');
  const platform=reply(s,['rpg']);const preview=answerConversation(platform,{type:'review'});
  assert.equal(preview.phase,'platform');
});

test('a free correction invalidates previous derived preferences until interpreted again',()=>{
  let s=said('Хочу историю');s=applyConversationProposal(s,proposal([fact(s)],null),catalog.dict).state;
  s=answerConversation(s,{type:'correct',text:'Передумал, теперь хочу гонки'});
  assert.equal(s.facts.length,0);assert.equal(s.summary,'');assert.equal(s.needsPlan,true);
  assert.ok(s.turns.some(t=>t.answer.includes('Хочу историю')),'source history retained for reinterpretation');
});

test('today goals outrank historical feature preferences and indifference never becomes avoid',()=>{
  const items=[game(1,'Большой мир',{'freedom.open_world':1}),game(2,'Линейная история',{'freedom.linear':1})];
  const cat=makeCatalog({items,...computeIdf(items),stats:{}},'game');
  const s=said('Обычно открытый мир, сегодня линейную, реализм неважен');
  const out=applyConversationProposal(s,proposal([
    fact(s,{key:'past',scope:'history',feature:'freedom.open_world',quote:'Обычно открытый мир'}),
    fact(s,{key:'today',feature:'freedom.linear',quote:'сегодня линейную'}),
    fact(s,{key:'realism',stance:'indifferent',feature:'tone.gritty',quote:'реализм неважен'}),
  ],null),cat.dict);
  assert.ok(!out.error); const legacy=conversationToLegacy(out.state,cat.dict);
  const session=sessionOf(legacy), ranked=rankAll(cat,profileOf(legacy),session).ranked;
  assert.equal(ranked[0].game.id,'2'); assert.ok(!session.goalAvoids.some(x=>x.f==='tone.gritty'));
});

test('started game remains available to continue; finished game excluded without excluding entire series',()=>{
  const items=[game(1,'Начатая',{'story.central':1}),game(2,'Пройденная',{'story.central':1}),game(3,'Новая часть',{'story.central':1})];
  items[1].series=['shared']; items[2].series=['shared'];
  const cat=makeCatalog({items,...computeIdf(items),stats:{}},'game');
  const s=said('Первую только начал, вторую прошёл');
  const out=applyConversationProposal(s,proposal([
    fact(s,{key:'started',stance:'history',scope:'history',feature:null,gameId:'1',exposure:'started',quote:'Первую только начал'}),
    fact(s,{key:'finished',stance:'history',scope:'history',feature:null,gameId:'2',exposure:'finished',quote:'вторую прошёл'}),
  ],null),cat.dict);
  const legacy=conversationToLegacy(out.state,cat.dict), ids=rankAll(cat,profileOf(legacy),sessionOf(legacy)).ranked.map(r=>r.game.id);
  assert.ok(ids.includes('1')); assert.ok(!ids.includes('2')); assert.ok(ids.includes('3'));
});

test('full raw meaning survives into final prompt beyond old 300 character note',()=>{
  const tail='Самое важное — хочу вернуться к начатой игре'; const s=said('Мне интересно '.repeat(45)+tail);
  const out=applyConversationProposal(s,proposal([fact(s,{quote:tail,text:tail,feature:null})],null),catalog.dict);
  assert.match(describePerson(conversationToLegacy(out.state,catalog.dict),catalog),/хочу вернуться к начатой игре/);
});

test('adaptive final picker is not instructed to keep today inside historical taste',()=>{
  const text=systemFor(conversationToLegacy(ready(),catalog.dict));
  assert.ok(!text.includes('Start from the titles the person loves'));
  assert.ok(!text.includes('not replace their main reasons'));
  assert.match(text,/today.*goal/i);
});

test('explicit excluded title is removed even when it was only started',()=>{
  const s=said('Первую только начал, но сегодня её не предлагай');
  const out=applyConversationProposal(s,proposal([fact(s,{key:'no-title',stance:'exclude',gameId:'1',exposure:'started',feature:null})],null),catalog.dict);
  const legacy=conversationToLegacy(out.state,catalog.dict);
  assert.ok(sessionOf(legacy).notNow.includes('1'));
  assert.ok(!rankAll(catalog,profileOf(legacy),sessionOf(legacy)).ranked.some(r=>r.game.id==='1'));
});

test('editing company invalidates facts sourced from superseded context, including later proposals',()=>{
  let s=newConversation({id:'company-edit'});s=reply(s,['rpg']);s=reply(s,['windows']);s=reply(s,['friend']);
  const source=s.turns.at(-1);
  s=applyConversationProposal(s,proposal(),catalog.dict).state;s=reply(s,[],'Хочу историю');
  const coop=fact(s,{key:'cooperation',stance:'require',feature:'social.coop',sourceId:source.id,quote:source.answer});
  s=applyConversationProposal(s,proposal([coop],null),catalog.dict).state;
  s=answerConversation(s,{type:'context',company:'solo'});
  assert.ok(!s.facts.some(f=>f.key===coop.key));
  assert.ok(!sessionOf(conversationToLegacy(s,catalog.dict)).goalRequires.some(x=>x.f==='social.coop'));
  assert.ok(applyConversationProposal(s,proposal([coop],null),catalog.dict).error);
});

test('familiar marks keep the result and today goal; keep-return overrides completed exposure but not a hard today exclusion',()=>{
  let s=said('Первую прошёл');
  s=applyConversationProposal(s,proposal([fact(s,{stance:'history',scope:'history',gameId:'1',exposure:'finished',feature:null})],null),catalog.dict).state;
  s={...s,phase:'result',result:{top:{id:'1'},alternatives:[{id:'3'}]}};
  const summary=s.summary,turns=s.turns;
  s=answerConversation(s,{type:'familiar_mark',id:'1'});
  assert.deepEqual(s.familiar.marked,['1']);assert.equal(s.result.top.id,'1');assert.equal(s.summary,summary);assert.deepEqual(s.turns,turns);
  s=answerConversation(s,{type:'familiar_keep',id:'1'});
  assert.deepEqual(s.familiar.marked,[]);
  let legacy=conversationToLegacy(s,catalog.dict);
  assert.ok(rankAll(catalog,profileOf(legacy),sessionOf(legacy)).ranked.some(r=>r.game.id==='1'));
  s.facts.push({...s.facts[0],key:'today-hard',scope:'today',stance:'exclude'});
  legacy=conversationToLegacy(s,catalog.dict);
  assert.ok(!rankAll(catalog,profileOf(legacy),sessionOf(legacy)).ranked.some(r=>r.game.id==='1'));
});

test('old v1 conversation restores with safe familiarity defaults and result actions reject unrelated titles',()=>{
  const old=ready();delete old.familiar;delete old.replacement;
  const restored=normalizeConversation(old);
  assert.deepEqual(restored.familiar.marked,[]);
  assert.throws(()=>answerConversation({...restored,phase:'result',result:{top:{id:'1'},alternatives:[]}},{type:'familiar_mark',id:'3'}),/карточ/);
});

test('changing the query clears pending result marks and undo without forgetting current-session hidden games',()=>{
  let s={...ready(),phase:'result',result:{top:{id:'1'},alternatives:[]},familiar:{marked:['1'],keep:[],excluded:[],hidden:['3'],undo:{result:{top:{id:'3'},alternatives:[]},marked:['3'],keep:[],hidden:[]}},replacement:{changedIds:['3'],unresolvedIds:[],notice:''}};
  s=answerConversation(s,{type:'correct',text:'Теперь хочу гонки'});
  assert.deepEqual(s.familiar.marked,[]);assert.equal(s.familiar.undo,null);assert.equal(s.replacement,null);assert.deepEqual(s.familiar.hidden,['3']);
});

test('return-to-game choice reaches final picker as an explicit today decision without inferring taste',()=>{
  let s={...ready(),phase:'result',result:{top:{id:'1'},alternatives:[]}};
  s=answerConversation(s,{type:'familiar_keep',id:'1'});
  const legacy=conversationToLegacy(s,catalog.dict,catalog),text=describePerson(legacy,catalog);
  assert.match(text,/явно оставил.*вернуться|явно оставил.*переиграть/i);assert.match(text,/The Witcher 3|Ведьмак 3/);
  assert.equal(Object.keys(legacy.answers).length,0);assert.deepEqual(legacy.preferences,[]);
});

test('restored familiarity and replacement metadata cannot grow unbounded or nest an undo chain',()=>{
  const old=ready();old.familiar={marked:[],keep:[],excluded:[],hidden:Array.from({length:501},(_,i)=>String(i))};
  assert.throws(()=>normalizeConversation(old),/отметки/);
  old.familiar={marked:[],keep:[],excluded:[],hidden:[],undo:{result:{top:{id:'1'},alternatives:[]},marked:[],hidden:[],keep:[],undo:{result:{top:{id:'3'}}}}};
  old.replacement={changedIds:['1'],unresolvedIds:[],notice:'x'.repeat(1000),extra:{deep:'discard'}};
  const restored=normalizeConversation(old);assert.equal(restored.familiar.undo.undo,undefined);assert.ok(restored.replacement.notice.length<=240);assert.equal(restored.replacement.extra,undefined);
});
