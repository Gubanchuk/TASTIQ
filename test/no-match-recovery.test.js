import test from 'node:test';
import assert from 'node:assert/strict';
import {createMediaConversationService} from '../src/server/media-conversation-service.js';
import {screenFixture} from './fixture.js';
import {mediaConversationToLegacy} from '../src/core/media-conversation.js';
import {animeRequestOptions} from '../src/core/anime-request.js';
import {criteriaOf} from '../src/ai/pick-constraints.js';
import {makeCatalog} from '../src/core/catalog.js';
import {noMatchHtml} from '../src/server/public/shared/no-match-view.js';

const film=screenFixture('film');
const withService=options=>{
 const service=createMediaConversationService({domain:'film',catalogs:{film},...options});
 return (state,action,extra)=>service({domain:'film',state,action,...extra});
};

test('a five-minute film wish offers a nearby runtime and a wider ordinary session with several eligible works',async()=>{
 const items=[31,55,60,78,82,90].map((runtime,i)=>({...film.items[0],runtime,id:'f'+i,work:'f'+i,name:'Film '+i}));
 const catalog=makeCatalog({...film,items},'film');
 const text='Хочу полнометражную драму о семье. На фильм есть пять минут.';
 const plan=(_,s)=>{
   const evidence={sourceId:s.turns[0].id,quote:'На фильм есть пять минут.'};
   return {proposal:{summary:text,context:{company:null,childAge:null,timeMode:{...evidence,value:'session'},commitment:null,onlyEnded:null,format:null},
     sessionTime:{...evidence,minutes:5},uncertainties:[],action:'review',question:null,facts:[]}};
 };
 const send=withService({catalogs:{film:catalog},plan,pick:()=>({error:'Все кандидаты проверены',noMatch:'checked',retryable:false})});
 const start=await send(),wish=await send(start.state,{type:'answer',questionId:start.screen.question.id,text});
 assert.equal(wish.state.sessionTime?.minutes,5);
 assert.equal(mediaConversationToLegacy(wish.state,catalog.dict,catalog).session.requireKnownRuntime,true);
 const out=await send(wish.state,{type:'confirm'});
 assert.deepEqual(out.screen.noMatch.choices.map(c=>c.action),[{type:'extend_runtime',minutes:31},{type:'extend_runtime',minutes:90}]);
 const changed=await send(out.state,out.screen.noMatch.choices[1].action);
 assert.equal(changed.state.sessionTime.minutes,90);
 assert.equal(mediaConversationToLegacy(changed.state,catalog.dict,catalog).session.requireKnownRuntime,true);
 const reverted=await send(changed.state,{type:'back'});
 assert.equal(reverted.state.sessionTime.minutes,5);
 assert.equal(mediaConversationToLegacy(reverted.state,catalog.dict,catalog).session.requireKnownRuntime,true);
 const narrow=await send(wish.state,{type:'confirm'},{rememberedExclusions:['f3','f4','f5']});
 assert.deepEqual(narrow.screen.noMatch.choices.map(c=>c.action),[{type:'extend_runtime',minutes:31}]);
});

test('a checked empty selection offers a positive, grounded theme edit without dropping mixed, safety or format requirements',async()=>{
 const facts=[['power','История о борьбе за власть','require'],['freedom','Тема свободы','require'],
  ['safety','Тема власти без эротики','require'],['order','Хочу детектив, который можно смотреть отдельно','require'],
  ['format','Политика в полнометражном фильме','require'],['content','Без мата','exclude']];
 const text=facts.map(f=>f[1]).join('. ')+'.';
 const send=withService({plan:(_,s)=>({proposal:{summary:text,context:{company:null,childAge:null,timeMode:null,commitment:null,onlyEnded:null,format:null},sessionTime:null,uncertainties:[],action:'review',question:null,
   facts:facts.map(([key,quote,stance])=>({key,quote,text:quote,stance,scope:'today',sourceId:s.turns[0].id,feature:null,titleId:null,exposure:null,titleIntent:null}))}}),
   pick:()=>({error:'Нет совпадений',noMatch:'checked',retryable:false})});
 const start=await send(),wish=await send(start.state,{type:'answer',questionId:start.screen.question.id,text});
 const empty=await send(wish.state,{type:'confirm'});
 assert.deepEqual(empty.screen.noMatch.choices.map(c=>c.action),['power','freedom'].map(key=>({type:'remove_fact',key})));
 const changed=await send(empty.state,empty.screen.noMatch.choices[0].action);
 const rules=state=>criteriaOf(mediaConversationToLegacy(state,film.dict,film)).map(f=>f.text);
 assert.deepEqual(rules(changed.state),rules(wish.state).filter(line=>line!==facts[0][1]));
 assert.deepEqual(changed.state.context,wish.state.context);
 assert.match(noMatchHtml(empty.screen,String),/проверим варианты по остальным пожеланиям/iu);
});

