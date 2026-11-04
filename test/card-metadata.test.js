import test from 'node:test';
import assert from 'node:assert/strict';
import {cardMetadataParts,cardMetadataHtml} from '../src/server/public/shared/card-metadata.js';
test('media metadata keeps episode units and season counts together and translates known display genres',()=>{
 const card={year:2005,kind:'series',runtime:23,seasons:3,episodes:62,genres:['Action','Adventure']};
 assert.deepEqual(cardMetadataParts(card,{domain:'cartoon'}),['2005','23 мин / эпизод','3 сез. · 62 эп.','Боевик','Приключения']);
 assert.deepEqual(cardMetadataParts({...card,kind:'film',seasons:null,episodes:null},{domain:'film'}),['2005','23 мин','Боевик','Приключения']);
});
test('game genres retain domain meaning and unknown catalog labels remain literal escaped content',()=>{
 const card={year:2020,genres:['Action','RPG']};assert.deepEqual(cardMetadataParts(card,{domain:'game'}),['2020','Экшен','Ролевая игра']);
 const html=cardMetadataHtml({genres:['<img onerror=x>']},{domain:'game'});assert.match(html,/&lt;img onerror=x&gt;/);assert.doesNotMatch(html,/<img/);
 assert.equal(cardMetadataHtml({},{}),'');
 assert.deepEqual(cardMetadataParts({genres:['constructor']}),['constructor']);
 assert.equal(cardMetadataHtml({genres:'malformed old save'},{}),'');
});
