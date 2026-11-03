import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
let db;
const event=(revision=2)=>({version:1,id:'sql-run',dialogueId:'sql-dialogue',domain:'film',revision,at:'2026-11-03T10:00:00Z',updatedAt:'2026-11-03T10:01:00Z',context:{},cards:[{id:'tt0001',title:'Synthetic',origin:'engine'}],responses:[],selectionReview:{verdict:'reject',issue:'fit',note:"Literal ' OR 1=1; --",requestSummary:'Synthetic QA',transcript:'Synthetic QA only',learn:true}});
const record=(payload,namespace='qa:sql_test')=>db.query('select public.tastiq_record_feedback($1::jsonb,$2::text) as receipt',[JSON.stringify(payload),namespace]);
before(async()=>{
 db=new PGlite();await db.exec('create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;');
 await db.exec(readFileSync('supabase/migrations/20261103193819_durable_selection_feedback.sql','utf8'));
});
after(async()=>db?.close());
test('SQL RPC is idempotent, preserves out-of-order revisions and rejects contradictory duplicates',async()=>{
 assert.deepEqual((await record(event())).rows[0].receipt,{ok:true,id:'sql-run',revision:2});
 await record(event());await record(event(1));
 assert.equal((await db.query("select count(*)::int as n from public.tastiq_feedback_events where namespace='qa:sql_test'")).rows[0].n,2);
 assert.equal((await db.query("select revision from public.tastiq_feedback_latest where namespace='qa:sql_test'")).rows[0].revision,2);
 await assert.rejects(()=>record({...event(),selectionReview:{...event().selectionReview,note:'Different payload'}}),e=>e.code==='23505');
 assert.equal((await db.query("select payload->'selectionReview'->>'note' as note from public.tastiq_feedback_latest where namespace='qa:sql_test'")).rows[0].note,event().selectionReview.note);
});
test('anonymous and authenticated users cannot read or execute; backend role can write',async()=>{
 for(const role of ['anon','authenticated']){
  await db.exec('set role '+role);
  try{
   await assert.rejects(()=>db.query('select * from public.tastiq_feedback_events'),e=>e.code==='42501');
   await assert.rejects(()=>db.query('select * from public.tastiq_feedback_latest'),e=>e.code==='42501');
   await assert.rejects(()=>record(event()),e=>e.code==='42501');
  }finally{await db.exec('reset role');}
 }
 await db.exec('set role service_role');try{await record({...event(),id:'service-role-run'});}finally{await db.exec('reset role');}
 const properties=await db.query("select relrowsecurity from pg_class where oid='public.tastiq_feedback_events'::regclass");assert.equal(properties.rows[0].relrowsecurity,true);
 assert.equal((await db.query("select prosecdef from pg_proc where oid='public.tastiq_record_feedback(jsonb,text)'::regprocedure")).rows[0].prosecdef,false);
});
test('namespace and size checks are enforced, QA is separate and owner analysis SQL runs',async()=>{
 await assert.rejects(()=>record(event(),'other'),e=>e.code==='23514');
 await assert.rejects(()=>record({...event(),extra:'x'.repeat(262145)}),e=>e.code==='23514');
 await record({...event(),id:'production-example'},'production');
 const reports=await db.exec(readFileSync('docs/FEEDBACK_ANALYSIS_QUERIES.sql','utf8'));
 assert.equal(reports[0].rows[0].reviewed_lists,1);assert.equal(reports[0].rows[0].no_fit,1);
 assert.equal(reports[1].rows[0].reports,1);
});
