import { test } from 'node:test';
import assert from 'node:assert/strict';
import { screenFixture } from './fixture.js';
import { sessionOf, profileOf } from '../src/core/dialogue.js';
import { buildTaste } from '../src/core/profile.js';
import { createFeedbackStore, normalizeFeedback } from '../src/server/public/shared/evening-feedback.js';
import { feasibilityOf } from '../src/core/feasibility.js';
import { readFileSync } from 'node:fs';
import { makeCatalog } from '../src/core/catalog.js';
import { createMediaConversationService } from '../src/server/media-conversation-service.js';
const liveProposal=domain=>JSON.parse(readFileSync(new URL('./fixtures/media-live-proposals.json',import.meta.url),'utf8'))[domain];
const core = await import('../src/core/media-conversation.js').catch(() => ({}));
const { newMediaConversation: fresh, normalizeMediaConversation: normalize, answerMediaConversation: reduce,
  applyMediaConversationProposal: apply, mediaConversationScreen: screen, mediaConversationToLegacy: project, mediaFallbackQuestion: fallback } = core;
const dict = screenFixture('film').dict;
const context = () => ({company:null,childAge:null,timeMode:null,commitment:null,onlyEnded:null,format:null});
const q = (id='experience') => ({id,title:'Какое впечатление хочется получить?',why:'Уточним сегодняшний запрос.',options:[{id:'warm',label:'Тёплая история'},{id:'dark',label:'Мрачная история'}],multiple:true,controls:['unknown','indifferent','none']});
const proposal = (patch={}) => ({summary:'Ищем историю на сегодняшний вечер.',facts:[],uncertainties:[],action:'question',question:q(),context:context(),sessionTime:null,...patch});
const reply = (s,text,patch={}) => reduce(s,{type:'answer',questionId:s.question.id,text,selected:[],...patch});
const said = (text,domain='film') => reply(fresh({id:`test-${domain}`,domain}),text);
const fact = (s,patch={}) => ({key:'goal',text:'Тёплая история',stance:'want',scope:'today',sourceId:s.turns.at(-1).id,quote:s.turns.at(-1).answer,feature:'tone.feelgood',titleId:null,exposure:null,titleIntent:null,...patch});
const ev = (s,value,quote=s.turns.at(-1).answer) => ({value,sourceId:s.turns.at(-1).id,quote});

test('quick wishes count as explicit desired experience when the planner can already summarize',()=>{
 const state=reply(fresh({id:'quick-mood',domain:'film'}),'',{selected:['mood_relax','avoid_stress']});
 const out=apply(state,proposal({action:'review',question:null}),dict);
 assert.equal(out.error,undefined);assert.equal(out.state.phase,'review');
});
const accepted = (s,patch={}) => {const out=apply(s,proposal(patch),dict);assert.equal(out.error,undefined);return out.state;};

test('three media entries expose a free-text first question without importing game or child context',()=>{
  assert.equal(typeof fresh,'function','media-specific reducer is missing');
  for(const domain of ['film','series','cartoon']) {
    const s=fresh({domain,id:domain});assert.equal(s.domain,domain);assert.equal(screen(s).type,'question');
    assert.ok(s.question.title.length);assert.ok(s.question.multiple);assert.notEqual(s.question.allowText,false);
    assert.deepEqual(s.context,{company:null,childAge:null,minutes:null,timeMode:null,commitment:null,onlyEnded:null,format:null});
    const next=reply(s,'Хочу историю с юмором');assert.equal(next.needsPlan,true);assert.equal(next.turns[0].answer,'Хочу историю с юмором');
  }
});

test('normalization rejects opposite-domain, game snapshots, duplicate sources and oversized evidence',()=>{
  const s=said('Хочу тёплую историю');
  for(const bad of [{...s,domain:'game'},{...s,domain:'series'},{...s,turns:[...s.turns,s.turns[0]]},{...s,turns:[{...s.turns[0],answer:'x'.repeat(2401)}]},{...s,phase:'platform'}])
    assert.throws(()=>normalize(bad,'film'),e=>e.status===400);
  assert.throws(()=>fresh({domain:'game'}),e=>e.status===400);assert.throws(()=>normalize({...s,context:{...s.context,childAge:6}}),e=>e.status===400);
  assert.equal(normalize(s,'film').domain,'film');
});

test('neutral answers cannot create a negative or positive preference and invalid proposals stay atomic',()=>{
  for(const kind of ['unknown','indifferent','none']) {
    const s=reply(fresh({domain:'film'}),'',{kind});const before=structuredClone(s);
    const out=apply(s,proposal({facts:[fact(s,{stance:'avoid'})]}),dict);assert.ok(out.error);assert.deepEqual(out.state,before);
  }
  const s=said('Хочу тёплую историю');
  for(const patch of [{quote:'никогда не говорил'},{sourceId:'foreign'},{feature:'game.invalid'}])assert.ok(apply(s,proposal({facts:[fact(s,patch)]}),dict).error);
  assert.ok(apply(s,proposal(),dict,s.revision-1).error);
});

test('correction preserves independent active evidence and a complete new snapshot replaces only corrected meaning',()=>{
  let s=said('Хочу тёплую историю');const old=fact(s);s=accepted(s,{facts:[old]});
  s=reduce(s,{type:'correct',text:'Поправка: хочу мрачную историю без юмора'});
  assert.equal(s.facts.length,1);assert.notEqual(s.turns[0].superseded,true);
  const next=accepted(normalize(s),{facts:[fact(s,{text:'Мрачная история',feature:'tone.dark'})],question:q('tension')});
  assert.deepEqual(next.facts.map(f=>f.feature),['tone.dark']);
  const back=reduce(s,{type:'back'});assert.notEqual(back.turns[0].superseded,true);assert.equal(back.question.id,s.turns.at(-1).question.id);
});

test('back removes dependent interpretation and restores the unanswered question with monotonic revision',()=>{
  let s=accepted(said('Хочу историю с юмором'));s=reply(s,'Тёплая история');const id=s.turns.at(-1).id;
  s=accepted(s,{facts:[fact(s)],question:q('tone')});const rev=s.revision;s=reduce(s,{type:'back'});
  assert.ok(s.revision>rev);assert.equal(s.question.id,'experience');assert.ok(!s.facts.some(f=>f.sourceId===id));assert.equal(s.needsPlan,false);
});

