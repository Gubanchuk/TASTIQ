import {createServer} from 'node:http';
import {readFile, mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const port = Number(process.env.LIBRARY_STUDIO_PORT || 5333);
const sandbox = await mkdtemp(join(tmpdir(), 'tastiq-library-studio-'));
Object.assign(process.env, {AI_ACCESS:'off', FEEDBACK_DATABASE_URL:'', FEEDBACK_DATABASE_SECRET:'', JOURNAL_PATH:join(sandbox, 'demo.ndjson')});
const {handler} = await import('../../src/server/app.js');
const local = name => new URL(name, import.meta.url);
// Compare against the library the owner reviewed, even after a design ships.
const reference = name => execFileSync('git',['show','d5b3902:src/server/public/library/'+name],{
  cwd:fileURLToPath(local('../../')),encoding:'utf8'
});
const referencePage = reference('index.html'), referenceApp = reference('app.js');
const variants = new Set(['original', 'wall', 'shelves', 'focus','catalog']);
const files = new Map(Object.entries({'gallery.html':'text/html', 'studio.css':'text/css', 'design.css':'text/css', 'layout.js':'text/javascript', 'seed.js':'text/javascript'}));
const send = (res, type, content) => { res.writeHead(200, {'Content-Type':type, 'Cache-Control':'no-store'}); res.end(content); };
async function route(req, res) {
  const {pathname} = new URL(req.url, 'http://localhost');
  const name = pathname.split('/')[2];
  if (pathname === '/') return send(res, 'text/html; charset=utf-8', await readFile(local('gallery.html')));
  if (pathname.startsWith('/studio/') && files.has(name) && pathname === '/studio/' + name)
    return send(res, files.get(name) + '; charset=utf-8', await readFile(local(name)));
  if (/^\/shots\/(original|wall|shelves|focus|catalog)-(desktop|mobile)\.jpg$/.test(pathname))
    return send(res, 'image/jpeg', await readFile(local('.' + pathname)));
  if (variants.has(name) && pathname === '/v/' + name + '/') {
    const source = referencePage;
    const css = name === 'original' ? '' : '<link rel="stylesheet" href="/studio/design.css">';
    const html = source.replace('<html lang="ru">','<html lang="ru" data-concept="' + name + '">')
      .replace(/<script type="module" src="\/library\/app\.js[^"]*"><\/script>/, '')
      .replace('</head>', css + '<script type="module" src="/studio/seed.js"></script></head>');
    return send(res, 'text/html; charset=utf-8', html);
  }
  if (pathname === '/library/app.js') return send(res,'text/javascript; charset=utf-8',referenceApp);
  if (pathname === '/library/studio-app.js') {
    const js = referenceApp;
    const marker = "$('#library-app').setAttribute('aria-busy','false');";
    if (!js.includes(marker)) throw new Error('Library render hook changed');
    return send(res, 'text/javascript; charset=utf-8', "import {layout} from '/studio/layout.js';\n" + js.replace(marker, 'layout({state,records,activeFilters,render,writeNavigation});\n' + marker));
  }
  if (pathname === '/library/') {
    return send(res,'text/html; charset=utf-8','<!doctype html><html lang="ru"><title>Библиотека</title><script>const mode=sessionStorage.getItem("studio.concept");location.replace("/v/"+('+JSON.stringify([...variants])+'.includes(mode)?mode:"original")+"/"+location.search);</script></html>');
  }
  return handler(req,res);
}
createServer((req,res) => route(req,res).catch(error => {
  console.error(req.url,error.message);
  if (!res.headersSent) res.writeHead(error.code === 'ENOENT' ? 404 : 500); res.end();
})).listen(port, '127.0.0.1', () => console.log('Library studio http://127.0.0.1:' + port + '/'));
