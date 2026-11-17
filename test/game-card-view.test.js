import test from 'node:test';
import assert from 'node:assert/strict';
import {gameCardHtml} from '../src/server/public/pick/game/card-view.js';
import {mediaCardHtml} from '../src/server/public/pick/watch/card-view.js';
import {singleReplacementIndex} from '../src/server/public/shared/result-clarity.js';

test('the new card presentation escapes model/catalog text and rejects executable media and links',()=>{
 const html=gameCardHtml({id:'steam:1',name:'<img src=x onerror=bad()>',poster:'javascript:bad()',image:'data:text/html,bad',link:'javascript:bad()',ai:{reason:'<script>bad()</script>',caveat:'<b>warning</b>'}});
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));assert.ok(!html.includes('javascript:'));assert.ok(!html.includes('data:text/html'));
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('&lt;b&gt;warning&lt;/b&gt;'));
});

test('game and media cards explain the fit and distinguish the plan action from choosing for tonight',()=>{
 for(const render of [gameCardHtml,mediaCardHtml]){
  const card={id:'one',name:'One',reason:'A fact-based reason',poster:'https://example.com/landscape.jpg'};
  const html=render(card,{index:0});
  assert.match(html,/Почему может подойти/);
  assert.match(html,/A fact-based reason/);
  assert.match(html,/data-act="library-save"[^>]*aria-pressed="false">[^]*?<\/svg>Сохранить<\/button>/);
  assert.match(render(card,{saved:true,libraryLane:'tonight'}),/data-act="library-save"[^>]*aria-pressed="true"/);
  assert.match(render(card,{saved:true,libraryLane:'want'}),/data-act="library-save"[^>]*aria-pressed="true"/);
  assert.match(html,/class="game-poster[^\"]*" data-title="One"/);
  assert.match(html,/<picture><img[^>]+loading="eager"/);
  assert.doesNotMatch(html,/<img[^>]+(?:width|height)="/);
  assert.match(html,/game-proposal-featured/);
  assert.match(html,/<h2[^>]*>Главный вариант<\/h2>/);
  assert.match(render(card,{index:1}),/<h2[^>]*>Другие варианты<\/h2>/);
  assert.doesNotMatch(render(card,{index:2}),/Главный вариант|Другие варианты/);
  assert.doesNotMatch(render(card,{index:1}),/game-proposal-featured/);
  assert.doesNotMatch(render(card,{index:2}),/game-proposal-featured/);
 }
});

test('complete art retains load/error hooks while familiarity remains an explicit reversible replacement',()=>{
 for(const render of [gameCardHtml,mediaCardHtml]){
  const card={id:'one',name:'One',poster:'https://example.com/portrait.jpg'};
  assert.match(render(card),/data-act="familiar-mark"[^>]*>Знакомо — заменить<\/button>/);
  const pending=render(card,{marked:true,blocked:true});
  for(const token of ['data-title="One"','<picture><img','familiar-unmark','familiar-keep','data-history-block="one"',' checked'])assert.ok(pending.includes(token),token);
  assert.doesNotMatch(pending,/data-card-feedback/);
  assert.match(render({...card,poster:null}),/game-poster-fallback/);
 }
});

test('an alternative retains visible reason and uncertain conditions; a marked card keeps undo/return/exclusion actions',()=>{
 const reason='Можно свернуть с тропы, исследовать руины и вернуться к заданию позже. Так ты сам задаёшь темп и выбираешь, куда идти.';
 const card={id:'steam:1',name:'Example',ai:{reason,caveat:'Оговорка'},feasibility:[{status:'unknown',text:'Вместимость не проверена'}]};
 for(const render of [gameCardHtml,mediaCardHtml]){
  const html=render(card,{index:1});
  assert.ok(html.includes(reason));assert.ok(!html.includes('<details'));
  assert.doesNotMatch(html,/мнение модели|данные каталога/);
 }
 const html=gameCardHtml(card,{index:1});
 assert.ok(html.includes('Вместимость не проверена'));assert.ok(html.includes('Оговорка'));
 const marked=gameCardHtml(card,{marked:true,blocked:true});
 for(const action of ['familiar-unmark','familiar-keep','data-history-block'])assert.ok(marked.includes(action));
 assert.ok(marked.includes('checked'));assert.ok(marked.includes('Example'));
 assert.ok(!marked.includes('data-act="familiar-mark"'));
});

test('a single swap offers undo on the changed slot, with a footer fallback if it becomes marked',()=>{
 const top={id:'top',name:'Top'},old={id:'old',name:'Old'},next={id:'next',name:'Next'};
 const state={
  result:{top,alternatives:[next]},
  familiar:{marked:[],undo:{marked:[old.id],result:{top,alternatives:[old]}}},
  replacement:{changedIds:[old.id]},
 };
 assert.equal(singleReplacementIndex(state),1);
 for(const render of [gameCardHtml,mediaCardHtml]){
  assert.match(render(next,{index:1,inlineUndo:true}),/data-inline-undo>Отменить замену/);
  assert.doesNotMatch(render(top),/data-inline-undo/);
 }
 state.familiar.marked=[next.id];
 assert.equal(singleReplacementIndex(state),-1);
 state.familiar.marked=[];
 state.replacement.changedIds=[top.id,old.id];
 assert.equal(singleReplacementIndex(state),-1);
});