test('removed fact stays retracted across paraphrased keys and undo restores the prior understanding',()=>{
  let s=said('Хочу тёплую историю');const f=fact(s);s=accepted(s,{facts:[f]});const before=structuredClone(s);
  s=reduce(s,{type:'remove_fact',key:f.key});assert.equal(s.facts.length,0);assert.equal(screen(s).canUndoFactRemoval,true);
  assert.ok(apply(s,proposal({facts:[{...f,key:'new-key'}]}),dict).error);
  s=reduce(s,{type:'undo_fact_removal'});assert.deepEqual(s.facts,before.facts);assert.deepEqual(s.retractions,before.retractions);assert.equal(s.factRemovalUndo,null);
});

test('explicit media context is grounded, child age requires children and cartoons never invent an audience',()=>{
  let s=said('Смотрю один. Хочу взрослую анимацию','cartoon');
  assert.ok(apply(s,proposal({context:{...context(),company:ev(s,'children')}}),dict).error);
  s=accepted(s,{context:{...context(),company:ev(s,'solo','Смотрю один')}});assert.equal(s.context.company,'solo');assert.equal(s.context.childAge,null);
  let kids=said('Смотрим с ребёнком, ему 7 лет');
  kids=accepted(kids,{context:{...context(),company:ev(kids,'children'),childAge:ev(kids,7)}});
  assert.equal(kids.context.childAge,7);assert.equal(Number(sessionOf(project(kids,dict)).childAge),7);
  assert.ok(apply(kids,proposal({context:{...context(),company:ev(kids,'children'),childAge:ev(kids,9)}}),dict).error);
});

test('context editor records explicit evidence and preserves current unanswered question',()=>{
  let s=accepted(said('Хочу юмор'));const current=s.question;
  s=reduce(s,{type:'set_context',context:{company:'children',childAge:8,minutes:40,timeMode:'episode',commitment:'short',onlyEnded:true,format:'episodic'}});
  assert.deepEqual(s.question,current);assert.equal(s.needsPlan,false);assert.equal(s.context.minutes,40);assert.equal(s.sessionTime.minutes,40);
  assert.equal(normalize(s).context.childAge,8);assert.ok(s.turns.at(-1).answer.includes('40 минут'));
  s=reduce(s,{type:'set_context',context:{company:'adults',childAge:null,minutes:null,timeMode:null,commitment:null,onlyEnded:null,format:null}});
  assert.equal(s.context.childAge,null);assert.equal(s.context.minutes,null);assert.equal(s.sessionTime,null);
  assert.throws(()=>reduce(s,{type:'set_context',context:{company:'adults',childAge:5}}),e=>e.status===400);
});

test('available time projects film runtime and episode runtime without whole-series limits',()=>{
  for(const domain of ['film','series','cartoon']) {
    let s=said('Сегодня есть 45 минут',domain);s=accepted(s,{sessionTime:{minutes:45,sourceId:s.turns[0].id,quote:'Сегодня есть 45 минут'},context:{...context(),timeMode:ev(s,'session')}});
    const legacy=project(s,dict);assert.equal(legacy.domain,domain);const session=sessionOf(legacy);
    assert.equal(session.maxRuntime,45);assert.equal(session.minutes,45);assert.equal(session.maxEpisodes,undefined);assert.equal(session.maxSeasons,undefined);
    assert.equal(legacy.conversation.sessionTime.quote,'Сегодня есть 45 минут');assert.equal(legacy.conversation.context.timeMode,'session');
  }
});

test('runtime, episode and commitment are separate supported facts and missing series metadata remains unknown',()=>{
  let s=said('Хочу сериал, эпизоды не больше 30 минут. Готов к длинной истории. Только законченный сериал','series');
  const ctx={...context(),timeMode:ev(s,'episode','эпизоды не больше 30 минут'),commitment:ev(s,'long','Готов к длинной истории'),onlyEnded:ev(s,true,'Только законченный сериал')};
  s=accepted(s,{context:ctx,sessionTime:{minutes:30,sourceId:s.turns[0].id,quote:'эпизоды не больше 30 минут'}});
  const projected=project(s,dict),session=sessionOf(projected);assert.equal(session.maxRuntime,30);assert.equal(session.onlyEnded,true);assert.equal(projected.conversation.context.commitment,'long');
  assert.equal(session.maxSeasons,undefined);assert.equal(session.maxEpisodes,undefined);assert.ok(screen(s).uncertainties.some(x=>/длительност|статус|сезон/i.test(x)));
  let film=said('Фильм не больше 100 минут');film=accepted(film,{context:{...context(),timeMode:ev(film,'runtime')},sessionTime:{minutes:100,sourceId:film.turns[0].id,quote:film.turns[0].answer}});assert.equal(sessionOf(project(film,dict)).maxRuntime,100);
});

test('explicit caps phrased as na film or na episode retain the exact evidence and runtime meaning',()=>{
  for(const [domain,quote,minutes,mode]of [['film','На фильм не больше 110 минут.',110,'runtime'],['cartoon','На фильм до 100 минут',100,'runtime'],['series','На эпизод максимум 45 минут',45,'episode'],['series','На серию не больше 30 минут',30,'episode']]){
    const s=said(`Хочу лёгкую историю. ${quote} Без тяжёлой драмы.`,domain);
    const next=accepted(s,{context:{...context(),timeMode:ev(s,mode,quote)},sessionTime:{minutes,sourceId:s.turns[0].id,quote}});
    assert.deepEqual(next.sessionTime,{minutes,sourceId:s.turns[0].id,quote});
    assert.equal(sessionOf(project(normalize(next,domain),dict)).maxRuntime,minutes);
  }
});

