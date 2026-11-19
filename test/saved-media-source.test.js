import test from 'node:test';
import assert from 'node:assert/strict';
import {createMediaConversationService} from '../src/server/media-conversation-service.js';
import {screenFixture,title} from './fixture.js';
import {makeCatalog} from '../src/core/catalog.js';
import {newMediaConversation,mediaConversationToLegacy,applyMediaConversationProposal} from '../src/core/media-conversation.js';
import {aiPick,candidatesOf} from '../src/ai/pick.js';

const domain='film',base=screenFixture(domain);
const added=(id,minutes,work=id)=>({...title(id,id,domain,{}),domain,kind:'film',runtime:minutes,work});
const catalog=makeCatalog({...base,items:[added('a',90),added('b',80),added('c',110),added('d',null),
  added('e',45),added('f',55),added('g',70),added('h',60),added('same',85,'a')]},domain);
const source=ids=>({version:1,domain,ids});
const service=opts=>createMediaConversationService({domain,catalogs:{film:catalog},...opts});
const send=(srv,state,action)=>srv({domain,state,action});
const ids=out=>[out.state.result?.top,...(out.state.result?.alternatives??[])].filter(Boolean).map(c=>c.id);
const confirm=async(srv,out)=>send(srv,(await send(srv,out.state,{type:'review'})).state,{type:'confirm'});

test('saved snapshots canonicalize on start and reject scope drift on restore, restart and undo',async()=>{
 const srv=service({access:()=>({allowed:false})}),pristine=newMediaConversation({domain});
 pristine.savedSource=source(['b','a','gone','b']);
 const start=await srv({domain,state:pristine});
 assert.equal(start.state.id,pristine.id); assert.deepEqual(start.state.savedSource,source(['b','a']));
 const out=await confirm(srv,start); assert.deepEqual(new Set(ids(out)),new Set(['b','a']));
 const restart=await send(srv,out.state,{type:'restart'}); assert.deepEqual(restart.state.savedSource,start.state.savedSource);
 assert.deepEqual((await srv({domain,state:out.state})).state.result,out.state.result);
 for(const broken of [{...out.state,savedSource:undefined},{...out.state,savedSource:source(['a','e'])},
   {...out.state,result:{...out.state.result,top:{...out.state.result.top,id:'e'}}}]) {
   await assert.rejects(()=>srv({domain,state:broken}),e=>e.status===400);
 }
 await assert.rejects(()=>srv({domain,savedSource:{...source(['a']),domain:'series'}}),e=>e.status===400);
 const empty=await srv({domain,savedSource:source(['gone'])});assert.deepEqual(empty.state.savedSource.ids,[]);
 const none=await confirm(srv,empty);assert.match(none.error,/сохранён/i);assert.deepEqual(ids(none),[]);
});

test('a free-text strict cap on a saved list works offline, survives restore and excludes unknown runtime',async()=>{
 const srv=service({access:()=>({allowed:false}),spend:()=>assert.fail()});
 const start=await srv({domain,savedSource:source(['a','c','d'])});
 const out=await send(srv,start.state,{type:'answer',questionId:start.screen.question.id,selected:[],text:'Хочу лёгкий фильм до полутора часов',kind:'answer'});
 const result=await confirm(srv,out);
 assert.equal(result.state.sessionTime.minutes,90);assert.deepEqual(ids(result),['a']);
 assert.deepEqual(ids(await srv({domain,state:result.state})),['a']);
 const more=await send(srv,result.state,{type:'more'});assert.match(more.error,/сохранён/i);assert.deepEqual(ids(more),['a']);
});

