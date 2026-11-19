import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

// Keep this design study local and independent of the owner's feedback and AI accounts.
Object.assign(process.env, {
  AI_ACCESS: 'off',
  AI_EVAL_BUDGET_DIR: '',
  FEEDBACK_DATABASE_URL: '',
  FEEDBACK_DATABASE_SECRET: '',
  JOURNAL_PATH: join(tmpdir(), 'tastiq-mode-cards-preview.ndjson'),
});
const {handler} = await import('../../src/server/app.js');
const original = new Map([
  ['/shared/selection-mode.js', ['original-mode.js', 'text/javascript']],
  ['/shared/selection-mode.css', ['original-mode.css', 'text/css']],
]);
const examples = new Map([
  ['/shared/selection-mode.js', ['cards.js', 'text/javascript']],
  ['/shared/selection-mode.css', ['cards.css', 'text/css']],
]);
// The chosen design on 5224 now comes entirely from the application.
const previews = process.argv.includes('--objects-only') ? [[5224, null]] : [[5222, examples], [5223, original], [5224, null]];
for (const [port, assets] of previews) {
  createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const view = assets && url.searchParams.has('original') ? original : assets;
    const asset = view?.get(url.pathname);
    if (!asset) return handler(req, res);
    const [file, type] = asset;
    res.writeHead(200, {'Content-Type': type, 'Cache-Control': 'no-store'});
    res.end(readFileSync(new URL(file, import.meta.url)));
  }).listen(port, '127.0.0.1', () => console.log((assets ? 'Study' : 'TASTIQ') + ' on ' + port));
}
