// Explicit, one-step live diagnostic. All costs go to the existing shared ledger; never auto-retry.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadCatalogs} from '../../../src/core/catalog.js';
import {newConversation,answerConversation} from '../../../src/core/conversation.js';
import {createConversationService} from '../../../src/server/conversation-service.js';
import {PaidBudget} from '../../../src/stand/paid-budget.js';
import {budgetTransport} from '../../../src/ai/budget-transport.js';
const dir=path.dirname(fileURLToPath(import.meta.url));
const [name,operation,inputFile]=process.argv.slice(2);
if(!/^[a-z0-9-]{1,40}$/.test(name??''))throw Error('Case name required');
const cases={
 'story-guided':{mode:'guided',direction:['rpg','open_world'],text:'Хочется интересных историй и живого мира, развивать героя без фарма.',targets:['Kingdom Come: Deliverance II','Cyberpunk 2077','Avowed','The Outer Worlds']},
 'story-free':{mode:'free',direction:['rpg','open_world'],text:'Хочется интересных историй и живого мира, развивать героя без фарма.',targets:['Kingdom Come: Deliverance II','Cyberpunk 2077','Avowed','The Outer Worlds']},
 'linear-guided':{mode:'guided',direction:['shooter'],text:'Сегодня хочу одиночный линейный экшен, интересные ситуации, без открытого мира и фарма.',targets:['Titanfall 2','DOOM Eternal','Wolfenstein II: The New Colossus','Call of Juarez: Gunslinger']},
};
const filename=path.join(dir,`live-${name}.json`);
let record=fs.existsSync(filename)?JSON.parse(fs.readFileSync(filename,'utf8')):{case:name,definition:cases[name],steps:[]};
if(!record.definition)throw Error('Unknown case');
let state=record.steps.at(-1)?.out.state,action;
if(operation==='init'){
 if(record.steps.length)throw Error('Case already started. Resume explicitly.');
 state=newConversation({id:`adaptive-${name}-v1`,mode:record.definition.mode});
 for(const selected of [record.definition.direction,['windows'],['solo']])state=answerConversation(state,{type:'answer',questionId:state.question.id,selected,text:state.phase==='direction'?record.definition.text:'',kind:'answer'});
 action={type:'retry'};
}else if(operation==='answer'||operation==='correct'){
 const text=fs.readFileSync(path.resolve(inputFile),'utf8').trim();
 action=operation==='correct'?{type:'correct',text}:{type:'answer',questionId:state.question.id,selected:[],kind:'answer',text};
}else if(['confirm','review','retry','continue'].includes(operation))action={type:operation};
else throw Error('Use init/answer/correct/confirm/review/retry/continue');
const catalogs=loadCatalogs();
const ledger=new PaidBudget(path.resolve('research-vault/taste-quality-strategy-2026-10/eval/quality-round-2'));
const before=ledger.snapshot();
try{
 const api=budgetTransport({ledger,batchId:'adaptive-20261031',cap:1});
 const service=createConversationService({catalogs,api,journal:row=>fs.appendFileSync(path.join(dir,'live-journal.ndjson'),JSON.stringify(row)+'\n')});
 const out=await service({state,action},{uid:'adaptive-live-diagnostic'});
 const after=ledger.snapshot();
 record.steps.push({at:new Date().toISOString(),action,out,costUsd:after.cumulativeUpper-before.cumulativeUpper});
 fs.writeFileSync(filename,JSON.stringify(record,null,2)+'\n');
 console.log(JSON.stringify({case:name,stage:out.screen.type,revision:out.state.revision,error:out.error??null,question:out.screen.question,
   summary:out.screen.summary,facts:out.screen.facts,uncertainties:out.screen.uncertainties,
   picks:out.screen.result?[out.screen.result.top,...out.screen.result.alternatives].filter(Boolean).map(p=>({id:p.id,name:p.name,reason:p.ai?.reason,caveat:p.ai?.caveat,feasibility:p.feasibility})):null,
   costUsd:after.cumulativeUpper-before.cumulativeUpper,totalUpper:after.cumulativeUpper,remainingLower:after.remainingLower},null,2));
}finally{ledger.close();}
