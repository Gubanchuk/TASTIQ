import test from 'node:test';
import assert from 'node:assert/strict';
import {requestOverviewHtml,activeRequestText,requestPreviewHtml} from '../src/server/public/shared/request-overview.js';

test('request overview exposes active conditions without a hidden details wrapper',()=>{
 const html=requestOverviewHtml({screen:{facts:[{key:'one',text:'Без спешки',stance:'want',scope:'today'},{key:'two',text:'Без PvP',stance:'avoid',scope:'today'}]},state:{turns:[]}});
 assert.match(html,/Без спешки/);assert.match(html,/Без PvP/);assert.match(html,/data-key="one"/);assert.match(html,/data-act="remove-fact"/);assert.doesNotMatch(html,/<details[^>]*request-details/);
});

test('mobile preview keeps the current wish visible when there is an unresolved question',()=>{
 const html=requestPreviewHtml({screen:{summary:'Хочется исследовать мир без спешки.',uncertainties:['Мир, история или герой?']}});
 assert.match(html,/Хочется исследовать мир без спешки/);
 assert.match(html,/data-act="preview-clarify"/);
 assert.match(html,/Уточнить один момент/);
 assert.doesNotMatch(html,/Мир, история или герой\?/);
});
test('request text uses active sent own words and never a superseded or model uncertainty',()=>{
 const state={turns:[{kind:'answer',text:'Старое',superseded:true},{kind:'answer',text:'Тихое исследование'},{kind:'unknown',text:''}]};
 assert.equal(activeRequestText(state),'Тихое исследование');assert.equal(activeRequestText({turns:[{kind:'answer',text:'Старое',superseded:true}]}),'');
 const html=requestOverviewHtml({screen:{summary:'',uncertainties:['Модель не уверена']},state});assert.match(html,/Тихое исследование/);assert.doesNotMatch(html,/Модель не уверена/);
});
test('request overview escapes user text and preserves escaped identity for a removal action',()=>{
 const html=requestOverviewHtml({screen:{summary:'<img onerror=boom>',facts:[{key:'"bad',text:'<script>bad</script>',stance:'require',scope:'today'}]},state:{}});
 assert.doesNotMatch(html,/<script>|<img/);assert.match(html,/&lt;script&gt;/);assert.match(html,/data-key="&quot;bad"/);
});

test('a local genre summary never hides the sent own-word wish while conditions are being asked',()=>{
 const html=requestOverviewHtml({screen:{type:'question',question:{id:'platform'},summary:'Хочется: Стратегия',facts:[{key:'genre',text:'Стратегия',stance:'want',scope:'today'}]},state:{turns:[{kind:'answer',text:'Хочу управлять экономикой и развивать государство.'}]}});
 assert.match(html,/Хочу управлять экономикой и развивать государство\./);
 assert.match(html,/Стратегия/);
});

test('removing a grounded condition does not reintroduce its source as the current request fallback',()=>{
 const state={turns:[{id:'t1',kind:'answer',text:'Хочу без PvP',answer:'Хочу без PvP'}],retractions:[{sourceId:'t1',quote:'без PvP',key:'avoid-pvp',feature:'pvp'}]};
 assert.equal(activeRequestText(state),'');
 const html=requestOverviewHtml({screen:{summary:'',facts:[]},state});assert.doesNotMatch(html,/Хочу без PvP/);
});
