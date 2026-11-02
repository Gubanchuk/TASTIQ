import test from 'node:test';
import assert from 'node:assert/strict';
import {pickerEntryRoute} from '../src/server/public/shared/media-route.js';
test('existing landing media entries use the new conversation and legacy restore stays explicit',()=>{
 for(const domain of ['film','series','cartoon'])assert.equal(pickerEntryRoute({search:`?start=${domain}`}),`/pick/watch/?domain=${domain}`);
 assert.equal(pickerEntryRoute({search:'?start=film&legacy=1'}),null);
 assert.equal(pickerEntryRoute({search:''}),null);
 assert.equal(pickerEntryRoute({search:'?start=game'}),null);
 assert.equal(pickerEntryRoute({hash:'#my',search:'?start=film'}),'/library/');
});
