import test from 'node:test';
import assert from 'node:assert/strict';
import {selectionCopyText} from '../src/server/public/shared/selection-copy.js';

const card=(name,extra={})=>({id:`private-${name}`,name,year:2026,ai:{reason:`Почему ${name}`,caveat:`Оговорка ${name}`},...extra});
const state=domain=>({domain,id:'private-dialogue',uid:'private-person',phase:'result',summary:'Хочется приключения с юмором, без жестокости',
 turns:[{id:'a',question:{title:'Какого впечатления хочется?'},kind:'answer',answer:'Приключение; без жестокости',text:'без жестокости'},{id:'b',question:{title:'Темп?'},kind:'unknown',answer:'Пока не знаю'}],
 facts:[{text:'Без жестокости',stance:'avoid',scope:'today'},{text:'Пример знакомого названия',stance:'history',scope:'history'}],
 context:{company:domain==='game'?'friend':'adults',platform:domain==='game'?'windows':null,onlyEnded:domain==='series'?false:null},sessionTime:{minutes:45},
 uncertainties:['Не определена точная версия примера'],result:{top:card('Первый'),alternatives:[card('Второй'),card('Третий'),card('Четвёртый'),card('Не показан')]},
 drafts:{correction:'UNSENT'},library:['PRIVATE_LIBRARY'],familiar:{excluded:['PRIVATE_HISTORY']},feedback:{note:'PRIVATE_NOTE'}});

test('the shareable selection contains the sent request, current understanding, conditions and exactly the visible cards in every domain',()=>{
 for(const domain of ['game','film','series','cartoon']){
  const text=selectionCopyText({state:state(domain)});
  for(const part of ['TASTIQ','Приключение; без жестокости','Пока не знаю','Хочется приключения с юмором, без жестокости','Без жестокости','45 мин','Не определена точная версия примера','Первый (2026)','Почему Первый','Оговорка Четвёртый'])assert.ok(text.includes(part),`${domain}: ${part}`);
  assert.ok(text.indexOf('Первый (2026)')<text.indexOf('Второй (2026)'));
  assert.doesNotMatch(text,/private-|PRIVATE_|UNSENT|Не показан/);
  if(domain==='game')assert.match(text,/Windows|Вдвоём/);
  if(domain==='series')assert.match(text,/Продолжающиеся сериалы допустимы/);
 }
});

test('superseded and retracted source answers are not re-exposed as the current request, and the current summary survives',()=>{
 const s=state('film');
 s.turns=[{id:'old',superseded:true,question:{title:'Старое'},answer:'OLD_SECRET'},
  {id:'removed',question:{title:'Желание'},answer:'REMOVED_SECRET'},
  {id:'current',question:{title:'Поправка'},answer:'Оставь добрый юмор'}];
 s.retractions=[{sourceId:'removed',quote:'REMOVED_SECRET'}];
 const text=selectionCopyText({state:s});
 assert.doesNotMatch(text,/OLD_SECRET|REMOVED_SECRET/);assert.match(text,/Оставь добрый юмор/);assert.match(text,/Хочется приключения с юмором, без жестокости/);
 assert.match(text,/Часть ответов изменена/);
});

test('a new batch exports only its visible result and provisional/unknown data stay explicit',()=>{
 const s=state('cartoon'),old=s.result;s.result={top:card('Новая карточка',{year:null,link:'javascript:bad()',ai:null}),alternatives:[]};
 s.familiar.undo={result:old};s.provisional=true;
 const text=selectionCopyText({state:s});
 assert.match(text,/Новая карточка/);assert.match(text,/Предварительный подбор/);assert.doesNotMatch(text,/Первый|Четвёртый|javascript:|undefined|null/);
 assert.equal(selectionCopyText({state:{...s,result:null}}),'');
});

test('visible card metadata and unverified conditions remain in the copied result',()=>{
 const s=state('series');s.result.top={...s.result.top,kind:'series',runtime:30,seasons:2,episodes:16,genres:['Comedy','Drama','Hidden genre'],feasibility:[{status:'unknown',text:'Длительность эпизода нужно проверить'},{status:'ok',text:'INVISIBLE_CONDITION'}]};
 const text=selectionCopyText({state:s});
 for(const part of ['30 мин · эпизод','2 сез.','16 эп.','Comedy','Не подтверждено: Длительность эпизода нужно проверить'])assert.ok(text.includes(part),part);
 assert.doesNotMatch(text,/Hidden genre|INVISIBLE_CONDITION/);
});

test('time/context retractions hide older raw sources and explicit zero child age remains a value',()=>{
 const s=state('cartoon');s.turns=[{id:'one',answer:'OLD_BUDGET',question:{title:'Время?'}},{id:'two',answer:'REMOVED_BUDGET',question:{title:'Условия?'}},{id:'three',answer:'Тёплый юмор',question:{title:'Поправка?'}}];
 s.retractions=[{kind:'session_time',sourceId:'two',at:'two'}];s.sessionTime=null;s.context={company:'children',childAge:0};
 const text=selectionCopyText({state:s});
 assert.doesNotMatch(text,/OLD_BUDGET|REMOVED_BUDGET|45 мин/);assert.match(text,/Тёплый юмор/);assert.match(text,/Возраст младшего ребёнка: 0/);
});