test('na-film wording cannot bypass uncertain, ranged, wrong-value or retracted cap evidence',()=>{
  const quote='На фильм не больше 110 минут';
  for(const [text,minutes]of [[`Если будет время, ${quote}`,110],[`${quote} или 130 минут`,110],[quote,100],[`${quote}, но теперь времени нет`,110]]){
    const s=said(text);assert.ok(apply(s,proposal({context:{...context(),timeMode:ev(s,'runtime',quote)},sessionTime:{minutes,sourceId:s.turns[0].id,quote}}),dict).error,text);
  }
  let s=said(quote);s=accepted(s,{context:{...context(),timeMode:ev(s,'runtime')},sessionTime:{minutes:110,sourceId:s.turns[0].id,quote}});
  s=reduce(s,{type:'remove_fact',key:'session_time'});
  assert.ok(apply(s,proposal({context:{...context(),timeMode:ev(s,'runtime',quote)},sessionTime:{minutes:110,sourceId:s.turns[0].id,quote}}),dict).error);
});

test('short-series commitment survives descriptive adjectives in the exact user quote',()=>{
  for(const quote of ['Хочу короткий лёгкий детективный сериал для одного взрослого.','Хочу короткую лёгкую законченную историю','Хочу короткий и лёгкий сериал','Хочу короткий, лёгкий, детективный сериал']){
    const s=said(quote,'series');const next=accepted(s,{context:{...context(),commitment:ev(s,'short',quote)}});
    assert.equal(next.context.commitment,'short');assert.equal(normalize(next,'series').contextEvidence.commitment.quote,quote);
  }
});

test('short descriptive grammar does not turn a short fragment or a negated wish into short-series commitment',()=>{
  for(const quote of ['Хочу короткий эпизод длинного сериала','Хочу короткий обзор лёгкого сериала','Хочу короткое описание длинного сериала','Хочу короткое содержание длинного сериала','Хочу короткое изложение длинной истории','Хочу короткое содержимое длинного сериала','Хочу короткий исторический фильм','Не хочу короткий лёгкий сериал','Хочу не короткий лёгкий сериал','Хочу некороткий лёгкий сериал','Если успею, хочу короткий лёгкий сериал']){
    const s=said(quote,'series');assert.ok(apply(s,proposal({context:{...context(),commitment:ev(s,'short',quote)}}),dict).error,quote);
  }
});

test('one descriptive full-length cartoon keeps single commitment and derives a missing movie format',()=>{
  const source='Хочу один добрый полнометражный мультфильм для просмотра с ребёнком 7 лет.';
  for(const quote of [source,'один добрый полнометражный мультфильм']){
    const s=said(source,'cartoon');
    const next=accepted(s,{context:{...context(),format:ev(s,'movie',quote),commitment:ev(s,'single',quote)}});
    assert.equal(normalize(next,'cartoon').context.commitment,'single');
  }
  const s=said(source,'cartoon'),f=fact(s,{feature:null,stance:'require',quote:source,text:'Нужен один полнометражный мультфильм'});
  const next=accepted(s,{facts:[f]});assert.equal(next.context.format,'movie');assert.equal(project(next,dict).conversation.context.format,'movie');
});

test('descriptive full-length movie grammar preserves negative, conditional, synopsis, alternative and removed evidence',()=>{
  for(const source of ['Не хочу один добрый полнометражный мультфильм','Если успею, хочу один добрый полнометражный мультфильм','Хочу один добрый обзор полнометражного мультфильма','Хочу одно доброе описание полнометражного мультфильма','Хочу один добрый мультфильм или сериал']){
    const s=said(source,'cartoon');assert.ok(apply(s,proposal({context:{...context(),format:ev(s,'movie',source),commitment:ev(s,'single',source)}}),dict).error,source);
  }
  let s=said('Хочу один добрый полнометражный мультфильм','cartoon');const f=fact(s,{feature:null,stance:'require',text:'Нужен фильм'});
  s=accepted(s,{facts:[f]});s=reduce(s,{type:'remove_fact',key:'context:format'});
  assert.ok(apply(s,proposal({facts:[f]}),dict).error);
});

test('ambiguous, historical, conditional, negated and lower-bound time cannot become a hard cap',()=>{
  for(const text of ['Раньше смотрел по 30 минут','На весь сериал 30 часов','Если успею, сегодня есть 30 минут','Сегодня есть 30–60 минут','Сегодня есть не меньше 30 минут','Сегодня есть 30 минут, но теперь времени нет']) {
    const s=said(text,'series');const quote=text.includes('сегодня есть')?'сегодня есть 30 минут':text.startsWith('Сегодня есть 30 минут,')?'Сегодня есть 30 минут':text;
    const out=apply(s,proposal({sessionTime:{minutes:30,sourceId:s.turns[0].id,quote},context:{...context(),timeMode:ev(s,'session',quote)}}),dict);assert.ok(out.error,text);
  }
});

test('removing time blocks alternate source quotes and old budgets until a new explicit answer',()=>{
  let s=said('Сегодня есть 30 минут');s=accepted(s,{sessionTime:{minutes:30,sourceId:s.turns[0].id,quote:s.turns[0].answer},context:{...context(),timeMode:ev(s,'session')}});
  s=reply(s,'Сейчас есть 45 минут');s=accepted(s,{sessionTime:{minutes:45,sourceId:s.turns.at(-1).id,quote:s.turns.at(-1).answer},context:{...context(),timeMode:ev(s,'session')},question:q('after-time')});
  s=reduce(s,{type:'remove_fact',key:'session_time'});assert.equal(s.sessionTime,null);assert.equal(s.context.minutes,null);
  assert.ok(apply(s,proposal({sessionTime:{minutes:30,sourceId:s.turns[0].id,quote:s.turns[0].answer}}),dict).error);
  s=reduce(s,{type:'undo_fact_removal'});assert.equal(s.sessionTime.minutes,45);
});

test('context retraction prevents the planner restoring the same inference under an alternate quote',()=>{
  let s=said('Смотрим с детьми вместе с ребёнком');s=accepted(s,{context:{...context(),company:ev(s,'children','Смотрим с детьми')}});
  s=reduce(s,{type:'remove_fact',key:'context:company'});assert.equal(s.context.company,null);
  assert.ok(apply(s,proposal({context:{...context(),company:ev(s,'children','вместе с ребёнком')}}),dict).error);
});

