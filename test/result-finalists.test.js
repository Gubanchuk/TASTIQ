import test from 'node:test';
import assert from 'node:assert/strict';
import {currentFinalists,comparisonRows,comparisonReasonsHtml} from '../src/server/public/shared/result-comparison.js';
import {resultCardReason,resultRequestScreen} from '../src/server/public/shared/result-clarity.js';
import {gameCardHtml} from '../src/server/public/pick/game/card-view.js';
import {mediaCardHtml} from '../src/server/public/pick/watch/card-view.js';
import {shorterLimit,shorterAction} from '../src/server/public/pick/watch/shorter-result.js';
import {answerMediaConversation,newMediaConversation,normalizeMediaConversation} from '../src/core/media-conversation.js';

test('the comparison follows the visible batch and excludes marked, duplicate, and superseded titles',()=>{
 const [a,b,c,d,e]=['a','b','c','d','e'].map(id=>({id}));
 const state={result:{top:e},familiar:{marked:['b']},id:'s'};
 const result={top:a,alternatives:[b,a,d,e]};
 assert.deepEqual(currentFinalists(state,{type:'result',result}),[a,d]);
 assert.deepEqual(currentFinalists(state,{type:'result',result:{top:c,alternatives:[e]}}),[c,e]);
 assert.deepEqual(currentFinalists(state,{type:'review'}),[]);
});

test('only a distinct pair can be compared and unknown data stays separate from differences in episode scope',()=>{
 const a={id:'a',kind:'film',year:2020,runtime:27,genres:['Action','Comedy']};
 const b={id:'b',kind:'series',year:2020,runtime:27,genres:['Comedy','Action'],episodes:6};
 assert.deepEqual(comparisonRows([a],'anime'),[]);
 assert.deepEqual(comparisonRows([a,a],'anime'),[]);
 assert.deepEqual(comparisonRows([a,b,{id:'c'}],'anime'),[]);
 const rows=comparisonRows([a,b],'anime');
 assert.deepEqual(rows.map(row=>row.label),['Длительность','Формат','Эпизоды']);
 assert.deepEqual(rows[0].values,['27 мин · фильм','27 мин · первая серия']);
 assert.deepEqual(rows[2].values,['','6']);
 assert.deepEqual(comparisonRows([a,{...a,id:'c'}],'film'),[]);
});

test('game comparison uses real player checks and never turns unverified capacity or review playtime into a session length',()=>{
 const rows=comparisonRows([{id:'a',feasibility:[{key:'players',status:'unknown',text:'Нет источника'}],facts:[{id:'fact:hours',hours:20}]},
  {id:'b',feasibility:[{key:'players',status:'yes',text:'В компании из четырёх человек'}],genres:['Action']}],'game');
 assert.deepEqual(rows,[{label:'Жанры',values:['','Экшен']},{label:'Число игроков',values:['','В компании из четырёх человек']}]);
});

test('each finalist keeps its own explanation and caveat even when the genres match',()=>{
 const a={id:'a',name:'Мир <А>',genres:['Drama'],ai:{reason:'Герои решают спор за разговором.',caveat:'Начало медленное.'}};
 const b={id:'b',name:'Б',genres:['Drama'],reason:'Спор быстро переходит в погоню.'};
 assert.deepEqual(comparisonRows([a,b],'film'),[]);
 const html=comparisonReasonsHtml([a,b]);
 assert.match(html,/Мир &lt;А&gt;<\/h4>\s*<p>Герои решают спор за разговором\.<\/p>.*Начало медленное\./s);
 assert.match(html,/<h4>Б<\/h4>\s*<p>Спор быстро переходит в погоню\.<\/p>/);
 const replacement={name:'В',facts:[{id:'pace'}],explanation:{reasons:[{text:'Можно остановиться после главы.',factIds:['pace']}]}};
 const changed=comparisonReasonsHtml([replacement,b]);
 assert.match(changed,/Можно остановиться после главы/);
 assert.doesNotMatch(changed,/Начало медленное|Герои решают спор/);
 assert.match(comparisonReasonsHtml([b,{name:'Г',genres:['Drama']}]),/Спор быстро переходит в погоню/);
 assert.equal(comparisonReasonsHtml([{name:'Д'},{name:'Е'}]),'');
});

test('the pair summary follows both identities on switch, including reverse order and older cards',()=>{
 const summary='В «А» ты сам ищешь дорогу. В «Б» погоня задаёт темп.';
 const a={id:'a',name:'А',ai:{reason:'Открытые маршруты.',comparisons:[{otherId:'b',summary}]}};
 const b={id:'b',name:'Б',ai:{reason:'Быстрая погоня.',caveat:'Сложный старт.'}};
 for(const pair of [[a,b],[b,a]]){
  const html=comparisonReasonsHtml(pair);
  assert.ok(html.includes(summary));assert.ok(html.includes(b.ai.caveat));assert.ok(!html.includes(b.ai.reason));
 }
 const c={id:'c',name:'В',reason:'Спокойный маршрут.'};
 assert.doesNotMatch(comparisonReasonsHtml([a,c]),/погоня задаёт/);
 assert.ok(comparisonReasonsHtml([a,c]).includes(c.reason));
 const hostile={...a,ai:{comparisons:[{otherId:'b',summary:'<tag>'}]}};
 assert.match(comparisonReasonsHtml([b,hostile]),/&lt;tag&gt;/);
});

