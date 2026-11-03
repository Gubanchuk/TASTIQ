import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('./', import.meta.url);
const allowed = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/refinements.png', ['refinements.png', 'image/png']],
  ['/lettering/', ['lettering.html', 'text/html; charset=utf-8']],
  ['/lettering.html', ['lettering.html', 'text/html; charset=utf-8']],
  ['/lettering.png', ['lettering-study-v1.png', 'image/png']],
  ['/bear-5b-refined-v1.png', ['bear-5b-refined-v1.png', 'image/png']],
  ['/selected/', ['selected.html', 'text/html; charset=utf-8']],
  ['/selected.html', ['selected.html', 'text/html; charset=utf-8']],
  ['/palettes/', ['palettes.html', 'text/html; charset=utf-8']],
  ['/palettes.html', ['palettes.html', 'text/html; charset=utf-8']],
  ['/palette-options.json', ['palette-options.json', 'application/json; charset=utf-8']],
  ['/palettes-v2/', ['palettes-v2.html', 'text/html; charset=utf-8']],
  ['/palettes-v2.html', ['palettes-v2.html', 'text/html; charset=utf-8']],
  ['/palette-options-v2.json', ['palette-options-v2.json', 'application/json; charset=utf-8']],
  ['/cobalt/', ['cobalt.html', 'text/html; charset=utf-8']],
  ['/brand-kit.zip', ['TASTIQ-brand-cobalt-v1.zip', 'application/zip']]
]);
for (const name of ['tastiq-logo','tastiq-symbol','tastiq-wordmark']) {
  for (const suffix of ['','-white']) {
    const filename = `exports/${name}${suffix}.svg`;
    allowed.set(`/${filename}`, [filename, 'image/svg+xml']);
  }
}
for(const name of ['logo','symbol','wordmark'])for(const suffix of ['cobalt','inverse','white','black']){
  const filename=`tastiq-${name}-${suffix}.svg`;
  allowed.set(`/brand/svg/${filename}`,[`brand-cobalt-v1/svg/${filename}`,'image/svg+xml']);
}
for(const filename of ['tastiq-logo-accent.svg','favicon.svg'])allowed.set(`/brand/svg/${filename}`,[`brand-cobalt-v1/svg/${filename}`,'image/svg+xml']);
http.createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
  const entry = allowed.get(pathname);
  if (!entry || !['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const body = await readFile(fileURLToPath(new URL(entry[0], root)));
    response.writeHead(200, { 'Content-Type': entry[1], 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404).end();
  }
}).listen(5184, '127.0.0.1', () => process.stdout.write('Logo preview: http://127.0.0.1:5184/\n'));
