// Offline only. No server/browser, real model, budget runner or journal is used.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {newConversation,answerConversation,applyConversationProposal,conversationToLegacy} from '../../../src/core/conversation.js';
import {createConversationService} from '../../../src/server/conversation-service.js';
import {profileOf,sessionOf} from '../../../src/core/dialogue.js';
import {makeCatalog} from '../../../src/core/catalog.js';
import {rankAll,recommendIds} from '../../../src/core/recommend.js';
import {buildTaste} from '../../../src/core/profile.js';
import {checkSieves} from '../../../src/core/sieves.js';
import {feasibilityOf} from '../../../src/core/feasibility.js';
import {fixtureCatalog} from '../../../test/fixture.js';

const frozen=JSON.parse(readFileSync(new URL('./cases.frozen.json',import.meta.url),'utf8'));
const catalogBytes=readFileSync(new URL('../../../data/catalog.json',import.meta.url));
const real=makeCatalog(JSON.parse(catalogBytes),'game'),fixture=fixtureCatalog();
const output=[];
const reply=(s,selected=[],text='',kind='answer')=>answerConversation(s,{type:'answer',questionId:s.question.id,selected,text,kind});
const q={id:'audit-detail',title:'Что важно сегодня?',why:'Уточняем желание',options:[],multiple:true,controls:['unknown','indifferent','none']};
function ready(text='Хочу игру сегодня',company='solo') {
 let s=newConversation({id:'offline-'+output.length});s=reply(s,[],text);s=reply(s,['windows']);s=reply(s,[company]);
 if(company==='group')s=reply(s,['3']);
 s=applyConversationProposal(s,{summary:text,facts:[],uncertainties:[],action:'question',question:q},fixture.dict).state;
 return reply(s,[],text);
}
const fact=(s,patch={})=>({key:'current',text:s.turns.at(-1).text,stance:'want',scope:'today',sourceId:s.turns.at(-1).id,quote:s.turns.at(-1).answer,feature:null,gameId:null,exposure:null,...patch});
const proposed=(s,facts,catalog=fixture,extra={})=>applyConversationProposal(s,{summary:s.turns.at(-1).text||'Проверяем запрос',facts,uncertainties:[],action:'review',question:null,...extra},catalog.dict);
const project=(s,catalog=fixture)=>{const legacy=conversationToLegacy(s,catalog.dict,catalog);return {legacy,profile:profileOf(legacy),session:sessionOf(legacy)};};
async function run(id,fn) {
 const contract=frozen.cases.find(c=>c.id===id);
 try {const row=await fn();output.push({...contract,...row});}catch(error){output.push({...contract,status:'fail',kind:'deterministic-error',error:error.message});}
}

