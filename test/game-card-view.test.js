import test from 'node:test';
import assert from 'node:assert/strict';
import {gameCardHtml} from '../src/server/public/pick/game/card-view.js';
import {mediaCardHtml} from '../src/server/public/pick/watch/card-view.js';

test('the new card presentation escapes model/catalog text and rejects executable media and links',()=>{
 const html=gameCardHtml({id:'steam:1',name:'<img src=x onerror=bad()>',poster:'javascript:bad()',image:'data:text/html,bad',link:'javascript:bad()',ai:{reason:'<script>bad()</script>',caveat:'<b>warning</b>'}});
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));assert.ok(!html.includes('javascript:'));assert.ok(!html.includes('data:text/html'));
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('&lt;b&gt;warning&lt;/b&gt;'));
});

test('game and media cards distinguish catalogue reasons and the plan action from choosing for tonight',()=>{
 for(const render of [gameCardHtml,mediaCardHtml]){
  const card={id:'one',name:'One',reason:'A fact-based reason',poster:'https://example.com/landscape.jpg'};
  const html=render(card,{index:0});
  assert.match(html,/Почему предложено · данные каталога/);
  assert.match(html,/data-act="library-save"[^>]*>Сохранить<\/button>/);
  assert.match(html,/class="game-poster[^\"]*" data-title="One"/);
  assert.match(html,/<picture><img[^>]+loading="eager"/);
  assert.doesNotMatch(html,/<img[^>]+(?:width|height)="/);
  assert.match(html,/game-proposal-featured/);
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
 const card={id:'steam:1',name:'Example',ai:{reason:'Причина',caveat:'Оговорка'},feasibility:[{status:'unknown',text:'Вместимость не проверена'}]};
 const html=gameCardHtml(card,{index:1});
 assert.ok(html.includes('Причина'));assert.ok(!html.includes('<details'));
 assert.ok(html.includes('Вместимость не проверена'));assert.ok(html.includes('Оговорка'));
 const marked=gameCardHtml(card,{marked:true,blocked:true});
 for(const action of ['familiar-unmark','familiar-keep','data-history-block'])assert.ok(marked.includes(action));
 assert.ok(marked.includes('checked'));assert.ok(marked.includes('Example'));
 assert.ok(!marked.includes('data-act="familiar-mark"'));
});