test('history exposure is not dislike, only finished works hide, explicit replay returns the exact title',()=>{
  let s=said('Раньше досмотрел Short One. Сегодня хочу пересмотреть Short One','film');
  s=accepted(s,{facts:[fact(s,{key:'seen',feature:null,titleId:'t1',exposure:'finished',scope:'history',stance:'history',quote:'Раньше досмотрел Short One'}),fact(s,{key:'replay',feature:null,titleId:'t1',titleIntent:'replay',quote:'Сегодня хочу пересмотреть Short One'})]});
  let legacy=project(s,dict,screenFixture('film'));assert.equal(legacy.answers.t1,undefined);assert.deepEqual(legacy.conversation.familiarity.returnToIds,['t1']);
  s.facts=s.facts.filter(f=>f.key!=='replay');legacy=project(s,dict,screenFixture('film'));const taste=buildTaste(screenFixture('film'),profileOf(legacy));
  assert.equal(taste.consumed.has('t1'),true);assert.equal(taste.dislike.size,0);assert.equal(taste.hardNo.size,0);
  s.facts=[{...s.facts[0],exposure:'started'}];legacy=project(s,dict);assert.equal(legacy.answers.t1,undefined);
});

test('title return requires explicit today intent and history never creates today wants',()=>{
  const s=said('Любил тёплые истории, начал Short One');
  for(const patch of [{titleId:'t1',titleIntent:'replay'},{titleId:null,titleIntent:'return'},{titleId:'t1',titleIntent:'return',scope:'history'}])assert.ok(apply(s,proposal({facts:[fact(s,patch)]}),dict).error);
  const next=accepted(s,{facts:[fact(s,{scope:'history',stance:'want'})]});assert.deepEqual(project(next,dict).session.goalWants,[]);
});

test('familiar marking, keep and replacement undo preserve cards without changing taste or permanent exclusions',()=>{
  let s=fresh({domain:'film'});s.phase='result';s.result={top:{id:'t1'},alternatives:[{id:'t2'},{id:'t3'}]};
  s=reduce(s,{type:'familiar_mark',id:'t1'});assert.deepEqual(s.familiar.marked,['t1']);assert.deepEqual(s.familiar.excluded,[]);
  s=reduce(s,{type:'familiar_keep',id:'t1'});assert.deepEqual(s.familiar.marked,[]);assert.deepEqual(s.familiar.keep,['t1']);assert.deepEqual(project(s,dict).preferences,[]);
  const undo={result:s.result,marked:['t2'],keep:s.familiar.keep,hidden:[],replacement:null};s.familiar.undo=undo;s.result={top:{id:'t1'},alternatives:[{id:'t4'},{id:'t3'}]};s.familiar.hidden=['t2'];
  s=reduce(s,{type:'undo_replacement'});assert.deepEqual(s.result.alternatives.map(c=>c.id),['t2','t3']);assert.deepEqual(s.familiar.hidden,[]);
  assert.throws(()=>reduce(s,{type:'familiar_mark',id:'elsewhere'}),e=>e.status===400);
});

test('review can be requested early while adaptive questions avoid resolved repeats and children age is conditional',()=>{
  const early=reduce(fresh({domain:'series'}),{type:'review'});assert.equal(screen(early).type,'review');assert.equal(early.provisional,true);
  const s=said('Комедия');assert.ok(apply(s,proposal({action:'review',question:null}),dict).error);
  assert.ok(apply(s,proposal({question:{...q(),id:'direction'}}),dict).error);
  const kids=reduce(fresh({domain:'cartoon'}),{type:'set_context',context:{company:'children'}});assert.equal(fallback(kids).id,'child_age');
  assert.notEqual(fallback(fresh({domain:'cartoon'})).id,'child_age');
});

test('back through edited context restores previous explicit time and never revives a retracted company',()=>{
  let s=reduce(fresh({domain:'film'}),{type:'set_context',context:{company:'solo',minutes:90,timeMode:'session'}});
  s=reduce(s,{type:'set_context',context:{company:'adults',minutes:120,timeMode:'session'}});
  s=reduce(s,{type:'back'});assert.equal(s.context.company,'solo');assert.equal(s.context.minutes,90);assert.equal(s.sessionTime.minutes,90);
  s=reduce(s,{type:'remove_fact',key:'context:company'});s=reduce(s,{type:'continue'});s=reply(s,'С юмором');s=reduce(s,{type:'back'});
  assert.equal(s.context.company,null);assert.equal(normalize(s).context.company,null);
});

test('bare age is valid only as the complete answer to an explicit child age question',()=>{
  let s=reduce(fresh({domain:'cartoon'}),{type:'set_context',context:{company:'children'}});
  s.question=fallback(s);s.phase='talk';s=reply(s,'7');
  s=accepted(s,{context:{...context(),company:s.contextEvidence.company,childAge:ev(s,7)}});assert.equal(s.context.childAge,7);
  const unrelated=said('7','cartoon');assert.ok(apply(unrelated,proposal({context:{...context(),childAge:ev(unrelated,7)}}),dict).error);
});

test('saved context source cannot forge field values behind an unrelated exact quote',()=>{
  const s=said('Хочу комедию');s.turns[0].question={...q(),id:'context'};s.turns[0].context={company:'children'};s.turns[0].contextQuotes={company:'Хочу комедию'};
  s.context.company='children';s.contextEvidence.company={value:'children',sourceId:s.turns[0].id,quote:'Хочу комедию'};
  assert.throws(()=>normalize(s),e=>e.status===400);
});

test('context negation and conditional runtime cannot be made definite by choosing a convenient subquote',()=>{
  for(const [saidText,key,value,quote] of [
    ['Сегодня смотрю не один','company','solo','один'],
    ['Смотрим без детей','company','children','детей'],
    ['Если успею, смотрю один','company','solo','смотрю один'],
    ['Не хочу длинную историю','commitment','long','хочу длинную историю'],
    ['Если будет время, фильм не больше 100 минут','timeMode','runtime','фильм не больше 100 минут'],
  ]) {
    const s=said(saidText);assert.ok(apply(s,proposal({context:{...context(),[key]:ev(s,value,quote)}}),dict).error,saidText);
  }
});

test('a conditional willingness to return is not a general ban and non-final exposure cannot hide titles',()=>{
  const s=said('Если захочется, могу продолжить Short One');
  const conditionalFact=fact(s,{feature:null,titleId:'t1',titleIntent:'return',stance:'conditional'});
  const next=accepted(s,{facts:[conditionalFact]});assert.deepEqual(project(next,dict).session.notNow,[]);
  assert.deepEqual(project(next,dict).conversation.familiarity.returnToIds,['t1']);
});

