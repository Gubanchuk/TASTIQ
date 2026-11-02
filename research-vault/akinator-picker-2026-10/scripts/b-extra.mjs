// Extra checks for walkthrough "b": reload at «за что», «Добавлю ещё», skip-all path, search misses, Enter key,
// scrolled captures of the result on desktop, phone drawer → landing → «Моё».
import { chromium } from 'file:///C:/Users/Dusik/AppData/Local/Temp/claude/E--project-TASTIQ/316e07fd-614b-4eb4-a3ec-2c92111b7da4/scratchpad/pw-lib/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:5173';
const root = 'C:/Users/Dusik/AppData/Local/Temp/claude/E--project-TASTIQ/316e07fd-614b-4eb4-a3ec-2c92111b7da4/scratchpad/shots/b';
const out = [];
const note = (s) => { out.push(s); console.log('NOTE', s); };

async function mk(name, { width, height, scheme }) {
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  const phone = width < 700;
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, locale: 'ru-RU', isMobile: phone, hasTouch: phone });
  const page = await ctx.newPage();
  let n = 0;
  const settle = async (ms = 200) => { await page.waitForFunction(() => !document.body.classList.contains('is-busy'), null, { timeout: 40000 }).catch(() => note('settle timeout')); await page.waitForTimeout(ms); };
  const shot = async (label, o = {}) => { if (o.wait) await page.waitForTimeout(o.wait); n++; const f = path.join(dir, `${String(n).padStart(2, '0')}-${label}.png`); await page.screenshot({ path: f, fullPage: !!o.full }); console.log(`[${name}/${n}] ${label}`); return f; };
  const tap = async (sel, o = {}) => { const l = typeof sel === 'string' ? page.locator(sel).first() : sel; await l.scrollIntoViewIfNeeded().catch(() => {}); await l.click({ timeout: 10000 }); if (!o.noSettle) await settle(); };
  const step = () => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('tastiq.site'))?.step; } catch { return null; } });
  const primary = () => page.locator('#actionbar [data-act="primary"]');
  const text = (sel) => page.locator(sel).first().innerText().catch(() => null);
  return { browser, page, settle, shot, tap, step, primary, text, dir };
}

