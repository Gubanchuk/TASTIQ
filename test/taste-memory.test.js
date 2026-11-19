import assert from 'node:assert/strict';
import test from 'node:test';
import {createTasteMemory,TASTE_MEMORY_PREFIX} from '../src/server/public/shared/taste-memory.js';
import {createQaSession} from '../src/server/public/shared/qa-session.js';

function storage() {
  const data=new Map();
  return {
    get length(){return data.size;},key:i=>[...data.keys()][i]??null,
    getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),
    removeItem:key=>data.delete(key),
  };
}
const entry={id:'evening-1',context:{domain:'film',note:'Старый отзыв о вечере'}};
const review={kind:'review',id:entry.id,title:'Мой вечер',evidence:entry.context.note};

test('only confirmed preferences enter the same section, corrections supersede history and leave the original evidence local',()=>{
  const raw=storage(),store=createTasteMemory({storage:raw});
  raw.setItem('tastiq.site.library',JSON.stringify({items:[{domain:'film',answer:{text:'Старый ответ'}}]}));
  assert.deepEqual(store.context('film'),[]);
  assert.deepEqual(store.filterReviews('film',[entry]),[entry]);
  const record=store.save({domain:'film',text:'  Люблю длинное кино по выходным  ',source:review});
  assert.equal(record.text,'Люблю длинное кино по выходным');assert.equal(record.revision,1);
  const changed=store.save({id:record.id,domain:'film',text:'Короткое кино по будням',expectedRevision:record.revision});
  const fresh=createTasteMemory({storage:raw});
  assert.deepEqual(fresh.context('film'),[{id:record.id,domain:'film',text:changed.text,revision:2,source:{kind:'review',id:entry.id}}]);
  assert.deepEqual(fresh.context('series'),[]);assert.deepEqual(fresh.filterReviews('film',[entry]),[]);
  assert.equal(fresh.all()[0].source.evidence,review.evidence);
  assert.equal(fresh.setEnabled(record.id,false,2).enabled,false);
  assert.deepEqual(store.context('film'),[]);assert.deepEqual(store.filterReviews('film',[entry]),[]);
  assert.equal(store.setEnabled(record.id,true,3).enabled,true);store.remove(record.id,4);
  assert.deepEqual(fresh.context('film'),[]);assert.deepEqual(fresh.all(),[]);assert.deepEqual(fresh.filterReviews('film',[entry]),[]);
  assert.deepEqual(store.reviewSuppression('film',entry.id),{revision:5,restorable:false});
  assert.throws(()=>store.restoreReview('film',entry,5));
  assert.throws(()=>store.save({domain:'film',text:'Устаревший ввод',source:review}));
  assert(!raw.getItem([...Array(raw.length).keys()].map(i=>raw.key(i)).find(k=>k.startsWith(TASTE_MEMORY_PREFIX))).includes(entry.context.note));
  assert.equal(store.save({domain:'film',text:'Снова хочу учитывать',source:review,expectedRevision:5}).revision,6);
});

test('historical reviews can be muted and restored explicitly without saving a preference',()=>{
  const raw=storage(),first=createTasteMemory({storage:raw}),second=createTasteMemory({storage:raw});
  const other={id:entry.id,context:{domain:'game'}};
  first.suppressReview('film',entry);
  assert.deepEqual(second.reviewSuppression('film',entry.id),{revision:1,restorable:true});
  assert.deepEqual(second.all(),[]);assert.deepEqual(second.filterReviews('game',[other]),[other]);
  assert.deepEqual(second.filterReviews('film',[entry]),[]);
  second.restoreReview('film',entry,1);
  assert.deepEqual(first.filterReviews('film',[entry]),[entry]);assert.equal(first.reviewSuppression('film',entry.id),null);
  assert.deepEqual(first.sourceStates(),[{domain:'film',kind:'review',id:entry.id,revision:2,state:'released'}]);
  assert.throws(()=>first.restoreReview('film',entry,1));
  const preference=first.save({domain:'film',text:'Учитывать мой вкус',source:review,expectedRevision:2});
  assert.deepEqual(first.reviewSuppression('film',entry.id),{revision:3,restorable:false});
  first.remove(preference.id,3);
  assert.throws(()=>second.restoreReview('film',entry.id,1));
});