test('partial correction shortens runtime while preserving earlier genre and explicit avoidance',()=>{
  let s=said('Хочу детектив без жестокости. Сегодня есть 120 минут');
  const genre=fact(s,{key:'genre',text:'Детектив',quote:'Хочу детектив',feature:null});
  const avoid=fact(s,{key:'avoid',text:'Без жестокости',quote:'без жестокости',stance:'exclude',feature:'content.violence'});
  s=accepted(s,{facts:[genre,avoid],sessionTime:{minutes:120,sourceId:s.turns[0].id,quote:'Сегодня есть 120 минут'},context:{...context(),timeMode:ev(s,'session','Сегодня есть 120 минут')}});
  const previous=s.sessionTime;s=reduce(s,{type:'correct',text:'только короче, до90мин'});
  assert.deepEqual(s.facts,[genre,avoid]);assert.notEqual(s.turns[0].superseded,true);assert.equal(s.sessionTime,null);
  const ctx={...context(),timeMode:s.contextEvidence.timeMode};
  assert.ok(apply(s,proposal({facts:[genre,avoid],context:ctx,sessionTime:previous,question:q('after-correction')}),dict).error);
  s=accepted(s,{facts:[genre,avoid],context:ctx,sessionTime:{minutes:90,sourceId:s.turns.at(-1).id,quote:'только короче, до90мин'},question:q('after-correction')});
  const legacy=project(s,dict);assert.equal(sessionOf(legacy).maxRuntime,90);assert.deepEqual(legacy.session.goalExcludes,[{f:'content.violence',evidence:'без жестокости'}]);assert.ok(s.facts.some(f=>f.key==='genre'));
});

test('historical or negated viewing is never a current return/replay permission',()=>{
  for(const [words,titleIntent] of [['Я досмотрел Short One','return'],['Не хочу продолжать Short One','return'],['Не хочу пересматривать Short One','replay'],['Раньше хотел пересмотреть Short One','replay']]) {
    const s=said(words);assert.ok(apply(s,proposal({facts:[fact(s,{feature:null,titleId:'t1',titleIntent})]}),dict).error,words);
  }
});

test('back restores the latest complete context snapshot including cleared values and rejects forged cached evidence',()=>{
  let s=reduce(fresh({domain:'film'}),{type:'set_context',context:{company:'solo',minutes:90,timeMode:'session'}});
  s=reduce(s,{type:'continue'});s=reply(s,'Компания и время теперь не важны');s=accepted(s,{context:context(),sessionTime:null,question:q('after-clear')});
  s=reply(s,'Хочу юмор');s=reduce(s,{type:'back'});assert.equal(s.context.company,null);assert.equal(s.context.minutes,null);assert.equal(s.sessionTime,null);
  s.turns.at(-1).acceptedContext.company={value:'children',sourceId:s.turns.at(-1).id,quote:'Компания и время теперь не важны'};
  assert.throws(()=>normalize(s),e=>e.status===400);
});

test('watching only an episode or an unfinished fragment cannot be marked finished',()=>{
  for(const words of ['Смотрел Short One только первую серию','Смотрел Short One, но не до конца','Не видел Short One целиком']) {
    const s=said(words,'series');assert.ok(apply(s,proposal({facts:[fact(s,{feature:null,titleId:'t1',exposure:'finished',stance:'history',scope:'history'})]}),dict).error,words);
  }
});

test('adult context projects a supported legacy company without changing audience or inventing taste',()=>{
  const s=reduce(fresh({domain:'film'}),{type:'set_context',context:{company:'adults'}});const legacy=project(s,dict);
  assert.equal(legacy.situation.company,'group');assert.equal(legacy.conversation.context.company,'adults');assert.deepEqual(legacy.preferences,[]);assert.equal(sessionOf(legacy).childAge,null);
});

test('children age survives the actual evening store, normalization, choice and reload',async()=>{
  const s=reduce(fresh({domain:'cartoon',id:'family-evening'}),{type:'set_context',context:{company:'children',childAge:7}});
  const legacy=project(s,dict,screenFixture('cartoon')),result={top:{id:'t1',name:'Short One'},alternatives:[]};
  const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
  const make=()=>createFeedbackStore({storage,transaction:async fn=>fn(storage),id:()=> 'family-run',now:()=> '2026-11-02T12:00:00.000Z'});
  const store=make(),run=await store.observe('family-dialogue',legacy,result);
  assert.ok(run,'a family evening must not disappear during feedback normalization');assert.ok(normalizeFeedback(run));assert.equal(run.context.childAge,'7');
  assert.equal(await store.update(run.id,'t1',{type:'choose',value:true}),true);
  const resumed=make().get(run.id);assert.ok(resumed);assert.equal(resumed.responses[0].chosen,true);assert.equal(resumed.context.childAge,'7');
  const session=sessionOf(legacy);assert.equal(Number(session.childAge),7);assert.ok(feasibilityOf(screenFixture('cartoon').items[0],session).some(f=>f.key==='age'&&f.status==='unknown'));
});

test('retracting an untyped fact blocks a renamed paraphrase from its old source but keeps unchanged independent facts',()=>{
  let s=said('Хочу детектив: именно расследование, без спешки. Без жестокости');
  const genre=fact(s,{key:'genre',text:'Детектив',quote:'Хочу детектив',feature:null});
  const calm=fact(s,{key:'calm',text:'Без спешки',quote:'без спешки',feature:null});
  const noViolence=fact(s,{key:'no-violence',text:'Без жестокости',quote:'Без жестокости',feature:'content.violence',stance:'exclude'});
  s=accepted(s,{facts:[genre,calm,noViolence]});s=reduce(s,{type:'remove_fact',key:'genre'});
  const paraphrase={...genre,key:'investigation',text:'Расследование',quote:'именно расследование'};
  assert.ok(apply(s,proposal({facts:[paraphrase,calm,noViolence],question:q('after-removal')}),dict).error,'new key and alternate quote must not revive removed untyped meaning');
  const unchanged=apply(normalize(s),proposal({facts:[calm,noViolence],question:q('after-removal')}),dict);assert.equal(unchanged.error,undefined);assert.deepEqual(unchanged.state.facts,[calm,noViolence]);
  assert.ok(apply(s,proposal({facts:[{...calm,text:'Неспешная история'},noViolence],question:q('after-removal')}),dict).error,'old-source untyped survivors must remain byte-for-byte unchanged');
  const typed={...noViolence,key:'less-violence',stance:'avoid'};assert.equal(apply(s,proposal({facts:[calm,typed],question:q('after-removal')}),dict).error,undefined,'typed evidence remains independently usable');
  s=reduce(s,{type:'correct',text:'Расследование всё-таки хочу'});const explicit=fact(s,{key:'investigation',text:'Расследование',quote:'Расследование всё-таки хочу',feature:null});
  const renewed=apply(s,proposal({facts:[explicit,calm,noViolence],question:q('after-correction')}),dict);assert.equal(renewed.error,undefined);
});

