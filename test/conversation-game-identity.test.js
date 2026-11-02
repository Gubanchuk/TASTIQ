import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCatalog} from '../src/core/catalog.js';
import {computeIdf} from '../src/core/idf.js';
import {game} from './fixture.js';
import {newConversation,answerConversation} from '../src/core/conversation.js';
import {createConversationService} from '../src/server/conversation-service.js';
import {rankAll} from '../src/core/recommend.js';
import {profileOf,sessionOf} from '../src/core/dialogue.js';

const items=[
 game(1,'The Elder Scrolls V: Skyrim',{}, {work:'skyrim'}),
 game(2,'The Elder Scrolls V: Skyrim Special Edition',{}, {work:'skyrim'}),
 game(3,'The Elder Scrolls V: Skyrim VR',{}, {work:'skyrim-vr'}),
 game(4,'Red Dead Redemption 2',{}),game(5,'Red Dead Redemption',{}),
 game(6,"Baldur's Gate 3",{}),game(7,'The Witcher 3: Wild Hunt',{}),
 game(8,'Portal',{}),game(9,'Portal 2',{}),game(10,'CONTROL Ultimate Edition',{}),
 game(11,'Unrelated A',{}),game(12,'Unrelated B',{}),
];
items[0].aliases=['Скайрим'];items[1].aliases=['Skyrim Special Edition'];items[3].aliases=['RDR2'];
items[10].aliases=['Shared Saga'];items[11].aliases=['Shared Saga'];
const catalog=makeCatalog({items,...computeIdf(items),stats:{}},'game');
function pending(text) {
 let s=newConversation({id:'identity',mode:'free'});
 for(const selected of [['rpg'],['windows'],['solo']])s=answerConversation(s,{type:'answer',questionId:s.question.id,selected,text:s.phase==='direction'?text:'',kind:'answer'});
 return s;
}
const fact=(s,text,gameId=null,quote=text)=>({key:'history',text,stance:'history',scope:'history',sourceId:s.turns[0].id,quote,feature:null,gameId,exposure:'finished'});
async function run(text,facts=[]) {
 let known;
 const s=pending(text),service=createConversationService({catalogs:{game:catalog},plan:async(_,state,options)=>{known=options.knownGames;return {proposal:{action:'review',summary:'Сегодняшняя цель',uncertainties:[],question:null,facts:typeof facts==='function'?facts(s):facts}};}});
 return {out:await service({state:s,action:{type:'retry'}}),known,state:s};
}

test('planner receives verified short names and actual catalog aliases without inferring exposure',async()=>{
 for(const [text,id] of [['Skyrim','1'],['Скайрим','1'],['RDR2','4'],['BG3','6'],['Ведьмак3','7'],['Ведьмака 3','7']]) {
  const {out,known}=await run(`${text} прошёл`);assert.equal(out.error,undefined,text);assert.deepEqual(known.map(g=>g.id),[id],text);
  assert.ok(known[0].evidence.some(e=>e.sourceId==='identity:1'&&e.quote===text));assert.equal(known[0].exposure,undefined);assert.equal(known[0].liked,undefined);
 }
});
test('longer exact title wins over earlier series part or edition-prefix matches',async()=>{
 for(const [text,id] of [['Red Dead Redemption 2','4'],['Portal 2','9'],['Skyrim Special Edition','2'],['The Elder Scrolls V: Skyrim VR','3']]) {
  const {known}=await run(`${text} прошёл`);assert.deepEqual(known.map(g=>g.id),[id],text);
 }
});
test('generic words and ambiguous aliases do not acquire an identity by substring or popularity',async()=>{
 for(const text of ['Мне нужен control над героем и portal в другой мир','Shared Saga прошёл'])assert.deepEqual((await run(text)).known,[],text);
 assert.deepEqual((await run('Играл в «Portal»')).known.map(g=>g.id),['8']);
 assert.deepEqual((await run('Control прошёл')).known.map(g=>g.id),['10']);
});
test('a null identity may be repaired from a unique proposed title supported by its source, preserving exposure only',async()=>{
 const {out}=await run('Skyrim и RDR2 прошёл',s=>[fact(s,'Skyrim пройден',null,'Skyrim и RDR2 прошёл')]);
 assert.equal(out.error,undefined);assert.equal(out.state.facts[0].gameId,'1');assert.equal(out.state.facts[0].exposure,'finished');
 assert.equal(out.feedbackState,undefined);assert.equal(out.state.facts[0].stance,'history');
});
test('game identity cannot leak across source turns or survive superseded title evidence',async()=>{
 const s=pending('The Elder Scrolls V: Skyrim прошёл'),source=s.turns[0];
 const service=createConversationService({catalogs:{game:catalog},plan:async()=>({proposal:{action:'review',summary:'Цель',question:null,uncertainties:[],facts:[{...fact(s,'Skyrim пройден','1','Один'),sourceId:s.turns[2].id}]}})});
 const out=await service({state:s,action:{type:'retry'}});assert.ok(out.error);assert.equal(out.state.facts.some(f=>f.gameId==='1'),false);
 source.superseded=true;let known;
 const retired=createConversationService({catalogs:{game:catalog},plan:async(_,__,options)=>{known=options.knownGames;return {proposal:{action:'review',summary:'Цель',question:null,uncertainties:[],facts:[]}};}});
 await retired({state:s,action:{type:'retry'}});assert.deepEqual(known,[]);
});