test('an empty saved collection has a working link to saved titles in the affected section',()=>{
 const html=noMatchHtml({domain:'film',type:'review',savedSource:{domain:'film',ids:[]},noMatch:{message:'Нет вариантов.',choices:[]}},String);
 assert.match(html,/href="\/library\/\?view=saved&amp;saved\.domain=film"/);
});

test('«мне» is not a negation before an explicit age rating',()=>{
 const strict=answer=>animeRequestOptions({domain:'anime',turns:[{kind:'answer',id:'one',answer}]}).verifiedAge;
 for(const text of ['Нужен фильм с официальной маркировкой 18+','Мне нужен фильм с официальной маркировкой 18+','Мне только 18+'])assert.equal(strict(text),true,text);
 for(const text of ['Не нужен фильм 18+','Не только 18+','не   только 18+','Только 18+ серий'])assert.equal(strict(text),false,text);
});

test('empty catalog returns a restorable choice, and only the viewer releases their time limit',async()=>{
 const send=withService({access:()=>({allowed:false})});
 const start=await send(),review=await send(start.state,{type:'review'}),edited=await send(review.state,{type:'set_context',context:{minutes:30,timeMode:'runtime'}});
 const out=await send(edited.state,{type:'confirm'},{rememberedExclusions:['t1']});
 assert.equal(out.error,undefined);
 assert.equal(out.screen.noMatch.kind,'catalog');
 assert.equal(out.state.sessionTime.minutes,30);
 assert.deepEqual(out.state.familiar.excluded,['t1']);
 const restored=await send(out.state);
 assert.deepEqual(restored.screen.noMatch,out.screen.noMatch);
 assert.deepEqual(out.screen.noMatch.choices.map(choice=>choice.action),[{type:'extend_runtime',minutes:150}]);
 const changed=await send(restored.state,restored.screen.noMatch.choices[0].action);
 assert.equal(changed.screen.type,'review');
 assert.equal(changed.state.sessionTime.minutes,150);
 const result=await send(changed.state,{type:'confirm'});
 assert.ok(result.screen.result.top);
 assert.ok([result.screen.result.top,...result.screen.result.alternatives].every(card=>card.id!=='t1'));
 const blocked=await send(edited.state,{type:'confirm'},{rememberedExclusions:['t1','t2','t3']});
 assert.deepEqual(blocked.screen.noMatch.choices,[]);
});

