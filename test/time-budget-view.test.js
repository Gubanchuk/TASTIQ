import test from 'node:test';
import assert from 'node:assert/strict';
import {timeBudgetHtml,timeEvidenceHtml,hasSessionTime} from '../src/server/public/pick/game/time-budget-view.js';

const time={minutes:90,sourceId:'dialogue:4',quote:'На сегодня полтора часа'};
test('today time is visible and removable in review and summary without claiming game suitability',()=>{
 for(const scope of ['summary','review']){
  const html=timeBudgetHtml(time,{scope});
  assert.ok(html.includes('На сегодня: 90 мин'));assert.ok(html.includes('Убрать ограничение времени'));
  assert.ok(html.includes('data-act="remove-time"'));assert.ok(html.includes(`data-focus="remove-time:${scope}"`));
  assert.ok(!html.includes('длительность игры'));assert.ok(!html.includes('можно прервать'));
 }
});
test('absent, incomplete, or invalid time metadata produces no invented chip or empty evidence',()=>{
 for(const value of [null,{}, {...time,minutes:'90'},{...time,minutes:0},{...time,minutes:-3},{...time,minutes:1.5},{...time,minutes:NaN},{...time,quote:''},{...time,sourceId:''}]){
  assert.equal(hasSessionTime(value),false);assert.equal(timeBudgetHtml(value),'');assert.equal(timeEvidenceHtml(value),'');
 }
});
test('time source shows the exact human words as escaped evidence',()=>{
 const html=timeEvidenceHtml({...time,quote:'Сегодня <90> минут & без спешки'});
 assert.ok(html.includes('Сегодня &lt;90&gt; минут &amp; без спешки'));assert.ok(!html.includes('<90>'));
 assert.ok(!html.includes(time.sourceId));
});
