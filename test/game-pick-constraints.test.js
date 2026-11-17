import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureCatalog,game} from './fixture.js';
import {initialConversation} from '../src/server/public/shared/conversation-entry.js';
import {conversationToLegacy} from '../src/core/conversation.js';
import {createConversationService} from '../src/server/conversation-service.js';
import {aiPick,checkPicks} from '../src/ai/pick.js';
import {criteriaOf,validateConstraintChecks} from '../src/ai/pick-constraints.js';

const catalog=fixtureCatalog(),catalogs={game:catalog};
const wire=picks=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({picks})}]}]});
const checks=(criteria,status)=>criteria.map(({key})=>({key,status,reason:'Деталь нельзя проверить по каталогу'}));
const fact=(key,quote,stance='exclude')=>({key,quote,text:quote,sourceId:'today',scope:'today',stance,feature:null,gameId:null,exposure:null});
function review(...facts){
 const s=initialConversation({domain:'game',id:'constraints-test'});
 Object.assign(s,{phase:'review',question:null,context:{platform:'windows',company:'solo',partySize:null},summary:'Сегодняшний запрос',facts,
   turns:[{id:'today',kind:'answer',answer:facts.map(f=>f.quote).join('. '),question:{id:'wish',title:'Что хочется сегодня?'}}]});
 return s;
}
const projection=s=>conversationToLegacy(s,catalog.dict,catalog);

test('game picker checks active semantic constraints and does not fill a short reviewed list',async()=>{
 const state=projection(review(fact('pvp','Без обязательного PvP'),fact('pace','Обязательно без таймера','require'),{...fact('history','Раньше без крафта'),scope:'history'}));
 const criteria=criteriaOf(state);
 assert.deepEqual(criteria.map(c=>c.text),['Без обязательного PvP','Обязательно без таймера']);
 const result=await aiPick(catalogs,state,{api:async request=>{
  assert.match(request.input,/Без обязательного PvP/);
  assert.match(request.input,/Сокращай выдачу, если подходящих вариантов меньше/);
  assert.deepEqual(request.text.format.schema.properties.picks.items.properties.constraintChecks.items.properties.key.enum,criteria.map(c=>c.key));
  return wire([{id:'4',constraintChecks:checks(criteria,'unknown')},{id:'6',constraintChecks:checks(criteria,'conflict')},{id:'3'}]);
 }});
 assert.deepEqual(result.picks.map(p=>p.id),['4']);
 assert.deepEqual(result.filled,[]);
 assert.deepEqual(result.picks[0].unknownCriteria.map(x=>x.text),criteria.map(c=>c.text));
});

test('More takes four different checked works from one response, and explains a partial batch',async()=>{
 const pool=fixtureCatalog([
  game(31,'North',{}, {work:'north'}),game(32,'North remake',{}, {work:'north'}),
  ...[34,35,36,37,38,39].map(id=>game(id,`Candidate ${id}`,{})),
 ]);
 const state=review(fact('pvp','Без обязательного PvP'));
 Object.assign(state,{phase:'result',result:{top:{id:'1',name:'The Witcher 3'},alternatives:[]}});
 const criteria=criteriaOf(conversationToLegacy(state,pool.dict,pool));
 let requests=0;
 const service=createConversationService({catalogs:{game:pool},api:async request=>{
  requests++;
  assert.equal(request.text.format.schema.properties.picks.maxItems,6);
  assert.match(request.input,/Целевое число вариантов — 4/);
  assert.match(request.input,/Уже показано для выбора/);
  const proposed=requests===1?['31','32','34','35','36','37']:['38','39'];
  return wire(proposed.map(id=>({id,constraintChecks:checks(criteria,id==='34'?'conflict':'compatible')})));
 }});
 const first=await service({state,action:{type:'more'}});
 assert.ok(!first.error,first.error);
 assert.deepEqual([first.state.result.top,...first.state.result.alternatives].map(card=>card.id),['31','35','36','37']);
 assert.equal(requests,1);
 assert.match(first.state.replacement.notice,/Ещё 4 варианта/);
 const second=await service({state:first.state,action:{type:'more'}});
 assert.ok(!second.error,second.error);
 assert.deepEqual([second.state.result.top,...second.state.result.alternatives].map(card=>card.id),['38','39']);
 assert.equal(requests,2);
 assert.match(second.state.replacement.notice,/ещё 2 подходящих варианта/);
 assert.deepEqual(second.state.familiar.hidden,[]);
});

