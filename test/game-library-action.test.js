import test from 'node:test';
import assert from 'node:assert/strict';
import {gameCardHtml,saveGameToLibrary,gameLibraryState} from '../src/server/public/pick/game/card-view.js';

test('explicit game save uses the library plan lane and a normalized title without changing the source card',()=>{
 const card={id:'steam:10',ru:'Русское название',name:'English title',ai:{reason:'Сегодня подходит'},known:false};
 const calls=[],library={save:(saved,options)=>{calls.push({saved,options});return {...saved,...options};}};
 const saved=saveGameToLibrary(library,card);
 assert.deepEqual(calls[0].options,{lane:'want',domain:'game'});
 assert.equal(saved.title,'Русское название');
 assert.equal(calls[0].saved.known,false);
 assert.equal(card.title,undefined);
 assert.deepEqual(card.ai,{reason:'Сегодня подходит'});
});

test('a successful evening choice can use tonight without inventing taste or familiarity',()=>{
 const calls=[],library={save:(card,options)=>{calls.push({card,options});return card;}};
 saveGameToLibrary(library,{id:'steam:11',name:'A game'},{lane:'tonight'});
 assert.deepEqual(calls[0],{card:{id:'steam:11',name:'A game',title:'A game'},options:{lane:'tonight',domain:'game'}});
 for(const key of ['status','answer','known','familiar','liked'])assert.ok(!Object.hasOwn(calls[0].card,key));
 assert.equal(saveGameToLibrary(library,{name:'Missing identity'}),null);
 assert.equal(calls.length,1);
});

test('each available result exposes explicit save and persistent state without changing familiar controls',()=>{
 const card={id:'steam:12',title:'A game'};
 const fresh=gameCardHtml(card,{index:2,known:true});
 assert.match(fresh,/data-act="library-save"[^>]+aria-pressed="false"[^>]*>Сохранить/);
 assert.ok(fresh.includes('data-act="familiar-mark"'));
 const saved=gameCardHtml(card,{saved:true,libraryLane:'tonight'});
 assert.match(saved,/data-act="library-save"[^>]+aria-pressed="true"[^>]*>Сохранено/);
 assert.ok(saved.includes('На этот вечер'));
 const marked=gameCardHtml(card,{marked:true,saved:true});
 assert.ok(!marked.includes('data-act="library-save"'));
 assert.ok(marked.includes('data-act="familiar-unmark"'));
});

test('a library known plan or a previous taste answer marks only the same game as familiar without excluding it',()=>{
 const card={id:'steam:12',title:'A game'};
 for(const row of [
  {id:card.id,domain:'game',lane:'known',status:'want'},
  {id:card.id,domain:'game',lane:'want',status:'liked'},
  {id:card.id,domain:'game',lane:'tonight',status:'disliked'},
 ]){
  const before=structuredClone(row),state=gameLibraryState(card,[row]);
  assert.equal(state.known,true);
  assert.equal(state.saved,true);
  assert.equal(state.libraryLane,row.lane);
  assert.equal(Object.hasOwn(state,'blocked'),false);
  assert.deepEqual(row,before);
  assert.ok(gameCardHtml(card,state).includes('Уже знакома'));
 }
 for(const rows of [
  [{id:card.id,domain:'film',lane:'known'}],
  [{id:'steam:13',domain:'game',lane:'known'}],
  [{id:card.id,domain:'game',lane:'want',status:'want'}],
  [{id:card.id,domain:'game',lane:'tonight',status:'want'}],
 ])assert.equal(gameLibraryState(card,rows).known,false);
});
