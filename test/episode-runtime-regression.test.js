import test from 'node:test';
import assert from 'node:assert/strict';
import {newMediaConversation,answerMediaConversation,applyMediaConversationProposal,normalizeMediaConversation,mediaConversationToLegacy} from '../src/core/media-conversation.js';
import {createMediaConversationService} from '../src/server/media-conversation-service.js';
import {aiPick,candidatesOf} from '../src/ai/pick.js';
import {makeCatalog} from '../src/core/catalog.js';
import {screenFixture,title} from './fixture.js';
const queries=['Комедийный сериал с сериями до 25 минут','Комедийный сериал до 25 минут на эпизод. Друзей уже смотрел'];
const base=screenFixture('series');
const catalog=makeCatalog({...base,items:[title('short','Short','series',{}, {runtime:22}),title('ted','Better Off Ted','series',{}, {runtime:30})]},'series');
const catalogs={series:catalog};
const response=value=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
function answer(query){const s=newMediaConversation({domain:'series',depth:'standard'});return answerMediaConversation(s,{type:'answer',questionId:s.question.id,text:query,selected:[],kind:'answer'});}
function proposal(s,minutes=25){const t=s.turns[0],ev={sourceId:t.id,quote:t.text.split('.')[0]};return {summary:t.text,facts:[],uncertainties:[],action:'question',question:{id:'tone',title:'Какое настроение?',why:'Уточним',options:[],multiple:false,controls:['unknown','indifferent','none']},context:{company:null,childAge:null,timeMode:{value:'episode',...ev},commitment:null,onlyEnded:null,format:null},sessionTime:{minutes,...ev}};}
for(const query of queries){
 test(`exact episode source, omission, restore, review: ${query}`,()=>{
  let s=answer(query);assert.equal(s.sessionTime?.minutes,25,'explicit cap must survive before the planner');
  let out=applyMediaConversationProposal(s,proposal(s),catalog.dict);assert.equal(out.error,undefined);s=out.state;
  const omitted=proposal(s);omitted.context.timeMode=null;omitted.sessionTime=null;
  out=applyMediaConversationProposal(s,omitted,catalog.dict);assert.equal(out.error,undefined);s=out.state;
  for(let i=0;i<2;i++)s=normalizeMediaConversation(JSON.parse(JSON.stringify(s)),'series');
  s=answerMediaConversation(s,{type:'review'});
  assert.equal(mediaConversationToLegacy(s,catalog.dict,catalog).session.maxRuntime,25);
  const removed=answerMediaConversation(s,{type:'remove_time'});assert.equal(normalizeMediaConversation(removed,'series').sessionTime,null);
  const stale=applyMediaConversationProposal(removed,proposal(removed),catalog.dict);assert.ok(stale.error,'removed source cannot be reintroduced');
 });
 test(`planner failure cannot bypass cap through review/confirm: ${query}`,async()=>{
  let calls=0,prompt;
  const service=createMediaConversationService({domain:'series',catalogs,plan:async(_,s)=>({proposal:proposal(s,22)}),pick:async(c,s,o)=>aiPick(c,s,{...o,api:async request=>{calls++;prompt=request;const keys=request.text.format.schema.properties.picks.items.properties.constraintChecks?.items.properties.key.enum??[];return response({picks:[{id:'short',reason:'Подходящая комедия',viewingStart:'independent',constraintChecks:keys.map(key=>({key,status:'compatible',reason:'QA'}))}],understood:'',comparisons:[]});}})});
  let out=await service({domain:'series'});
  out=await service({domain:'series',state:out.state,action:{type:'answer',questionId:out.screen.question.id,text:query,selected:[],kind:'answer'}});
  assert.ok(out.error);assert.equal(out.state.sessionTime?.minutes,25);
  out=await service({domain:'series',state:JSON.parse(JSON.stringify(out.state))});assert.equal(calls,0);
  out=await service({domain:'series',state:out.state,action:{type:'review'}});
  out=await service({domain:'series',state:out.state,action:{type:'confirm'}});
  assert.equal(out.error,undefined);assert.equal(out.state.result.top.id,'short');assert.equal(calls,1);
  assert.match(prompt.input,/25/);assert.doesNotMatch(prompt.input,/^id=ted[ |]/m);
 });
 for(const byName of [false,true])test(`hard cap blocks ${byName?'title/year':'ID'} bypass: ${query}`,async()=>{
  const s=answer(query),legacy=mediaConversationToLegacy(s,catalog.dict,catalog);assert.equal(legacy.session.maxRuntime,25);
  assert.ok(!candidatesOf(catalog,legacy).ranked.some(r=>r.game.id==='ted'));
  const out=await aiPick(catalogs,legacy,{api:async request=>{
   assert.doesNotMatch(request.input,/^id=ted[ |]/m);
   const keys=request.text.format.schema.properties.picks.items.properties.constraintChecks?.items.properties.key.enum??[];
   return response({picks:[{id:byName?'':'ted',title:'Better Off Ted',year:2010,reason:'Короткие эпизоды по 22 минуты',viewingStart:'independent',constraintChecks:keys.map(key=>({key,status:'compatible',reason:'QA'}))}],comparisons:[]});
  }});assert.ok(!out.picks?.some(p=>p.id==='ted'));
 });
}
for(const query of ['Если получится, комедийный сериал с сериями до 25 минут','Раньше смотрел комедийный сериал с сериями до 25 минут','Не хочу сериал с сериями до 25 минут','Комедийный сериал с сериями от 20 до 25 минут','Комедийный сериал до 25 или 30 минут на эпизод','Комедийный сериал до 25 минут на эпизод, если получится','Комедийный сериал до 25 минут на эпизод. Но теперь лимита нет','Он сказал «Комедийный сериал с сериями до 25 минут»'])test(`no hard episode cap inferred: ${query}`,()=>assert.equal(answer(query).sessionTime,null));
test('episode cap correction and editor clear do not revive old time',()=>{
 let s=answer(queries[0]);s=answerMediaConversation(s,{type:'review'});
 s=answerMediaConversation(s,{type:'set_context',context:{minutes:null,timeMode:null}});
 assert.equal(normalizeMediaConversation(s,'series').sessionTime,null);
 s=answerMediaConversation(s,{type:'correct',text:'Комедийный сериал до 20 минут на эпизод'});
 assert.equal(normalizeMediaConversation(s,'series').sessionTime?.minutes,20);
});
for(const byName of [false,true])test(`catalog runtime contradiction removed from ${byName?'title/year':'ID'} explanation`,async()=>{
 const state=mediaConversationToLegacy(newMediaConversation({domain:'series'}),catalog.dict,catalog);
 for(const minutes of [22,30]){
  const out=await aiPick(catalogs,state,{api:async()=>response({picks:[{id:byName?'':'ted',title:'Better Off Ted',year:2010,reason:`За ${minutes} минуты сериал успевает развернуть абсурдную ситуацию.`,caveat:`Эпизоды по ${minutes} минут.`,viewingStart:'independent'}],comparisons:[]})});
  assert.equal(out.picks[0].id,'ted');assert.equal(out.picks[0].reason,minutes===30?'За 30 минуты сериал успевает развернуть абсурдную ситуацию.':'');assert.equal(out.picks[0].caveat,minutes===30?'Эпизоды по 30 минут.':'');
 }
 assert.equal(catalog.byId.get('ted').runtime,30);
});
for(const query of queries)test(`old failed-planner draft restores explicit cap without reviving removed time: ${query}`,()=>{
 const old=answer(query);old.sessionTime=null;old.context.minutes=null;old.context.timeMode=null;old.contextEvidence.timeMode=null;old.failedAction='plan';
 for(const turn of old.turns){delete turn.acceptedTime;delete turn.acceptedContext;}
 let restored=normalizeMediaConversation(JSON.parse(JSON.stringify(old)),'series');
 assert.equal(restored.sessionTime?.minutes,25);
 restored=normalizeMediaConversation(JSON.parse(JSON.stringify(restored)),'series');
 assert.equal(mediaConversationToLegacy(answerMediaConversation(restored,{type:'review'}),catalog.dict,catalog).session.maxRuntime,25);
 const removed=answerMediaConversation(restored,{type:'remove_time'});removed.failedAction='plan';
 assert.equal(normalizeMediaConversation(removed,'series').sessionTime,null);
});
