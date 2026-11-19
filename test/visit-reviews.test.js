import test from 'node:test';
import assert from 'node:assert/strict';
import {createVisitReviews} from '../src/server/public/shared/visit-reviews.js';
import {tasteMemoryPanelHtml} from '../src/server/public/shared/visit-reviews.js';
import {historicalReviewEntries} from '../src/server/public/shared/selection-review.js';
import {createConversationClient} from '../src/server/public/shared/conversation-client.js';
import {feedbackContextPrompt} from '../src/ai/feedback-context.js';
import {createConversationService} from '../src/server/conversation-service.js';
import {newConversation,answerConversation,conversationToLegacy} from '../src/core/conversation.js';
import {fixtureCatalog} from './fixture.js';
import {rankAll} from '../src/core/recommend.js';
import {profileOf,sessionOf} from '../src/core/dialogue.js';

const review=(id,overrides={})=>({id,domain:'film',updatedAt:'2026-11-19',cards:[{id:'title',title:'Фильм'}],
 selectionReview:{learn:true,verdict:'partial',issue:'fit',requestSummary:'Пожелание',note:id},...overrides});
const runs=[review('first-review'),review('second-review'),review('another-domain',{domain:'game'}),review('not-opted-in',{selectionReview:{learn:false,verdict:'accept'}})];
const entries=()=>historicalReviewEntries(runs,'film');

function view(client,getEntries=entries){
 const handlers=new Map();
 const slot={innerHTML:'',querySelector:()=>null,contains:()=>false};
 const root={querySelector:()=>slot,addEventListener:(name,handler)=>handlers.set(name,handler)};
 const controls=createVisitReviews({client,entries:getEntries,root});
 const use=(id,checked)=>handlers.get('change')({target:{checked,dataset:{visitReview:id}}});
 return {controls,slot,use};
}

test('only opted-in reviews from the section appear, and a visit override follows its draft across reload and restart',async()=>{
 const map=new Map(),storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};
 const before=JSON.stringify(runs);
 const options={storage,domain:'film',localStart:true};
 const first=createConversationClient(options);first.chooseDepth('standard');const a=view(first);a.controls.refresh();
 assert.match(a.slot.innerHTML,/2 из 2/);assert.match(a.slot.innerHTML,/Пожелание/);assert.doesNotMatch(a.slot.innerHTML,/another-domain|not-opted-in/);
 a.use('first-review',false);assert.match(a.slot.innerHTML,/1 из 2/);
 assert.deepEqual(a.controls.context().map(r=>r.note),['second-review']);
 const reload=createConversationClient(options),b=view(reload);
 assert.deepEqual(b.controls.context(),a.controls.context());
 reload.chooseDepth('deep',{restart:true});assert.deepEqual(b.controls.context().map(r=>r.note),['first-review','second-review']);
 assert.equal(JSON.stringify(runs),before);
});

test('switching one review off changes the final picker prompt for the same dialogue and revision',async()=>{
 const domain='game',cat=fixtureCatalog(),drafts=new Map();
 const client={draft:key=>drafts.get(key)??{},saveDraft:(key,value)=>drafts.set(key,value)};
 const ui=view(client,()=>historicalReviewEntries([review('first-review',{domain}),review('second-review',{domain})],domain));
 let state=newConversation({id:'visit-reviews-prompt'});
 for(const selected of ['rpg','windows','solo']){
  state=answerConversation(state,{type:'answer',questionId:state.question.id,selected:[selected],kind:'answer'});
 }
 state={...state,phase:'review',question:null,needsPlan:false,summary:'Сегодня хочу RPG'};
 const legacy=conversationToLegacy(state,cat.dict,cat);
 const picks=rankAll(cat,profileOf(legacy),sessionOf(legacy)).ranked.slice(0,4).map(({game})=>({id:game.id,title:'',year:0,reason:'Подходит',caveat:'',likelySeen:false}));
 const prompts=[];
 const service=createConversationService({catalogs:{game:cat},api:async req=>{
  prompts.push(req.input);
  return {status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({understood:'Запрос',picks})}]}]};
 }});
 const confirm=()=>service({state,action:{type:'confirm'},qualityFeedback:ui.controls.context()});
 assert.equal((await confirm()).error,undefined);assert.match(prompts[0],/first-review/);assert.match(prompts[0],/second-review/);
 ui.use('first-review',false);assert.equal((await confirm()).error,undefined);
 assert.equal(prompts.length,2);assert.doesNotMatch(prompts[1],/first-review/);assert.match(prompts[1],/second-review/);
});

test('a transport retry rebuilds the review payload after the last review is switched off',async()=>{
 const sent=[];let controls;
 const client=createConversationClient({domain:'film',localStart:true,qualityFeedback:()=>controls.context(),fetch:async(_,init)=>{
  const body=JSON.parse(init.body);sent.push(body);
  if(sent.length===1)throw TypeError('Fixture connection failure');
  return {ok:true,json:async()=>({state:body.state,screen:{type:'question'}})};
 }});
 const ui=view(client);controls=ui.controls;client.chooseDepth('standard');
 ui.use('second-review',false);await client.send({type:'review'});
 assert.deepEqual(sent[0].qualityFeedback.map(row=>row.note),['first-review']);
 assert.ok(!Object.hasOwn(sent[0].qualityFeedback[0],'id'));
 ui.use('first-review',false);await client.retry();
 assert.ok(!Object.hasOwn(sent[1],'qualityFeedback'));assert.equal(feedbackContextPrompt(sent[1].qualityFeedback),'');
});

test('a per-visit review switch also suppresses its promoted reason; the preference manager is always reachable',()=>{
 const client=createConversationClient({domain:'film',localStart:true,storage:null});client.chooseDepth('standard');
 const rows=[{id:'from-review',domain:'film',revision:1,text:'Тихие истории <script>',source:{kind:'review',id:'first-review'}},
  {id:'manual',domain:'film',revision:2,text:'Без спешки',source:{kind:'manual'}}];
 const handlers={},root={addEventListener:(name,handler)=>handlers[name]=handler,querySelector:()=>null};
 const memory={context:()=>rows,filterReviews:(_,reviews)=>reviews.filter(row=>row.id!=='first-review')};
 const ctl=createVisitReviews({client,entries,root,memory,domain:'film'});
 client.saveDraft('__skipReview:first-review',{text:'off'});
 assert.deepEqual(ctl.tasteContext().map(row=>row.id),['manual']);
 assert.deepEqual(ctl.context().map(row=>row.note),['second-review']);
 handlers.change({target:{dataset:{visitMemory:'manual'},checked:false}});
 assert.deepEqual(ctl.tasteContext(),[]);
 assert.match(tasteMemoryPanelHtml('film',rows,()=>true),/Тихие истории &lt;script&gt;/);
 assert.match(tasteMemoryPanelHtml('film',[],()=>true),/memory.domain=film/);
});