test('a shared reason appears once and a distinct caveat stays on the correct side',()=>{
 const a={name:'Первый',reason:'Тихое исследование.'},b={name:'Второй',reason:a.reason,caveat:'Долгое вступление.'};
 const html=comparisonReasonsHtml([a,b]);
 assert.equal(html.split(a.reason).length,2);
 assert.match(html,/<section data-slot="1"><h4>Второй<\/h4>[\s\S]*Долгое вступление\./);
 assert.doesNotMatch(html,/нет пояснения/);
 assert.doesNotMatch(comparisonReasonsHtml([a,{...b,caveat:''}]),/<section/);
});

test('a restored or mixed pair compares available catalog facts even if the old reasons match',()=>{
 const [a,b]=[{id:'a',name:'А',genres:['Action'],reason:'Одна причина.'},{id:'b',name:'Б',genres:['Action','Adventure'],reason:'Одна причина.'}];
 const html=comparisonReasonsHtml([a,b],'game');
 assert.match(html,/Общий жанр — экшен\. У «Б» в каталоге также указан жанр «приключения»/);
 assert.equal(html.split(a.reason).length,2);
 const series=[{...a,kind:'series',runtime:24},{...b,kind:'series',runtime:45}];
 assert.match(comparisonReasonsHtml(series,'anime'),/Первая серия в «А» длится 24 мин, в «Б» — 45 мин/);
 assert.doesNotMatch(comparisonReasonsHtml([{...a,genres:[]},b],'game'),/Различия по каталогу/);
});

test('an available grounded reason is shown, while a card without evidence never repeats a batch disclaimer',()=>{
 const notice='Это предварительный подбор по доступным признакам: помощник сейчас недоступен, свободный ответ мог быть учтён не полностью.';
 const screen={type:'result',provisional:true,uncertainties:[notice,'Кто смотрит вместе?']};
 assert.deepEqual(resultRequestScreen(screen).uncertainties,['Кто смотрит вместе?']);
 assert.equal(screen.uncertainties.length,2);
 for(const render of [gameCardHtml,mediaCardHtml]){
  const card={id:'1',name:'Пример',facts:[{id:'mood:humour'}],explanation:{reasons:[
   {text:'Нет основания',factIds:['missing']},{text:'Ты выбрал юмор',factIds:['mood:humour']},
  ]}};
  assert.match(render(card),/Ты выбрал юмор/);assert.doesNotMatch(render(card),/Нет основания/);
  assert.doesNotMatch(render({id:'1',name:'Пример'}),/Вариант по каталогу|Пока мало данных|Почему может подойти/);
  assert.equal(resultCardReason({...card,ai:{reason:'Причина подбора'}}),'Причина подбора');
  assert.equal(resultCardReason({feasibility:[{key:'minutes',status:'yes',text:'96 минут при лимите 120.'}]}),'96 минут при лимите 120.');
 }
});

test('a shorter evening limit takes an explicit valid number and preserves committed conditions and the wish on review',()=>{
 let state=newMediaConversation({id:'test-evening',domain:'series'});
 const wish='Хочу детектив с юмором';
 state=answerMediaConversation(state,{type:'answer',questionId:'direction',text:wish});
 state=answerMediaConversation(state,{type:'set_context',context:{company:'adults',format:'episodic',commitment:'short',onlyEnded:true,minutes:45,timeMode:'episode'}});
 state={...state,phase:'result',result:{top:{id:'pilot'},alternatives:[]}};
 const limit=shorterLimit(state,'series');
 for(const value of ['',45,46,4,27.5,'мало'])assert.equal(shorterAction(limit,value),null);
 const action=shorterAction(limit,'27');
 assert.deepEqual(action,{type:'set_context',context:{minutes:27,timeMode:'episode'}});
 const next=normalizeMediaConversation(answerMediaConversation(state,action),'series');
 assert.equal(next.phase,'review');assert.equal(next.needsPlan,false);
 assert.deepEqual(next.context,{...state.context,minutes:27});
 assert.equal(next.sessionTime.minutes,27);assert.equal(next.turns[0].text,wish);
 assert.equal(shorterLimit({context:{minutes:5}},'film'),null);
 const relative=shorterLimit({context:{},result:{top:{kind:'film',runtime:142}}},'film');
 assert.equal(relative.max,141);assert.equal(shorterAction(relative,'180'),null);
 assert.deepEqual(shorterAction(shorterLimit({context:{}},'film'),90),{type:'set_context',context:{minutes:90,timeMode:'runtime'}});
});
