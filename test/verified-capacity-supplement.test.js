import {test} from 'node:test';
import assert from 'node:assert/strict';
import {playerFact,playerFeasibility} from '../src/core/feasibility.js';
import {recommendIds} from '../src/core/recommend.js';
import {fixtureCatalog,game} from './fixture.js';

const verified=[
 [962130,'Grounded',4,'https://store.steampowered.com/app/962130/Grounded/'],
 [892970,'Valheim',10,'https://www.valheimgame.com/faq/'],
 [1203620,'Enshrouded',16,'https://enshrouded.com/en-US/FAQ'],
];
const catalog=fixtureCatalog(verified.map(([id,name])=>({...game(id,name,{}, {facts:['social.coop']}),id:`steam:${id}`})));

test('the reviewed Grounded, Valheim and Enshrouded records verify room for three in ordinary Windows co-op',()=>{
 for(const [appid,title,max,source] of verified) {
  const item=catalog.byId.get(`steam:${appid}`),fact=playerFact(item);
  assert.equal(fact?.title,title);assert.equal(fact?.min,1);assert.equal(fact?.max,max);
  assert.equal(fact.coverage,'standard');assert.equal(fact.checkedAt,'2026-11-01');assert.equal(fact.source,source);
  const out=recommendIds(catalog,{}, {platform:'windows',partySize:'3',moods:['party']},[item.id]);
  assert.ok(out);assert.equal(out.top.feasibility.find(f=>f.key==='players').status,'yes');
 }
});

test('five-plus cannot fit Grounded, while larger verified caps remain explicitly conditional',()=>{
 const session={platform:'windows',partySize:'5+',moods:['party']};
 assert.equal(recommendIds(catalog,{},session,['steam:962130']),null);
 for(const [appid,,max] of verified.slice(1)) {
  const check=playerFeasibility(catalog.byId.get(`steam:${appid}`),session);
  assert.equal(check.status,'conditional');assert.ok(check.text.includes(String(max)));
 }
});

test('Windows capacity facts do not certify another platform or an unreviewed game',()=>{
 for(const [appid] of verified)for(const platform of ['mac','linux','deck'])assert.equal(playerFeasibility(catalog.byId.get(`steam:${appid}`),{platform,partySize:'3'}).status,'unknown');
 for(const [id,title] of [[1284190,'The Planet Crafter'],[648800,'Raft'],[275850,"No Man's Sky"]]) {
  const item={...game(id,title,{}, {facts:['social.coop']}),id:`steam:${id}`};
  assert.equal(playerFact(item),null);assert.equal(playerFeasibility(item,{platform:'windows',partySize:'3'}).status,'unknown');
 }
});