test('unresolved title reference remains an unchanged untyped survivor after a separate meaning is removed',()=>{
  let s=said('Хочу детектив, можно как «Неясное название»');
  const genre=fact(s,{key:'genre',quote:'Хочу детектив',feature:null}),reference=fact(s,{key:'reference',quote:'как «Неясное название»',feature:null,titleIntent:'reference'});
  s=accepted(s,{facts:[genre,reference]});s=reduce(s,{type:'remove_fact',key:'genre'});
  const restored=normalize(s);assert.deepEqual(restored.facts,[reference]);
  assert.equal(apply(restored,proposal({facts:[reference],question:q('exact-title')}),dict).error,undefined);
});

test('real live-round1 receipt accepts explicit solo adult audience and keeps the exact 100-minute evidence offline',()=>{
  const {state:saved,proposal:received,receiptId}=liveProposal('film');
  assert.equal(receiptId,'resp_0299223206d53dc9016ae7dc2e491c87d28ca081ce84b11c82','replay the exact original synthetic receipt');
  assert.equal(received.context.company.quote,'для одного взрослого');
  const before=structuredClone(saved),out=apply(saved,received,dict);
  assert.equal(out.error,undefined);assert.deepEqual(saved,before);assert.equal(out.state.context.company,'solo');assert.equal(out.state.context.childAge,null);assert.equal(out.state.context.minutes,100);
  assert.deepEqual(out.state.sessionTime,{minutes:100,sourceId:'8c8bf187-37f0-46f3-8e3c-5a13c34e21c4:2',quote:'Сегодня есть 100 минут.'});
  assert.equal(out.state.phase,'review');assert.equal(out.state.facts.length,6);assert.equal(normalize(out.state).context.company,'solo');
});

test('single-adult wording accepts only an explicit solo viewer without negation or conditions',()=>{
  for(const words of ['Хочу фильм для одного взрослого','Хочу фильм для одной взрослой']) {
    const s=said(words),out=apply(s,proposal({context:{...context(),company:ev(s,'solo')}}),dict);
    assert.equal(out.error,undefined,words);assert.equal(out.state.context.company,'solo');assert.equal(out.state.context.childAge,null);
  }
  for(const [words,quote] of [
    ['Хочу фильм для взрослого','для взрослого'],
    ['Хочу фильм для взрослых','для взрослых'],
    ['Хочу фильм не для одного взрослого','для одного взрослого'],
    ['Хочу фильм не для одного взрослого','Хочу фильм не для одного взрослого'],
    ['Если останусь один, хочу фильм для одного взрослого','для одного взрослого'],
    ['Хочу фильм для одного взрослого, если останусь один','для одного взрослого'],
  ]) {
    const s=said(words);assert.ok(apply(s,proposal({context:{...context(),company:ev(s,'solo',quote)}}),dict).error,words);
  }
});

function realSeriesRound2() {
  const fixture=liveProposal('series');
  assert.equal(fixture.receiptId,'resp_0527ef1b4e250236016ae7dcf8e33887d28cf1f3f36e95e6d9');
  return fixture;
}

test('real series receipt preserves valid goal and episode time while locally clarifying complete story versus ended series',()=>{
  const {state,proposal:received}=realSeriesRound2(),before=structuredClone(state),out=apply(state,received,dict);
  assert.equal(out.error,undefined);assert.deepEqual(state,before);assert.equal(out.state.context.company,'solo');assert.equal(out.state.context.commitment,'short');
  assert.equal(out.state.context.minutes,45);assert.equal(out.state.context.timeMode,'episode');assert.equal(out.state.context.onlyEnded,null);
  assert.deepEqual(out.state.sessionTime,{minutes:45,sourceId:'394d1440-7db7-44b2-afca-5e4187336225:2',quote:'серии до 45 минут'});
  assert.deepEqual(out.state.facts.map(f=>f.key),['detective','violence_exclusion','short_story','no_multiple_seasons']);
  assert.equal(out.state.question.id,'only_ended');assert.equal(out.state.needsPlan,false);assert.ok(out.state.uncertainties.some(u=>/истори.*сериал|сериал.*истори/iu.test(u)));
  const legacy=project(normalize(out.state),dict);assert.equal(sessionOf(legacy).onlyEnded,false);assert.ok(!legacy.session.goalRequires.some(f=>f.f==='completeness.ended'));
  assert.ok(out.state.facts.some(f=>f.feature==='story.mystery'));assert.ok(out.state.facts.some(f=>f.feature==='content.violence'&&f.stance==='exclude'));
});

test('fixed ended-series clarification answers become grounded local context and review without another plan',()=>{
  const {state,proposal:received}=realSeriesRound2(),clarified=apply(state,received,dict).state;
  for(const [selected,value] of [['yes',true],['any',false]]) {
    const next=reply(clarified,'',{selected:[selected]});assert.equal(next.phase,'review');assert.equal(next.needsPlan,false);assert.equal(next.context.onlyEnded,value);
    assert.equal(next.contextEvidence.onlyEnded.sourceId,next.turns.at(-1).id);assert.equal(next.contextEvidence.onlyEnded.quote,next.turns.at(-1).answer);
    assert.equal(next.context.minutes,45);assert.equal(next.context.commitment,'short');assert.equal(normalize(next).context.onlyEnded,value);
  }
  const unknown=reply(clarified,'',{kind:'unknown'});assert.equal(unknown.phase,'review');assert.equal(unknown.needsPlan,false);assert.equal(unknown.context.onlyEnded,null);
  const own=reply(clarified,'Для меня важен законченный сюжет');assert.equal(own.needsPlan,true);assert.equal(own.context.onlyEnded,null);
});