test('adaptive lookup can complete a batch from catalog titles outside the shortlist',()=>{
 const works=[game(41,'A',{}, {work:'a'}),game(42,'B',{}),game(43,'C',{}),game(44,'D',{}),game(45,'E',{})];
 const ranked=works.map(game=>({game}));
 const state=projection(review(fact('pvp','Без обязательного PvP'))),criteria=criteriaOf(state);
 const out={picks:['Previously shown','A','B','C','D','E'].map(title=>({id:'',title,year:0,
  constraintChecks:checks(criteria,title==='B'?'conflict':'compatible')}))};
 const checked=checkPicks(out,[],4,ranked,criteria,{byId:new Map(works.map(work=>[work.id,work])),distinctWorks:true,ownLimit:6});
 assert.deepEqual(checked.picks.map(pick=>pick.id),['41','43','44','45']);
 assert.equal(checked.constraintDrops.conflict,1);
});

test('dated, retracted, softer and unconfirmed game facts do not become hard checks',()=>{
 const state=projection(review(fact('active','Без обязательного PvP'),fact('retracted','Без гринда'),fact('old','Без таймера'),fact('soft','Хорошо бы историю','want'),fact('made-up','Этого не говорили')));
 state.conversation.facts[4].quote='чужой текст';
 state.conversation.turns.push({id:'old-turn',kind:'answer',answer:'Без таймера',superseded:true});
 state.conversation.facts[2].sourceId='old-turn';
 state.conversation.retractions.push({key:'retracted',sourceId:'today',quote:'Без гринда'});
 assert.deepEqual(criteriaOf(state).map(c=>c.text),['Без обязательного PvP']);
});

test('a requirement for confirmed absence cannot be satisfied by unknown or model confidence alone',async()=>{
 const state=projection(review(fact('ads','Только игры с подтверждённым отсутствием рекламы')));
 const criteria=criteriaOf(state);
 assert.equal(validateConstraintChecks({constraintChecks:checks(criteria,'unknown')},criteria).ok,false);
 const result=await aiPick(catalogs,state,{api:async()=>wire([{id:'4',constraintChecks:checks(criteria,'compatible')}])});
 assert.equal(result.retryable,false);
 assert.deepEqual(result.picks,[]);
});

test('a game session limit is not running time and receives an honest caveat when unknown',async()=>{
 const state=review();
 state.turns[0].answer='Сегодня у меня есть 30 минут';
 state.sessionTime={minutes:30,sourceId:'today',quote:state.turns[0].answer};
 const legacy=projection(state),criterion=criteriaOf(legacy,{runtime:20})[0];
 assert.match(criterion.text,/игровой сеанс/i);
 const service=createConversationService({catalogs,api:async()=>wire([{id:'4',constraintChecks:checks([criterion],'unknown')}])});
 const out=await service({state,action:{type:'confirm'}});
 assert.equal(out.state.result.top.id,'4');
 assert.equal(out.state.result.alternatives.length,0);
 assert.ok(out.state.result.top.feasibility.some(f=>f.status==='unknown'&&f.text.includes('30 мин')));
});

test('verified player capacity can settle uncertainty, but a co-op tag cannot prove the number',async()=>{
 const partyCatalog=fixtureCatalog([game(962130,'Grounded',{}, {facts:['social.coop']}),game(1426210,'It Takes Two',{}, {facts:['social.coop']})]);
 const state=review();
 state.context={platform:'windows',company:'group',partySize:'4'};
 state.turns.push({id:'party',kind:'answer',answer:'Четверо',question:{id:'party',title:'Сколько вас будет?'}});
 const legacy=conversationToLegacy(state,partyCatalog.dict,partyCatalog),criteria=criteriaOf(legacy);
 assert.match(criteria[0]?.key??'',/^context:players:/);
 const result=await aiPick({game:partyCatalog},legacy,{api:async()=>wire([
  {id:'1426210',title:'It Takes Two',year:2020,constraintChecks:checks(criteria,'compatible')},
  {id:'4',constraintChecks:checks(criteria,'compatible')},
  {id:'962130',constraintChecks:checks(criteria,'unknown')},
 ])});
 assert.deepEqual(result.picks.map(p=>p.id),['4','962130']);
 assert.deepEqual(result.picks[0].unknownCriteria.map(c=>c.text),['Можно играть всей компанией (4)']);
 assert.deepEqual(result.picks[1].unknownCriteria,[]);
});

