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

test('modern feedback exposes every fit action before the optional explanation disclosure',()=>{
  const html=eveningControls(modernRun,'first',{modern:true});
  const visible=html.slice(0,html.indexOf('<details'));
  for(const [value,label] of [['accept','Подходит'],['conditional','С оговоркой'],['reject','Не подходит'],['unknown','Пока не знаю']]){
    assert.match(visible,new RegExp(`data-act="evening-fit" data-run="evening-one" data-id="first" data-v="${value}"[^>]*>${label}</button>`));
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

test('modern feedback keeps chosen/start/outcome actions and selected fit available without changing legacy defaults',()=>{
  const run={...modernRun,responses:[{cardId:'first',fit:'conditional',chosen:true,started:true,outcome:'liked',reason:'time',note:'Short evening'}]};
  const html=eveningControls(run,'first',{modern:true});
  for(const token of ['data-act="evening-choose"','data-v="off"','data-act="evening-start"','data-act="evening-outcome"','data-fk="evening-reason:evening-one:first"'])assert.ok(html.includes(token),token);
  assert.match(html,/data-v="conditional"[^>]+aria-pressed="true"/);
  assert.match(html,/<summary[^>]*>Изменить уточнение/);
  const legacy=eveningControls(run,'first');
  assert.equal(legacy,eveningControls(run,'first',{modern:false}));
  assert.match(legacy,/<summary>Подходит на сегодня\?/);
  assert.doesNotMatch(legacy,/evening-controls-modern/);
});
