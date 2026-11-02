// Isolated browser fixture: real catalog/controller/static UI, deterministic model, no external API.
import {createServer} from 'node:http';
import {readFileSync,appendFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadCatalogs,catalogMeta} from '../../src/core/catalog.js';
import {createConversationService} from '../../src/server/conversation-service.js';
import {profileOf,sessionOf,searchInDomain} from '../../src/core/dialogue.js';
import {rankAll} from '../../src/core/recommend.js';
import {normalizeFeedback} from '../../src/server/public/shared/evening-feedback.js';
import {validateSessionTime} from '../../src/core/session-time.js';

const root=resolve(fileURLToPath(new URL('../..',import.meta.url))),publicDir=resolve(root,'src/server/public');
const evidence=resolve(root,'research-vault/overnight-2026-11/browser');mkdirSync(evidence,{recursive:true});
const journalPath=resolve(evidence,'browser-journal.ndjson');
const catalogs=loadCatalogs(),catalog=catalogs.game;
let plans=0,picks=0,failNext=false,dropNext=false,failPlanNext=null;
globalThis.fetch=()=>{throw Error('Live API disabled in browser fixture');};
const first=['steam:1091500','steam:391220','steam:264710','steam:526870'];
const plan=async(_,s)=>{
 plans++;
 if(failPlanNext){const out=failPlanNext;failPlanNext=null;return out;}
 const last=s.turns.at(-1),ready=s.turns.some(t=>t.question.id==='experience');
 const timed=[...s.turns].reverse().flatMap(t=>{const match=t.answer.match(/Сегодня есть (\d+) минут/u);const candidate=match?{minutes:Number(match[1]),sourceId:t.id,quote:match[0]}:null;return candidate&&validateSessionTime(candidate,s).time?[candidate]:[];})[0]??null;
 const facts=last&&ready?[{key:'today-story',text:'Сегодня хочется увлекательной истории и исследования.',stance:'want',scope:'today',sourceId:last.id,quote:last.answer.slice(0,120),feature:'story.central',gameId:null,exposure:null}]:[];
 return {model:'stub',proposal:{summary:'Для одиночной игры на Windows: увлекательная история, исследование и развитие героя. Без частых повторов.',facts,sessionTime:timed,uncertainties:['Настройки сложности и доступность отдельных режимов ещё нужно проверить.'],action:ready?'review':'question',question:ready?null:{id:'experience',title:'Что поможет увлечься игрой сегодня?',why:'Уточним, что хочется получить от выбранного направления.',options:[{id:'story',label:'История и персонажи'},{id:'explore',label:'Исследование мира'},{id:'builds',label:'Рост героя и новые возможности'},{id:'build',label:'Построить что-то своё'}],multiple:true,controls:['unknown','indifferent','none']}}};
};
const pick=async(_,state,{previous=[]}={})=>{
 picks++;
 await new Promise(r=>setTimeout(r,350));
 if(failNext){failNext=false;return {error:'Проверочный сбой модели. Отметки и прежние игры сохранены.'};}
 const ranked=rankAll(catalog,profileOf(state),sessionOf(state)).ranked;
 const eligible=new Set(ranked.map(r=>r.game.id));
 const ids=[...new Set([...first,...ranked.map(r=>r.game.id)])].filter(id=>eligible.has(id)&&!previous.includes(id)).slice(0,4);
 return {model:'stub',shortlist:ranked.length,picks:ids.map(id=>({id,reason:'Подходит к запросу на историю, исследование и развитие. Это подменённое объяснение для проверки интерфейса.',caveat:'Перед началом проверь, подходят ли темп и сложность.',likelySeen:false,own:false}))};
};
const service=createConversationService({catalogs,plan,pick,access:()=>({allowed:true}),journal:row=>appendFileSync(journalPath,JSON.stringify(row)+'\n')});
const json=(res,body,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://localhost:5180');let body={};
  if(req.method==='POST'){let raw='';for await(const chunk of req)raw+=chunk;body=JSON.parse(raw||'{}');}
  if(url.pathname==='/__test/status')return json(res,{plans,picks,paidCalls:0,failNext,dropNext,failPlanNext});
  if(req.method==='POST'&&url.pathname==='/__test/fail-plan-next'){failPlanNext=body.retryable===false?{error:'Достигнут лимит расходов на нейросеть. Ответ сохранён.',retryable:false}:{error:'Проверочный сбой разбора. Твой ответ сохранён.',retryable:true};return json(res,{ok:true});}
  if(req.method==='POST'&&url.pathname==='/__test/fail-next'){failNext=true;return json(res,{ok:true});}
  if(req.method==='POST'&&url.pathname==='/__test/drop-next'){dropNext=body.count===2?2:1;return json(res,{ok:true});}
  if(url.pathname==='/api/meta')return json(res,catalogMeta(catalogs));
  if(url.pathname==='/api/search')return json(res,searchInDomain({domain:url.searchParams.get('domain')},catalogs,url.searchParams.get('q')??''));
  if(url.pathname==='/api/conversation'){
   appendFileSync(resolve(evidence,'requests.ndjson'),JSON.stringify({at:new Date().toISOString(),action:body.action??null,revision:body.state?.revision,context:body.state?.context})+'\n');
   const out=await service(body,{uid:'isolated-browser-fixture'});
   if(dropNext){dropNext--;req.socket.destroy();return;}
   return json(res,out);
  }
  if(url.pathname==='/api/feedback'){
   const run=normalizeFeedback(body.run);if(!run)return json(res,{error:'Invalid feedback'},400);
   appendFileSync(journalPath,JSON.stringify({event:'fixture-feedback',data:run})+'\n');return json(res,{ok:true,id:run.id,revision:run.revision});
  }
  const file=resolve(publicDir,'.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(publicDir+sep)||!existsSync(file))return json(res,{error:'not found'},404);
  res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'})[extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(readFileSync(file));
 }catch(error){json(res,{error:error.message},400);}
}).listen(5180,'127.0.0.1',()=>console.log('Isolated fixture http://localhost:5180/pick/game/; paid APIs disabled'));
