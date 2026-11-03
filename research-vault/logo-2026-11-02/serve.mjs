import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url));
const types = { '.html':'text/html; charset=utf-8', '.png':'image/png', '.svg':'image/svg+xml', '.ttf':'font/ttf', '.txt':'text/plain; charset=utf-8' };
http.createServer(async (req,res) => {
  try {
    const path = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const target = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!target.startsWith(root + sep) || !types[extname(target)]) { res.writeHead(404);res.end();return; }
    const body = await readFile(target);
    res.writeHead(200,{'Content-Type':types[extname(target)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);
  } catch { res.writeHead(404);res.end(); }
}).listen(5183,'127.0.0.1',()=>console.log('Logo preview: http://127.0.0.1:5183/'));
