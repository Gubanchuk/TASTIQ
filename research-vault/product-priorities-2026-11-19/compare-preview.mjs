// Local deep links to the picker. Examples use their own QA archive.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

Object.assign(process.env,{AI_ACCESS:'off',AI_EVAL_BUDGET_DIR:'',FEEDBACK_DATABASE_URL:'',FEEDBACK_DATABASE_SECRET:'',
 JOURNAL_PATH:join(tmpdir(),'tastiq-finalists-preview.ndjson')});
const {handler}=await import('../../src/server/app.js');
const pickerRoot=new URL('../../src/server/public/pick/',import.meta.url);
const recordedGame=new URL('../overnight-2026-11/live-round-2/10-coop-pick.json',import.meta.url);
const port=Number(process.env.FINALISTS_PREVIEW_PORT??5235);
const launch=`import {qaFetch,qaStorage} from '/shared/qa-session.js';
import {createSelectionArchive,selectionUrl} from '/shared/selection-archive.js';
import {initialConversationSnapshot} from '/shared/conversation-entry.js';
try{
 async function filmSnapshot(){
  let snapshot=initialConversationSnapshot({domain:'film',depth:'standard',requireDirection:true});
  for(const action of [{type:'answer',questionId:'direction',text:'Лёгкое приключение с юмором до двух часов'},{type:'review'},{type:'confirm'}]){
   const response=await qaFetch('/api/media-conversation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({domain:'film',state:snapshot.state,action})});
   snapshot=await response.json();
   if(!response.ok||!snapshot.state)throw Error('Подбор недоступен. Обнови страницу, чтобы повторить.');
  }
  return snapshot;
 }
 const snapshot=location.pathname==='/compare/game/'?await (await fetch('/compare/recorded-game.json')).json():await filmSnapshot();
 if(!snapshot.state.result?.alternatives?.length)throw Error('Для сравнения нужны два варианта из выдачи.');
 const entry=createSelectionArchive({storage:qaStorage(localStorage)}).capture(snapshot);
 if(!entry)throw Error('Для примера нужно разрешить локальное хранение подбора.');
 location.replace(selectionUrl(entry)+'&comparePreview=1');
}catch(error){document.querySelector('p').textContent=error.message;}`;
const openDialog=`const open=()=>{
 const button=document.querySelector('[data-act="compare-results"]:not(:disabled)');
 if(!button)return false;
 button.click();return !!document.querySelector('dialog.finalist-dialog[open]');
};
window.addEventListener('load',()=>{
 if(open())return;
 const observer=new MutationObserver(()=>{if(open())observer.disconnect();});
 observer.observe(document.body,{subtree:true,childList:true,attributes:true});
},{once:true});`;
const headers=type=>({'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'});
createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/compare/'||url.pathname==='/compare/game/'){
  if(url.searchParams.get('qa_run')!=='finalists-preview'){
   res.writeHead(302,{Location:url.pathname+'?qa_run=finalists-preview'});res.end();return;
  }
  res.writeHead(200,headers('text/html'));res.end('<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Сравнение · TASTIQ</title><link rel="stylesheet" href="/shared/brand.css"><p role="status">Открываю сравнение…</p><script type="module" src="/compare/start.js"></script></html>');return;
 }
 if(url.pathname==='/compare/recorded-game.json'){
  res.writeHead(200,headers('application/json'));res.end(await readFile(recordedGame));return;
 }
 if(url.pathname==='/compare/start.js'||url.pathname==='/compare/open.js'){
  res.writeHead(200,headers('text/javascript'));res.end(url.pathname.endsWith('start.js')?launch:openDialog);return;
 }
 if(['/pick/watch/','/pick/game/'].includes(url.pathname)&&url.searchParams.has('comparePreview')){
  const page=await readFile(new URL(url.pathname==='/pick/game/'?'game/index.html':'watch/index.html',pickerRoot),'utf8');
  res.writeHead(200,headers('text/html'));res.end(page.replace('</body>','<script type="module" src="/compare/open.js"></script></body>'));return;
 }
 return handler(req,res);
}).listen(port,'127.0.0.1',()=>console.log('http://127.0.0.1:'+port+'/compare/'));
