// UX walkthrough "a", extra: minimal skip path, «Моё» lists (move, remove, undo), browser back.
// usage: node a-extra.mjs <game|cartoon> <1440|390> <light|dark>
import { chromium } from 'file:///C:/Users/Dusik/AppData/Local/Temp/claude/E--project-TASTIQ/316e07fd-614b-4eb4-a3ec-2c92111b7da4/scratchpad/pw-lib/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const [domain = 'game', widthArg = '1440', scheme = 'light'] = process.argv.slice(2);
const width = Number(widthArg);
const height = width === 390 ? 844 : 900;
const BASE = 'http://localhost:5173';
const ROOT = 'C:/Users/Dusik/AppData/Local/Temp/claude/E--project-TASTIQ/316e07fd-614b-4eb4-a3ec-2c92111b7da4/scratchpad/shots/a';
const run = `extra-${domain}-${width}-${scheme}`;
const dir = path.join(ROOT, run);
fs.mkdirSync(dir, { recursive: true });

const log = { run, screens: [], taps: 0, shots: [], notes: [], consoleErrors: [] };
let shotN = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: 1, locale: 'ru-RU' });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log.consoleErrors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => log.consoleErrors.push(`pageerror: ${e.message}`));

async function settle(ms = 500) { await page.waitForLoadState('networkidle').catch(() => {}); await sleep(ms); }
async function shot(name, { full = false, wait = 0 } = {}) {
  if (wait) await sleep(wait);
  shotN++;
  const file = path.join(dir, `${String(shotN).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file, fullPage: full });
  log.shots.push(file);
  return file;
}
async function tap(selector, label) {
  const loc = typeof selector === 'string' ? page.locator(selector).first() : selector;
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await loc.click({ timeout: 8000 });
  log.taps++;
  log.notes.push(`tap ${log.taps}: ${label ?? selector}`);
  await settle();
}
async function info(name) {
  const i = await page.evaluate(() => {
    let st = null; try { st = JSON.parse(localStorage.getItem('tastiq.site') || 'null'); } catch { st = null; }
    const title = document.querySelector('#q-title')?.textContent?.trim() ?? '';
    const hint = document.querySelector('.q-hint')?.textContent?.trim() ?? '';
    const actions = [...document.querySelectorAll('#actionbar button')].map((b) => `${b.textContent.trim()}${b.disabled ? ' [disabled]' : ''}`);
    const stepsSum = document.querySelector('.steps-sum')?.textContent?.trim() ?? '';
    const cards = document.querySelectorAll('.pcard').length;
    const hScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
    return { step: st?.step, title, hint, actions, stepsSum, cards, hScroll, url: location.href };
  });
  log.screens.push({ n: log.screens.length + 1, name, ...i });
  return i;
}
const myState = () => page.evaluate(() => ({
  tabs: [...document.querySelectorAll('.my-tabs .seg')].map((b) => `${b.textContent.replace(/\s+/g, ' ').trim()}${b.getAttribute('aria-pressed') === 'true' ? ' *' : ''}`),
  rows: [...document.querySelectorAll('.my-row')].map((r) => r.textContent.replace(/\s+/g, ' ').trim().slice(0, 160)),
  undo: document.querySelector('.my-undo')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
  empty: document.querySelector('.my-empty, .empty')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
  body: document.querySelector('.q-body')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 400) ?? '',
}));

const DOOR = { game: 'Поиграть', cartoon: 'Мультфильм' };

try {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await sleep(800);
  await page.goto(`${BASE}/pick/?start=${domain}`, { waitUntil: 'networkidle' });
  await sleep(1500);
  await shot('start-param');
  let i = await info('start-param');
  if (i.step === 'platform') { await tap('.tile[data-v="windows"]', 'platform ПК'); i = await info('after-platform'); }
  // skip genres
  if (i.step === 'genres') {
    await tap('[data-act="skip"]', 'Пропустить (genres)');
    await sleep(2500);
    await shot('liked-after-skip-genres');
    i = await info('liked-after-skip-genres');
    log.notes.push(`[liked after skipping genres] cards=${i.cards} actions=${i.actions.join(',')}`);
  }
  // liked: can we proceed without picking? (no skip)
  const noPick = i.actions;
  log.notes.push(`[liked, nothing picked] actions=${noPick.join(',')}`);
  await tap('.pcard[aria-pressed="false"]', 'card 1 (only one)');
  await tap('#actionbar [data-act="primary"]', 'Дальше (liked)');
  await sleep(1500);
  await shot('why-1');
  i = await info('why-1');
  // Не знаю
  await tap('[data-act="skip"]', 'Не знаю (why)');
  await sleep(1500);
  await shot('after-dont-know');
  i = await info('after-dont-know');
  if (i.step === 'disliked') {
    await tap('[data-act="skip"]', 'Ничего такого');
    await sleep(800);
    await shot('after-nothing-disliked');
    i = await info('after-nothing-disliked');
  }
  if (i.step === 'today') {
    await tap('[data-act="skip"]', 'Пропустить (today)');
    await sleep(800);
    await shot('playback-min');
    i = await info('playback-min');
    log.notes.push(`[playback minimal] ${await page.evaluate(() => document.querySelector('.q-body')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 600))}`);
  }
  if (i.step === 'playback') {
    await tap('#actionbar [data-act="primary"]', 'Да, подбирай');
    await sleep(3000);
    await shot('result-min');
    await shot('result-min-full', { full: true });
    i = await info('result-min');
    log.notes.push(`[result minimal] ${JSON.stringify(await page.evaluate(() => ({
      hero: document.querySelector('.hero')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 400),
      alts: [...document.querySelectorAll('.alt')].map((a) => a.textContent.replace(/\s+/g, ' ').trim().slice(0, 120)),
      label: document.querySelector('.hero .label, .hero .confidence, .hero [class*=label]')?.textContent.trim(),
      fork: document.querySelector('.fork')?.textContent.replace(/\s+/g, ' ').trim(),
      sieves: document.querySelector('.sieves')?.textContent.replace(/\s+/g, ' ').trim(),
    })))}`);
    // detail on phone
    if (width === 390) { await page.locator('#detail-inline').scrollIntoViewIfNeeded().catch(() => {}); await sleep(400); await shot('result-min-detail'); await page.evaluate(() => window.scrollTo(0, 0)); }
  }
  log.notes.push(`[minimal path] screens=${log.screens.length} taps=${log.taps}`);

  // ----- take two items into Моё -----
  await tap('[data-act="take"]:visible', 'В Моё (hero)');
  await shot('after-take-hero');
  const alts = page.locator('.alt');
  if (await alts.count()) {
    await tap(alts.nth(0), 'alt 1');
    await sleep(600);
    await tap('[data-act="take"]:visible', 'В Моё (alt 1)');
    await shot('after-take-alt');
    await tap(alts.nth(1), 'alt 2');
    await sleep(600);
    await tap('[data-act="played"]:visible', 'Уже играл/смотрел (alt 2)');
    await shot('alt2-played-ask');
    await tap('[data-act="reaction"][data-r="dislike"]:visible', 'Не зашло (alt 2)');
    await sleep(1500);
    await shot('after-alt2-dislike');
  }
  // sidebar / my link
  const myLink = page.locator('a[href="#my"], [data-act="my"], #my-link').first();
  log.notes.push(`[my link visible on result] ${await myLink.count() ? await myLink.isVisible() : 'none'} text=${await myLink.count() ? (await myLink.textContent()).trim() : ''}`);

  // browser back
  await page.goBack().catch(() => {});
  await sleep(1200);
  await shot('browser-back');
  const b = await info('browser-back');
  log.notes.push(`[browser back from result] url=${b.url} step=${b.step} title=${b.title} h1=${await page.evaluate(() => document.querySelector('h1')?.textContent.trim())}`);
  await page.goForward().catch(() => {});
  await sleep(1200);
  await shot('browser-forward');
  const f = await info('browser-forward');
  log.notes.push(`[browser forward] url=${f.url} step=${f.step} title=${f.title}`);
  await page.goto(`${BASE}/pick/`, { waitUntil: 'networkidle' });
  await sleep(1200);
  await shot('reopen-pick');
  const r = await info('reopen-pick');
  log.notes.push(`[reopen /pick/ after result] step=${r.step} title=${r.title}`);

  // ----- Моё -----
  await page.goto(`${BASE}/pick/#my`, { waitUntil: 'networkidle' });
  await sleep(1500);
  await shot('my-default');
  await info('my-default');
  log.notes.push(`[my default] ${JSON.stringify(await myState())}`);
  const tabs = page.locator('.my-tabs .seg');
  for (let t = 0; t < await tabs.count(); t++) {
    await tap(tabs.nth(t), `my tab ${t + 1}`);
    await shot(`my-tab-${t + 1}`);
    log.notes.push(`[my tab ${t + 1}] ${JSON.stringify(await myState())}`);
  }
  await tap(tabs.nth(0), 'my tab want');
  if (await page.locator('.my-row').count()) {
    await tap('.my-row [data-act="my-select"]', 'select row 1');
    await shot('my-row-selected');
    await info('my-row-selected');
    log.notes.push(`[my selected detail] ${await page.evaluate(() => (document.querySelector('#inspector .my-detail') ?? document.querySelector('.my-inline'))?.textContent.replace(/\s+/g, ' ').trim().slice(0, 600))}`);
    await tap('.my-row [data-act="my-liked"]', 'Зашло (row 1)');
    await shot('my-after-liked');
    log.notes.push(`[my after liked] ${JSON.stringify(await myState())}`);
    await tap(tabs.nth(1), 'tab Зашло');
    await shot('my-tab-liked');
    log.notes.push(`[my tab liked] ${JSON.stringify(await myState())}`);
    if (await page.locator('.my-row [data-act="my-disliked"]').count()) {
      await tap('.my-row [data-act="my-disliked"]', 'В «Не зашло» (row 1)');
      await shot('my-after-move-disliked');
      log.notes.push(`[my after move to disliked] ${JSON.stringify(await myState())}`);
    }
    await tap(tabs.nth(2), 'tab Не зашло');
    await shot('my-tab-disliked');
    log.notes.push(`[my tab disliked] ${JSON.stringify(await myState())}`);
    if (await page.locator('.my-row [data-act="my-remove"]').count()) {
      await tap('.my-row [data-act="my-remove"]', 'Убрать (row 1)');
      await shot('my-after-remove');
      log.notes.push(`[my after remove] ${JSON.stringify(await myState())}`);
      if (await page.locator('[data-act="my-undo"]').count()) {
        await tap('[data-act="my-undo"]', 'Вернуть');
        await shot('my-after-undo');
        log.notes.push(`[my after undo] ${JSON.stringify(await myState())}`);
      } else log.notes.push('[my] no undo button after remove');
    }
    await tap(tabs.nth(3), 'tab История');
    await shot('my-history');
    log.notes.push(`[my history] ${JSON.stringify(await myState())}`);
  } else log.notes.push('[my] no rows in want tab');
  // К подбору
  await tap('#back-btn', 'К подбору');
  await sleep(1500);
  await shot('my-to-pick');
  const back = await info('my-to-pick');
  log.notes.push(`[К подбору] step=${back.step} title=${back.title} url=${back.url}`);
  // reload persistence
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(1500);
  await shot('after-reload');
  const rl = await info('after-reload');
  log.notes.push(`[after reload] step=${rl.step} title=${rl.title}`);
} catch (err) {
  log.notes.push(`ERROR: ${err.stack}`);
  await shot('error').catch(() => {});
} finally {
  fs.writeFileSync(path.join(dir, 'log.json'), JSON.stringify(log, null, 2));
  console.log(`done ${run}: ${log.shots.length} shots, ${log.taps} taps, errors=${log.consoleErrors.length}`);
  console.log(log.notes.filter((n) => !n.startsWith('tap ')).join('\n'));
  console.log('CONSOLE', log.consoleErrors);
  await browser.close();
}
