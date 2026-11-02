import test from 'node:test';
import assert from 'node:assert/strict';
import {questionDraftKey,questionScreenKey,planLegacyQuestionDraftMigration,legacyQuestionDraftKeyV2,backDraftSeed,prepareBackDraft,finishBackDraft} from '../src/server/public/pick/game/question-drafts.js';

const q={id:'experience',title:'Какой темп хочется?',multiple:true,options:[{id:'calm',label:'Спокойный'},{id:'fast',label:'Быстрый'}]};
const state=(turns=[],id='dialogue')=>({id,turns});
const accepted=(question=q,kind='none',text='',selected=[])=>({question,kind,text,selected});
const empty=()=>({text:'',selected:[],kind:'answer'});
const plan=(s,current,legacy,scoped={})=>new Map(planLegacyQuestionDraftMigration(s,{type:'question',question:current},key=>scoped[key]??legacy[key]??empty()));

test('a repeated identical question after none starts a new blank draft instance',()=>{
 const first=questionDraftKey(state(),q),second=questionDraftKey(state([accepted()]),q);
 assert.notEqual(first,second);
 assert.notEqual(questionScreenKey(state(),{type:'question',question:q}),questionScreenKey(state([accepted()]),{type:'question',question:q}));
});
test('wording or option changes split drafts; option reordering alone does not',()=>{
 const first=questionDraftKey(state(),q);
 assert.notEqual(first,questionDraftKey(state(),{...q,title:'Какой мир хочется?'}));
 assert.notEqual(first,questionDraftKey(state(),{...q,options:[{id:'calm',label:'Один'},{id:'fast',label:'Вдвоём'}]}));
 assert.equal(first,questionDraftKey(state(),{...q,options:[...q.options].reverse()}));
 assert.notEqual(first,questionDraftKey(state([],'another-dialogue'),q));
});
test('Back, a free context edit and reload recover the same question instance',()=>{
 const before=state(),key=questionDraftKey(before,q);
 const withContext=state([accepted({id:'context',title:'Условия вечера',options:[]},'answer')]);
 assert.equal(questionDraftKey(withContext,q),key);
 const afterAnswer=state([...withContext.turns,accepted()]);
 assert.equal(questionDraftKey({...afterAnswer,turns:afterAnswer.turns.slice(0,-1)},q),key);
 assert.equal(questionDraftKey(structuredClone(withContext),structuredClone(q)),key);
});
test('legacy migration preserves the current unsubmitted words and never overwrites a scoped draft',()=>{
 const s=state(),key=questionDraftKey(s,q),legacy={experience:{text:'Хочу гонки',selected:[],kind:'answer'}};
 assert.equal(plan(s,q,legacy).get(key).text,'Хочу гонки');
 assert.equal(plan(s,q,legacy,{[key]:{text:'Новый сохранённый черновик',selected:[],kind:'answer'}}).has(key),false);
 assert.equal(legacy.experience.text,'Хочу гонки');
});
test('obviously stale legacy none belongs to the accepted instance, not the repeated question',()=>{
 const s=state([accepted()]),legacy={experience:{text:'',selected:[],kind:'none'}},writes=plan(s,q,legacy);
 assert.equal(writes.has(questionDraftKey(s,q)),false);
 assert.deepEqual(writes.get(questionDraftKey(state(),q)),legacy.experience);
});
test('legacy words matching the last accepted same topic do not leak into changed wording',()=>{
 const old=accepted(q,'answer','  Хочу быстрый темп  ',[{id:'fast',label:'Быстрый'}]),s=state([old]);
 const next={...q,title:'Что важно в мире игры?'},legacy={experience:{text:'Хочу быстрый темп',selected:['fast'],kind:'answer'}},writes=plan(s,next,legacy);
 assert.equal(writes.has(questionDraftKey(s,next)),false);
 assert.equal(writes.get(questionDraftKey(state(),q)).text,'Хочу быстрый темп');
});
test('ambiguous legacy edits are conservatively kept on the current question and remain recoverable',()=>{
 const s=state([accepted(q,'answer','Люблю головоломки')]),legacy={experience:{text:'А сегодня хочу гонки',selected:[],kind:'answer'}},writes=plan(s,q,legacy);
 assert.equal(writes.get(questionDraftKey(s,q)).text,'А сегодня хочу гонки');
 assert.equal(writes.get(questionDraftKey(state(),q)).text,'Люблю головоломки');
});
test('legacy suspended words on review remain recoverable when returning to the latest known question',()=>{
 const s=state([accepted()]),legacy={experience:{text:'Хочу спокойную игру',selected:[],kind:'none'}};
 const writes=new Map(planLegacyQuestionDraftMigration(s,{type:'review'},key=>legacy[key]??empty()));
 assert.deepEqual(writes.get(questionDraftKey(state(),q)),legacy.experience);
 assert.equal(legacy.experience.text,'Хочу спокойную игру');
});
test('an explicit correction starts a new draft epoch even when the old question was unanswered and unchanged',()=>{
 const before=state(),oldKey=questionDraftKey(before,q),saved=new Map([[oldKey,{text:'Хочу сюжет',selected:[],kind:'answer'}]]);
 const correction={id:'dialogue:9',question:{id:'correction:9',title:'Что нужно изменить?',options:[]},kind:'answer',text:'Теперь гонки без сюжета'};
 const changed=state([correction]),newKey=questionDraftKey(changed,q);
 assert.notEqual(newKey,oldKey);assert.equal(saved.has(newKey),false);
 assert.notEqual(questionScreenKey(before,{type:'question',question:q}),questionScreenKey(changed,{type:'question',question:q}));
 assert.equal(saved.get(questionDraftKey({...changed,turns:[]},q)).text,'Хочу сюжет');
 assert.equal(questionDraftKey(state([correction,accepted({id:'context',title:'Условия вечера',options:[]},'answer')]),q),newKey);
 assert.equal(questionDraftKey(state([accepted(),correction]),q),newKey);
});
test('one-time V2 upgrade conservatively preserves current saved own words, then a future correction uses a blank new epoch',()=>{
 const correction={id:'dialogue:9',question:{id:'correction:9',title:'Поправка',options:[]},kind:'answer',text:'Хочу гонки'},s=state([correction]);
 const v2key=legacyQuestionDraftKeyV2(s,q),legacy={[v2key]:{text:'Гонки без обязательной карьеры',selected:[],kind:'answer'}};
 const writes=plan(s,q,legacy),current=questionDraftKey(s,q);
 assert.equal(writes.get(current).text,'Гонки без обязательной карьеры');
 const next=state([...s.turns,{...correction,id:'dialogue:10',question:{...correction.question,id:'correction:10'},text:'Теперь пазлы'}]);
 assert.equal(writes.has(questionDraftKey(next,q)),false);assert.notEqual(questionDraftKey(next,q),current);
});
test('Back from a submitted correction recovers editable words when no question cache was ever written',()=>{
 const correction={id:'dialogue:4',question:{id:'correction:4',title:'Что нужно изменить?',options:[]},kind:'answer',text:'Хочу гонки без обязательного сюжета',selected:[]};
 assert.deepEqual(backDraftSeed(correction.question,correction,{hasDraft:false}),{text:correction.text,selected:[],kind:'answer'});
 assert.equal(backDraftSeed(correction.question,correction,{hasDraft:true}),null);
});
test('Back seeds old selected IDs but never replaces an unanswered context-resume question or intentional empty cache',()=>{
 const turn=accepted(q,'answer','Побыстрее',[{id:'fast',label:'Быстрый'}]);
 assert.deepEqual(backDraftSeed(q,turn,{hasDraft:false}),{text:'Побыстрее',selected:['fast'],kind:'answer'});
 assert.equal(backDraftSeed(q,turn,{hasDraft:true}),null);
 assert.equal(backDraftSeed(q,{...turn,question:{id:'context'}},{hasDraft:false}),null);
});
test('a failed Back retains its exact recovery through repeated network failures until explicit Retry accepts the matching question',()=>{
 const turn={id:'dialogue:4',question:{id:'correction:4',title:'Что нужно изменить?',options:[]},kind:'answer',text:'Сегодня хочу гонки вместо исследования мира.',selected:[]};
 const pending=prepareBackDraft(state([turn])),failed=finishBackDraft(pending,state([turn]),{type:'question',question:q},{successful:false,error:'Нет связи'});
 assert.deepEqual(failed.pending,pending);assert.equal(failed.seed,null);
 const failedAgain=finishBackDraft(failed.pending,state([turn]),{type:'question',question:q},{successful:false,error:'Нет связи'});
 const retried=finishBackDraft(failedAgain.pending,state(),{type:'question',question:turn.question},{successful:true});
 assert.equal(retried.pending,null);assert.deepEqual(retried.seed,{text:turn.text,selected:[],kind:'answer'});
});
test('accepted Back retry respects a user cache and cannot seed another conversation or a context-resume question',()=>{
 const turn=accepted(q,'answer','Не потерять'),pending=prepareBackDraft(state([turn]));
 for(const [s,screen,hasDraft]of [[state(),{type:'question',question:q},true],[state([],'other'),{type:'question',question:q},false],[state(),{type:'question',question:{...q,id:'another'}},false]]){
  const recovered=finishBackDraft(pending,s,screen,{successful:true,hasDraft});assert.equal(recovered.seed,null);assert.equal(recovered.pending,null);
 }
});
