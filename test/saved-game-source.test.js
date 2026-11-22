import test from 'node:test';
import assert from 'node:assert/strict';
import {game,fixtureCatalog} from './fixture.js';
import {createConversationService} from '../src/server/conversation-service.js';
import {initialConversation} from '../src/server/public/shared/conversation-entry.js';
import {conversationToLegacy} from '../src/core/conversation.js';
import {aiPick,candidatesOf} from '../src/ai/pick.js';

const steam=(appid,name,options={})=>({...game(appid,name,{},options),id:'steam:'+appid});
const base=steam(72850,'The Elder Scrolls V: Skyrim',{work:'elder scrolls v skyrim'});
const edition=steam(489830,'The Elder Scrolls V: Skyrim Special Edition',{work:base.work});
const duo=steam(1426210,'It Takes Two',{facts:['social.coop']});
const group=steam(962130,'Grounded',{facts:['social.coop']});
const unknown=steam(90001,'Unknown capacity',{facts:['social.coop'],platforms:{windows:true,mac:true}});
const catalog=fixtureCatalog([base,edition,duo,group,unknown]);
const source=ids=>({version:1,domain:'game',ids});
const service=opts=>createConversationService({catalogs:{game:catalog},...opts});
const offline=()=>service({access:()=>({allowed:false}),spend:()=>assert.fail('offline request')});
const send=(srv,out,action)=>srv({state:out.state,action});
const ids=out=>[out.state.result?.top,...(out.state.result?.alternatives??[])].filter(Boolean).map(x=>x.id);
const start=(srv,ids)=>srv({state:initialConversation({id:'same-device',savedSource:source(ids)})});
const context=(srv,out,extra={})=>send(srv,out,{type:'context',platform:'windows',company:'solo',...extra});
const confirm=(srv,out)=>send(srv,out,{type:'confirm'});

test('game source accepts a local pristine draft, preserves its ID and rejects a lost or swapped source',async()=>{
  const srv=offline(),list=[base.id,edition.id,unknown.id],first=await start(srv,[...list,'tt404','absent',base.id]);
  assert.equal(first.state.id,'same-device');
  assert.deepEqual(first.state.savedSource,source(list));
  assert.match(first.state.savedSourceKey,/^[0-9a-f]{64}$/);
  const result=await confirm(srv,await context(srv,first));
  assert.equal(ids(result).length,2);
  assert.equal(new Set(ids(result).map(id=>catalog.byId.get(id).work)).size,2);
  assert.deepEqual(result.feedbackState.savedSource,source(list));
  const restored=await srv({state:result.state});
  assert.deepEqual(restored.state.result,result.state.result);
  assert.deepEqual((await send(srv,result,{type:'restart'})).state.savedSource,source(list));
  for(const damaged of [
    {...result.state,savedSource:undefined},
    {...result.state,savedSourceKey:undefined},
    {...result.state,savedSource:source(['1',...list])},
    {...result.state,domain:'film'},
    {...result.state,result:{...result.state.result,top:{id:'1'}}},
    {...result.state,result:{...result.state.result,top:{id:base.id},alternatives:[{id:edition.id}]}},
    {...result.state,familiar:{...result.state.familiar,undo:{result:{top:{id:'1'},alternatives:[]}}}},
  ])await assert.rejects(()=>srv({state:damaged}),err=>err.status===400);
  await assert.rejects(()=>srv({state:result.state,savedSource:source(['1'])}),err=>err.status===400);
  await assert.rejects(()=>srv({savedSource:{...source(['1']),domain:'film'}}),err=>err.status===400);
  const empty=await srv({savedSource:source(['tt404'])});
  assert.deepEqual(empty.state.savedSource.ids,[]);assert.equal(empty.retryable,false);assert.deepEqual(ids(empty),[]);
});

test('offline or online saved game picks enforce platform and verified party size for each visible edition',async()=>{
  const list=[duo.id,group.id,unknown.id];
  for(const allowed of [false,true]){
    const srv=service({access:()=>({allowed}),spend:()=>assert.fail('one verified match is local')});
    const single=await confirm(srv,await context(srv,await start(srv,[duo.id,group.id])));
    assert.deepEqual(ids(single),[group.id]);
    const four=await confirm(srv,await context(srv,await start(srv,list),{company:'group',partySize:'4'}));
    assert.deepEqual(ids(four),[group.id]);
    assert.equal(four.state.result.top.feasibility.find(row=>row.key==='players').status,'yes');
    await assert.rejects(()=>srv({state:{...four.state,result:{...four.state.result,top:{id:unknown.id}}}}),err=>err.status===400);
    const mac=await confirm(srv,await context(srv,await start(srv,list),{platform:'mac',company:'friend'}));
    assert.equal(mac.retryable,false);assert.deepEqual(ids(mac),[]);
    const soloMac=await confirm(srv,await context(srv,await start(srv,list),{platform:'mac'}));
    assert.deepEqual(ids(soloMac),[unknown.id]);
  }
});

