import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCatalogs, catalogMeta, searchItems} from '../src/core/catalog.js';
import {newMediaConversation, mediaConversationToLegacy} from '../src/core/media-conversation.js';
import {candidatesOf,checkPicks,lookUp} from '../src/ai/pick.js';
import {describeCandidates} from '../src/ai/prompt.js';
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
    assert.ok(Object.values(item.features).every(feature=>feature.src.every(source=>['editorial','wikidata'].includes(source))));
  }
});

test('CC0 anime additions appear in search and broad recommendations without claiming unsupported conditions',()=>{
  const {anime}=catalogs;
  assert.ok(anime.items.length>1000);
  const frieren=searchItems(anime,'Фрирен')[0];
  assert.equal(frieren.id,'tt22248376');
  assert.equal(frieren.kind,'series');
  assert.match(frieren.link,/wikidata.org\/wiki\/Q115792176$/);
  assert.equal(frieren.runtime,null);
  assert.equal(frieren.standalone,null);
  const state=newMediaConversation({domain:'anime'});
  const legacy=mediaConversationToLegacy(state,anime.dict);
  assert.ok(candidatesOf(anime,legacy).ranked.some(({game})=>game.id===frieren.id));
  legacy.session.standaloneOnly=true;
  assert.ok(!candidatesOf(anime,legacy).ranked.some(({game})=>game.id===frieren.id));
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

test('anime discovery identifies a series with no duration and resolves catalogue aliases',()=>{
  const {anime}=catalogs;
  const frieren=anime.byId.get('tt22248376');
  const rows=[{game:frieren,matches:[],penalties:[]}];
  assert.match(describeCandidates(rows,anime,[],{detailed:0}),/аниме-сериал/);
  assert.match(describeCandidates(rows,anime,[],{detailed:1}),/аниме-сериал/);
  assert.equal(lookUp(rows,frieren.aliases[0],frieren.year),frieren.id);
  const spirited=anime.byId.get('tt0245429');
  assert.ok(spirited.aliases.length);
  assert.equal(lookUp([{game:spirited}],spirited.aliases.at(-1),spirited.year),spirited.id);
});

test('romaji in a model answer resolves only to the screened series and release year',()=>{
  const {anime}=catalogs;
  const state=newMediaConversation({domain:'anime'});
  state.context.format='episodic';
  state.turns=[{id:'wish',kind:'answer',answer:'Только японские анимационные сериалы.',question:{title:'Какое аниме хочется сегодня?'}}];
  const {rows,ranked}=candidatesOf(anime,mediaConversationToLegacy(state,anime.dict));
  const proposed=[['Natsume Yuujinchou',2008],['Hakumei to Mikochi',2018],['Ookami to Koushinryou',2008],['Somali to Mori no Kamisama',2020]];
  const out=checkPicks({picks:proposed.map(([title,year])=>({id:'',title,year}))},rows,4,ranked,[],{ownLimit:4});
  assert.deepEqual(out.picks.map(p=>p.id),['tt1352421','tt1158671','tt11428586']);
  assert.equal(lookUp(ranked,'Ookami to Koushinryou',2024),null);
  assert.equal(lookUp(ranked.filter(({game})=>game.id!=='tt1352421'),'Natsume Yuujinchou',2008),null);
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