test('a strict 18+ certificate offers one explicit opt-out, preserves independent exclusions, and cannot relax a child request',async()=>{
 const blank={company:null,childAge:null,timeMode:null,commitment:null,onlyEnded:null,format:null};
 const text='Хочу фильм про взрослую жизнь и серьёзные отношения. Только 18+. Без эротики.';
 const facts=(sourceId)=>[
  {key:'rating',scope:'today',stance:'require',sourceId,quote:'Только 18+',text:'Только 18+',feature:'audience.adult',titleId:null,exposure:null,titleIntent:null},
  {key:'without-sex',scope:'today',stance:'exclude',sourceId,quote:'Без эротики',text:'Без эротики',feature:'content.sexual',titleId:null,exposure:null,titleIntent:null}];
 const send=withService({plan:(_,s)=>({proposal:{summary:text,context:blank,sessionTime:null,uncertainties:[],action:'review',question:null,facts:facts(s.turns.at(-1).id)}})});
 const start=await send(),wish=await send(start.state,{type:'answer',questionId:start.screen.question.id,text});
 const offline=withService({access:()=>({allowed:false})});
 const empty=await offline(wish.state,{type:'confirm'});
 assert.equal(empty.error,undefined);
 assert.match(empty.screen.noMatch.message,/возрастн/);
 assert.deepEqual(empty.screen.noMatch.choices.map(x=>x.action),[{type:'allow_unverified_rating'}]);
 const change=await offline(empty.state,empty.screen.noMatch.choices[0].action);
 assert.deepEqual(change.state.facts.map(f=>f.key),['without-sex']);
 const result=await offline(change.state,{type:'confirm'});
 assert.ok(result.screen.result?.top);
 assert.ok(result.screen.result.top.feasibility.some(row=>row.text.includes('Без эротики')));
 const child=await offline(empty.state,{type:'set_context',context:{company:'children',childAge:10}});
 const stillEmpty=await offline(child.state,{type:'confirm'});
 assert.deepEqual(stillEmpty.screen.noMatch.choices,[]);
 await assert.rejects(offline(stillEmpty.state,{type:'allow_unverified_rating'}),{status:400});
});

test('a non-answer from the service remains retryable and distinct from an empty selection',async()=>{
 const send=withService({pick:()=>({error:'Временный сбой',retryable:true})});
 const start=await send(),review=await send(start.state,{type:'review'}),out=await send(review.state,{type:'confirm'});
 assert.equal(out.error,'Временный сбой');
 assert.equal(out.screen.noMatch,undefined);
});

test('Back restores a runtime limit from before the suggested edit, after a free reload',async()=>{
 const send=withService({access:()=>({allowed:false})});
 const start=await send(),review=await send(start.state,{type:'review'});
 const capped=await send(review.state,{type:'set_context',context:{minutes:30,timeMode:'runtime'}});
 const empty=await send(capped.state,{type:'confirm'});
 const choice=empty.screen.noMatch.choices[0].action;
 assert.deepEqual(choice,{type:'extend_runtime',minutes:90});
 const changed=await send(empty.state,choice),restored=await send(changed.state);
 assert.equal(restored.state.sessionTime.minutes,90);
 const back=await send(restored.state,{type:'back'});
 assert.equal(back.screen.type,'review');
 assert.equal(back.state.sessionTime?.minutes,30);
 assert.equal(back.state.context.timeMode,'runtime');
 assert.equal((await send(back.state)).state.sessionTime.minutes,30);
});

test('the explicit age opt-out clears a paraphrased requirement whilst preserving other wishes; Back restores it',async()=>{
 const quote='Нужен рейтинг 18+ для этого фильма';
 const text='Хочется напряжённой истории с неоднозначными героями. '+quote+'. Без школьной романтики.';
 const send=withService({plan:(_,s)=>({proposal:{summary:text,context:{company:null,childAge:null,timeMode:null,commitment:null,onlyEnded:null,format:null},sessionTime:null,uncertainties:[],action:'review',question:null,
   facts:[['age',quote,'Требуется официальный рейтинг 18+','require'],['avoid','Без школьной романтики','Без школьной романтики','exclude']].map(([key,quote,text,stance])=>({key,quote,text,stance,scope:'today',sourceId:s.turns[0].id,feature:null,titleId:null,exposure:null,titleIntent:null}))}})});
 const start=await send(),wish=await send(start.state,{type:'answer',questionId:start.screen.question.id,text});
 const offline=withService({access:()=>({allowed:false})});
 const rules=state=>criteriaOf(mediaConversationToLegacy(state,film.dict,film)).map(c=>c.text);
 const empty=await offline(wish.state,{type:'confirm'}),changed=await offline(empty.state,empty.screen.noMatch.choices[0].action);
 assert.deepEqual(rules(changed.state),['Без школьной романтики']);
 assert.doesNotMatch(changed.screen.summary,/18\+/);assert.match(changed.screen.summary,/школьной романтики/);
 const resumed=await offline(changed.state);
 const back=await offline(resumed.state,{type:'back'});
 assert.equal(back.screen.type,'review');
 assert.deepEqual(rules(back.state),rules(wish.state));
 assert.equal(mediaConversationToLegacy(back.state,film.dict,film).session.verifiedAge,true);
 assert.deepEqual(rules((await offline(back.state)).state),rules(wish.state));
});

