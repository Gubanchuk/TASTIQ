import test from 'node:test';
import assert from 'node:assert/strict';
import {createTasteMemory} from '../src/server/public/shared/taste-memory.js';
import {createMemoryView} from '../src/server/public/library/memory-view.js';

test('library memory actions preserve the original feedback and explicit opt-in',async function historyControl(t) {
  const values=new Map(), storage={get length(){return values.size;},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  const memory=createTasteMemory({storage});
  const review={id:'run-id',context:{domain:'film',request:'На прошлой неделе',note:'Изначальная формулировка',verdict:'partial',cards:[]}};
  const legacy={id:'tt123',domain:'film',title:'Кино',status:'liked',answer:{reaction:'like',reasons:['story.central'],issues:[{f:'difficulty.hard',hard:true}],text:'Причина из старого ответа'}};
  const before=JSON.stringify({review,legacy});
  const ui=createMemoryView({memory,library:{all:()=>[legacy]},feedback:{learningEntries:d=>d==='film'?[review]:[]},
    domains:{film:'Фильмы',game:'Игры'},escape:String,render(){},notice(){},
    fetchLabels:async()=>({film:{'story.central':'Важен сюжет','difficulty.hard':'Высокая сложность'}})});
  const click=(action,data={})=>ui.act({dataset:{act:'memory-'+action,...data}},'film');
  const write=text=>ui.submit({elements:{text:{value:text}}});
  const source={kind:'review',domain:'film',id:review.id};
  await t.test('promote an allowed review only after saving an explicit wording',async()=>{
    assert.match(ui.html('film'),/Причина из старого ответа/);
    await new Promise(resolve=>setImmediate(resolve));
    assert.match(ui.html('film'),/Понравилось.*Важен сюжет.*Высокая сложность \(никогда\)/);
    assert.deepEqual(memory.context('film'),[]);
    await click('from-source',{...source,version:0});assert.deepEqual(memory.context('film'),[]);
    await write('Часто люблю медленные истории');
    assert.equal(memory.context('film')[0].text,'Часто люблю медленные истории');
    assert.deepEqual(memory.filterReviews('film',[review]),[]);
    assert.deepEqual(memory.context('game'),[]);
  });
  await t.test('remove a linked preference without rewriting its source or restoring the old review',async()=>{
    const row=memory.all()[0],data={id:row.id,revision:row.revision};
    await click('remove',data);assert.equal(memory.context('film').length,1);
    await click('confirm-remove',data);assert.deepEqual(memory.context('film'),[]);
    assert.deepEqual(memory.filterReviews('film',[review]),[]);assert.equal(JSON.stringify({review,legacy}),before);
  });
});
