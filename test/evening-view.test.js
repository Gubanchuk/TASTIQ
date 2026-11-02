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
