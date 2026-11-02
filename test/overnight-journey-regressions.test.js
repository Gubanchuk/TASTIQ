import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newConversation,answerConversation,applyConversationProposal,conversationToLegacy,conversationScreen} from '../src/core/conversation.js';
import {createConversationService} from '../src/server/conversation-service.js';
import {fixtureCatalog} from './fixture.js';
import {rankAll} from '../src/core/recommend.js';
import {profileOf,sessionOf} from '../src/core/dialogue.js';
import {createConversationClient,CONVERSATION_KEY} from '../src/server/public/shared/conversation-client.js';

const catalog=fixtureCatalog();
function replayState() {
 let s=newConversation({id:'overnight-replay'});
 for(const id of ['rpg','windows','solo'])s=answerConversation(s,{type:'answer',questionId:s.question.id,selected:[id]});
 return answerConversation(s,{type:'correct',text:'Ведьмака 3 прошёл; сегодня хочу перепройти именно его'});
}
const fact=(s,patch={})=>({key:'past-finished',text:'Ведьмака 3 прошёл',stance:'history',scope:'history',sourceId:s.turns.at(-1).id,
 quote:'Ведьмака 3 прошёл',feature:null,gameId:'1',exposure:'finished',...patch});
const proposal=facts=>({facts,summary:'Проверяем сегодняшний выбор',uncertainties:[],action:'review',question:null});
const candidates=s=>{const legacy=conversationToLegacy(s,catalog.dict,catalog);return rankAll(catalog,profileOf(legacy),sessionOf(legacy)).ranked.map(r=>r.game.id);};

test('a restored v1 planner error has an answerable fallback question without automatic API calls',async()=>{
  const catalog=fixtureCatalog();let paidCalls=0;
  const service=createConversationService({catalogs:{game:catalog},access:()=>({allowed:false,reason:'Offline audit'}),
    plan:async()=>{paidCalls++;throw Error('No API calls allowed');},pick:async()=>{paidCalls++;throw Error('No API calls allowed');}});
  let state=newConversation({id:'overnight-v1-error'});
  for(const id of ['rpg','windows','solo'])state=answerConversation(state,{type:'answer',questionId:state.question.id,selected:[id]});
  delete state.familiar;delete state.replacement;
  state.failedAction='plan';
  const restored=await service({state});
  assert.equal(restored.screen.type,'question');
  const answered=await service({state:restored.state,action:{type:'answer',questionId:restored.screen.question.id,selected:[],text:'Спокойно исследовать мир',kind:'answer'}});
  assert.equal(answered.state.turns.at(-1).text,'Спокойно исследовать мир');
  assert.equal(paidCalls,0);
});

test('explicit today return or replay admits the finished work and its editions without inferring taste',()=>{
 for(const gameIntent of ['return','replay'])for(const stance of ['want','conditional']) {
  let s=replayState();s.familiar.excluded=['1'];
  const out=applyConversationProposal(s,proposal([fact(s),fact(s,{key:'today-return',text:'Сегодня хочу перепройти именно его',quote:'сегодня хочу перепройти именно его',scope:'today',stance,exposure:null,gameIntent})]),catalog.dict);
  assert.equal(out.error,undefined);
  assert.ok(candidates(out.state).includes('1'),`${gameIntent}/${stance}: original work`);
  assert.ok(candidates(out.state).includes('2'),`${gameIntent}/${stance}: other edition`);
  const legacy=conversationToLegacy(out.state,catalog.dict,catalog);
  assert.equal(Object.keys(legacy.answers).length,0);
  assert.deepEqual(legacy.preferences,[]);
  assert.ok(legacy.conversation.familiarity.returnToIds.includes('1'));
 }
});

test('reference or ordinary positive mention never permits replay and missing gameIntent is backward compatible',()=>{
 for(const gameIntent of [undefined,null,'reference']) {
  const s=replayState();
  const out=applyConversationProposal(s,proposal([fact(s),fact(s,{key:'today-reference',quote:'сегодня хочу перепройти именно его',scope:'today',stance:'want',exposure:null,...(gameIntent===undefined?{}:{gameIntent})})]),catalog.dict);
  assert.equal(out.error,undefined);
  assert.equal(candidates(out.state).includes('1'),false);
  assert.equal(out.state.facts[1].gameIntent,gameIntent??null);
 }
});

