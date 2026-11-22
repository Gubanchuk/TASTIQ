import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCatalogs,makeCatalog} from '../src/core/catalog.js';
import {newMediaConversation,answerMediaConversation,applyMediaConversationProposal,mediaConversationToLegacy} from '../src/core/media-conversation.js';
import {aiPick,candidatesOf} from '../src/ai/pick.js';
import {createMediaConversationService} from '../src/server/media-conversation-service.js';
import {SCHEMA} from '../src/ai/prompt.js';
import {screenFixture} from './fixture.js';

const domain='anime', anime=loadCatalogs().anime;
const series='tt0112159', continuation='tt0169858', other='tt0094625';
const items=[series,continuation,other,'tt0409591','tt0988824'].map(id=>anime.byId.get(id));
const catalog=makeCatalog({...anime,items},domain);
const start=()=>newMediaConversation({domain});
const reply=(state,words)=>answerMediaConversation(state,{type:'answer',questionId:'direction',text:words});
const project=state=>mediaConversationToLegacy(state,catalog.dict,catalog);
const wire=picks=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({picks})}]}]});
const omitted={summary:'Хочется истории с интригой',facts:[],uncertainties:[],action:'review',question:null,
  context:{format:null,timeMode:null,commitment:null,company:null,childAge:null,onlyEnded:null},sessionTime:null};

test('explicit time for a film needs a known runtime within the budget even with English title references',()=>{
 const base=screenFixture('film'),items=[5,6,null].map((runtime,i)=>({...base.items[0],id:'budget-'+i,runtime}));
 const film=makeCatalog({...base,items},'film'),quote='На фильм есть пять минут.';
 const s=reply(newMediaConversation({domain:'film'}),'Хочу что-нибудь как «Before Midnight» или «Five Minutes of Heaven». '+quote);
 const e={quote,sourceId:s.turns[0].id};
 const out=applyMediaConversationProposal(s,{...omitted,context:{...omitted.context,timeMode:{...e,value:'session'}},sessionTime:{...e,minutes:5}},film.dict);
 assert.equal(out.error,undefined);
 const legacy=mediaConversationToLegacy(out.state,film.dict,film);
 assert.deepEqual(candidatesOf(film,legacy).ranked.map(row=>row.game.id),['budget-0']);
});

test('a mixed catalog respects a direct series request through a planner omission, restart-free correction and edits',async()=>{
 const service=createMediaConversationService({domain,catalogs:{anime:catalog},plan:async()=>({proposal:omitted}),pick:async(all)=>({picks:all.anime.items.map(item=>({id:item.id}))})});
 let out=await service({domain,state:start(),action:{type:'answer',questionId:'direction',text:'Хочу завершённый серьёзный аниме-сериал с единым сюжетом, без филлеров.'}});
 assert.equal(out.state.context.format,'episodic');
 out=await service({domain,state:out.state,action:{type:'confirm'}});
 assert.ok(out.state.result.top);assert.ok([out.state.result.top,...out.state.result.alternatives].every(card=>catalog.byId.get(card.id).kind==='series'));
 out=await service({domain,state:out.state,action:{type:'correct',text:'Теперь хочу фильм.'}});
 assert.equal(out.state.context.format,'movie');
 out=await service({domain,state:out.state,action:{type:'correct',text:'Формат не важен.'}});
 assert.equal(out.state.context.format,null);
 out=await service({domain,state:out.state,action:{type:'back'}});
 assert.equal(out.state.context.format,'movie');
 assert.equal((await service({domain,state:out.state})).state.context.format,'movie');
 for(const text of ['Раньше хотел сериал. Теперь хочется философии.','Хочу фильм или сериал','Хочу как в сериале «Наруто», без филлеров','Если успею, хочу сериал','Хочу сериал, но фильм тоже подойдёт']){
  const result=applyMediaConversationProposal(reply(start(),text),omitted,catalog.dict);
  assert.equal(result.state.context.format,null,text);
 }
});

test('catalogue-confirmed sequels need a matching predecessor or an explicit return, including in local mode',async()=>{
 const state=reply(start(),'Хочу аниме с героями, к которым привяжусь');
 const candidates=s=>new Set(candidatesOf(catalog,project(s)).ranked.map(row=>row.game.id));
 assert.ok(candidates(state).has(series));assert.ok(!candidates(state).has(continuation));
 const t=reply(start(),'Досмотрел «Евангелион».');
 const f={key:'viewed',scope:'history',stance:'history',text:'Досмотрел Евангелион',titleId:series,quote:t.turns[0].answer,sourceId:t.turns[0].id,exposure:'finished',feature:null,titleIntent:null};
 t.facts=[{...f,exposure:'started'}];assert.ok(!candidates(t).has(continuation));
 t.facts=[f];assert.ok(candidates(t).has(continuation));assert.ok(!candidates(t).has('tt0988824'));
 const requested=reply(start(),'Хочу пересмотреть «Конец Евангелиона».');
 requested.facts=[{...f,scope:'today',stance:'want',titleId:continuation,exposure:'finished',titleIntent:'replay',sourceId:requested.turns[0].id,quote:requested.turns[0].answer}];
 assert.ok(candidates(requested).has(continuation));
 assert.ok(candidates(reply(start(),'Можно продолжения.')).has(continuation));
 const withdrawn=reply(start(),'Можно продолжения.');
 withdrawn.retractions=[{key:'continuations',sourceId:withdrawn.turns[0].id,quote:'Можно продолжения.'}];
 assert.ok(!candidates(withdrawn).has(continuation));
 assert.ok(!candidates(reply(start(),'Вчера сказал «можно продолжения».')).has(continuation));
 assert.ok(!candidates(reply(start(),'Без продолжений.')).has(continuation));
 const service=createMediaConversationService({domain,catalogs:{anime:catalog},access:()=>({allowed:false})});
 const review=await service({domain,state,action:{type:'review'}});
 const local=await service({domain,state:review.state,action:{type:'confirm'}});
 assert.ok(local.state.result.top);
 assert.ok([local.state.result.top,...local.state.result.alternatives].every(c=>![continuation,'tt0988824'].includes(c.id)));
 assert.ok(local.state.result.top.feasibility.some(row=>row.key==='viewing-order'));
});