await run('today-switch',()=>{
 let s=ready('Раньше нравился открытый мир, сегодня хочу RPG');
 s=proposed(s,[fact(s,{key:'direction:rpg',quote:'RPG',text:'RPG'}),fact(s,{key:'past-world',scope:'history',feature:'freedom.open_world'})]).state;
 s=answerConversation(s,{type:'correct',text:'Теперь хочу гонки и вождение, а не RPG'});
 const checked=proposed(s,[fact(s,{key:'direction:racing',quote:'гонки',text:'Гонки'}),fact(s,{key:'drive',feature:'loop.driving'})]);
 const {legacy,session}=project(checked.state);
 return {status:!checked.error&&!session.genreWants.includes('RPG')&&session.goalWants.some(x=>x.f==='loop.driving')&&legacy.preferences.length===0&&legacy.conversation.turns.at(-1).answer.includes('Теперь хочу гонки')?'pass':'fail',kind:'deterministic-contract',genres:session.genreWants,wants:session.goalWants.map(x=>x.f),historyPreferences:legacy.preferences};
});
await run('neutral',()=>{
 const outcomes=['unknown','indifferent','none'].map(kind=>{let s=ready();s=reply({...s,question:q},[],'',kind);return {kind,rejected:Boolean(proposed(s,[fact(s,{stance:'avoid',feature:'world.realistic'})]).error)};});
 return {status:outcomes.every(x=>x.rejected)?'pass':'fail',kind:'deterministic-contract',outcomes};
});
await run('conditional',()=>{
 const s=ready('Можно сложную, если есть удобные сохранения');
 const checked=proposed(s,[fact(s,{stance:'conditional',feature:'difficulty.hard'})]),{session}=project(checked.state);
 return {status:!checked.error&&!session.goalRequires.length&&!session.goalExcludes.length&&checked.state.facts[0].stance==='conditional'?'pass':'fail',kind:'deterministic-contract',requires:session.goalRequires,excludes:session.goalExcludes,conditionalPreserved:checked.state.facts[0]?.stance};
});
await run('context-change',()=>{
 let s=ready('Играем втроём','group');const source=s.turns.find(t=>t.question.id==='company');
 const old=fact(s,{key:'company-coop',sourceId:source.id,quote:source.answer,feature:'social.coop',stance:'require'});
 s=proposed(s,[old]).state;s=answerConversation(s,{type:'context',company:'solo'});
 return {status:!s.facts.some(f=>f.key===old.key)&&Boolean(proposed(s,[old]).error)?'pass':'fail',kind:'deterministic-contract',context:s.context,oldSourceRejected:Boolean(proposed(s,[old]).error)};
});
await run('finished-replay',()=>{
 const s=ready('Ведьмака 3 прошёл, сегодня хочу перепройти именно его');
 const checked=proposed(s,[fact(s,{key:'past-finished',scope:'history',stance:'history',gameId:'1',exposure:'finished'}),fact(s,{key:'today-replay',text:'Сегодня хочу перепройти именно его',gameId:'1',gameIntent:'replay'})]);
 const {profile,session}=project(checked.state),ranked=rankAll(fixture,profile,session),taste=buildTaste(fixture,profile);
 const reference=ready('Ведьмака 3 прошёл, сегодня хочу другую похожую игру');
 const referenceState=proposed(reference,[fact(reference,{key:'past-finished',scope:'history',stance:'history',gameId:'1',exposure:'finished'}),fact(reference,{key:'today-reference',gameId:'1',gameIntent:'reference'})]).state;
 const negative=project(referenceState);
 const referenceReplayed=rankAll(fixture,negative.profile,negative.session).ranked.some(r=>r.game.id==='1');
 return {status:!checked.error&&ranked.ranked.some(r=>r.game.id==='1')&&!referenceReplayed?'pass':'fail',kind:'explicit-return-bridge',proposalAccepted:!checked.error,finishedGameAdmissible:ranked.ranked.some(r=>r.game.id==='1'),referenceReplayed,rejection:checkSieves(fixture.byId.get('1'),taste,session,fixture),boundary:'These are hand-written interpretations testing the bridge, not model understanding. Explicit gameIntent is required; a similar-game reference must not bypass completed exposure.'};
});
await run('started-history',()=>{
 const s=ready('Первую игру только начал'),checked=proposed(s,[fact(s,{scope:'history',stance:'history',gameId:'1',exposure:'started'})]);
 const {profile,session}=project(checked.state),taste=buildTaste(fixture,profile);
 return {status:rankAll(fixture,profile,session).ranked.some(r=>r.game.id==='1')&&!taste.dislike.size?'pass':'fail',kind:'deterministic-contract',admissible:rankAll(fixture,profile,session).ranked.some(r=>r.game.id==='1'),negativeWeights:taste.dislike.size};
});
await run('blocked-return',async()=>{
 const service=createConversationService({catalogs:{game:fixture},plan:async()=>{throw Error('No planning');},pick:async()=>{throw Error('No picking');}});
 let s={...ready(),phase:'result',result:{top:{id:'1',name:'The Witcher 3'},alternatives:[]}};
 s=(await service({state:s,rememberedExclusions:['1'],action:{type:'familiar_keep',id:'1'}})).state;
 let p=project(s),during=rankAll(fixture,p.profile,p.session).ranked.map(r=>r.game.id);
 const restarted=(await service({state:s,rememberedExclusions:['1'],action:{type:'restart'}})).state;
 p=project({...restarted,context:{platform:'windows',company:'solo',partySize:null}});
 const after=rankAll(fixture,p.profile,p.session).ranked.map(r=>r.game.id);
 return {status:during.includes('1')&&during.includes('2')&&!after.includes('1')&&!after.includes('2')&&after.includes('3')?'pass':'fail',kind:'deterministic-contract',allowedDuringReturn:during.filter(id=>['1','2'].includes(id)),excludedAfterRestart:!after.includes('1')&&!after.includes('2'),keepAfterRestart:restarted.familiar.keep};
});
await run('replace-undo',async()=>{
 let plans=0,picks=0;const service=createConversationService({catalogs:{game:fixture},plan:async()=>{plans++;throw Error('No planning');},pick:async()=>{picks++;return {picks:[{id:'4',reason:'Offline stub choice'}]};}});
 const initial={...ready('История и исследование'),phase:'result',result:{top:{id:'1',name:'Old'},alternatives:[{id:'3',name:'Retained',ai:{reason:'Keep this reason'}}]}};
 const marked=await service({state:initial,action:{type:'familiar_mark',id:'1'}}),body={state:marked.state,action:{type:'replace_familiar'}};
 const a=await service(body),b=await service(body),undo=await service({state:a.state,action:{type:'undo_replacement'}});
 return {status:plans===0&&picks===1&&JSON.stringify(a)===JSON.stringify(b)&&JSON.stringify(a.state.result.alternatives[0])===JSON.stringify(initial.result.alternatives[0])&&JSON.stringify(undo.state.result)===JSON.stringify(initial.result)?'pass':'fail',kind:'deterministic-contract',plans,picks,summaryPreserved:a.state.summary===initial.summary,retainedIds:a.feedbackCarry?.retainedIds};
});
await run('v1-error-resume',async()=>{
 let calls=0;const service=createConversationService({catalogs:{game:fixture},access:()=>({allowed:false}),plan:async()=>{calls++;throw Error('No API');}});
 let s=newConversation({id:'v1-resume'});for(const id of ['rpg','windows','solo'])s=reply(s,[id]);delete s.familiar;delete s.replacement;s.failedAction='plan';
 const restored=await service({state:s});
 try {const answered=await service({state:restored.state,action:{type:'answer',questionId:restored.screen.question.id,text:'Исследовать мир'}});return {status:answered.state.turns.at(-1).text==='Исследовать мир'&&calls===0?'pass':'fail',kind:'deterministic-contract',calls};}
 catch(error){return {status:'fail',kind:'deterministic-error',calls,displayedQuestion:restored.screen.question.id,stateQuestion:restored.state.question,error:error.message};}
});
await run('today-minutes',()=>{
 const s=ready('Сегодня есть 30 минут, хочу исследовать мир'),checked=proposed(s,[fact(s,{key:'today-minutes',text:'Сегодня есть 30 минут',quote:'Сегодня есть 30 минут'})],fixture,
  {sessionTime:{minutes:30,sourceId:s.turns.at(-1).id,quote:'Сегодня есть 30 минут'}});
 const {session}=project(checked.state),checks=feasibilityOf(fixture.byId.get('1'),session);
 const history=ready('Прошёл игру за 10 часов'),historyBudget=proposed(history,[],fixture,{sessionTime:{minutes:600,sourceId:history.turns.at(-1).id,quote:history.turns.at(-1).answer}});
 return {status:session.minutes===30&&checks.some(c=>c.key==='minutes'&&c.status==='unknown')&&Boolean(historyBudget.error)?'pass':'fail',kind:'structured-time-bridge',proposalAccepted:!checked.error,minutes:session.minutes??null,completionHoursRejected:Boolean(historyBudget.error),checks,boundary:'The new nullable sessionTime proposal field is validated against exact active source and duration value. Interruption remains unknown; this is not a human-fit or model-understanding measurement.'};
});
await run('real-catalog-directions',()=>{
 const specs=[['story-rpg','story.central','RPG','rpg','RPG, хочу сюжет'],['driving-racing','loop.driving',null,'racing','Хочу гонки и вождение'],['cooperative-survival','loop.survival',null,null,'Только кооператив, выживание для троих']];
 const rows=specs.map(([id,feature,genre,direction,text])=>{
  const s=ready(text,id==='cooperative-survival'?'group':'solo');
  const facts=[fact(s,{key:'signal',feature})];if(direction)facts.push(fact(s,{key:'direction:'+direction,quote:genre||'гонки',text:genre||'Гонки'}));
  if(id==='cooperative-survival')facts.push(fact(s,{key:'cooperative-only',stance:'require',feature:'social.coop',quote:'Только кооператив'}));
  const checked=proposed(s,facts,real),{profile,session}=project(checked.state,real);
  const {ranked,taste,removed}=rankAll(real,profile,session),top=ranked.slice(0,10);
  return {id,proposalAccepted:!checked.error,eligible:ranked.length,removedByFirstSieve:removed,allPass:top.every(r=>checkSieves(r.game,taste,session,real)===null),top:top.map(r=>({id:r.game.id,name:r.game.ru||r.game.name,score:Number(r.score.toFixed(3))}))};
 });
 const lists=rows.map(r=>JSON.stringify(r.top.map(x=>x.id)));
 return {status:rows.every(r=>r.proposalAccepted&&r.allPass&&r.eligible>0)&&new Set(lists).size===rows.length?'pass':'fail',kind:'real-catalog-diagnostics',rows,boundary:'Distinct scored lists demonstrate wiring only. They do not prove semantic understanding, sufficient retrieval recall or human fit.'};
});
await run('real-catalog-capacity',()=>{
 const s=ready('Спокойное кооперативное выживание','group');s.facts=[fact(s,{feature:'loop.survival'})];
 const {profile,session}=project(s,real),{ranked}=rankAll(real,profile,session),top=ranked.slice(0,12);
 const checks=top.map(r=>({id:r.game.id,name:r.game.ru||r.game.name,players:feasibilityOf(r.game,session).find(c=>c.key==='players')}));
 return {status:checks.length>0&&checks.every(r=>r.players&&['yes','unknown','conditional'].includes(r.players.status))?'pass':'fail',kind:'real-catalog-diagnostics',checks,unknownOrConditional:checks.filter(r=>r.players.status!=='yes').length,boundary:'Unknown capacity is disclosed, not silently certified. This audit does not independently verify each external player-count source.'};
});

const sources=['src/core/conversation.js','src/core/session-time.js','src/server/conversation-service.js','src/core/sieves.js','src/core/feasibility.js'];
const record={at:new Date().toISOString(),frozenFileSha256:createHash('sha256').update(readFileSync(new URL('./cases.frozen.json',import.meta.url))).digest('hex'),catalog:{items:real.items.length,sha256:createHash('sha256').update(catalogBytes).digest('hex')},sources:Object.fromEntries(sources.map(path=>[path,createHash('sha256').update(readFileSync(new URL('../../../'+path,import.meta.url))).digest('hex')])),paidApiCalls:0,humanFit:null,results:output};
writeFileSync(new URL('./results.json',import.meta.url),JSON.stringify(record,null,2)+'\n');
for(const row of output)console.log(JSON.stringify({id:row.id,status:row.status,kind:row.kind,error:row.error??null}));
console.log(JSON.stringify({cases:output.length,passed:output.filter(r=>r.status==='pass').length,failed:output.filter(r=>r.status==='fail').length,catalogItems:real.items.length,paidApiCalls:0,humanFit:null}));
