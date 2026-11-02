import test from 'node:test';
import assert from 'node:assert/strict';
import {feasibilityHtml} from '../src/server/public/pick/game/feasibility.js';

test('card warnings visibly retain unknown, conditional and incompatible conditions',()=>{
 const html=feasibilityHtml([{status:'yes',text:'Подтверждено'},{status:'unknown',text:'Вместимость не подтверждена'},{status:'conditional',text:'Нужен отдельный режим'},{status:'no',text:'Только два игрока'}]);
 for(const text of ['Проверь перед выбором','Не подтверждено','Вместимость не подтверждена','Есть условие','Нужен отдельный режим','Не подходит по условию','Только два игрока'])assert.ok(html.includes(text));
 assert.ok(!html.includes('Подтверждено'));
});
test('feasibility text is escaped and empty or verified-only conditions add no warning',()=>{
 assert.equal(feasibilityHtml(), '');assert.equal(feasibilityHtml([{status:'yes',text:'Можно'}]),'');assert.equal(feasibilityHtml([{status:'unknown',text:'  '}]),'');
 const html=feasibilityHtml([{status:'unknown',text:'<img src=x onerror="bad()"> & факт'}]);assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));assert.ok(html.includes('&amp; факт'));
});