// ---------- A. desktop film light: skip-all path, search misses, Enter, reload at why, «Добавлю ещё», scrolled result
{
  const { browser, page, settle, shot, tap, step, primary, text } = await mk('extra-film-1440-light', { width: 1440, height: 900, scheme: 'light' });
  await page.goto(`${BASE}/pick/?start=film`, { waitUntil: 'load' });
  await page.waitForSelector('#q-title'); await settle(400);
  // genres: skip
  await tap('[data-act="skip"]');
  await shot('liked-after-genre-skip', { wait: 2500 });
  note(`liked: skip button present? ${await page.locator('#actionbar [data-act="skip"]').count()}; Дальше disabled with 0 picks? ${await primary().isDisabled()}`);
  // search misses
  await page.fill('#search-pick', 'какой-то несуществующий фильм');
  await page.waitForTimeout(900);
  await shot('search-miss');
  note(`search miss text: ${await text('#suggest-pick')}`);
  await page.fill('#search-pick', 'inception');
  await page.waitForTimeout(900);
  await shot('search-english');
  note(`search english "inception": ${(await text('#suggest-pick'))?.slice(0, 120)}`);
  await page.fill('#search-pick', 'матр');
  await page.waitForTimeout(900);
  note(`search "матр": ${(await text('#suggest-pick'))?.slice(0, 160)}`);
  await page.fill('#search-pick', '');
  await page.keyboard.press('Escape');
  // «Показать другие» three times to see what a person who knows nothing gets
  for (let i = 0; i < 3; i++) await tap('[data-act="more"]');
  await shot('liked-after-3-more', { wait: 2500 });
  // pick 2 cards, Enter to continue
  await tap(page.locator('.pcard').nth(0), { noSettle: true });
  await tap(page.locator('.pcard').nth(1), { noSettle: true });
  await page.keyboard.press('Enter');
  await settle(800);
  note(`Enter on liked moved to step: ${await step()}`);
  if ((await step()) === 'liked') await tap(primary());
  await shot('why-1-via-enter', { wait: 1000 });
  // reload at why
  await page.reload({ waitUntil: 'load' }); await page.waitForSelector('#q-title'); await settle(600);
  await shot('why-1-after-reload', { wait: 1200 });
  note(`after reload at why: step=${await step()} title=${await text('#q-title')} back enabled=${!(await page.locator('#back-btn').isDisabled())}`);
  // «Не знаю» on every why, «Ничего такого», «Пропустить» today
  let g = 0;
  while ((await step()) === 'why' && g++ < 4) await tap('[data-act="skip"]');
  if ((await step()) === 'disliked') await tap('[data-act="skip"]');
  if ((await step()) === 'today') await tap('[data-act="skip"]');
  await shot('playback-skip-all', { wait: 500 });
  note(`playback (skip-all) content: ${(await text('#content'))?.replace(/\s+/g, ' ').slice(0, 400)}`);
  note(`playback (skip-all) inspector: ${(await text('#inspector'))?.replace(/\s+/g, ' ').slice(0, 300)}`);
  // «Добавлю ещё, что зашло»
  await tap('[data-act="more-liked"]');
  await shot('more-liked-screen', { wait: 2500 });
  note(`after «Добавлю ещё»: step=${await step()} title=${await text('#q-title')} cards=${await page.locator('.pcard').count()}`);
  await tap('#back-btn');
  note(`back from more-liked: step=${await step()}`);
  if ((await step()) !== 'playback') { let k = 0; while ((await step()) !== 'playback' && k++ < 5) { if (await page.locator('[data-act="skip"]').count()) await tap('[data-act="skip"]'); else await tap(primary()); } }
  await tap(primary());
  await shot('result-skip-all', { wait: 3000 });
  note(`result (skip-all) hint: ${await text('.q-hint')} | hero: ${(await text('.hero'))?.replace(/\s+/g, ' ')}`);
  note(`result (skip-all) labels: ${JSON.stringify(await page.locator('.status').allInnerTexts())}`);
  note(`result (skip-all) fork: ${(await text('.fork'))?.replace(/\s+/g, ' ')}`);
  // scrolled captures of content and inspector
  const ch = await page.evaluate(() => document.querySelector('#content').scrollHeight);
  const ih = await page.evaluate(() => document.querySelector('#inspector').scrollHeight);
  note(`result scroll heights: content=${ch} inspector=${ih} viewport=900`);
  for (let y = 700; y < ch; y += 700) { await page.evaluate((y) => { document.querySelector('#content').scrollTop = y; }, y); await shot(`result-content-scroll-${y}`); }
  await page.evaluate(() => { document.querySelector('#content').scrollTop = 0; });
  for (let y = 800; y < ih; y += 800) { await page.evaluate((y) => { document.querySelector('#inspector').scrollTop = y; }, y); await shot(`result-inspector-scroll-${y}`); }
  // expand «Ещё N подтверждений»
  await page.evaluate(() => { document.querySelector('#inspector').scrollTop = 0; });
  const more = page.locator('#inspector details.ev-more summary').first();
  if (await more.count()) { await more.click(); await shot('result-evidence-expanded', { wait: 300 }); note(`expanded evidence: ${(await page.locator('#inspector details.ev-more').first().innerText()).replace(/\s+/g, ' ').slice(0, 300)}`); }
  // «Открыть на IMDb» link target
  note(`detail link: ${await page.locator('.detail-link').first().getAttribute('href')}`);
  // dump the full reasons/risks text of the top pick
  note(`reasons: ${(await page.locator('#inspector .reasons').allInnerTexts()).join(' || ').replace(/\s+/g, ' ').slice(0, 1500)}`);
  // whynot on a title that was removed: search one of the liked titles
  const likedId = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('tastiq.site')); return Object.keys(s.answers)[0]; });
  const likedName = await page.evaluate((id) => { const m = JSON.parse(localStorage.getItem('tastiq.site.meta')); return (m.titles.find(([k]) => k === id) ?? [])[1]?.ru; }, likedId);
  if (likedName) {
    await page.locator('#search-why').scrollIntoViewIfNeeded();
    await page.fill('#search-why', likedName.slice(0, 12));
    await page.waitForSelector('#suggest-why:not([hidden]) .opt', { timeout: 8000 }).catch(() => {});
    await page.locator('#suggest-why .opt').first().click().catch(() => {});
    await page.waitForSelector('#whynot-out .whynot-card', { timeout: 15000 }).catch(() => {});
    await shot('whynot-liked-title');
    note(`whynot for liked «${likedName}»: ${(await text('#whynot-out'))?.replace(/\s+/g, ' ')}`);
  }
  await browser.close();
}

