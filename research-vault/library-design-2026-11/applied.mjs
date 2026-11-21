import {createServer} from 'node:http';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const dir=await mkdtemp(join(tmpdir(),'tastiq-wall-preview-'));
Object.assign(process.env,{AI_ACCESS:'off',FEEDBACK_DATABASE_URL:'',FEEDBACK_DATABASE_SECRET:'',JOURNAL_PATH:join(dir,'events.ndjson')});
const {handler}=await import('../../src/server/app.js');
const seed=await readFile(new URL('./seed.js',import.meta.url));
createServer((req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/example/'){
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    return res.end('<!doctype html><html lang="ru" data-concept="applied"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Пример библиотеки TASTIQ</title><p>Открываю демонстрационную коллекцию…</p><script type="module" src="/example/seed.js"></script></html>');
  }
  if(path==='/example/seed.js'){
    res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});return res.end(seed);
  }
  return handler(req,res);
}).listen(5344,'127.0.0.1',()=>console.log('TASTIQ library http://127.0.0.1:5344/library/ — sample /example/'));