test('two submitted edits receive the latest revision under the same origin lock; only one can commit',async()=>{
  const raw=storage(),names=[];
  let queue=Promise.resolve();
  const locks={request(name,change){names.push(name);const turn=queue.then(change);queue=turn.catch(()=>{});return turn;}};
  const a=createTasteMemory({storage:raw,locks}),b=createTasteMemory({storage:raw,locks});
  const row=await a.mutate(()=>a.save({domain:'film',text:'Первая запись'}));
  const both=await Promise.allSettled([
    a.mutate(()=>a.save({...row,text:'Исправлено',expectedRevision:row.revision})),
    b.mutate(()=>b.save({...row,text:'Устарело',expectedRevision:row.revision})),
  ]);
  assert.deepEqual(both.map(r=>r.status),['fulfilled','rejected']);
  assert.equal(new Set(names).size,1);assert.equal(b.all()[0].text,'Исправлено');
  assert.equal(b.all()[0].source.evidence,'Первая запись');
});

test('tabs merge different entries, reject a stale form and keep a deleted answer from being resurrected',()=>{
  const raw=storage(),a=createTasteMemory({storage:raw}),b=createTasteMemory({storage:raw});
  const left=a.save({domain:'game',text:'Хочу головоломки',source:{kind:'answer',id:'steam:620',title:'Portal 2'}});
  const right=b.save({domain:'game',text:'Иногда играю с друзьями'});
  assert.deepEqual(new Set(a.all().map(row=>row.id)),new Set([left.id,right.id]));
  b.save({id:left.id,domain:'game',text:'По выходным люблю головоломки',expectedRevision:1});
  assert.throws(()=>a.save({id:left.id,domain:'game',text:'Старый экран',expectedRevision:1}),/измен|обнов/i);
  assert.throws(()=>a.setEnabled(left.id,false,1));assert.throws(()=>a.remove(left.id,1));
  a.remove(left.id,2);
  assert.throws(()=>b.save({id:left.id,domain:'game',text:'Старый экран',expectedRevision:2}));
  assert.equal(b.isSourceSuppressed('game','answer','steam:620'),true);
  assert.deepEqual(b.context('game').map(row=>row.id),[right.id]);
});

test('storage errors withhold preferences and historic reviews and never acknowledge a failed edit',()=>{
  const raw=storage(),store=createTasteMemory({storage:raw});
  const saved=store.save({domain:'film',text:'Мой выбор'}),get=raw.getItem;
  raw.getItem=()=>{throw Error('denied');};
  assert.deepEqual(store.context('film'),[]);assert.equal(store.persistent,false);
  assert.deepEqual(store.filterReviews('film',[entry]),[]);
  assert.throws(()=>store.remove(saved.id,saved.revision));
  raw.getItem=get;raw.setItem=()=>{throw Error('quota');};
  assert.throws(()=>store.remove(saved.id,saved.revision));assert.equal(store.persistent,false);
  assert.equal(createTasteMemory({storage:raw}).all()[0].id,saved.id);
  assert.deepEqual(createTasteMemory({storage:null}).filterReviews('film',[entry]),[]);
});

test('QA namespaces, source size and active limits are respected without dropping old entries',()=>{
  const raw=storage(),qa=createQaSession({search:'?qa_run=taste-test',session:storage()});
  const sandbox=createTasteMemory({storage:qa.storage(raw)}),store=createTasteMemory({storage:raw});
  sandbox.save({domain:'film',text:'Тестовая запись'});
  assert.deepEqual(store.all(),[]);
  assert.throws(()=>store.save({domain:'film',text:'а'.repeat(301)}));
  assert.throws(()=>store.save({domain:'film',text:'Вкус',source:{kind:'answer',id:'!'}}));
  for(let i=0;i<30;i++)store.save({domain:'film',text:'Причина '+i});
  assert.throws(()=>store.save({domain:'film',text:'Ещё одна'}));
  store.save({domain:'series',text:'Отдельный раздел'});
  const first=store.all().find(row=>row.domain==='film');
  store.setEnabled(first.id,false,1);store.save({domain:'film',text:'Новая причина'});
  assert.throws(()=>store.setEnabled(first.id,true,2));
  assert.equal(store.context('film').length,30);assert.equal(sandbox.context('film').length,1);
});