// ---------- B. phone series dark: drawer → landing, landing → «Моё», hero reasons on phone, fork layout
{
  const { browser, page, settle, shot, tap, step, primary, text } = await mk('extra-series-390-dark', { width: 390, height: 844, scheme: 'dark' });
  await page.goto(`${BASE}/pick/?start=series`, { waitUntil: 'load' });
  await page.waitForSelector('#q-title'); await settle(400);
  await tap(page.locator('.chips .chip').nth(0), { noSettle: true });
  await tap(primary());
  await page.waitForTimeout(2000);
  await tap(page.locator('.pcard').nth(0), { noSettle: true });
  await tap(page.locator('.pcard').nth(2), { noSettle: true });
  await tap(primary());
  let g = 0;
  while ((await step()) === 'why' && g++ < 4) { const c = page.locator('#qbody .chips .chip'); if (await c.count()) await tap(c.nth(0), { noSettle: true }); if (await c.count() > 1) await tap(c.nth(1), { noSettle: true }); await tap(primary()); }
  if ((await step()) === 'disliked') await tap('[data-act="skip"]');
  if ((await step()) === 'today') { await tap(page.locator('[aria-label="Настроение"] .chip').nth(0), { noSettle: true }); await tap(primary()); }
  await shot('playback-phone', { wait: 400 });
  // where does the toolbar title say we are + how many steps the sidebar counts
  await tap('#menu-btn', { noSettle: true });
  await tap('[data-act="steps"]', { noSettle: true });
  await shot('drawer-steps-open');
  await tap('#sidebar-close', { noSettle: true });
  await tap(primary());
  await shot('result-phone', { wait: 3000 });
  note(`phone hero text: ${(await text('.hero'))?.replace(/\s+/g, ' ')}`);
  note(`phone hero reasons visible: ${await page.locator('.hero .hero-reasons').locator('visible=true').count()}`);
  note(`phone fork box: ${await page.locator('.fork').count() ? JSON.stringify(await page.locator('.fork').boundingBox()) : 'none'} segs=${await page.locator('.fork .seg').count()}`);
  note(`phone result page height: ${await page.evaluate(() => document.documentElement.scrollHeight)}`);
  // tap alternative on phone: does it scroll to inline detail?
  const alt = page.locator('.alt').first();
  if (await alt.count()) { await tap(alt, { noSettle: true }); await page.waitForTimeout(900); await shot('alt-tapped-phone'); note(`after alt tap scrollY=${await page.evaluate(() => window.scrollY)}`); }
  // drawer → brand → landing
  await tap('#menu-btn', { noSettle: true });
  await shot('drawer-open-result');
  await tap('a.brand', { noSettle: true });
  await page.waitForSelector('#doors', { timeout: 30000 });
  await shot('landing-from-drawer', { wait: 2000 });
  // landing → Моё
  await tap('#my-link', { noSettle: true });
  await page.waitForSelector('#q-title', { timeout: 30000 });
  await shot('my-phone', { wait: 1000 });
  note(`my phone title=${await text('#q-title')} tabs=${JSON.stringify(await page.locator('[data-act="my-tab"]').allInnerTexts())}`);
  // back to picker keeps dialogue?
  await tap('#back-btn', { noSettle: true });
  await page.waitForTimeout(800);
  await shot('back-to-dialogue-from-my', { wait: 1500 });
  note(`after «К подбору»: step=${await step()} title=${await text('#q-title')}`);
  // landing: «Подобрать» button
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await tap('#pick-btn', { noSettle: true });
  await page.waitForTimeout(800);
  await shot('landing-podobrat-click');
  note(`landing «Подобрать» → url=${page.url()} scrollY=${await page.evaluate(() => window.scrollY)}`);
  await browser.close();
}

fs.writeFileSync(path.join(root, 'extra-notes.json'), JSON.stringify(out, null, 2));
console.log('DONE');