test('a compound rating and content condition retains its exact content clause through opt-out and reload',async()=>{
 const quote='Только 18+ и без эротики';
 const text='Хочу напряжённую фантастическую историю с неоднозначными героями. '+quote+'.';
 const send=withService({plan:(_,s)=>({proposal:{summary:text,context:{company:null,childAge:null,timeMode:null,commitment:null,onlyEnded:null,format:null},sessionTime:null,uncertainties:[],action:'review',question:null,
   facts:[{key:'mixed',quote,text:'Требуется рейтинг 18+ и отсутствие эротики',stance:'require',scope:'today',sourceId:s.turns[0].id,feature:null,titleId:null,exposure:null,titleIntent:null}]}})});
 const start=await send(),wish=await send(start.state,{type:'answer',questionId:start.screen.question.id,text});
 const offline=withService({access:()=>({allowed:false})});
 const empty=await offline(wish.state,{type:'confirm'}),change=await offline(empty.state,empty.screen.noMatch.choices[0].action),restored=await offline(change.state);
 const rules=criteriaOf(mediaConversationToLegacy(restored.state,film.dict,film));
 assert.deepEqual(rules.map(rule=>[rule.quote,rule.stance]),[['без эротики','exclude']]);
 assert.doesNotMatch(restored.screen.summary,/18\+/);
 const back=await offline(restored.state,{type:'back'});
 assert.deepEqual(back.state.facts,wish.state.facts);
});

test('an ambiguous 18+ wish does not become erotic content, profanity or adult-targeted animation',async()=>{
 const blank={company:null,childAge:null,timeMode:null,commitment:null,onlyEnded:null,format:null};
 const text='Хочу фантастику про власть и свободу с длинной историей и сложными героями. Можно 18+.';
 const send=withService({plan:(_,s)=>({proposal:{summary:'Нужны эротика и мат',context:blank,sessionTime:null,uncertainties:[],action:'review',question:null,
   facts:['audience.adult','content.profanity','content.sexual'].map((feature,index)=>({key:'mature'+index,scope:'today',stance:'require',sourceId:s.turns.at(-1).id,quote:'Можно 18+',text:'Нужен взрослый контент',feature,titleId:null,exposure:null,titleIntent:null}))}})});
 const start=await send();
 const out=await send(start.state,{type:'answer',questionId:start.screen.question.id,text,kind:'answer'});
 assert.equal(out.error,undefined);
 assert.doesNotMatch(out.screen.summary,/эротик|мат|нужен взрослый/iu);
 const projected=mediaConversationToLegacy(out.state,film.dict,film);
 assert.deepEqual(projected.session.goalRequires,[]);
 assert.deepEqual(projected.session.goalExcludes,[]);
});

test('permission for 18+ stays optional even if a planner returns a hard untyped fact with the short quote',async()=>{
 const text='Мне интересны сложные персонажи и моральные дилеммы в фантастической истории. Можно 18+.';
 const send=withService({plan:(_,s)=>({proposal:{summary:'Рейтинг обязателен',context:{company:null,childAge:null,timeMode:null,commitment:null,onlyEnded:null,format:null},sessionTime:null,uncertainties:[],action:'review',question:null,
  facts:[{key:'age',text:'Рейтинг 18+',stance:'require',scope:'today',sourceId:s.turns[0].id,quote:'18+',feature:null,titleId:null,exposure:null,titleIntent:null}]}})});
 const start=await send(),out=await send(start.state,{type:'answer',questionId:start.screen.question.id,text});
 assert.equal(out.state.facts[0].stance,'conditional');
 assert.deepEqual(criteriaOf(mediaConversationToLegacy(out.state,film.dict,film)),[]);
});
