import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureCatalog,screenFixture} from './fixture.js';
import {createMediaConversationService} from '../src/server/media-conversation-service.js';
import {newMediaConversation,answerMediaConversation} from '../src/core/media-conversation.js';
import {createLibraryStore} from '../src/server/public/shared/library-store.js';
import {createMediaHistory} from '../src/server/public/shared/media-history.js';
import {createGameHistory} from '../src/server/public/shared/game-history.js';
import {rememberExampleVotes} from '../src/server/public/shared/example-view.js';
import {createConversationService} from '../src/server/conversation-service.js';
import {newConversation} from '../src/core/conversation.js';

const catalog=fixtureCatalog(), catalogs={game:catalog};
const start=async service=>{
  const state=newConversation({id:'game-examples',depth:'deep'});
  return service({state,action:{type:'context',platform:'windows',company:'solo'}});
};
const marks=[{id:'10',title:'подставленное название',rating:'liked',reason:'Хочу снова искать секретные тропы'},
  {id:null,title:'Своя настольная RPG',rating:'disliked'}];

test('review offers examples for free, final model request receives only selected marks and the exact reason',async()=>{
  const requests=[];
  const service=createConversationService({catalogs,api:async req=>{requests.push(req);throw Error('stub');}});
  const review=await start(service);
  assert.equal(review.screen.type,'review');
  assert.ok(review.screen.ratedExamples.suggested.length>0);
  assert.equal(requests.length,0);
  const failed=await service({state:review.state,action:{type:'confirm',ratedExamples:marks}});
  assert.equal(requests.length,1);
  assert.match(requests[0].input,/Хочу снова искать секретные тропы/);
  assert.doesNotMatch(requests[0].input,/подставленное название/);
  assert.match(requests[0].instructions,/ratedExamples/);
  assert.deepEqual(failed.state.ratedExamples,[{...marks[0],title:'Skyrim'},marks[1]]);
  assert.deepEqual(failed.state.familiar,review.state.familiar);
  const restored=await service({state:failed.state});
  assert.equal(requests.length,1);
  await service({state:restored.state,action:{type:'retry'}});
  assert.match(requests[1].input,/Своя настольная RPG/);
  await service({state:restored.state,action:{type:'confirm',ratedExamples:[]}});
  assert.doesNotMatch(requests[2].input,/секретные тропы|Своя настольная RPG/);
  const fresh=await service({state:restored.state,action:{type:'restart'}});
  assert.equal(fresh.state.ratedExamples,undefined);
});

test('invalid or duplicate example ratings do not start a picker call',async()=>{
  const service=createConversationService({catalogs,spend:()=>assert.fail('invalid action spent money')});
  const review=await start(service);
  for(const invalid of [[{...marks[0],rating:'unknown'}],[...marks,marks[0]],Array(9).fill(marks[0]),
    [{...marks[0],reason:'a'.repeat(301)}],[{...marks[0],id:'unknown-id',title:''}]]){
    await assert.rejects(service({state:review.state,action:{type:'confirm',ratedExamples:invalid}}),e=>e.status===400);
  }
});

for(const domain of ['game','film','series','cartoon','anime']){
  test(domain+' keeps an explicit vote and exposure across visits; clearing the vote removes its model input',async()=>{
    const data=new Map();
    const storage={get length(){return data.size;},key:i=>[...data.keys()][i],getItem:k=>data.get(k)??null,
      setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
    const library=createLibraryStore({storage}),history=domain==='game'?createGameHistory({storage}):createMediaHistory(domain,{storage});
    const drafts=new Map(),client={state:{},draft:key=>drafts.get(key)??{text:'',selected:[]},saveDraft:(k,v)=>drafts.set(k,v)};
    const card={id:null,title:'Пример вне каталога',rating:'disliked',reason:'Только сегодня'};
    client.saveDraft('__rememberExamples',{text:'off'});
    rememberExampleVotes(client,library,history,domain,[card]);assert.equal(library.all().length,0);
    client.saveDraft('__rememberExamples',{text:'on'});
    rememberExampleVotes(client,library,history,domain,[card]);
    const [entry]=library.all(),[known]=history.all();assert.equal(entry.saved,false);
    assert.equal(known.exposure,domain==='game'?'played':'seen');
    assert.equal(known.blocked,false);assert.equal(entry.status,'disliked');
    const refreshed=createLibraryStore({storage});
    const memories=refreshed.ratingMemory(domain);assert.equal(memories.length,1);
    assert.match(memories[0].text,/не понравилось/);assert.doesNotMatch(JSON.stringify(memories),/Только сегодня/);
    assert.equal(refreshed.ratingMemory(domain==='game'?'film':'game').length,0);
    const catalog=domain==='game'?fixtureCatalog():screenFixture(domain);
    const requests=[],options={domain,catalogs:{[domain]:catalog},api:async req=>{requests.push(req);throw Error('stub');}};
    const service=domain==='game'?createConversationService(options):createMediaConversationService(options);
    const review=domain==='game'?await start(service):await service({domain,state:answerMediaConversation(newMediaConversation({domain}),{type:'review'})});
    const run=async(tasteMemory,ratedExamples)=>service({domain,state:review.state,tasteMemory,action:{type:'confirm',ratedExamples}});
    await run(memories,[]);assert.match(requests.at(-1).input,/Пример вне каталога/);assert.doesNotMatch(requests.at(-1).input,/Только сегодня/);
    refreshed.rate(domain,entry.id,'liked');assert.notEqual(refreshed.ratingMemory(domain)[0].revision,memories[0].revision);
    refreshed.rate(domain,entry.id,null);assert.deepEqual(refreshed.ratingMemory(domain),[]);
    await run(refreshed.ratingMemory(domain),[]);assert.doesNotMatch(requests.at(-1).input,/Пример вне каталога/);
    assert.equal(history.all().length,1);
    await run([], [card]);assert.match(requests.at(-1).input,/Только сегодня/);assert.match(requests.at(-1).instructions,/ratedExamples/);
  });
}
