import test from 'node:test';
import assert from 'node:assert/strict';
import {aiPick,candidatesOf} from '../src/ai/pick.js';
import {initialState} from '../src/core/dialogue.js';
import {screenFixture} from './fixture.js';
import {makeCatalog} from '../src/core/catalog.js';
import {readFileSync} from 'node:fs';
import {createMediaConversationService} from '../src/server/media-conversation-service.js';
import {loadCatalogs} from '../src/core/catalog.js';

test('adaptive media permits fewer picks and does not promise all semantic exclusions were prefiltered',async()=>{
 for(const domain of ['film','series','cartoon']){
  const catalog=makeCatalog(screenFixture(domain),domain),state={...initialState(domain),domain,conversation:{summary:'Без страшных сцен',facts:[],context:{},uncertainties:[],retractions:[]}};
  const id=candidatesOf(catalog,state).rows[0].game.id;let request;
  const out=await aiPick({[domain]:catalog},state,{alreadyShown:['earlier-card'],api:async body=>{
   request=body;return {status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({understood:'Понял',picks:[{id,reason:'Спокойная история',caveat:''}]})}]}]};
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
 let calls=0;const service=createMediaConversationService({domain:'cartoon',catalogs:loadCatalogs(),api:async()=>{calls++;return saved.response;}});
 const out=await service(saved.request);assert.equal(calls,1);assert.match(out.error,/проверку каталога/);assert.equal(out.retryable,false);
 assert.deepEqual(out.state.result,saved.request.state.result);assert.equal(out.state.context.childAge,7);assert.equal(out.state.context.minutes,90);
});
