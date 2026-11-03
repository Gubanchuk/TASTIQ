import {workspaceLibrarySeed} from '../../test/helpers/workspace-library-seed.mjs';
// Isolated, paid-zero visual QA. Never imports keys, receipts or user journals.
import {createServer} from 'node:http';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
// The production config loads .env at import time: explicitly suppress it in QA.
process.loadEnvFile=()=>{};
process.env.AI_ACCESS='off';
process.env.JOURNAL_PATH=join(mkdtempSync(join(tmpdir(),'tastiq-usability-qa-')),'journal.ndjson');
for(const key of ['AI_EVAL_BUDGET_DIR','AI_EVAL_BATCH_ID','AI_EVAL_BATCH_CAP','OPENAI_API_KEY','ANTHROPIC_API_KEY'])delete process.env[key];
globalThis.fetch=async()=>{throw Error('External network disabled in isolated brand QA');};
const {handler,catalogs}=await import('../../src/server/app.js');
const {newMediaConversation,answerMediaConversation,mediaConversationScreen,mediaConversationToLegacy}=await import('../../src/core/media-conversation.js');
const {newConversation,answerConversation,conversationScreen,conversationToLegacy}=await import('../../src/core/conversation.js');
const {createMediaConversationService}=await import('../../src/server/media-conversation-service.js');
const {createConversationService}=await import('../../src/server/conversation-service.js');
const {profileOf,sessionOf}=await import('../../src/core/dialogue.js');
const {rankAll,recommendIds}=await import('../../src/core/recommend.js');
const run='feedback20261103',prefix=`tastiq.qa.${run}:`,domains=['game','film','series','cartoon'];
let failNext=false,failPick=false,plans=0,picks=0,requests=0;
const delay=()=>new Promise(resolve=>setTimeout(resolve,Number(process.env.QA_DELAY_MS??700)));
const plan=async(catalog,state)=>{
 plans++;await delay();if(failNext){failNext=false;return {error:'Проверочный сбой разбора. Твой ответ сохранён.',retryable:true};}
 const source=state.turns.findLast(t=>!t.superseded&&t.kind==='answer'&&t.text?.trim()),summary=source?.text?.trim()||'Хочется интересной истории на вечер.';
 const facts=source?[{key:'qa:wish',text:summary.slice(0,240),stance:'want',scope:'today',sourceId:source.id,quote:source.text.slice(0,400),feature:null,exposure:null,...(state.domain?{titleId:null,titleIntent:null}:{gameId:null,gameIntent:null})}]:[];
 const needDetail=!state.domain&&!state.turns.some(t=>!['direction','platform','company','party'].includes(t.question.id))&&(state.turns.find(t=>t.question.id==='direction')?.text.length??0)<80;
 const question=needDetail?{id:'qa-detail',title:'Что больше всего хочется от игры?',why:'Уточним, что важно именно для этого вечера.',multiple:true,options:[{id:'world',label:'Исследовать и находить новое'},{id:'story',label:'Увлечься историей'},{id:'systems',label:'Разобраться в интересных системах'}]}:null;
 return {model:'qa-offline',proposal:{summary,facts,uncertainties:[],action:needDetail?'question':'review',question,sessionTime:null,...(state.domain?{context:{company:null,childAge:null,timeMode:null,commitment:null,onlyEnded:null,format:null}}:{})}};
};
const pick=async(scoped,state,{previous=[]}={})=>{
 picks++;await delay();if(failPick){failPick=false;return {error:'Проверочный сбой поиска. Прежние варианты сохранены.',retryable:true};}const catalog=scoped[state.domain];
 const ranked=rankAll(catalog,profileOf(state),sessionOf(state)).ranked;
 const ids=ranked.map(row=>row.game.id).filter(id=>!previous.includes(id)).slice(0,4);
 return {model:'qa-offline',shortlist:ranked.length,picks:ids.map(id=>({id,reason:'Проверочный вариант из настоящего каталога для оценки интерфейса.',caveat:'Это QA-пример, качество попадания человеку не измерялось.',likelySeen:false,own:false}))};
};
const services={game:createConversationService({catalogs,plan,pick,access:()=>({allowed:true}),journal:()=>{}})};
for(const domain of domains.slice(1))services[domain]=createMediaConversationService({domain,catalogs,plan,pick,access:()=>({allowed:true}),journal:()=>{}});
const json=(res,data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const html=(res,text)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(text);};
function seed(domain,view,{strategy=false,time=false}={}){
 const media=domain!=='game',catalog=catalogs[domain];
 let state=media?newMediaConversation({id:`${run}-${domain}`,domain}):newConversation({id:`${run}-${domain}`});
 const text=media?'Хочется что-то похожее на «Нобранец»: интересная история и неожиданные повороты.':strategy?'Хочу развивать державу, управлять экономикой и ресурсами, договариваться с соседями. Буду играть один на Windows.':time?'Сегодня есть 40 минут. Хочется исследовать большой мир без спешки.':'Хочется исследовать большой мир и никуда не спешить.';
 state=(media?answerMediaConversation:answerConversation)(state,{type:'answer',questionId:state.question.id,text,selected:[],kind:'answer'});
 if(!media){
  state=answerConversation(state,{type:'answer',questionId:state.question.id,selected:['windows'],text:'',kind:'answer'});
  state=answerConversation(state,{type:'answer',questionId:state.question.id,selected:['solo'],text:'',kind:'answer'});
 }
 state.phase='review';state.question=null;state.needsPlan=false;state.summary=text;
 const source=state.turns[0];state.facts=[{key:'qa:explore',text:media?'Интересная история и неожиданные повороты':strategy?'Развивать державу и управлять ресурсами':'Исследовать большой мир без спешки',stance:'want',scope:'today',sourceId:source.id,quote:source.text,feature:null,exposure:null,...(media?{titleId:null,titleIntent:null}:{gameId:null,gameIntent:null})}];
 if(time&&!media)state.sessionTime={minutes:40,sourceId:source.id,quote:'Сегодня есть 40 минут'};
 state.uncertainties=media?['Неясно, какое произведение ты имеешь в виду под «Нобранец». Уточни название или опиши, что в нём понравилось.']:['Что именно хочется исследовать: мир, историю или возможности героя?'];
 if(view==='result'){
  const legacy=(media?mediaConversationToLegacy:conversationToLegacy)(state,catalog.dict,catalog);
  const ids=strategy?[/Civilization VII?$/,/^Victoria 3$/,/^Stellaris$/,/^Dune: Spice Wars$/].map(pattern=>{const item=catalog.items.find(row=>pattern.test(row.name||row.title||''));if(!item)throw Error(`Missing strategy QA cover: ${pattern}`);return item.id;}):rankAll(catalog,profileOf(legacy),sessionOf(legacy)).ranked.slice(0,4).map(row=>row.game.id);
  state.result=recommendIds(catalog,profileOf(legacy),sessionOf(legacy),ids);
  if(!state.result?.top)throw Error(`No eligible QA cards: ${domain}`);
  state.phase='result';state.result.ai={model:'qa-offline',understood:text,shortlist:catalog.items.length};
  for(const card of [state.result.top,...state.result.alternatives]){const index=/Victoria 3/.test(card.name)?1:/Stellaris/.test(card.name)?2:/Dune: Spice Wars/.test(card.name)?3:0;card.ai=strategy?[
   {reason:'В этой стратегии ты развиваешь державу с первых поселений, распределяешь ресурсы и договариваешься с соседями в пошаговом темпе.',caveat:'Правила развития городов потребуют освоения.'},
   {reason:'Victoria 3 ставит в центр твоего запроса экономику: производство, торговлю и ресурсы, а дипломатия связывает её с интересами державы.',caveat:'Много взаимосвязанных систем; придётся разбираться в рынках и политике.'},
   {reason:'Stellaris переносит развитие державы в космос: управляешь планетами, добываешь ресурсы, заключаешь договоры и создаёшь федерации.',caveat:'По мере роста империи становится больше управления; немало возможностей связано с DLC.'},
   {reason:'В Dune: Spice Wars борьба за ресурсы сочетается с торговлей, политическими голосованиями и расширением владений на одной планете.',caveat:'Военные столкновения важны: одной экономикой и переговорами дело не ограничится.'},
  ][index]:{reason:'Пример настоящей карточки каталога для проверки интерфейса.',caveat:'Подбор показан как QA-фикстура.'};}
 }
 const snapshot={state,screen:(media?mediaConversationScreen:conversationScreen)(state)};
 if(view==='result')snapshot.feedbackState=(media?mediaConversationToLegacy:conversationToLegacy)(state,catalog.dict,catalog);
 return snapshot;
}
createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:5180');
  if(url.pathname==='/__qa/status')return json(res,{run,paidCalls:0,externalRequests:0,plans,picks,requests,failNext});
  if(url.pathname==='/__qa/fail-pick'){failPick=true;return html(res,'<p>Следующий поиск завершится проверочным сбоем.</p>');}
  if(url.pathname==='/__qa/fail-next'){failNext=true;return html(res,'<p>Следующий разбор завершится проверочным сбоем. Вернись в подбор и уточни запрос.</p><a href="javascript:history.back()">Назад</a>');}
  if(url.pathname==='/__qa/library'){
   const count=Number(url.searchParams.get('count')||128),libraryRun=count<=1?`${run}small${count}`:run;
   const fixture=workspaceLibrarySeed(Object.fromEntries(domains.map(domain=>[domain,catalogs[domain].items])),{run:libraryRun,count});
   return html(res,`<!doctype html><meta charset="utf-8"><title>Isolated library QA</title><script>sessionStorage.setItem('tastiq.qa.run',${JSON.stringify(libraryRun)});for(const [key,value] of Object.entries(${JSON.stringify(fixture.entries).replaceAll('<','\\u003c')}))localStorage.setItem(key,value);location.replace('/library/?qa_run=${libraryRun}');</script>`);
  }
  if(url.pathname==='/__qa/setup'){
   const domain=url.searchParams.get('domain')||'series',view=url.searchParams.get('view')||'review';
   if(!domains.includes(domain)||!['review','result'].includes(view))return json(res,{error:'Unknown fixture'},400);
   failNext=url.searchParams.get('fail')==='1';const snapshot=seed(domain,view,{strategy:domain==='game'&&url.searchParams.get('theme')==='strategy',time:url.searchParams.get('time')==='1'});if(url.searchParams.get('broken')==='1'&&snapshot.state.result){for(const result of [snapshot.state.result,snapshot.screen.result].filter(Boolean))for(const card of [result.top,...result.alternatives]){card.poster='http://127.0.0.1:5180/__qa/missing-cover.jpg';card.image='http://127.0.0.1:5180/__qa/missing-cover.jpg';}}
   const target=domain==='game'?`/pick/game/?qa_run=${run}`:`/pick/watch/?domain=${domain}&qa_run=${run}`;
   const value=JSON.stringify(JSON.stringify({version:1,snapshot,drafts:{},previous:null,correctionCheckpoint:null})).replaceAll('<','\u003c');
   return html(res,`<!doctype html><meta charset="utf-8"><title>QA seed</title><script>sessionStorage.setItem('tastiq.qa.run',${JSON.stringify(run)});localStorage.setItem(${JSON.stringify(prefix+`tastiq.conversation.${domain}.v1`)},${value});location.replace(${JSON.stringify(target)});</script>`);
  }
  if(url.pathname==='/__qa/'||url.pathname==='/__qa')return html(res,`<!doctype html><html lang="ru"><meta charset="utf-8"><title>Product QA · paid 0</title><h1>Изолированная проверка бренда</h1><p>Настоящий UI и каталог; ответы модели подменены. Платных вызовов 0. Данные с префиксом ${prefix}</p>${domains.map(domain=>`<h2>${domain}</h2><p><a href="/__qa/setup?domain=${domain}&view=review">Уточнение → проверка понимания</a> · <a href="/__qa/setup?domain=${domain}&view=result">Результат → исправить → восстановить</a> · <a href="/__qa/setup?domain=${domain}&view=review&fail=1">Сбой разбора → повторить</a></p>`).join('')}<p><a href="/?qa_run=${run}">Главная</a> · <a href="/library/?qa_run=${run}">Библиотека</a> · <a href="/__qa/status">Статус</a></p></html>`);
  if(req.method==='POST'&&['/api/conversation','/api/media-conversation'].includes(url.pathname)){
   requests++;
   if(req.headers['x-tastiq-qa-run']!==run)return json(res,{error:'Use an isolated __qa setup link'},403);
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>250000)throw Error('Request too large');}
   const body=JSON.parse(raw||'{}'),domain=url.pathname==='/api/conversation'?'game':body.domain;
   if(!services[domain])return json(res,{error:'Invalid QA domain'},400);
   return json(res,{...await services[domain](body,{uid:run}),qaBilling:{run,calls:[],paidCalls:0}});
  }
  return await handler(req,res);
 }catch(error){if(!res.headersSent)json(res,{error:error.message},error.status??500);else res.end();}
}).listen(Number(process.env.QA_PORT??5180),'127.0.0.1',()=>console.log(`Product QA: http://127.0.0.1:${process.env.QA_PORT??5180}/__qa/ · paid 0`));
