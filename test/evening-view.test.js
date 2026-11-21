import test from 'node:test';
import assert from 'node:assert/strict';
import { eveningControls } from '../src/server/public/shared/evening-view.js';
import { publicFeedback } from '../src/server/public/shared/evening-feedback.js';

test('a local draft survives rendering, stays escaped and never enters the saved feedback payload',()=>{
  const run={version:1,id:'run',dialogueId:'dialogue',domain:'game',revision:1,at:'2026-10-31T12:00:00Z',updatedAt:'2026-10-31T12:00:00Z',context:{},cards:[{id:'1',title:'One',origin:'engine'}],responses:[{cardId:'1',fit:'conditional',reason:null,note:'Saved',chosen:false,started:false,outcome:null}]};
  const html=eveningControls(run,'1',{open:true,draft:{reason:'time',note:'Draft <img src=x>'}});
  assert.match(html,/value="time" selected/);assert.match(html,/Draft &lt;img src=x&gt;/);
  assert.doesNotMatch(html,/<img/);assert.equal(publicFeedback(run).responses[0].note,'Saved');
});

const modernRun={id:'evening-one',cards:[{id:'first',title:'First'},{id:'second',title:'Second'}],responses:[]};

test('modern picks group fit actions under a closed rating disclosure and evenings expose them directly',()=>{
  const html=eveningControls(modernRun,'first',{modern:true});
  const rating=html.indexOf('<details class="evening-rating"');
  const explanation=html.indexOf('<details class="evening-fit evening-feedback-note"');
  assert.ok(rating>0&&explanation>rating);
  assert.doesNotMatch(html.slice(0,rating),/data-act="evening-fit"/);
  assert.match(html,/<details class="evening-rating" data-disclosure="rating:evening-one:first"><summary[^>]*>Оценить рекомендацию<\/summary>/);
  const history=eveningControls(modernRun,'first',{modern:true,history:true});
  assert.doesNotMatch(history,/class="evening-rating"/);
  for(const [value,label] of [['accept','Подходит'],['conditional','С оговоркой'],['reject','Не подходит'],['unknown','Пока не знаю']]){
    const action=new RegExp(`data-act="evening-fit" data-run="evening-one" data-id="first" data-v="${value}"[^>]*>${label}</button>`);
    assert.match(html.slice(rating,explanation),action);
    assert.match(history,action);
  }
  assert.match(html,/<details[^>]+data-feedback-details[^>]+data-run="evening-one" data-id="first">/);
  assert.match(html,/<summary[^>]*>Добавить уточнение/);
  assert.match(html,/name="reason"/);assert.match(html,/name="note"/);
});

test('modern explanation and its escaped unsent draft stay scoped to the requested card',()=>{
  const first=eveningControls(modernRun,'first',{modern:true,open:true,draft:{reason:'time',note:'Only first <script>draft</script>'}});
  const second=eveningControls(modernRun,'second',{modern:true});
  assert.match(first,/<details[^>]+data-id="first" open>/);
  assert.match(first,/value="time" selected/);assert.match(first,/Only first &lt;script&gt;draft&lt;\/script&gt;/);
  assert.doesNotMatch(second,/<details[^>]+ open/);assert.doesNotMatch(second,/Only first/);
  assert.doesNotMatch(first,/<script>/);assert.deepEqual(modernRun.responses,[]);
});

test('current and legacy results show choice and fit while experience is editable only in library history',()=>{
  const run={...modernRun,responses:[{cardId:'first',fit:'conditional',chosen:true,started:true,outcome:'liked',reason:'time',note:'Short evening'}]};
  for(const modern of [true,false]){
    const result=eveningControls(run,'first',{modern});
    assert.match(result,/data-act="evening-choose"[^>]+data-v="off"/);
    assert.match(result,/data-v="conditional"[^>]+aria-pressed="true"/);
    assert.doesNotMatch(result,/evening-start|evening-outcome|Понравилось/);
    const history=eveningControls(run,'first',{modern,history:true});
    assert.match(history,/data-act="evening-start"[^>]+aria-pressed="true"/);
    assert.match(history,/data-act="evening-outcome"[^>]+data-v="liked"[^>]+aria-pressed="true"/);
  }
});

test('saved fit is acknowledged on results and remains editable in both views',()=>{
  const run={...modernRun,responses:[{cardId:'first',fit:'conditional',chosen:true,started:true,outcome:'liked',reason:null,note:''}]};
  for(const history of [true,false]){
    const html=eveningControls(run,'first',{modern:true,history,status:'sent'});
    assert.match(html,/Спасибо за отзыв!/);
    assert.match(html,/<details class="evening-rating"[^>]+><summary[^>]*>.*Изменить оценку/);
    assert.doesNotMatch(html,/<details class="evening-(rating|outcome)"[^>]+ open/);
    assert.match(html,/С оговоркой/);
    if(history)assert.match(html,/<details class="evening-outcome"[^>]+><summary[^>]*>.*Как прошло: Понравилось.*Изменить отзыв/);
  }
});

test('choosing or recording an experience alone never acknowledges a recommendation rating on results',()=>{
  for(const outcome of [null,'liked']){
    const run={...modernRun,responses:[{cardId:'first',chosen:true,started:Boolean(outcome),outcome}]};
    for(const modern of [true,false]){
      const result=eveningControls(run,'first',{modern,status:'sent'});
      assert.doesNotMatch(result,/evening-start|evening-outcome|Спасибо за отзыв|data-feedback-status/);
    }
    if(outcome)assert.match(eveningControls(run,'first',{modern:true,history:true}),/Спасибо за отзыв/);
  }
});