test('saved picks, replacement, more, exhaustion and undo all respect the same works',async()=>{
 let calls=0;
 const srv=service({pick:async(all,state)=>{
   calls++; assert.deepEqual(new Set(all.film.items.map(i=>i.id)),new Set(['a','b','e','f','g','same']));
   const eligible=candidatesOf(all.film,state).ranked;
   return {picks:[{id:'h'},...eligible.slice(0,2).map(r=>({id:r.game.id}))]};
 }});
 const start=await srv({domain,savedSource:source(['a','b','e','f','g','same'])});
 const first=await confirm(srv,start);assert.equal(ids(first).length,2);assert.ok(!ids(first).includes('h'));
 const marked=await send(srv,first.state,{type:'familiar_mark',id:ids(first)[0]});
 const rep=await send(srv,marked.state,{type:'replace_familiar',id:ids(first)[0]});
 assert.equal(ids(rep)[1],ids(first)[1]);assert.ok(!ids(first).includes(ids(rep)[0]));
 const undo=await send(srv,rep.state,{type:'undo_replacement'});assert.deepEqual(ids(undo),ids(first));
 let out=first;const seen=new Set(ids(out).map(id=>catalog.byId.get(id).work));
 for(let i=0;i<3;i++){out=await send(srv,out.state,{type:'more'});if(out.error)break;for(const id of ids(out)){const w=catalog.byId.get(id).work;assert.ok(!seen.has(w));seen.add(w);}}
 assert.match(out.error,/сохранён/i);assert.equal(seen.size,5);assert.ok(calls>=2);
});

test('direct model selection only resolves titles inside the saved source',async()=>{
 const s=newMediaConversation({domain,savedSource:source(['a','b'])}),legacy=mediaConversationToLegacy(s,catalog.dict);
 const attempt=await aiPick({film:catalog},legacy,{api:async req=>{
   assert.equal(req.text.format.schema.properties.picks.maxItems,2);
   assert.doesNotMatch(req.input,/id=h \|/);assert.match(req.input,/сохранён/);
   const pick=(title,id='')=>({id,title,year:2010,reason:'Подходит',caveat:'',likelySeen:false});
   return {status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({understood:'',picks:[pick('h'),pick('a')]})}]}]};
 }});
 assert.deepEqual(attempt.picks.map(p=>p.id),['a']);
});

test('same conversation ID with two starting snapshots cannot share cached picks',async()=>{
 let calls=0;const srv=service({pick:async(all)=>{calls++;return {picks:all.film.items.map(r=>({id:r.id}))};}});
 const base=newMediaConversation({domain,id:'same-local-id'});
 async function reviewed(ids){const start=await srv({domain,state:{...base,savedSource:source(ids)}});return (await send(srv,start.state,{type:'review'})).state;}
 const left=await reviewed(['a','b']),right=await reviewed(['e','f']);
 assert.deepEqual(new Set(ids(await send(srv,left,{type:'confirm'}))),new Set(['a','b']));
 assert.deepEqual(new Set(ids(await send(srv,right,{type:'confirm'}))),new Set(['e','f']));
 await send(srv,left,{type:'confirm'});assert.equal(calls,2);
});

test('a model refusal with two candidates keeps the saved scope for the retry',async()=>{
 let calls=0;const srv=service({api:async req=>{
   calls++;assert.equal(req.text.format.schema.properties.picks.maxItems,2);
   const content=calls===1?[{type:'refusal',refusal:'stub'}]:[{type:'output_text',text:JSON.stringify({understood:'',picks:[
    {id:'h',title:'h',reason:'',caveat:''},{id:'b',title:'b',reason:'Да',caveat:''}]})}];
   return {status:'completed',output:[{type:'message',content}]};
 }});
 let out=await confirm(srv,await srv({domain,savedSource:source(['a','b'])}));
 assert.match(out.error,/отказалась/);assert.deepEqual(out.state.savedSource.ids,['a','b']);assert.deepEqual(ids(out),[]);
 out=await send(srv,out.state,{type:'retry'});assert.deepEqual(ids(out),['b']);
});

test('a scoped offline time correction and explicit removal change the eligible set',async()=>{
 const srv=service({access:()=>({allowed:false})});
 let out=await srv({domain,savedSource:source(['a','c','d'])});
 out=await send(srv,out.state,{type:'answer',questionId:out.screen.question.id,text:'До полутора часов',kind:'answer'});
 assert.equal(out.state.sessionTime.minutes,90);
 out=await send(srv,out.state,{type:'correct',text:'до двух часов'});
 assert.equal(out.state.sessionTime.minutes,120);
 out=await confirm(srv,out);assert.deepEqual(new Set(ids(out)),new Set(['a','c']));
 out=await send(srv,out.state,{type:'correct',text:'Убери ограничение по времени'});
 assert.equal(out.state.sessionTime,null);out=await confirm(srv,out);assert.deepEqual(new Set(ids(out)),new Set(['a','c','d']));
});