test('ambiguous structural context never bypasses source, quote, retraction, negation or condition validation',()=>{
  const {state,proposal:received}=realSeriesRound2();
  for(const patch of [{sourceId:'unknown-source'},{quote:'несуществующая цитата'}]) {
    const bad=structuredClone(received);Object.assign(bad.context.onlyEnded,patch);assert.ok(apply(state,bad,dict).error);
  }
  const retracted=structuredClone(state);retracted.retractions.push({kind:'context',key:'onlyEnded',sourceId:received.context.onlyEnded.sourceId,at:state.turns.at(-1).id,quote:received.context.onlyEnded.quote});
  assert.ok(apply(retracted,received,dict).error);
  for(const [words,quote] of [
    ['Не хочу законченную историю','законченную историю'],
    ['Не хочу законченную историю','Не хочу законченную историю'],
    ['Если будет время, хочу законченную историю','законченную историю'],
    ['Хочу законченную историю, если будет время','законченную историю'],
  ]) {
    const s=said(words,'series');assert.ok(apply(s,proposal({context:{...context(),onlyEnded:ev(s,true,quote)}}),dict).error,words);
  }
});

test('a completed-story feature alone also asks for status before it can become an ended-series hard filter',()=>{
  const {state,proposal:received}=realSeriesRound2();received.context.onlyEnded=null;
  const out=apply(state,received,dict);assert.equal(out.error,undefined);assert.equal(out.state.question.id,'only_ended');assert.equal(out.state.context.onlyEnded,null);
  assert.ok(!project(out.state,dict).session.goalRequires.some(f=>f.f==='completeness.ended'));
});

test('an ended-series feature cannot bypass negation or a removed status merely by omitting its context field',()=>{
  for(const words of ['Не хочу законченную историю','Если получится, хочу законченную историю']) {
    const s=said(words,'series'),f=fact(s,{feature:'completeness.ended',stance:'require'});
    assert.ok(apply(s,proposal({facts:[f]}),dict).error,words);
  }
  const {state,proposal:received}=realSeriesRound2();received.context.onlyEnded=null;
  state.retractions.push({kind:'context',key:'onlyEnded',sourceId:received.facts.find(f=>f.key==='completed_story').sourceId,at:state.turns.at(-1).id,quote:'Готов на короткую законченную историю'});
  assert.ok(apply(state,received,dict).error);
});

function realCartoonRound3() {
  const fixture=liveProposal('cartoon');
  assert.equal(fixture.receiptId,'resp_09d7535b2763b685016ae7de401cec87d2a5b67ca333f084af');
  return fixture;
}

test('real cartoon receipt preserves explicit children7, one full-length movie and 100 minutes despite missing format slot',()=>{
  const {state,proposal:received}=realCartoonRound3(),out=apply(state,received,dict);assert.equal(out.error,undefined);
  assert.equal(out.state.phase,'review');assert.equal(out.state.context.company,'children');assert.equal(out.state.context.childAge,7);
  assert.equal(out.state.context.commitment,'single');assert.equal(out.state.context.format,'movie');assert.equal(out.state.context.minutes,100);
  assert.deepEqual(out.state.contextEvidence.format,{value:'movie',sourceId:'318a1292-6559-48ef-bba7-b01f10a1a603:2',quote:'Нужен один полнометражный мультфильм'});
  assert.equal(out.state.facts.length,5);assert.equal(normalize(out.state).context.format,'movie');assert.equal(project(out.state,dict).situation.childAge,'7');
});

test('derived explicit movie format reaches the actual service shortlist and prevents a series result',async()=>{
  const {state,proposal:received}=realCartoonRound3(),checked=apply(state,received,dict);assert.equal(checked.error,undefined);
  const base=screenFixture('cartoon'),items=base.items.map(item=>({...item,features:{...item.features,'content.family':{r:1,c:1,src:['fixture'],ev:[]}}}));
  items.push({...items[0],id:'animated-series',name:'Animated Series',kind:'series',runtime:20,work:'animated-series'});
  const catalog=makeCatalog({...base,items},'cartoon');let picks=0;
  const service=createMediaConversationService({domain:'cartoon',catalogs:{cartoon:catalog},plan:async()=>assert.fail('no paid planning for replayed review'),pick:async offered=>{
    picks++;assert.ok(offered.cartoon.items.every(item=>item.kind==='film'));return {picks:[{id:'animated-series',reason:'Wrong format'},{id:'t1',reason:'Supported film'}]};
  }});
  const out=await service({domain:'cartoon',state:checked.state,action:{type:'confirm'}});assert.equal(out.error,undefined);assert.equal(picks,1);assert.equal(out.state.phase,'result');
  assert.deepEqual([out.state.result.top,...out.state.result.alternatives].map(card=>card.id),['t1']);
});

test('single full-length commitment and derived movie format preserve negation, conditional, retraction and source guards',()=>{
  for(const words of ['Не нужен один полнометражный мультфильм','Если останется время, нужен один полнометражный мультфильм','Нужен один полнометражный мультфильм, если останется время']) {
    const s=said(words,'cartoon'),f=fact(s,{feature:null,stance:'require'}),out=apply(s,proposal({facts:[f],context:{...context(),commitment:ev(s,'single')}}),dict);assert.ok(out.error,words);
  }
  const {state,proposal:received}=realCartoonRound3();state.retractions.push({kind:'context',key:'format',sourceId:state.turns.at(-1).id,at:state.turns.at(-1).id,quote:'Нужен один полнометражный мультфильм'});
  assert.ok(apply(state,received,dict).error,'removed format must not be restored through its old untyped require fact');
  for(const words of ['Раньше смотрел один полнометражный мультфильм','Хочу фильм или сериал']) {
    const s=said(words,'cartoon'),f=fact(s,{feature:null,stance:'want',scope:words.startsWith('Раньше')?'history':'today'}),out=apply(s,proposal({facts:[f]}),dict);
    assert.equal(out.error,undefined);assert.equal(out.state.context.format,null,words);
  }
});