test('a proposed unknown title cannot borrow the only resolved game from elsewhere in its source',async()=>{
 const {out}=await run('Skyrim только начал; Незнакомую Игру прошёл',s=>[fact(s,'Незнакомая Игра пройдена',null,'Незнакомую Игру прошёл')]);
 assert.equal(out.error,undefined);assert.equal(out.state.facts[0].gameId,null);
 const shared=await run('Skyrim только начал; Незнакомую Игру прошёл',s=>[fact(s,'Незнакомая Игра пройдена',null,'Skyrim только начал; Незнакомую Игру прошёл')]);
 assert.equal(shared.out.state.facts[0].gameId,null);
});

test('ambiguous title remains unresolved with a visible clarification instead of a guessed exclusion',async()=>{
 const {out}=await run('Shared Saga прошёл',s=>[fact(s,'Shared Saga пройдена',null,'Shared Saga прошёл')]);
 assert.equal(out.error,undefined);assert.equal(out.state.facts[0].gameId,null);assert.ok(out.state.uncertainties.some(text=>text.includes('Shared Saga')));
});

test('saved null-ID finished facts repair for free and exclude only the same work before final selection',async()=>{
 const s=pending('Skyrim прошёл');s.facts=[fact(s,'Skyrim пройден',null,'Skyrim прошёл')];s.phase='review';s.needsPlan=false;
 let plans=0,ids;
 const service=createConversationService({catalogs:{game:catalog},plan:async()=>{plans++;throw Error('No plan');},pick:async(_,legacy)=>{ids=rankAll(catalog,profileOf(legacy),sessionOf(legacy)).ranked.map(r=>r.game.id);return {picks:[{id:'4',reason:'Другой вариант'}]};}});
 const restored=await service({state:s});assert.equal(restored.state.facts[0].gameId,'1');assert.equal(plans,0);
 await service({state:s,action:{type:'confirm'}});assert.ok(!ids.includes('1'));assert.ok(!ids.includes('2'));assert.ok(ids.includes('3'));assert.equal(plans,0);
});

test('a generic exposure quote cannot assign one of several source titles to an already-played fact',async()=>{
 const {out}=await run('Skyrim только начал; RDR2 прошёл',s=>[fact(s,'Skyrim пройден','1','прошёл')]);
 assert.ok(out.error);assert.equal(out.state.facts.some(f=>f.gameId==='1'),false);
});

test('free saved-state repair requires the original exact quote rather than an invented completion claim',async()=>{
 const s=pending('Skyrim только начал');s.facts=[fact(s,'Skyrim пройден',null,'Skyrim прошёл')];s.phase='review';s.needsPlan=false;
 const service=createConversationService({catalogs:{game:catalog}});
 const restored=await service({state:s});assert.equal(restored.state.facts[0].gameId,null);
});
