import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCatalogs, catalogMeta, searchItems} from '../src/core/catalog.js';
import {newMediaConversation, mediaConversationToLegacy} from '../src/core/media-conversation.js';
import {candidatesOf} from '../src/ai/pick.js';
import {pickerEntryRoute} from '../src/server/public/shared/media-route.js';
import {collectionRecords} from '../src/server/public/shared/library-collection.js';
import {createLibraryStore} from '../src/server/public/shared/library-store.js';
import {mediaCardHtml, mediaLibraryState, toggleMediaLibrarySave} from '../src/server/public/pick/watch/card-view.js';

const catalogs = loadCatalogs();
const avatar = 'tt0417299';

test('anime is an independent entry with screened membership and stable screen IDs', () => {
  assert.equal(pickerEntryRoute({search:'?start=anime'}), '/pick/watch/?domain=anime');
  const {anime, cartoon, series} = catalogs;
  assert.match(newMediaConversation({domain:'anime'}).question.title, /аниме/i);
  for (const id of ['tt0382932','tt0120587']) {
    assert.ok(cartoon.byId.has(id));
    assert.ok(!anime.byId.has(id));
  }
  assert.equal(anime.byId.get(avatar).work, cartoon.byId.get(avatar).work);
  assert.ok(!anime.byId.has('tt9018736') && series.byId.has('tt9018736'));
  assert.equal(searchItems(anime, 'Унесённые призраками')[0].id, 'tt0245429');
  assert.equal(catalogMeta(catalogs).domains.anime.items, anime.byId.size);
});

test('the Japanese-only request restricts the actual shortlist and a movie time cap excludes series', () => {
  const {anime} = catalogs;
  assert.ok(anime.byId.has(avatar));
  const state = newMediaConversation({domain:'anime'});
  state.context.format = 'movie';
  state.sessionTime = {minutes:100};
  state.turns = [{id:'answer',kind:'answer',answer:'Только японское аниме, без западной стилизации',question:{title:'Что посмотреть?'}}];
  const rows = candidatesOf(anime, mediaConversationToLegacy(state, anime.dict)).rows;
  assert.ok(rows.length > 0);
  assert.ok(rows.every(({game}) => game.animeOrigin === 'japanese' && game.kind === 'film' && game.runtime <= 100));
});

test('the published anime menu uses independent metadata and no imported ratings or artwork', () => {
  const {anime,cartoon}=catalogs;
  assert.equal(anime.byId.get('tt0245429').runtime,125);
  const {byId}=cartoon;
  for(const item of [...anime.items,byId.get('tt0382932'),byId.get('tt0120587')]){
    assert.equal(item.reviews.desc,null);
    assert.equal(item.reviews.total,0);
    assert.ok(!item.poster&&!item.image&&!item.network);
    assert.ok(Object.values(item.features).every(feature=>feature.src.every(source=>source==='editorial')));
  }
});

test('a verified first episode is distinct from the duration of every episode', () => {
  const {anime}=catalogs;
  const state=newMediaConversation({domain:'anime'});
  state.context={...state.context,format:'episodic',timeMode:'episode'};
  state.sessionTime={minutes:24,sourceId:'answer'};
  state.turns=[{id:'answer',kind:'answer',answer:'Только западные работы. Первая серия до 24 минут.',question:{title:'Что посмотреть?'}}];
  const search=()=>candidatesOf(anime,mediaConversationToLegacy(state,anime.dict)).rows.map(row=>row.game.id);
  assert.deepEqual(search(),[avatar]);
  state.sessionTime={minutes:35,sourceId:'answer'};
  state.turns[0].answer='Только западные работы. Каждый эпизод до 35 минут.';
  assert.deepEqual(search(),[]);
});

test('the western style marker and saved work survive crossing from anime to cartoons', () => {
  const library = createLibraryStore({});
  const card = {id:avatar,name:'Avatar'};
  assert.match(mediaCardHtml(card,{domain:'anime'}), /В аниме-стиле/);
  toggleMediaLibrarySave(library,card,{domain:'anime'});
  assert.equal(mediaLibraryState(card,library.all(),'cartoon').saved,true);
  const records = collectionRecords({items:library.all(),runs:[{id:'a',domain:'anime',cards:[card],responses:[{cardId:avatar,chosen:true}]}]});
  assert.equal(records.length,1);
  assert.equal(records[0].reviews[0].runId,'a');
  toggleMediaLibrarySave(library,card,{domain:'cartoon'});
  assert.equal(mediaLibraryState(card,library.all(),'anime').saved,false);
});