test('recorded solo unknowns are settled by a strong Steam Singleplayer tag or a catalog fact',async()=>{
 const tagged=(id,name,r,votes)=>({...game(id,name,{}),features:{'social.solo':{r,c:0.6,src:['tag'],ev:[{id:'tag:Singleplayer',kind:'tag',q:'Singleplayer',votes}]}}});
 const soloCatalog=fixtureCatalog([tagged(715560,'Eastshade',0.95,105),tagged(757310,'Sable',1,481),game(753640,'Outer Wilds',{}, {facts:['social.solo']}),tagged(3900,'Weak tag',0.5,4)]);
 const state=review({...fact('company','Один','require'),text:'Будешь играть один.',sourceId:'company',feature:'social.solo'});
 state.turns.push({id:'company',kind:'answer',selected:[{id:'solo',label:'Один'}],answer:'Один',question:{id:'company',title:'Будешь играть один или вместе с кем-то?'}});
 const legacy=conversationToLegacy(state,soloCatalog.dict,soloCatalog),criteria=criteriaOf(legacy);
 let prompt;
 const out=await aiPick({game:soloCatalog},legacy,{api:async request=>{
  prompt=request.input;
  return wire(['715560','753640','757310','3900'].map(id=>({id,constraintChecks:checks(criteria,'unknown')})));
 }});
 assert.deepEqual(out.picks.map(p=>[p.id,p.unknownCriteria.length]),[['715560',0],['753640',0],['757310',0],['3900',1]]);
 assert.match(prompt.split('\n').find(line=>line.startsWith('id=715560 |'))??'',/Steam: Singleplayer/);
 const strict=structuredClone(legacy),quote='Только игры с подтверждённым одиночным режимом';
 strict.conversation.facts[0].quote=quote;strict.conversation.turns.at(-1).answer=quote;
 const strictCriteria=criteriaOf(strict);
 const checked=await aiPick({game:soloCatalog},strict,{api:async()=>wire(['715560','753640'].map(id=>({id,constraintChecks:checks(strictCriteria,'compatible')})))});
 assert.deepEqual(checked.picks.map(p=>p.id),['753640']);
 const conflict=await aiPick({game:soloCatalog},legacy,{api:async()=>wire([{id:'715560',constraintChecks:checks(criteria,'conflict')}])});
 assert.equal(conflict.constraintDrops.conflict,1);
});

test('a sole game with semantic constraints must pass the picker for both more and replacement',async()=>{
 let calls=0;
 const state=review(fact('pvp','Без обязательного PvP'));
 Object.assign(state,{phase:'result',result:{top:{id:'1',name:'The Witcher 3'},alternatives:[]}});
 state.familiar.marked=['1'];
 const rememberedExclusions=catalog.items.filter(g=>!['1','2','4'].includes(g.id)).map(g=>g.id);
 const criteria=criteriaOf(projection(state));
 const service=createConversationService({catalogs,api:async request=>{
  calls++;
  assert.match(request.input,/Уже показано для выбора/);
  assert.doesNotMatch(request.input,/Уже показано и не устроило/);
  return wire([{id:'4',constraintChecks:checks(criteria,'unknown')}]);
 }});
 for(const action of [{type:'more'},{type:'replace_familiar',id:'1'}]){
  const out=await service({state,action,rememberedExclusions});
  assert.equal(out.error,undefined);
  assert.equal(out.state.result.top.id,'4');
  assert.match(out.state.result.top.feasibility.find(x=>x.key==='request-conditions')?.text??'',/Без обязательного PvP/);
 }
 assert.equal(calls,2);
});

test('AI-off fallback cannot show games when the request requires a separately verified condition',async()=>{
 const service=createConversationService({catalogs,access:()=>({allowed:false})});
 const state=review(fact('ads','Только игры с подтверждённым отсутствием рекламы'));
 const out=await service({state,action:{type:'confirm'}});
 assert.equal(out.state.result,null);
 assert.equal(out.state.phase,'review');
 assert.equal(out.retryable,false);
});
