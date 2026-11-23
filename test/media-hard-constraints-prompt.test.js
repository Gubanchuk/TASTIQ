import test from 'node:test';
import assert from 'node:assert/strict';
import {aiPick,candidatesOf} from '../src/ai/pick.js';
import {initialState} from '../src/core/dialogue.js';
import {screenFixture,title} from './fixture.js';
import {makeCatalog} from '../src/core/catalog.js';
import {readFileSync} from 'node:fs';
import {createMediaConversationService} from '../src/server/media-conversation-service.js';
import {loadCatalogs} from '../src/core/catalog.js';
import {normalizeTitle} from '../src/lib/text.js';

test('a media wish without mapped preferences gets a varied shortlist within the same catalog limits',()=>{
 const items=Array.from({length:16},(_,i)=>({...title(`film-${i}`,`Film ${i}`,'film',{}),
  quality:.99-i*.012,genres:[i<12?'Drama':'Comedy'],runtime:i===12?160:90}));
 const catalog=makeCatalog({items,idf:{},df:{},stats:{}},'film');
 const state={...initialState(),domain:'film',conversation:{summary:'Хочу посмеяться'},session:{maxRuntime:120}};
 const rows=candidatesOf(catalog,state,8).rows.map(row=>row.game.id);
 assert.equal(rows.length,8);
 assert.equal(new Set(rows).size,8);
 assert.ok(!rows.includes('film-12'));
 assert.ok(['film-13','film-14','film-15'].every(id=>rows.includes(id)));
 const legacy=candidatesOf(catalog,{...state,conversation:undefined},8).rows;
 assert.ok(legacy.every(row=>row.game.genres[0]==='Drama'));
});

test('adaptive media permits fewer picks and does not promise all semantic exclusions were prefiltered',async()=>{
 for(const domain of ['film','series','cartoon']){
  const catalog=makeCatalog(screenFixture(domain),domain),state={...initialState(domain),domain,conversation:{summary:'Без страшных сцен',facts:[],context:{},uncertainties:[],retractions:[]}};
  const id=candidatesOf(catalog,state).rows[0].game.id;let request;
  const out=await aiPick({[domain]:catalog},state,{alreadyShown:['earlier-card'],api:async body=>{
   request=body;return {status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({understood:'Понял',picks:[{id,viewingStart:'independent',reason:'Спокойная история',caveat:''}]})}]}]};
  }});
  assert.match(request.instructions,/not every semantic exclusion is covered/);
  assert.match(request.instructions,/Omit any candidate you know violates/);
  assert.match(request.input,/Не дополняй число заведомо неподходящими/);
  assert.doesNotMatch(request.input,/Выбери ровно/);
  assert.deepEqual(out.picks.map(p=>p.id),[id]);assert.deepEqual(out.filled,[]);
 }
});

test('an intentionally empty adaptive choice is explained as no fit rather than an invalid id',async()=>{
 const catalog=makeCatalog(screenFixture('cartoon'),'cartoon'),state={...initialState('cartoon'),domain:'cartoon',conversation:{summary:'Без страшных сцен',facts:[],context:{},uncertainties:[],retractions:[]}};
 const out=await aiPick({cartoon:catalog},state,{api:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'{"understood":"Нет подходящих","picks":[]}'}]}]})});
 assert.match(out.error,/подходящих вариантов/i);assert.equal(out.retryable,false);
});

test('the real unverified model-owned replacement preserves prior cards and explains catalog verification without paid retry',async()=>{
 const saved=JSON.parse(readFileSync(new URL('./fixtures/cartoon-more-no-fit-2026-11-03.json',import.meta.url),'utf8'));
 const proposal=JSON.parse(saved.response.output.flatMap(block=>block.content??[]).find(block=>block.type==='output_text').text).picks[0];
 const {cartoon}=loadCatalogs();
 // Replay the original missing-title case independently of later catalog imports.
 const unavailable=normalizeTitle(proposal.title);
 const items=cartoon.items.filter(item=>Math.abs(item.year-proposal.year)>1||
  ![item.name,item.ru,item.original,...(item.aliases??[])].filter(Boolean).some(name=>normalizeTitle(name)===unavailable));
 let calls=0;const service=createMediaConversationService({domain:'cartoon',catalogs:{cartoon:makeCatalog({...cartoon,items},'cartoon')},api:async()=>{calls++;return saved.response;}});
 const out=await service(saved.request);assert.equal(calls,1);assert.equal(out.error,undefined);assert.equal(out.screen.noMatch.kind,'title-lookup');assert.match(out.screen.noMatch.message,/В каталоге не удалось подтвердить/);assert.equal(out.retryable,false);
 assert.deepEqual(out.state.result,saved.request.state.result);assert.equal(out.state.context.childAge,7);assert.equal(out.state.context.minutes,90);
});