test('return intent cannot override a hard today exclusion and disappears with retraction or correction',()=>{
 const s=replayState(),returnFact=fact(s,{key:'today-return',quote:'сегодня хочу перепройти именно его',scope:'today',stance:'want',exposure:null,gameIntent:'replay'});
 let out=applyConversationProposal(s,proposal([fact(s),returnFact]),catalog.dict);
 assert.ok(candidates(out.state).includes('1'));
 const removed=answerConversation(out.state,{type:'remove_fact',key:returnFact.key});
 assert.equal(candidates(removed).includes('1'),false);
 out=applyConversationProposal(s,proposal([fact(s),returnFact,fact(s,{key:'today-stop',scope:'today',stance:'exclude',exposure:null,gameIntent:null})]),catalog.dict);
 assert.equal(candidates(out.state).includes('1'),false);
 assert.equal(candidates(out.state).includes('2'),false);
 const corrected=answerConversation({...removed,familiar:{...removed.familiar,excluded:['1']}},{type:'correct',text:'Сегодня хочу другую игру'});
 assert.equal(candidates(corrected).includes('1'),false);
 assert.deepEqual(conversationToLegacy(corrected,catalog.dict,catalog).conversation.familiarity.returnToIds,[]);
});

test('return intents require a current supported stance and resolved game ID',()=>{
 for(const patch of [{scope:'history'},{stance:'exclude'},{stance:'history'},{gameId:null},{gameIntent:'invented'}]) {
  const s=replayState();
  const out=applyConversationProposal(s,proposal([fact(s,{key:'return',quote:'сегодня хочу перепройти именно его',scope:'today',stance:'want',exposure:null,gameIntent:'return',...patch})]),catalog.dict);
  assert.ok(out.error,JSON.stringify(patch));
 }
});

test('saving changed context keeps the visible unanswered question and its draft reachable without planning',async()=>{
 let s=newConversation({id:'overnight-context-draft'});
 for(const id of ['rpg','windows','group','3'])s=answerConversation(s,{type:'answer',questionId:s.question.id,selected:[id]});
 const question={id:'today-experience',title:'Какого опыта хочется от игры?',why:'Уточним желание',multiple:true,options:[],controls:['unknown','indifferent','none']};
 const contextSource=s.turns.find(t=>t.question.id==='company');
 s=applyConversationProposal(s,{summary:'Вечер втроём',uncertainties:[],action:'question',question,facts:[{
  key:'old-company',text:'Нужен кооператив',stance:'require',scope:'today',sourceId:contextSource.id,quote:contextSource.answer,feature:'social.coop',gameId:null,exposure:null,
 }]},catalog.dict).state;
 const map=new Map([[CONVERSATION_KEY,JSON.stringify({version:1,snapshot:{state:s,screen:conversationScreen(s)},drafts:{}})]]);
 const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 let plans=0,seen;
 const service=createConversationService({catalogs:{game:catalog},plan:async(_,current)=>{
  plans++;seen=current;return {proposal:{summary:'Новая цель',facts:[],uncertainties:[],action:'review',question:null}};
 }});
 const client=createConversationClient({storage,fetch:async(_,options)=>({ok:true,json:async()=>service(JSON.parse(options.body))})});
 await client.start();client.saveDraft(question.id,{text:'Хочу спокойно исследовать мир',selected:[],kind:'answer'});
 await client.send({type:'context',company:'solo',platform:'windows',partySize:null});
 assert.equal(plans,0);
 assert.equal(client.screen.type,'question');
 assert.equal(client.screen.question.id,question.id);
 assert.equal(client.draft(client.screen.question.id).text,'Хочу спокойно исследовать мир');
 assert.equal(client.state.facts.some(f=>f.key==='old-company'),false);
 assert.equal(client.state.context.company,'solo');
 const draft=client.draft(question.id);
 await client.send({type:'answer',questionId:question.id,text:draft.text,selected:[],kind:'answer'});
 assert.equal(plans,1);
 assert.equal(seen.context.company,'solo');
 assert.equal(seen.context.partySize,null);
 assert.equal(seen.turns.at(-1).text,'Хочу спокойно исследовать мир');
});

test('back after saving context restores the previous conditions and the same unanswered question',()=>{
 let s=replayState();
 const question={id:'unanswered-experience',title:'Что хочется получить от игры?',options:[],multiple:true};
 s=applyConversationProposal(s,{...proposal([]),action:'question',question},catalog.dict).state;
 s=answerConversation(s,{type:'context',platform:'windows',company:'group',partySize:'3'});
 assert.equal(s.question.id,question.id);
 s=answerConversation(s,{type:'back'});
 assert.equal(s.phase,'talk');assert.equal(s.question.id,question.id);
 assert.equal(s.context.company,'solo');assert.equal(s.context.partySize,null);
 assert.equal(s.needsPlan,false);
});
