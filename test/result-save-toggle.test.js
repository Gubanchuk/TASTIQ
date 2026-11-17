import test from 'node:test';
import assert from 'node:assert/strict';
import {createLibraryStore} from '../src/server/public/shared/library-store.js';
import {toggleGameLibrarySave,gameLibraryState,gameCardHtml} from '../src/server/public/pick/game/card-view.js';
import {toggleMediaLibrarySave,mediaLibraryState,mediaCardHtml} from '../src/server/public/pick/watch/card-view.js';

for(const domain of ['game','film','series','cartoon'])test(`${domain}: bookmark toggles independently of a work rating, including old tonight records`,()=>{
 const library=createLibraryStore(),card={id:'title:1',title:'Название',year:2001};
 library.save(card,{domain,lane:'tonight'});library.rate(domain,card.id,'liked');
 const state=()=>domain==='game'?gameLibraryState(card,library.all()):mediaLibraryState(card,library.all(),domain);
 const toggle=()=>domain==='game'?toggleGameLibrarySave(library,card):toggleMediaLibrarySave(library,card,{domain});
 assert.equal(state().saved,true);toggle();assert.equal(state().saved,false);
 assert.equal(library.all()[0].status,'liked');assert.equal(state().known,true);
 toggle();assert.equal(state().saved,true);assert.equal(library.all()[0].status,'liked');
 const html=domain==='game'?gameCardHtml(card,state()):mediaCardHtml(card,{...state(),domain});
 assert.match(html,/aria-pressed="true"[^]*?Сохранено<\/button>/);
 assert.doesNotMatch(html,/На потом/);
});

test('an unsaved rating is not a saved bookmark',()=>{
 const items=[{domain:'game',id:'a',lane:'known',status:'liked'}];
 assert.equal(gameLibraryState({id:'a'},items).saved,false);
 assert.equal(gameLibraryState({id:'a'},items).known,true);
});
