// Screenshots of the picker at given dialogue states, in an isolated headless Chromium via CDP
// (the shared Playwright MCP browser is used by other agents, so this uses its own profile).
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const CHROME = 'C:/Users/Dusik/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';
const OUT = 'C:/Users/Dusik/AppData/Local/Temp/claude/E--project-TASTIQ/316e07fd-614b-4eb4-a3ec-2c92111b7da4/scratchpad/out';
const SHOTS = 'E:/project/TASTIQ/research-vault/akinator-picker-2026-10/raw/screens';
const PORT = 9377;
mkdirSync(SHOTS, { recursive: true });

const p1 = JSON.parse(readFileSync(`${OUT}/games-p1-careful-state.json`, 'utf8'));
const p2 = JSON.parse(readFileSync(`${OUT}/games-p2-careful-state.json`, 'utf8'));
const p1lazy = JSON.parse(readFileSync(`${OUT}/games-p1-lazy.json`, 'utf8')).finalState;

const SCENES = [
  { file: 'games-p1-careful-result.png', state: p1, waitFor: 'Вот что я подобрал' },
  { file: 'games-p1-careful-today.png', state: { ...p1, step: 'today' }, waitFor: 'Что сегодня?' },
  { file: 'games-p1-careful-why-disco.png', state: { ...p1, step: 'why', whyIndex: 1 }, waitFor: 'За что тебе зашло' },
  { file: 'games-p1-careful-playback.png', state: { ...p1, step: 'playback' }, waitFor: 'Вот как я тебя вижу' },
  { file: 'games-p2-careful-result.png', state: p2, waitFor: 'Вот что я подобрал' },
  { file: 'games-p2-careful-whynot-civ6.png', state: { ...p2, step: 'why_not', whyIndex: 1 }, waitFor: 'Что не понравилось' },
  { file: 'games-p1-lazy-liked-page1.png', state: { ...p1lazy, step: 'liked', shown: [], answers: {}, liked: [], genres: [] }, waitFor: 'Во что играл' },
];

const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}/chrome-profile`, '--headless=new', '--no-first-run', '--no-default-browser-check', '--window-size=1280,900', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function targets() {
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json`); return await r.json(); } catch { await sleep(250); }
  }
  throw new Error('chrome did not start');
}

const list = await targets();
const page = list.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((resolve) => { const n = ++id; pending.set(n, resolve); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

async function goto(url) {
  await send('Page.navigate', { url });
  for (let i = 0; i < 40; i++) { await sleep(150); if ((await evaluate('document.readyState')) === 'complete') break; }
}

await goto('http://localhost:5173/pick/');
for (const scene of SCENES) {
  await evaluate(`localStorage.setItem('tastiq.site', ${JSON.stringify(JSON.stringify(scene.state))}); localStorage.removeItem('tastiq.site.history'); 'ok'`);
  await goto('http://localhost:5173/pick/');
  let ok = false;
  for (let i = 0; i < 60; i++) {
    await sleep(200);
    if (await evaluate(`document.body.innerText.includes(${JSON.stringify(scene.waitFor)})`)) { ok = true; break; }
  }
  await sleep(1200); // posters
  const { contentSize } = await send('Page.getLayoutMetrics').then((m) => m.result);
  const height = Math.min(Math.ceil(contentSize.height), 6000);
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height, deviceScaleFactor: 1, mobile: false });
  await sleep(300);
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(`${SHOTS}/${scene.file}`, Buffer.from(shot.result.data, 'base64'));
  const h1 = await evaluate('document.querySelector("main h1")?.innerText ?? document.title');
  console.log(`${ok ? 'OK ' : 'NO '} ${scene.file} h1="${h1}" height=${height}`);
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
}
ws.close();
chrome.kill();
process.exit(0);