test('adaptive media checks every proposed starting point, including model-owned matches, without equating no filler with a short film',async()=>{
 const legacy=project(reply(start(),'Без филлеров. Хочу долго следить за одними и теми же героями.'));
 let sent;
 const chosen=await aiPick({anime:catalog},legacy,{api:async request=>{sent=request;return wire([
  {id:series,viewingStart:'requires_prior'},{id:'',title:catalog.byId.get(continuation).name,year:1997,viewingStart:'independent'},
  {id:'tt0409591',viewingStart:'unknown'},{id:other,viewingStart:'independent'}
 ]);}});
 assert.ok(sent.text.format.schema.properties.picks.items.required.includes('viewingStart'));
 assert.match(sent.instructions,/filler/i);assert.match(sent.instructions,/character arcs/i);
 assert.deepEqual(chosen.picks.map(p=>p.id),[other]);
});

test('media request schemas isolate the permitted predecessor IDs across overlapping selections and leave the base contract intact',async()=>{
 const legacy=project(start()),schemaBefore=JSON.stringify(SCHEMA);
 const schemaFor=async(priorIds)=>{
  let schema;
  await aiPick({anime:catalog},{...legacy,session:{...legacy.session,viewingOrder:{priorIds,returnToIds:[]}}},{api:async request=>{
   schema=request.text.format.schema;await Promise.resolve();return wire([]);
  }});
  return schema.properties.picks.items.properties.viewingStart.enum;
 };
 const [withPrior,without]=await Promise.all([schemaFor([series]),schemaFor([])]);
 assert.ok(withPrior.includes('after:'+series));assert.ok(!without.includes('after:'+series));assert.equal(JSON.stringify(SCHEMA),schemaBefore);
});

test('film confirm returns a checked empty state for sequels and unknown starting points, but rejects invalid identities',async()=>{
 const film=screenFixture('film');
 const review=answerMediaConversation(newMediaConversation({domain:'film'}),{type:'review'});
 for(const [picks,checked] of [
  [['t1','t2'].map(id=>({id,viewingStart:'requires_prior'})),'checked'],
  [[{id:'t1',viewingStart:'unknown'}],'checked'],
  [[{id:'',title:'The Kid',year:1921,viewingStart:'independent'}],'title-lookup'],
  [[{id:'missing',title:'Short One',year:2010,viewingStart:'requires_prior'}],false],
  [[{id:17,title:'Short One',year:2010,viewingStart:'independent'}],false],
 ]){
  const service=createMediaConversationService({domain:'film',catalogs:{film},api:async()=>wire(picks)});
  const out=await service({domain:'film',state:review,action:{type:'confirm'}});
  assert.equal(out.state.phase,'review');assert.equal(out.state.result,null);
  if(checked){
   assert.equal(out.error,undefined);assert.equal(out.screen.noMatch?.kind,checked);
   assert.equal((await service({domain:'film',state:out.state})).screen.noMatch?.kind,checked);
  }else{
   assert.equal(out.screen.noMatch,undefined);assert.match(out.error,/каталога/);
  }
 }
});

test('released planner wording describes a finished drama series and sustained attachment to characters',()=>{
 const cases=[
  ['series','Ищу завершённый драматический сериал с общей историей.','onlyEnded',true,'Ищу завершённый драматический сериал'],
  ['anime','Хочу аниме-сериал про дружбу и власть, с героями, за которых переживаешь несколько сезонов. Как в «Наруто».','commitment','long','с героями, за которых переживаешь несколько сезонов'],
 ];
 for(const [domain,words,key,value,quote] of cases){
  const state=reply(newMediaConversation({domain}),words);
  const context={...omitted.context,[key]:{value,sourceId:state.turns[0].id,quote}};
  const out=applyMediaConversationProposal(state,{...omitted,context,action:'question',
   question:{id:'tone',title:'Какой настрой тебе ближе?',why:'Выберем тон истории.',options:[],controls:['unknown','indifferent','none'],multiple:false}},catalog.dict);
  assert.equal(out.error,undefined,words);assert.equal(out.state.context[key],value);assert.equal(out.state.contextEvidence[key].quote,quote);
 }
 for(const [key,value,words,quote] of [
  ['onlyEnded',true,'Раньше смотрел завершённый драматический сериал. Сегодня хочется комедии.','завершённый драматический сериал'],
  ['onlyEnded',true,'Не ищу завершённый драматический сериал','завершённый драматический сериал'],
  ['onlyEnded',true,'Ищу завершённую историю из драматического сериала','завершённую историю из драматического сериала'],
  ['commitment','long','Раньше смотрел сериал с героями, за которых переживаешь несколько сезонов.','с героями, за которых переживаешь несколько сезонов'],
  ['commitment','long','Не хочу сериал с героями, за которых переживаешь несколько сезонов.','с героями, за которых переживаешь несколько сезонов'],
  ['commitment','long','Хочу сериал про героев, которые снимали кино несколько сезонов.','про героев, которые снимали кино несколько сезонов'],
 ]){
  const state=reply(start(),words),context={...omitted.context,[key]:{value,sourceId:state.turns[0].id,quote}};
  const out=applyMediaConversationProposal(state,{...omitted,context},catalog.dict);
  assert.ok(out.error||out.state.context[key]===null,words);
 }
});
