// Authorized, bounded real-provider diagnostic. Receipts stay in the existing cumulative ledger.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,appendFileSync,existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {loadCatalogs} from '../../src/core/catalog.js';
import {createMediaConversationService} from '../../src/server/media-conversation-service.js';
import {applyMediaConversationProposal,mediaConversationScreen} from '../../src/core/media-conversation.js';
import {createConversationService} from '../../src/server/conversation-service.js';
import {PaidBudget} from '../../src/stand/paid-budget.js';
import {budgetTransport} from '../../src/ai/budget-transport.js';

const round=process.argv[2]??'live-round-3';
if(!/^live-round-[1-9][0-9]*$/.test(round))throw Error('Invalid round');
const folder=resolve('research-vault/adaptive-media-2026-11-02',round);
if(existsSync(resolve(folder,'report.json')))throw Error('Preserve immutable prior report');
mkdirSync(folder,{recursive:true});
const ledger=new PaidBudget(resolve('research-vault/taste-quality-strategy-2026-10/eval/quality-round-2'));
const before=ledger.snapshot();
const report={cap:0.60,maxCalls:12,before:{upper:before.cumulativeUpper,calls:before.successfulCalls},cases:[],stageCalls:0,stageUsd:0};
const transport=budgetTransport({ledger,batchId:'adaptive-media-20261102',cap:0.60});
let calls=0;
const api=request=>{if(++calls>7)throw Error('Explicit diagnostic request limit');return transport(request);};
const save=()=>writeFileSync(resolve(folder,'report.json'),JSON.stringify(report,null,2));
const examples={
 film:'Хочу лёгкую комедию для одного взрослого. Сегодня есть 100 минут. Без жестокости и тяжёлого финала. Хочется лёгкого приключения, без пересмотра знакомого.',
 series:'Сегодня смотрю один. Хочу детективный сериал, серии до 45 минут, без натуралистичной жестокости. Готов на короткую законченную историю, несколько сезонов сейчас не хочу.',
 game:'Сегодня хочу спокойное приключение с исследованием, без гринда и постоянных поражений. Сегодня могу поиграть 60 минут, на Windows, один.',
 cartoon:'Будем смотреть с ребёнком 7 лет. Нужен один полнометражный мультфильм, добрый и смешной. Сегодня есть 100 минут. Не сериал и без страшных сцен.',
};
try{
 assert.equal(before.uncertainReserve,0,'No outstanding uncertain spend');
 const catalogs=loadCatalogs();
 for(const [domain,text]of Object.entries(examples)){
  const row={domain,steps:[]};report.cases.push(row);
  const service=(domain==='game'?createConversationService:createMediaConversationService)({domain,catalogs,api,journal:event=>appendFileSync(resolve(folder,'journal.ndjson'),JSON.stringify(event)+'\n')});
  const who={uid:`live-media-${domain}`,ip:'127.0.0.1'};
  let out;
  if(domain==='film'||domain==='series'){
   const previous=JSON.parse(readFileSync(resolve('research-vault/adaptive-media-2026-11-02/live-round-2/report.json'),'utf8'));
   const priorCase=previous.cases.find(c=>c.domain===domain);
   if(domain==='film'){
    const passed=priorCase.steps.find(step=>step.action==='confirm');assert.ok(passed?.state?.result?.top);
    out=await service({domain,state:passed.state},who);assert.ok(!out.error);row.passed=true;row.carriedReport='live-round-2/report.json';row.steps.push({action:'free-restore-previous-success',...out});row.titles=[out.state.result.top,...out.state.result.alternatives].map(c=>c.ru||c.name);save();continue;
   }
   const failed=priorCase.steps.find(step=>step.action==='answer');
   const receipt=before.calls.findLast(call=>call.id.startsWith('adaptive-media-20261102:')&&call.request?.text?.format?.name==='tastiq_media_conversation'&&JSON.parse(call.request.input).id===failed.state.id&&JSON.parse(call.request.input).revision===failed.state.revision);
   assert.ok(receipt,'Existing settled response receipt');
   const raw=receipt.response.output.filter(m=>m.type==='message').flatMap(m=>m.content??[]).filter(c=>c.type==='output_text').map(c=>c.text).join('');
   const checked=applyMediaConversationProposal(failed.state,JSON.parse(raw),catalogs[domain].dict,failed.state.revision);
   assert.ok(!checked.error,`Offline original receipt revalidation: ${checked.error}`);
   out={state:checked.state,screen:mediaConversationScreen(checked.state)};
   row.firstQuestion=priorCase.firstQuestion;row.reusedReceipt=receipt.id;row.originalReport='live-round-2/report.json';
   assert.equal(out.screen.question?.id,'only_ended');row.steps.push({action:'offline-repaired-receipt',...out});
   out=await service({domain,state:out.state,action:{type:'answer',questionId:'only_ended',selected:['yes'],text:'',kind:'answer'}},who);
   assert.ok(!out.error);assert.equal(out.state.context.onlyEnded,true);assert.equal(out.screen.type,'review');row.steps.push({action:'local-clarification',...out});
  }else{
  out=await service({domain},who);
  const answer=async(text,selected=[])=>service({domain,state:out.state,action:{type:'answer',questionId:out.screen.question.id,text,selected,kind:'answer'}},who);
  out=await answer(domain==='game'?'Не могу решить, во что поиграть сегодня.':'Пока не могу решить, чего именно хочется посмотреть.');
  if(domain==='game'){out=await answer('',['windows']);out=await answer('',['solo']);}
  row.steps.push({action:'broad-request',...out});save();
  assert.ok(!out.error,`${domain} first clarification: ${out.error}`);
  assert.equal(out.screen.type,'question',`${domain} broad wish needs a useful clarification`);
  row.firstQuestion=out.screen.question;
  out=await answer(text);
  }
  row.steps.push({action:'answer',...out});save();
  assert.ok(!out.error,`${domain} interpretation: ${out.error}`);
  assert.ok(out.state.summary||out.state.facts.length,`${domain} grounded understanding`);
  if(out.screen.type!=='review')out=await service({domain,state:out.state,action:{type:'review'}},who);
  out=await service({domain,state:out.state,action:{type:'confirm'}},who);
  row.steps.push({action:'confirm',...out});save();
  assert.ok(!out.error,`${domain} recommendation: ${out.error}`);
  assert.ok(out.state.result?.top,`${domain} result`);
  const cards=[out.state.result.top,...out.state.result.alternatives];
  assert.ok(cards.every(card=>catalogs[domain].byId.has(card.id)),`${domain} catalog identity`);
  if(domain==='cartoon'){
   assert.equal(out.state.context.company,'children');assert.equal(out.state.context.childAge,7);assert.equal(out.state.context.format,'movie');
   assert.ok(cards.every(card=>card.kind==='film'),'Explicit cartoon movie format');
  }
  row.passed=true;row.titles=cards.map(card=>card.ru||card.name);save();
  process.stdout.write(`${domain}: interpretation + result checked (${cards.length} cards)\n`);
 }
 report.passed=true;
}catch(error){report.error=error.message;process.exitCode=1;}
finally{
 const after=ledger.snapshot();report.after={upper:after.cumulativeUpper,calls:after.successfulCalls,uncertainReserve:after.uncertainReserve};
 report.stageCalls=after.successfulCalls-before.successfulCalls;report.stageUsd=+(after.cumulativeUpper-before.cumulativeUpper).toFixed(10);save();ledger.close();
 process.stdout.write(JSON.stringify({passed:report.passed??false,calls:report.stageCalls,usd:report.stageUsd,error:report.error??null})+'\n');
}
