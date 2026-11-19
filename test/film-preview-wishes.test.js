import test from 'node:test';
import assert from 'node:assert/strict';
import {filmPreviewSession} from '../src/core/film-preview.js';
import {createMediaConversationService} from '../src/server/media-conversation-service.js';
import {makeCatalog} from '../src/core/catalog.js';
import {screenFixture,title} from './fixture.js';

const request='Лёгкое приключение с юмором до двух часов';
const turn=(text,id='direction')=>({question:{id},id,text,kind:'answer',selected:[]});
const state=(turns,overrides={})=>({domain:'film',turns,retractions:[],...overrides});
const preferences=(s,session={goalWants:[],genreWants:[]})=>filmPreviewSession(s,session);

test('the film preview maps explicit adventure and humour to soft catalog signals with source text',()=>{
 const base={goalWants:[],genreWants:[],maxRuntime:120};
 const applied=preferences(state([turn(request)]),base);
 assert.deepEqual(applied.genreWants,['Adventure']);
 assert.deepEqual(applied.goalWants,[{f:'humor.funny',evidence:'с юмором'}]);
 assert.equal(applied.maxRuntime,120);assert.equal(applied.goalRequires,undefined);
 assert.deepEqual(base,{goalWants:[],genreWants:[],maxRuntime:120});
 for(const prior of ['Вчера смотрел приключение с юмором','Раньше хотел приключение с юмором',
  'Без приключений и юмора','Не хочу приключение с юмором','Если захочу приключение с юмором',
  'В книге герой говорит «Хочу приключение с юмором»','Приключение с юмором мне надоело',
  'Приключение или драма, пока не знаю','Приключение с юмором мне не хочется']){
  const s=preferences(state([turn(prior)]));assert.deepEqual(s.goalWants,[],prior);assert.deepEqual(s.genreWants,[],prior);
 }
});

test('old turns with only an answer keep their wish, unidentifiable turns add no preference',()=>{
 const old={id:'old',question:{id:'direction'},answer:request,kind:'answer'};
 assert.deepEqual(preferences(state([old])).genreWants,['Adventure']);
 const projected={...old,question:'Какой фильм хочется сегодня?',questionId:'direction'};
 assert.deepEqual(preferences(state([projected])).goalWants,[{f:'humor.funny',evidence:'с юмором'}]);
 for(const missing of [{...old,question:null},{...old,question:{}},{...old,answer:null},null]){
  assert.deepEqual(preferences(state([missing])).genreWants,[]);
 }
});

test('later corrections, retracted evidence, examples and another section cannot reintroduce an old wish',()=>{
 const original=turn(request);
 const corrected=preferences(state([original,turn('Теперь без юмора','correction:2')]));
 assert.deepEqual(corrected.goalWants,[]);assert.deepEqual(corrected.genreWants,['Adventure']);
 for(const s of [state([{...original,superseded:true}]),state([turn('Приключение с юмором','reference')]),
  state([original],{domain:'series'}),state([original],{retractions:[{sourceId:original.id,quote:request}]})]){
  assert.deepEqual(preferences(s).goalWants,[]);assert.deepEqual(preferences(s).genreWants,[]);
 }
 const stable=preferences(state([original,turn('Покороче, до 90 минут','correction:2')]),
  {goalWants:[{f:'humor.funny',evidence:'с юмором'}],genreWants:['Adventure']});
 assert.equal(stable.goalWants.length,1);assert.equal(stable.genreWants.length,1);
});

test('the offline film service ranks a requested adventure with humour ahead of higher-rated alternatives',async()=>{
 const domain='film',base=screenFixture(domain);
 const items=['war','drama','mystery','love','short','over'].map((id,i)=>({
  ...title(id,id,domain,i>=4?{'humor.funny':1}:{},{runtime:id==='over'?130:95}),
  quality:i<4?0.96:0.78,genres:i>=4?['Adventure','Comedy']:['Drama'],
 }));
 const catalog=makeCatalog({...base,items},domain);
 const service=createMediaConversationService({domain,catalogs:{film:catalog},access:()=>({allowed:false}),spend:()=>assert.fail('offline')});
 async function preview(text){
  let out=await service({domain});
  for(const action of [{type:'answer',questionId:'direction',text},{type:'review'},{type:'confirm'}]){
   out=await service({domain,state:out.state,action});
  }
  return out.state.result;
 }
 assert.notEqual((await preview('Фильм до двух часов')).top.id,'short');
 const result=await preview(request);assert.equal(result.top.id,'short');
 assert.ok(result.alternatives.some(x=>x.genres.includes('Drama')));
 assert.ok(result.alternatives.every(x=>x.runtime<=120));
});