function savedScreen(domain,options={}){
 const rows=[
  ['film-short','film',25,null],['film-long','film',150,null],['film-unknown','film',null,null],
  ['episode-short','series',25,'Ended'],['episode-second','series',30,'Ended'],['episode-long','series',150,'Returning Series'],
  ['episode-unknown','series',null,null],['unknown-status','series',25,null],
 ].filter(([,kind])=>!['film','series'].includes(domain)||kind===domain);
 const items=rows.map(([id,kind,runtime,status])=>({...title(id,id,kind,{'content.family':1},{runtime,status}),domain,
  ...(domain==='anime'&&id==='episode-short'?{firstEpisodeMinutes:runtime}:{})}));
 const catalog=makeCatalog({...screenFixture(domain),items},domain);
 const srv=createMediaConversationService({domain,catalogs:{[domain]:catalog},access:()=>({allowed:false}),...options});
 return {catalog,call:(state,action)=>srv({domain,state,action,...(!state?{savedSource:{version:1,domain,ids:items.map(i=>i.id)}}:{})})};
}
const answer=async(call,out,text)=>call(out.state,{type:'answer',questionId:out.screen.question.id,text});
const result=async(call,out)=>call((await call(out.state,{type:'review'})).state,{type:'confirm'});

test('saved strict duration is sourced and checked across mixed formats, the episode and the evening',async()=>{
 for(const [section,text,mode,minutes] of [
  ['film','Лёгкое приключение с юмором до двух часов','runtime',120],
  ['film','Хочу фильм про любовь, до двух часов','runtime',120],
  ['film','Фильм до 90 минут и без насилия','runtime',90],
  ['film','Хочу фильм не дольше 90 минут','runtime',90],
  ['series','Хочу эпизод до 30 минут','episode',30],
  ['cartoon','Хочу эпизод до 30 минут','episode',30],
  ['anime','Полнометражное аниме до полутора часов','runtime',90],
  ['cartoon','Хочу мультфильм до полутора часов','runtime',90],
  ['cartoon','На весь вечер до двух часов','session',120],
  ['series','На весь вечер у меня есть до двух часов','session',120],
 ]){
  const {call,catalog}=savedScreen(section);const out=await result(call,await answer(call,await call(),text));
  assert.equal(out.state.sessionTime?.minutes,minutes,text);assert.equal(out.state.context.timeMode,mode,text);
  assert.ok(ids(out).length,text);for(const id of ids(out)){const row=catalog.byId.get(id);
   assert.ok(row.runtime>0&&row.runtime<=minutes,text);if(mode!=='session')assert.equal(row.kind,mode==='episode'?'series':'film',text);}
  assert.deepEqual(ids(await call(out.state)),ids(out),text);
 }
 for(const text of ['Вчера смотрел эпизод до 30 минут','Не хочу эпизод до 30 минут','В книге герой говорит «Хочу эпизод до 30 минут»',
  'Если останется время, эпизод до 30 минут','Могу смотреть до двух часов ночи','Не обязательно до двух часов','Фильм про гонку до двух часов']){
  const {call}=savedScreen('cartoon');const out=await answer(call,await call(),text);assert.equal(out.state.sessionTime,null,text);
 }
});

test('saved episode request distinguishes verified first-episode and whole-series evidence',async()=>{
 for(const [section,text,expected] of [
  ['anime','Первая серия до 30 минут',['episode-short']],
  ['series','Первая серия до 30 минут',[]],
  ['anime','Каждый эпизод до 30 минут',[]],
  ['series','Каждый эпизод до 30 минут',[]],
 ]){
  const {call}=savedScreen(section);const out=await result(call,await answer(call,await call(),text));
  assert.equal(out.state.context.timeMode,'episode');assert.deepEqual(ids(out),expected,text);
 }
});

