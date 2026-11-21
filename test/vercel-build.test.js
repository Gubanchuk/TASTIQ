import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {readScreenCatalog,writeScreenCatalog} from '../src/lib/screen-catalog.js';
const {buildVercel}=await import('../scripts/build-vercel.mjs').catch(()=>({}));
const {journalPath}=await import('../src/server/runtime-paths.js').catch(()=>({}));
const json=path=>JSON.parse(readFileSync(path,'utf8'));
function fixture(){
 const root=mkdtempSync(join(tmpdir(),'tastiq-vercel-build-'));
 const put=(name,value)=>{mkdirSync(join(root,name,'..'),{recursive:true});writeFileSync(join(root,name),value);};
 put('src/server/public/index.html','<!doctype html><title>TASTIQ</title><h1>Выбери вечер</h1>');
 put('src/server/public/shared/app.js','export const app=true;');
 put('src/server/app.js','export async function handler(req,res){res.end("ok")}');
 put('.env','OPENAI_API_KEY=PRIVATE_CANARY');
 put('data/journal.ndjson','PRIVATE_CANARY');
 put('data/unrelated.json','PRIVATE_CANARY');
 for(const name of ['catalog.json','catalog-screen.json','anime-wikidata.json','quotes-ru.json','posters.json','catalog-artwork.json','catalog-artwork-recovered.json','verified-game-context.json','verified-game-releases.json'])put('data/'+name,'{}');
 return{root,put,close:()=>rmSync(root,{recursive:true,force:true})};
}

test('Vercel output serves actual public HTML and a Node API, with only approved catalog data',()=>{
 assert.equal(typeof buildVercel,'function');const f=fixture();
 try{
  const screen={stats:{titles:2},items:[{id:'tt1',name:'Фильм'},{id:'tt2',name:'Сериал'}]};
  const parts=writeScreenCatalog(join(f.root,'data/catalog-screen.json'),screen,{partBytes:55});
  assert.equal(parts.length,2);
  f.put('data/catalog-screen.part-0009-0000000000000000.json','[]');
  buildVercel({root:f.root});const output=join(f.root,'.vercel/output'),fn=join(output,'functions/tastiq.func');
  assert.match(readFileSync(join(output,'static/index.html'),'utf8'),/<h1>Выбери вечер<\/h1>/);
  assert.ok(existsSync(join(output,'static/shared/app.js')));
  assert.equal(json(join(fn,'.vc-config.json')).launcherType,'Nodejs');
  assert.equal(json(join(fn,'.vc-config.json')).shouldAddHelpers,false,'preserve raw JSON request streams');
  assert.equal(json(join(fn,'.vc-config.json')).maxDuration,300,'allow the full Hobby/Fluid window for model responses');
  assert.match(readFileSync(join(fn,'handler.mjs'),'utf8'),/src\/server\/app\.js/);
  assert.ok(existsSync(join(fn,'data/catalog-screen.json')));
  assert.deepEqual(readScreenCatalog(join(fn,'data/catalog-screen.json')),screen);
  assert.equal(existsSync(join(fn,'data/catalog-screen.part-0009-0000000000000000.json')),false);
  assert.ok(parts.every(name=>!existsSync(join(output,'static/data',name))));
  assert.ok(existsSync(join(fn,'data/anime-wikidata.json')));
  assert.ok(existsSync(join(fn,'data/catalog-artwork.json')));
  assert.ok(existsSync(join(fn,'data/catalog-artwork-recovered.json')));
  assert.equal(existsSync(join(output,'static/data/anime-wikidata.json')),false);
  for(const name of ['.env','data/journal.ndjson','data/unrelated.json'])assert.equal(existsSync(join(fn,name)),false,name);
  assert.equal(existsSync(join(output,'static/data/catalog.json')),false);
  const routes=json(join(output,'config.json')).routes;
  assert.equal(routes[0].handle,'filesystem');assert.equal(routes.at(-1).dest,'/tastiq');
 }finally{f.close();}
});

test('Vercel build refuses to publish a site missing its required screen catalog',()=>{
 assert.equal(typeof buildVercel,'function');const f=fixture();
 try{rmSync(join(f.root,'data/catalog-screen.json'));assert.throws(()=>buildVercel({root:f.root}),/catalog-screen\.json/);}
 finally{f.close();}
});

test('landing HTML uses the deployment anime flag before catalog metadata arrives',()=>{
 const f=fixture();
 try{
  f.put('src/server/public/index.html',readFileSync(new URL('../src/server/public/index.html',import.meta.url),'utf8'));
  for(const [flag,expected] of [['on','true'],['off','false'],[undefined,'false']]){
   const output=buildVercel({root:f.root,env:{VERCEL:'1',TASTIQ_ANIME:flag}});
   const html=readFileSync(join(output,'static/index.html'),'utf8');
   assert.ok(html.includes(`data-anime-enabled="${expected}"`));
   assert.match(html,/<a class="door" data-domain="anime" data-anime-entry href=/);
  }
 }finally{f.close();}
});

test('a missing catalog part is reported by the server loader and the build',()=>{
 const f=fixture();
 try{
  const path=join(f.root,'data/catalog-screen.json');
  const [part]=writeScreenCatalog(path,{items:[{id:'tt1'}]});
  rmSync(join(f.root,'data',part));
  assert.throws(()=>readScreenCatalog(path),{message:new RegExp(part)});
  assert.throws(()=>buildVercel({root:f.root}),{message:new RegExp(part)});
 }finally{f.close();}
});

test('serverless journaling uses temporary storage, while local and explicit journal locations stay supported',()=>{
 assert.equal(typeof journalPath,'function');const dataDir=resolve('local-data'),tempDir=resolve('temporary');
 assert.equal(journalPath({env:{},dataDir,tempDir}),join(dataDir,'journal.ndjson'));
 assert.equal(journalPath({env:{VERCEL:'1'},dataDir,tempDir}),join(tempDir,'tastiq-journal.ndjson'));
 assert.equal(journalPath({env:{VERCEL:'1',JOURNAL_PATH:join(tempDir,'custom.ndjson')},dataDir,tempDir}),join(tempDir,'custom.ndjson'));
});