test('removing either the explicit movie fact or its derived format clears both bindings and undo restores them',()=>{
  const {state,proposal:received}=realCartoonRound3(),original=apply(state,received,dict).state;
  for(const key of ['format_movie','context:format']) {
    const removed=reduce(original,{type:'remove_fact',key});assert.equal(removed.context.format,null);assert.equal(removed.contextEvidence.format,null);
    assert.ok(!removed.facts.some(f=>f.key==='format_movie'));assert.equal(normalize(removed).context.format,null);
    const undo=reduce(removed,{type:'undo_fact_removal'});assert.equal(undo.context.format,'movie');assert.ok(undo.facts.some(f=>f.key==='format_movie'));
  }
});

test('story, plot and arc completion stay ambiguous even when the same quote also mentions a series',()=>{
  for(const words of ['Хочу сериал с короткой законченной историей','Хочу законченную историю в сериале','Хочу сериал с завершённым сюжетом','Хочу сериал с законченной аркой']) {
    const s=said(words,'series'),f=fact(s,{key:'ended',text:'Законченная история',feature:'completeness.ended',stance:'require'});
    const out=apply(s,proposal({facts:[f],context:{...context(),onlyEnded:ev(s,true)}}),dict);
    assert.equal(out.error,undefined,words);assert.equal(out.state.context.onlyEnded,null,words);assert.equal(out.state.question.id,'only_ended',words);
    assert.ok(!project(out.state,dict).session.goalRequires.some(f=>f.f==='completeness.ended'),words);
  }
});

test('an explicit whole-series status clause remains usable alongside an independently completed story',()=>{
  for(const words of ['Нужен только завершённый сериал','Сериал уже завершён','Хочу сериал с законченной историей. Сериал уже завершён.']) {
    const s=said(words,'series'),f=fact(s,{key:'ended',feature:'completeness.ended',stance:'require'});
    const out=apply(s,proposal({facts:[f],context:{...context(),onlyEnded:ev(s,true)}}),dict);
    assert.equal(out.error,undefined,words);assert.equal(out.state.context.onlyEnded,true,words);assert.notEqual(out.state.question.id,'only_ended',words);
    assert.ok(project(out.state,dict).session.goalRequires.some(f=>f.f==='completeness.ended'),words);
  }
  const s=said('Хочу законченную историю в сериале. Нужен только завершённый сериал.','series');
  const out=apply(s,proposal({facts:[fact(s,{key:'story',feature:'completeness.ended',stance:'require',quote:'Хочу законченную историю в сериале'})],context:{...context(),onlyEnded:ev(s,true,'Нужен только завершённый сериал')}}),dict);
  assert.equal(out.error,undefined);assert.equal(out.state.context.onlyEnded,true);assert.notEqual(out.state.question.id,'only_ended');
  assert.ok(!out.state.facts.some(f=>f.key==='story'&&f.feature==='completeness.ended'));
});

test('whole-series status still rejects negative, conditional, retracted and omitted-negative evidence',()=>{
  for(const [words,quote] of [
    ['Сериал ещё не завершён','Сериал ещё не завершён'],
    ['Хочу сериал с незаконченной историей','Хочу сериал с незаконченной историей'],
    ['Не нужен завершённый сериал','завершённый сериал'],
    ['Если получится, сериал уже завершён','сериал уже завершён'],
    ['Сериал уже завершён, если повезёт','Сериал уже завершён'],
    ['Хочу законченную историю в сериале, если будет время','Хочу законченную историю в сериале'],
  ]) {
    const s=said(words,'series'),f=fact(s,{key:'ended',feature:'completeness.ended',stance:'require',quote});
    assert.ok(apply(s,proposal({facts:[f],context:{...context(),onlyEnded:ev(s,true,quote)}}),dict).error,words);
  }
  const s=said('Нужен только завершённый сериал','series');s.retractions.push({kind:'context',key:'onlyEnded',sourceId:s.turns[0].id,quote:s.turns[0].answer,at:s.turns[0].id});
  assert.ok(apply(s,proposal({context:{...context(),onlyEnded:ev(s,true)}}),dict).error);
});

test('full-length cartoon interpretation and restored result omit only the irrelevant derived series notice',()=>{
  const notice='Число сезонов, общая длительность и статус сериала могут отсутствовать в каталоге.';
  const modelUncertainty='В каталоге может не быть точной информации о пугающих сценах.';
  const {state,proposal:received}=realCartoonRound3();received.uncertainties=[modelUncertainty];
  const out=apply(state,received,dict);assert.equal(out.error,undefined);assert.equal(out.state.context.format,'movie');assert.equal(out.state.context.commitment,'single');
  assert.ok(!out.state.uncertainties.includes(notice));assert.ok(out.state.uncertainties.includes(modelUncertainty));
  const saved={...out.state,phase:'result',result:{top:{id:'t1'},alternatives:[]},uncertainties:[...out.state.uncertainties,notice]};
  const before=structuredClone(saved),restored=normalize(saved);assert.deepEqual(saved,before);assert.ok(!screen(restored).uncertainties.includes(notice));
  assert.ok(restored.uncertainties.includes(modelUncertainty));assert.ok(restored.uncertainties.some(u=>/Возрастная пригодность/u.test(u)));
});

test('series and explicitly episodic cartoons retain their relevant seasons and status caution through restore',()=>{
  const notice='Число сезонов, общая длительность и статус сериала могут отсутствовать в каталоге.';
  const {state,proposal:received}=realSeriesRound2(),series=apply(state,received,dict);assert.equal(series.error,undefined);
  assert.ok(series.state.uncertainties.includes(notice));assert.ok(normalize(series.state).uncertainties.includes(notice));
  const episodic=reduce(fresh({domain:'cartoon'}),{type:'set_context',context:{format:'episodic',commitment:'short'}});
  const out=apply(episodic,proposal({context:episodic.contextEvidence}),dict);assert.equal(out.error,undefined);assert.ok(out.state.uncertainties.includes(notice));
  assert.ok(normalize(out.state).uncertainties.includes(notice));
});