test('saved completed status excludes unknown and returning series for model, restore, fallback and text',async()=>{
 let attempts=0;
 const {call}=savedScreen('series',{access:()=>({allowed:true}),api:async req=>{
  attempts++;if(attempts===1)return {status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'stub'}]}]};
  const keys=req.text.format.schema.properties.picks.items.properties.constraintChecks.items.properties.key.enum;
  const pick=(id,title=id)=>({id,title,year:2010,reason:'Подходит',caveat:'',constraintChecks:keys.map(key=>({key,status:'compatible',reason:'Да'}))});
  const picks=[pick('unknown-status'),pick('','episode-long'),pick('episode-short')];
  return {status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({understood:'',picks})}]}]};
 }});
 const start=await call();const edit=await call(start.state,{type:'set_context',context:{onlyEnded:true}});
 let out=await result(call,edit);assert.match(out.error,/отказалась/);out=await call(out.state,{type:'retry'});
 assert.deepEqual(ids(out),['episode-short']);
 const corrupted=structuredClone(out.state);corrupted.result.top.id='unknown-status';
 await assert.rejects(()=>call(corrupted),e=>e.status===400);
 const offline=savedScreen('series').call;
 out=await result(offline,await answer(offline,await offline(),'Только законченный сериал'));
 assert.deepEqual(new Set(ids(out)),new Set(['episode-short','episode-second']));
});

test('saved films with family tags cannot satisfy a checked age without certificates',async()=>{
 for(const text of [null,'Фильм для ребёнка 6 лет, только с подтверждённым возрастным рейтингом','Только с проверенным возрастным рейтингом']){
  const {call}=savedScreen('film');let out=await call();
  out=text?await answer(call,out,text):await call(out.state,{type:'set_context',context:{company:'children',childAge:6}});
  const online=savedScreen('film',{access:()=>({allowed:true}),pick:()=>assert.fail('cannot delegate a verified fact to a model')}).call;
  for(const driver of [online,call]){const chosen=await result(driver,out);assert.deepEqual(ids(chosen),[],text);assert.match(chosen.error,/подтвержд/);}
 }
});

test('saved scope retains independently sourced constraints when the planner omits them; an explicit correction can remove them',async()=>{
 const {call,catalog}=savedScreen('series');
 let out=await answer(call,await call(),'Только законченный сериал. Хочу один эпизод до 30 минут.');
 assert.equal(out.state.context.company,null);
 const blank=Object.fromEntries(['company','childAge','timeMode','commitment','onlyEnded','format'].map(k=>[k,null]));
 const proposal={summary:'Подбор',facts:[],uncertainties:[],context:blank,sessionTime:null,action:'question',question:{
  id:'experience',title:'Какая история нужна сегодня?',why:'Уточним настроение.',options:[],multiple:false,controls:['unknown','indifferent','none']}};
 const planned=applyMediaConversationProposal(out.state,proposal,catalog.dict);
 assert.equal(planned.error,undefined);
 assert.equal(planned.state.context.onlyEnded,true);assert.equal(planned.state.context.timeMode,'episode');
 assert.equal(planned.state.sessionTime.minutes,30);
 out=await result(call,{state:planned.state});assert.deepEqual(new Set(ids(out)),new Set(['episode-short','episode-second']));
 out=await call(out.state,{type:'set_context',context:{onlyEnded:null,minutes:null,timeMode:null}});
 const updated=await result(call,out);assert.ok(ids(updated).some(id=>!ids(out).includes(id)));
});

test('saved child and completion checks ignore history, quotation and explicit removal',async()=>{
 const films=savedScreen('film').call;
 for(const text of ['Вчера смотрел фильм для ребёнка 6 лет. Сегодня хочу комедию.',
  'Герой говорит «Мне нужен проверенный возрастной рейтинг».','Можно и без проверенного возрастного рейтинга']){
  let out=await answer(films,await films(),text);assert.equal(out.state.context.childAge,null);out=await result(films,out);assert.ok(ids(out).length,text);
 }
 let out=await answer(films,await films(),'Для ребёнка 6 лет');assert.equal(out.state.context.childAge,6);
 out=await films(out.state,{type:'correct',text:'Теперь только для взрослых'});
 assert.equal(out.state.context.childAge,null);assert.ok(ids(await result(films,out)).length);
 const series=savedScreen('series').call;
 for(const text of ['Вчера смотрел только законченный сериал','Хочу сериал про законченный сериал','Не обязательно законченный сериал']){
  out=await answer(series,await series(),text);assert.notEqual(out.state.context.onlyEnded,true,text);
 }
});
