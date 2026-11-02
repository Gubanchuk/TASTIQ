// Bounded night diagnostics, not human quality labels. Dry preparation is the default.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {loadCatalogs} from '../../src/core/catalog.js';
import {newConversation,answerConversation,conversationToLegacy} from '../../src/core/conversation.js';
import {profileOf,sessionOf} from '../../src/core/dialogue.js';
import {rankAll} from '../../src/core/recommend.js';
import {createConversationService} from '../../src/server/conversation-service.js';
import {PaidBudget} from '../../src/stand/paid-budget.js';
import {budgetTransport} from '../../src/ai/budget-transport.js';
import {reserveCost} from '../../src/ai/usage.js';

const dir=resolve('research-vault/overnight-2026-11/live-round-2');mkdirSync(dir,{recursive:true});
const scope='overnight-20261101-02',capUsd=0.80,maxRequests=7;
const resumePath=resolve('research-vault/overnight-2026-11/live-round-1/05-correction-plan.json');
const resumeHash=createHash('sha256').update(readFileSync(resumePath)).digest('hex');
const scenarios={
 replay:{direction:'rpg',text:'Skyrim прошёл. Сегодня хочу перепройти Skyrim: снова исследовать мир и развивать героя, но без частых повторов после смерти. Сегодня есть полчаса.'},
 reference:{direction:'rpg',text:'Skyrim прошёл. Сегодня хочу другую RPG с исследованием и интересной историей. Skyrim сегодня не предлагай. На полное прохождение готов потратить 30 часов, но сколько времени будет сегодня, пока не знаю.'},
 correction:{text:'Поправка: сегодня уже не RPG и не Skyrim. Хочу гонки: нравится управлять машиной и быстро начинать заезды, без обязательной длинной карьеры. Сегодня есть 45 минут. Общая длина игры неважна. Сюжет — хорошо, если есть, но он не обязателен.'},
 coop:{direction:'survival',company:'group',party:'3',text:'Нас трое, играем вместе онлайн на Windows. Хотим исследовать мир и построить общую базу. Бои допустимы, если можно снизить сложность; постоянных потерь ресурсов не хочется. Крафт допустим, но это не главная цель. Сегодня есть 1 час 30 минут.'},
 unknown:{direction:null,text:'',answer:'Хочется спокойно исследовать и находить новое. Бои не обязательны; если они есть, то пусть будут редкими. Не хочется сегодня постоянного напряжения.'},
};
const frozen=JSON.stringify({scope,capUsd,maxRequests,synthetic:true,resumeFrom:resumePath,resumeHash,scenarios},null,2)+'\n';
const frozenPath=resolve(dir,'cases.frozen.json');
if(existsSync(frozenPath))assert.equal(readFileSync(frozenPath,'utf8'),frozen);else writeFileSync(frozenPath,frozen,{flag:'wx'});
if(!process.argv.includes('--run')){console.log(JSON.stringify({prepared:true,scope,capUsd,maxRequests,paidCalls:0}));process.exit(0);}
assert.ok(!existsSync(resolve(dir,'report.json')),'A paid report already exists; inspect it instead of rerunning.');
const grant=JSON.parse(readFileSync(resolve('data/api-test-authorization-2026-11-01.json'),'utf8'));
const ledger=new PaidBudget(resolve('research-vault/taste-quality-strategy-2026-10/eval/quality-round-2'));
const before=ledger.snapshot(),bounded=budgetTransport({ledger,batchId:scope,cap:capUsd});
const files=['src/core/conversation.js','src/core/session-time.js','src/server/conversation-service.js','src/server/conversation-game-identity.js','src/ai/conversation.js','src/ai/prompt.js'];
const hashes=()=>Object.fromEntries(files.map(path=>[path,createHash('sha256').update(readFileSync(resolve(path))).digest('hex')]));
const codeBefore=hashes();let requests=0,stage='init';
const api=async body=>{
 if(++requests>maxRequests)throw Error('Diagnostic request ceiling reached');
 const s=ledger.snapshot(),reserve=reserveCost(body);
 if(reserve==null||s.cumulativeUpper+s.uncertainReserve+reserve>grant.maxCumulativeUpper)throw Error('Additional owner grant reserve exceeded');
 return bounded(body);
};
const save=(name,value)=>writeFileSync(resolve(dir,name+'.json'),JSON.stringify(value,null,2)+'\n');
const cards=s=>[s.result?.top,...(s.result?.alternatives??[])].filter(Boolean);
let report={scope,capUsd,maxRequests,synthetic:true,humanFitMeasured:false,resumeHash,status:'failed',checks:[],questions:[]};
try {
 assert.equal(before.uncertainReserve,0,'Resolve uncertain charges before any diagnostics');
 const catalogs=loadCatalogs(),catalog=catalogs.game;
 const service=createConversationService({catalogs,api,access:()=>({allowed:true}),journal:row=>appendFileSync(resolve(dir,'journal.ndjson'),JSON.stringify(row)+'\n')});
 const who={uid:scope};
 const call=async(name,state,action)=>{
  stage=name;const out=await service({state,...(action?{action}:{}),rememberedExclusions:[]},who);save(name,out);
  assert.ok(!out.error,out.error);return out.state;
 };
 function seed(name,c) {
  let s=newConversation({id:scope+'-'+name});
  for(const [id,text]of [[c.direction,c.text],['windows',''],[c.company??'solo',''],...(c.company==='group'?[[c.party,'']]:[])]){
   s=answerConversation(s,{type:'answer',questionId:s.question.id,selected:id?[id]:[],text,kind:id||text?'answer':'unknown'});
  }
  return s;
 }
 const review=async(name,s)=>s.phase==='review'?s:call(name,s,{type:'review'});
 const work=id=>catalog.byId.get(id)?.work;
 const projection=s=>conversationToLegacy(s,catalog.dict,catalog);

 const saved=JSON.parse(readFileSync(resumePath,'utf8'));
 assert.equal(saved.error,'Цитата времени не сохраняет условия исходного ответа.');
 assert.equal(saved.state.turns.at(-1).text,scenarios.correction.text);
 let racing=await call('01-correction-retry',saved.state,{type:'retry'});
 assert.equal(racing.sessionTime?.minutes,45,'New current time replaces the old half-hour');
 const racingProjection=projection(racing);
 assert.equal(racingProjection.conversation.familiarity.returnToIds.length,0);
 assert.ok(!racingProjection.session.genreWants.includes('RPG'));
 assert.ok(racingProjection.session.goalWants.some(x=>x.f==='loop.driving'));
 racing=await review('06-correction-review',racing);
 racing=await call('07-correction-pick',racing,{type:'confirm'});
 assert.ok(cards(racing).every(c=>c.feasibility.some(f=>f.key==='minutes'&&/45/.test(f.text))));
 report.racing=cards(racing).map(c=>({id:c.id,title:c.ru||c.name,reason:c.ai?.reason,caveat:c.ai?.caveat}));
 report.checks.push('Correction removes earlier RPG/replay goals and applies the new 45 minute budget.');

 let coop=await call('08-coop-plan',seed('coop',scenarios.coop),{type:'retry'});
 assert.equal(coop.sessionTime?.minutes,90);
 coop=await review('09-coop-review',coop);
 coop=await call('10-coop-pick',coop,{type:'confirm'});
 assert.equal(coop.context.partySize,'3');
 assert.ok(cards(coop).length>=3);
 assert.ok(cards(coop).every(c=>c.feasibility.some(f=>f.key==='players')&&c.feasibility.some(f=>f.key==='minutes'&&/90/.test(f.text))));
 const original=structuredClone(coop),retained=cards(coop).slice(2);
 for(const card of cards(coop).slice(0,2))coop=await call('11-coop-mark-'+card.id.replace(':','-'),coop,{type:'familiar_mark',id:card.id});
 coop=await call('12-coop-replace',coop,{type:'replace_familiar'});
 assert.equal(coop.replacement.changedIds.length,2);
 assert.deepEqual(coop.context,original.context);assert.deepEqual(coop.sessionTime,original.sessionTime);
 for(const c of retained)assert.deepEqual(cards(coop).find(x=>x.id===c.id),c);
 report.coop=cards(coop).map(c=>({id:c.id,title:c.ru||c.name,reason:c.ai?.reason,caveat:c.ai?.caveat,feasibility:c.feasibility}));
 report.checks.push('Three-player/90-minute coop conditions survive two-card replacement; untouched cards stay exact.');

 let unknown=await call('13-unknown-plan',seed('unknown',scenarios.unknown),{type:'retry'});
 assert.equal(unknown.phase,'talk','No specific wish yet: an adaptive useful question is needed');
 assert.ok(unknown.question&&!['platform','company','party'].includes(unknown.question.id));
 report.questions.push(unknown.question);
 unknown=await call('14-unknown-answer',unknown,{type:'answer',questionId:unknown.question.id,selected:[],text:scenarios.unknown.answer,kind:'answer'});
 assert.ok(unknown.summary);assert.equal(unknown.sessionTime,null);
 assert.ok(!unknown.facts.some(f=>f.stance==='exclude'&&f.feature?.startsWith('loop.')),'Optional fighting is not a categorical ban');
 if(unknown.question)report.questions.push(unknown.question);
 report.checks.push('Unknown direction elicits a non-context question; own words and optional combat are not converted into a hard ban.');

 const freeBefore=requests;
 await call('15-free-restore',racing);
 const removedTime=await call('16-free-remove-time',racing,{type:'remove_time'});assert.equal(removedTime.sessionTime,null);
 const undone=await call('17-free-undo-replacement',coop,{type:'undo_replacement'});assert.deepEqual(cards(undone),cards(original));
 assert.equal(requests,freeBefore);
 report.checks.push('Restore, time removal and replacement undo add no paid requests.');
 assert.deepEqual(hashes(),codeBefore,'Model/core code changed while the live diagnostic was running');
 report.status='pass';
}catch(error){report.error=error.message;report.failedStage=stage;process.exitCode=1;}
finally {
 const after=ledger.snapshot();
 report={...report,requests,codeBefore,codeAfter:hashes(),costUsd:Math.round((after.cumulativeUpper-before.cumulativeUpper)*1e10)/1e10,
  successfulCallsAdded:after.successfulCalls-before.successfulCalls,cumulativeUpper:after.cumulativeUpper,successfulCalls:after.successfulCalls,
  uncertainReserve:after.uncertainReserve,additionalRemainingLower:Math.round((grant.maxCumulativeUpper-after.cumulativeUpper-after.uncertainReserve)*1e10)/1e10};
 save('report',report);ledger.close();
 console.log(JSON.stringify({status:report.status,requests,costUsd:report.costUsd,successfulCallsAdded:report.successfulCallsAdded,uncertainReserve:report.uncertainReserve,additionalRemainingLower:report.additionalRemainingLower,failedStage:report.failedStage,error:report.error}));
}
