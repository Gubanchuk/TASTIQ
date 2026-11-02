import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, reduce, screen } from '../src/core/dialogue.js';
import { fixtureCatalog, screenFixture } from './fixture.js';
import { describePerson } from '../src/ai/prompt.js';
const cats={game:fixtureCatalog(),film:screenFixture('film')};
const choose=(s,value)=>reduce(s,{type:'choose',value},cats);
test('family age is optional, validated and passed to AI without inventing a rating',()=>{
  let s=choose(initialState(),'film');s=choose(s,'any');s=choose(s,'kids');
  assert.equal(s.step,'context');assert.equal(screen(s,cats).contextKey,'childAge');
  const skipped=reduce(s,{type:'skip'},cats);
  assert.equal(skipped.step,'anchors');assert.equal(skipped.situation.childAge,null);
  s=choose(s,'preschool');
  assert.equal(s.step,'anchors');assert.equal(s.situation.childAge,'preschool');
  assert.match(describePerson(s,cats.film),/Возраст детей: до 7 лет/);
});
test('group size is asked only for a gaming group, unknown answers stay unknown',()=>{
  let s=choose(initialState(),'game');s=choose(s,'windows');s=choose(s,'group');
  assert.equal(screen(s,cats).contextKey,'partySize');
  const unknown=choose(s,'not-an-option');assert.equal(unknown.situation.partySize,null);
  s=choose(s,'4');assert.match(describePerson(s,cats.game),/Игроков: четверо/);
  let solo=choose(initialState(),'game');solo=choose(solo,'windows');solo=choose(solo,'solo');
  assert.equal(solo.step,'anchors');
});
test('an optional evening wish survives the extra page, is bounded and is shown to AI',()=>{
  let s=choose(initialState(),'game');s=choose(s,'windows');s=choose(s,'solo');
  s=reduce(s,{type:'react',marks:[],note:'  история с героями\nна час перед сном  '},cats);
  assert.equal(s.situation.note,'история с героями на час перед сном');
  s=reduce(s,{type:'react',marks:[]},cats);
  assert.match(describePerson(s,cats.game),/Сегодня своими словами: «история с героями на час перед сном»/);
  assert.ok(s.situation.note.length<=300);
});
test('paging familiar titles preserves the wish without turning it into a permanent preference',()=>{
  let s=choose(initialState(),'game');s=choose(s,'windows');s=choose(s,'solo');
  s=reduce(s,{type:'more',ids:[],note:'на час перед сном'},cats);
  assert.equal(s.situation.note,'на час перед сном');
  assert.equal(s.preferences.length,0);
});
test('engine-only results disclose context they cannot verify from catalog facts',()=>{
 const state={...initialState(),domain:'film',step:'result',situation:{company:'kids',childAge:'preschool',note:'без жути'}};
 assert.deepEqual(screen(state,cats).result.uncheckedContext,['возраст детей','пожелание на вечер']);
});