test('a saved game session budget stays distinct from completion time and a strict stop needs evidence',async()=>{
  const srv=offline();
  async function review(text){
    const initial=await start(srv,['6','12']);
    return context(srv,await send(srv,initial,{type:'answer',questionId:'direction',text}));
  }
  const past=await review('Прошёл игру за 30 минут');
  assert.equal(past.state.sessionTime,null);
  const today=await review('Сегодня есть 30 минут');
  assert.equal(today.state.sessionTime.minutes,30);
  const ordinary=await confirm(srv,today);
  assert.equal(ids(ordinary).length,2);
  for(const card of [ordinary.state.result.top,...ordinary.state.result.alternatives]){
    assert.equal(card.feasibility.find(row=>row.key==='minutes').status,'unknown');
  }
  const strict=await review('На сессию строго до 30 минут');
  assert.equal(strict.state.sessionTime.minutes,30);
  const none=await confirm(srv,strict);assert.equal(none.retryable,false);assert.deepEqual(ids(none),[]);
  await assert.rejects(()=>srv({state:{...strict.state,phase:'result',result:ordinary.state.result}}),err=>err.status===400);
  const cleared=await send(srv,strict,{type:'remove_time'});
  assert.equal(ids(await confirm(srv,cleared)).length,2);
  const corrected=await send(srv,strict,{type:'correct',text:'Хочу больше истории'});
  assert.deepEqual(corrected.state.sessionTime,strict.state.sessionTime);
  const relaxed=await send(srv,corrected,{type:'correct',text:'Убери ограничение по времени'});
  assert.equal(relaxed.state.sessionTime,null);
  assert.equal(relaxed.state.retractions.at(-1).kind,'session_time');
});

test('model title lookup, shortlist and picker retries cannot escape saved game works',async()=>{
  const initial=await context(offline(),await start(offline(),['4','6']));
  const legacy=conversationToLegacy(initial.state,catalog.dict,catalog);
  const chosen=await aiPick({game:catalog},legacy,{api:async req=>{
    assert.equal(req.text.format.schema.properties.picks.maxItems,2);assert.match(req.input,/список сохранённых/);
    const picks=['Skyrim','Hades'].map(title=>({id:'',title,year:2020,reason:'Вариант',caveat:'',likelySeen:false}));
    return {status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({picks,understood:''})}]}]};
  }});
  assert.deepEqual(chosen.picks.map(p=>p.id),['6']);
  let count=0;
  const srv=service({pick:async(all,state)=>{
    assert.deepEqual(all.game.items.map(x=>x.id),state.savedSource.ids);
    count++;
    return count===1?{error:'Временный сбой'}:{picks:[{id:'7'},...all.game.items.map(x=>({id:x.id}))]};
  }});
  const first=await confirm(srv,initial);assert.match(first.error,/сбой/);
  const second=await send(srv,first,{type:'retry'});assert.deepEqual(ids(second),['4','6']);
  const other=await context(srv,await start(srv,['10','12']));
  assert.deepEqual(ids(await confirm(srv,other)),['10','12']);
  await confirm(srv,other);assert.equal(count,3);
});

test('scoped replacement, more, undo and exhaustion do not repeat works or change kept cards',async()=>{
  const list=[base.id,edition.id,'3','4','5','6','7','10','11'];
  for(const allowed of [false,true]){
    const srv=service({access:()=>({allowed}),pick:async(all,state)=>{
      const ranked=candidatesOf(all.game,state).ranked;
      return {picks:[{id:'12'},...ranked.slice(0,4).map(r=>({id:r.game.id}))]};
    }});
    const first=await confirm(srv,await context(srv,await start(srv,list)));
    const before=ids(first);
    assert.equal(before.length,4);
    const marked=await send(srv,first,{type:'familiar_mark',id:before[0]});
    const replaced=await send(srv,marked,{type:'replace_familiar',id:before[0]});
    assert.ok(list.includes(ids(replaced)[0])&&!before.includes(ids(replaced)[0]));
    assert.deepEqual(ids(replaced).slice(1),before.slice(1));
    assert.deepEqual(ids(await send(srv,replaced,{type:'undo_replacement'})),before);
    const second=await send(srv,first,{type:'more'});
    const shown=[...before,...ids(second)];
    assert.equal(shown.length,8);assert.ok(shown.every(id=>list.includes(id)));
    assert.equal(new Set(shown.map(id=>catalog.byId.get(id).work)).size,8);
    const exhausted=await send(srv,second,{type:'more'});
    assert.match(exhausted.screen.noMatch.message,/сохранён/);assert.deepEqual(ids(exhausted),ids(second));
    assert.deepEqual(ids(await send(srv,exhausted,{type:'undo_replacement'})),before);
  }
});
