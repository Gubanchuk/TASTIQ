import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnchorDraft } from '../src/server/public/shared/anchor-draft.js';
const data=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
test('unsubmitted marks survive reload, including an explicit empty selection',()=>{
  const storage=data(),a=createAnchorDraft(storage);
  const marks=[{card:{id:'steam:1',name:'Known game'},r:'love'}];
  a.save('evening-1','game',marks);
  assert.deepEqual(createAnchorDraft(storage).load('evening-1','game'),marks);
  a.save('evening-1','game',[]);
  assert.deepEqual(createAnchorDraft(storage).load('evening-1','game'),[]);
});
test('drafts stay within their dialogue/domain and only an explicit restart removes that draft',()=>{
  const storage=data(),s=createAnchorDraft(storage),m=[{card:{id:'steam:1',name:'One'},r:'like'}];
  s.save('one','game',m);s.save('two','film',[]);
  assert.equal(s.load('two','game'),null);assert.equal(s.load('one','film'),null);
  s.clear('one','game');assert.equal(s.load('one','game'),null);assert.deepEqual(s.load('two','film'),[]);
});
test('broken storage or unrecognized reactions cannot populate a restored selection',()=>{
  const storage=data(),s=createAnchorDraft(storage);s.save('one','game',[{card:{id:'1',name:'One'},r:'fake'}]);
  assert.deepEqual(s.load('one','game'),[]);
  const broken=createAnchorDraft({getItem:()=>'{broken',setItem:()=>{throw Error();}});
  assert.equal(broken.load('one','game'),null);assert.doesNotThrow(()=>broken.save('one','game',[]));
});
