import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCatalogs, catalogMeta, searchItems} from '../src/core/catalog.js';
import {newMediaConversation, mediaConversationToLegacy} from '../src/core/media-conversation.js';
import {candidatesOf,checkPicks,lookUp} from '../src/ai/pick.js';
import {recommendIds} from '../src/core/recommend.js';
import {profileOf,sessionOf} from '../src/core/dialogue.js';
import {createMediaConversationService} from '../src/server/media-conversation-service.js';
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

test('a publisher-verified anime film links to the release when no Wikidata ID is available', () => {
  const film = catalogs.anime.byId.get('tt6448586');
  assert.equal(film.kind, 'film');
  assert.equal(film.animeOrigin, 'japanese');
  assert.equal(film.link, 'https://www.inazuma.jp/archive/eiga/03/');
  assert.ok(film.poster);
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

test('anime origin accepts singular western series and only demands age proof when the age condition is explicit',()=>{
  const {anime}=catalogs;
  const state=newMediaConversation({domain:'anime'});
  const answer=(id,text)=>({id,kind:'answer',answer:text,question:{title:'Какое аниме хочется?'}});
  const ranked=(...answers)=>{
    state.turns=answers.map((text,i)=>answer(String(i),text));
    return candidatesOf(anime,mediaConversationToLegacy(state,anime.dict)).ranked.map(row=>row.game.id);
  };
  const japan=ranked('Только японское аниме.');
  assert.ok(japan.length);
  assert.deepEqual(ranked('Только японское аниме. Возрастной рейтинг не важен.'),japan);
  assert.deepEqual(ranked('Только японское аниме и возрастной рейтинг не указан.'),japan);
  const strict='Нужен подтверждённый возрастной рейтинг.';
  assert.deepEqual(ranked('Только японское аниме.',strict),[]);
  state.retractions=[{sourceId:'1',quote:'возрастной рейтинг'}];
  assert.deepEqual(ranked('Только японское аниме.',strict),japan);
  state.retractions=[];
  for(const correction of ['Возрастной рейтинг мне больше не важен.','Можно и без проверенного возрастного рейтинга.','Мне не нужен подтверждённый возрастной рейтинг.']){
    assert.deepEqual(ranked('Только японское аниме.',strict,correction),japan,correction);
  }
  const western=ranked('Только западные сериалы.');
  assert.ok(western.length&&western.every(id=>anime.byId.get(id).animeOrigin==='western'));
  for(const text of ['Только западный сериал.','Только западное аниме.','Только западную анимацию.'])
    assert.deepEqual(ranked(text),western,text);
});

test('the published anime menu uses independent metadata and no imported ratings', () => {
  const {anime,cartoon}=catalogs;
  assert.equal(anime.byId.get('tt0245429').runtime,125);
  const {byId}=cartoon;
  for(const item of [...anime.items,byId.get('tt0382932'),byId.get('tt0120587')]){
    assert.equal(item.reviews.desc,null);
    assert.equal(item.reviews.total,0);
    assert.ok(!item.network);
    assert.ok(Object.values(item.features).every(feature=>feature.src.every(source=>['editorial','wikidata'].includes(source))));
  }
});

test('anime recommendations show exact-release artwork, including in earlier saved results', () => {
  const {anime}=catalogs;
  const legacy=mediaConversationToLegacy(newMediaConversation({domain:'anime'}),anime.dict);
  const {top:frieren,alternatives:[spiritedAway]}=recommendIds(
    anime,profileOf(legacy),sessionOf(legacy),['tt22248376','tt0245429']);
  assert.equal(frieren.poster,'https://static.tvmaze.com/uploads/images/medium_portrait/479/1198409.jpg');
  assert.match(spiritedAway.poster,/^https:\/\/www\.ghibli\.jp\/gallery\/.*chihiro/);
  assert.match(mediaCardHtml(frieren,{domain:'anime'}),/<img .*1198409\.jpg/);
  const archived={...frieren,poster:null,image:null};
  const restored=mediaCardHtml(archived,{domain:'anime',index:1});
  assert.match(restored,/<img .*1198409\.jpg/);
  assert.match(restored,/href="https:\/\/www\.tvmaze\.com\/shows\/69956"/);
  assert.doesNotMatch(mediaCardHtml(archived,{domain:'series'}),/1198409\.jpg/);
  assert.match(mediaCardHtml(archived,{domain:'series'}),/<img src="\/assets\/catalog-covers\//);
  assert.doesNotMatch(anime.byId.get('tt5847454').poster??'',/static\.tvmaze\.com/);
});

test('new screen artwork reaches recommendations and free resume of pre-artwork selections', async () => {
  const examples={film:'tt0002130',series:'tt0044259',cartoon:'tt0032455',anime:'tt0079833'};
  for (const [domain,id] of Object.entries(examples)) {
    const catalog=catalogs[domain];
    const state=newMediaConversation({domain});
    const legacy=mediaConversationToLegacy(state,catalog.dict);
    const result=recommendIds(catalog,profileOf(legacy),sessionOf(legacy),[id]);
    assert.match(result.top.poster,/^https:\/\/image\.tmdb\.org\/t\/p\/w342\//);
    const expected=result.top.poster;
    delete result.top.poster;
    delete result.top.image;
    const createSelection=createMediaConversationService({
      domain,catalogs,pick:()=>assert.fail('Restoring artwork must not run a new pick'),
    });
    const resumed=await createSelection({domain,state:{...state,phase:'result',result}});
    assert.equal(resumed.state.result.top.id,id);
    assert.equal(resumed.screen.result.top.poster,expected);
  }
});

test('theater release dates can differ from production dates without losing ID-matched posters', () => {
  for (const [id,year] of [['tt0020298',1929],['tt0051790',1946],['tt0061643',1968]]) {
    const film=catalogs.film.byId.get(id);
    assert.equal(film.year,year);
    assert.match(film.poster,/^https:\/\/image\.tmdb\.org\//);
  }
});

test('recovered artwork is restored into a saved result and the card uses the work image', async () => {
  const domain='anime', id='tt9881586';
  const state=newMediaConversation({domain});
  const {anime}=catalogs;
  const legacy=mediaConversationToLegacy(state,anime.dict);
  const result=recommendIds(anime,profileOf(legacy),sessionOf(legacy),[id]);
  const url='https://en.cloverworks.co.jp/wp/wp-content/uploads/2019/01/aobuta_m_KV.jpg';
  assert.equal(result.top.poster,url);
  delete result.top.poster;
  const createSelection=createMediaConversationService({
    domain,catalogs,pick:()=>assert.fail('Restoring artwork must not run a new pick'),
  });
  const {screen}=await createSelection({domain,state:{...state,phase:'result',result}});
  assert.equal(screen.result.top.poster,url);
  assert.match(mediaCardHtml(screen.result.top,{domain}),/<img src="https:\/\/en\.cloverworks\.co\.jp\//);
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
  assert.deepEqual(out.picks.map(p=>p.id),['tt1352421','tt7806844','tt1158671','tt11428586']);
  assert.equal(lookUp(ranked.filter(({game})=>game.id!=='tt7806844'),'Hakumei to Mikochi',2018),null);
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
