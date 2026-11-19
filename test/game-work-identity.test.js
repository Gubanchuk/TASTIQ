import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCatalog,editionsOf} from '../src/core/catalog.js';
import {newConversation,conversationToLegacy} from '../src/core/conversation.js';
import {workKey} from '../src/lib/text.js';

test('Steam title collisions cannot extend an exclusion to an unrelated work', () => {
  const rows = [
    [1771980,'The Operator'],[1913370,'OPERATOR'],
    [1035510,'Ultimate Zombie Defense'],[533780,'Zombie Defense'],
    [72850,'The Elder Scrolls V: Skyrim'],[489830,'The Elder Scrolls V: Skyrim Special Edition'],
    [999000001,'The Elder Scrolls V: Skyrim Gold'],
  ].map(([appid,name])=>({id:'steam:'+appid,domain:'game',appid,name,work:workKey(name),popularity:1}));
  const catalog = makeCatalog({items:rows},'game');
  const state = newConversation();
  state.familiar.excluded = ['steam:1771980','steam:1035510','steam:489830'];
  const excluded = conversationToLegacy(state,catalog.dict,catalog).session.notNow;
  assert.deepEqual(new Set(excluded),new Set([...state.familiar.excluded,'steam:72850']));
  assert.deepEqual(editionsOf(catalog,'steam:1913370'),['steam:1913370']);
  assert.deepEqual(editionsOf(catalog,'steam:533780'),['steam:533780']);
  assert.deepEqual(editionsOf(catalog,'steam:999000001'),['steam:999000001']);
});

test('missing work identifiers remain separate and explicit source links remain shared', () => {
  const rows = [null,null,'Q34852','Q34852'].map((work,index)=>({
    id:'steam:'+(110+index),appid:110+index,name:'Example',domain:'game',popularity:1,work,
  }));
  const catalog = makeCatalog({items:rows},'game');
  assert.deepEqual(editionsOf(catalog,'steam:110'),['steam:110']);
  assert.deepEqual(editionsOf(catalog,'steam:112'),['steam:112','steam:113']);
});
