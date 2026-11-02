// UX walkthrough "a": games and cartoons, end to end, as a first-time visitor.
// usage: node a-walk.mjs <game|cartoon> <1440|390> <light|dark>
import { chromium } from 'file:///C:/Users/Dusik/AppData/Local/Temp/claude/E--project-TASTIQ/316e07fd-614b-4eb4-a3ec-2c92111b7da4/scratchpad/pw-lib/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const [domain = 'game', widthArg = '1440', scheme = 'light'] = process.argv.slice(2);
const width = Number(widthArg);
const height = width === 390 ? 844 : 900;
const BASE = 'http://localhost:5173';
const ROOT = 'C:/Users/Dusik/AppData/Local/Temp/claude/E--project-TASTIQ/316e07fd-614b-4eb4-a3ec-2c92111b7da4/scratchpad/shots/a';
const run = `${domain}-${width}-${scheme}`;
const dir = path.join(ROOT, run);
fs.mkdirSync(dir, { recursive: true });

const log = { run, screens: [], taps: 0, shots: [], notes: [], api: [], consoleErrors: [] };
let shotN = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: 1, locale: 'ru-RU' });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log.consoleErrors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => log.consoleErrors.push(`pageerror: ${e.message}`));
page.on('response', async (res) => {
  const url = res.url();
  if (!url.includes('/api/')) return;
  if (url.includes('/api/log')) return;
  try {
    const data = await res.json();
    if (url.includes('/api/dialogue')) {
      const s = data.screen ?? {};
      const entry = { step: s.step, title: s.title, hint: s.hint ?? null, progress: s.progress ?? null };
      if (s.options) entry.options = s.options.map((o) => o.label ?? o);
      if (s.avoid) entry.avoid = s.avoid.map((o) => o.label);
      if (s.categories) entry.categories = s.categories.map((o) => o.label);
      if (s.items) entry.items = s.items.map((x) => `${x.ru ?? x.name}${x.year ? ` (${x.year})` : ''}`);
      if (s.lines) entry.lines = s.lines;
      if (s.result) {
        const r = s.result;
        entry.result = {
          top: r.top ? { id: r.top.id, name: r.top.ru ?? r.top.name, label: r.top.label, labelText: r.top.labelText, reasons: (r.top.reasons ?? []).map((x) => x.text), risks: (r.top.risks ?? []).map((x) => x.text) } : null,
          alternatives: (r.alternatives ?? []).map((a) => ({ name: a.ru ?? a.name, label: a.labelText })),
          fork: r.fork ?? null,
          sieves: r.sieves,
          considered: r.considered,
        };
      }
      log.api.push({ url: url.replace(BASE, ''), status: res.status(), screen: entry });
    } else {
      log.api.push({ url: url.replace(BASE, ''), status: res.status(), body: JSON.stringify(data).slice(0, 1500) });
    }
  } catch { /* not json */ }
});

async function settle(ms = 400) {
  await sleep(ms);
  await page.waitForFunction(() => !document.body.classList.contains('is-busy'), null, { timeout: 15000 }).catch(() => {});
  await sleep(150);
}
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
async function screenInfo() {
  return page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('tastiq.site') || 'null');
    const title = document.querySelector('#q-title')?.textContent?.trim() ?? '';
    const hint = document.querySelector('.q-hint')?.textContent?.trim() ?? '';
    const chips = [...document.querySelectorAll('.content .chip')].map((c) => c.textContent.trim());
    const actions = [...document.querySelectorAll('#actionbar button')].map((b) => `${b.textContent.trim()}${b.disabled ? ' [disabled]' : ''}`);
    const toolbar = [...document.querySelectorAll('#toolbar button')].map((b) => `${b.textContent.trim() || b.getAttribute('aria-label')}${b.hidden || getComputedStyle(b).display === 'none' ? ' [hidden]' : ''}`);
    const stepsSum = document.querySelector('.steps-sum')?.textContent?.trim() ?? '';
    const hScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
    return { step: st?.step, title, hint, chips, actions, toolbar, stepsSum, hScroll, url: location.href };
  });
}
async function record(name) {
  const info = await screenInfo();
  log.screens.push({ n: log.screens.length + 1, name, ...info });
  return info;
}
async function textCheck(label) {
  // raw/English/technical text visible in the main content
  const found = await page.evaluate(() => {
    const out = [];
    const walker = document.createTreeWalker(document.querySelector('#main') ?? document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const t = walker.currentNode.textContent.trim();
      if (!t) continue;
      const el = walker.currentNode.parentElement;
      if (!el || !el.offsetParent) continue;
      if (/^[A-Za-z][A-Za-z0-9 .,:'!?&\-–—()]{6,}$/.test(t) || /[a-z]+[._:][a-z]+/.test(t)) out.push(`${el.className || el.tagName}: ${t.slice(0, 120)}`);
    }
    return out.slice(0, 40);
  });
  if (found.length) log.notes.push(`[text ${label}] ${found.join(' | ')}`);
}

const DOOR = { game: 'Поиграть', cartoon: 'Мультфильм' };
const SEARCH = { game: 'портал', cartoon: 'шрек' };
const FREE = { game: 'за атмосферу и сюжет, но бесил гринд', cartoon: 'за юмор и музыку, но слишком детское' };
const WHYNOT = { game: 'ведьмак', cartoon: 'король лев' };

try {
  // ---------- landing ----------
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await sleep(2500);
  await shot('landing-top');
  await shot('landing-full', { full: true });
  await record('landing');
  await textCheck('landing');
  const landingInfo = await page.evaluate(() => ({
    doors: [...document.querySelectorAll('.door')].map((d) => d.textContent.replace(/\s+/g, ' ').trim()),
    frags: [...document.querySelectorAll('.frag')].map((f) => f.textContent.replace(/\s+/g, ' ').trim().slice(0, 300)),
    answers: document.querySelector('#answers')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 600),
    result: document.querySelector('#result')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 900),
    again: document.querySelector('#doors-again')?.textContent.replace(/\s+/g, ' ').trim(),
    hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  log.notes.push(`[landing] ${JSON.stringify(landingInfo)}`);

  // scroll shots of landing sections on phone
  if (width === 390) {
    for (const sel of ['.how', '.example', '.again', '.foot']) {
      await page.locator(sel).scrollIntoViewIfNeeded();
      await sleep(600);
      await shot(`landing-${sel.slice(1)}`);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  // ---------- door ----------
  await tap(`.door[data-domain="${domain}"]`, `door ${DOOR[domain]}`);
  await page.waitForSelector('#q-title', { timeout: 15000 });
  await settle(800);
  await shot('after-door');
  let info = await record('after-door');

  if (width === 390) {
    await tap('#menu-btn', 'menu (drawer)');
    await shot('drawer');
    await tap('#sidebar-close', 'close drawer');
  }

  // ---------- platform (games) ----------
  if (info.step === 'platform') {
    await tap('.tile[data-v="windows"]', 'platform ПК');
    await shot('genres');
    info = await record('genres');
  }
  // ---------- genres ----------
  if (info.step === 'genres') {
    if (!log.shots.some((f) => f.includes('genres'))) { await shot('genres'); info = await record('genres'); }
    const chips = page.locator('.content .chip');
    const n = await chips.count();
    await tap(chips.nth(0), 'genre chip 1');
    if (n > 2) await tap(chips.nth(2), 'genre chip 2');
    await shot('genres-selected');
    await tap('#actionbar [data-act="primary"]', 'Дальше (genres)');
  }

  // ---------- liked ----------
  await sleep(2500);
  await shot('liked');
  info = await record('liked');
  await textCheck('liked');
  // search own title
  const search = page.locator('#search-pick');
  await search.click();
  await search.fill(SEARCH[domain]);
  log.taps++;
  await sleep(1200);
  await shot('liked-search');
  const opts = page.locator('#suggest-pick .opt');
  const optTexts = await opts.allTextContents();
  log.notes.push(`[search "${SEARCH[domain]}"] ${optTexts.map((t) => t.replace(/\s+/g, ' ').trim()).join(' | ')}`);
  if (await opts.count()) { await tap(opts.first(), 'search result 1'); await shot('liked-after-search'); }
  else await page.keyboard.press('Escape');
  // click two visible cards
  const cards = page.locator('.pcard[aria-pressed="false"]');
  await tap(cards.nth(0), 'card 1');
  await tap(cards.nth(0), 'card 2');
  await shot('liked-selected');
  await record('liked-selected');
  // "показать другие"
  await tap('[data-act="more"]', 'Показать другие');
  await sleep(2000);
  await shot('liked-more');
  await record('liked-more');
  await tap('#actionbar [data-act="primary"]', 'Дальше (liked)');

  // ---------- why (up to 3) ----------
  let whyN = 0;
  info = await screenInfo();
  while (info.step === 'why' && whyN < 4) {
    whyN++;
    await sleep(1500);
    await shot(`why-${whyN}`);
    info = await record(`why-${whyN}`);
    await textCheck(`why-${whyN}`);
    if (whyN === 1) {
      const chips = page.locator('#qbody .chips .chip');
      const n = await chips.count();
      if (n) await tap(chips.nth(0), 'why chip 1');
      if (n > 1) await tap(chips.nth(1), 'why chip 2');
      await tap('[data-act="love"]', 'Обожаю toggle');
      // free text
      await tap('#freetext summary', 'open freetext');
      await shot(`why-${whyN}-freetext-open`);
      await page.locator('#free').fill(FREE[domain]);
      log.taps++;
      await tap('[data-fk="parse"]', 'Разобрать');
      await sleep(1500);
      await shot(`why-${whyN}-parsed`);
      const parsed = await page.locator('#parsed').textContent();
      log.notes.push(`[parse "${FREE[domain]}"] ${parsed.replace(/\s+/g, ' ').trim()}`);
      const adds = page.locator('#parsed .chip-add');
      const an = await adds.count();
      for (let i = 0; i < Math.min(an, 2); i++) await tap(page.locator('#parsed .chip-add').first(), `add parsed ${i + 1}`);
      await shot(`why-${whyN}-after-add`);
      await record(`why-${whyN}-after-add`);
      await tap('#actionbar [data-act="primary"]', 'Дальше (why 1)');
      // if issues were added, a second question "не терпишь вообще" appears
      const t = await screenInfo();
      if (t.title.includes('не терпишь')) {
        await shot(`why-${whyN}-ask-hard`);
        await record(`why-${whyN}-ask-hard`);
        await tap('[data-act="c-ask"][data-v=""]', 'Ничего из этого');
        await tap('#actionbar [data-act="primary"]', 'Дальше (ask hard)');
      }
    } else if (whyN === 2) {
      // back button test, then "Не знаю"
      await tap('#back-btn', 'Назад');
      await shot(`why-${whyN}-after-back`);
      await record(`why-${whyN}-after-back`);
      await tap('#actionbar [data-act="primary"]', 'Дальше (return)');
      await sleep(800);
      const t2 = await screenInfo();
      if (t2.title.includes('не терпишь')) {
        log.notes.push('[back] after Назад + Дальше the «не терпишь вообще» question is asked again with the earlier answer lost');
        await shot(`why-${whyN}-ask-hard-again`);
        await record(`why-${whyN}-ask-hard-again`);
        await tap('[data-act="c-ask"][data-v=""]', 'Ничего из этого (again)');
        await tap('#actionbar [data-act="primary"]', 'Дальше (ask hard again)');
      }
      await shot(`why-${whyN}-returned`);
      await record(`why-${whyN}-returned`);
      await tap('[data-act="skip"]', 'Не знаю');
    } else {
      const chips = page.locator('#qbody .chips .chip');
      if (await chips.count()) await tap(chips.nth(0), 'why chip');
      await tap('#actionbar [data-act="primary"]', `Дальше (why ${whyN})`);
    }
    info = await screenInfo();
  }

  // ---------- disliked ----------
  await sleep(2000);
  await shot('disliked');
  info = await record('disliked');
  if (info.step === 'disliked') {
    await tap('.pcard[aria-pressed="false"]', 'disliked card 1');
    await shot('disliked-selected');
    await tap('#actionbar [data-act="primary"]', 'Дальше (disliked)');
    info = await screenInfo();
  }
  // ---------- why_not ----------
  if (info.step === 'why_not') {
    await sleep(1500);
    await shot('why-not');
    info = await record('why-not');
    await textCheck('why-not');
    const groups = page.locator('#qbody .cgroup');
    const c0 = groups.nth(0).locator('.chip');
    if (await c0.count()) await tap(c0.nth(0), 'complaint 1');
    if (await c0.count() > 1) await tap(c0.nth(1), 'complaint 2');
    const c1 = groups.nth(1).locator('.chip');
    if (await c1.count()) await tap(c1.nth(0), 'category 1');
    await shot('why-not-selected');
    await record('why-not-selected');
    await tap('#actionbar [data-act="primary"]', 'Дальше (why_not)');
    const t = await screenInfo();
    if (t.title.includes('не терпишь')) {
      await shot('why-not-ask-hard');
      await record('why-not-ask-hard');
      const rows = page.locator('.ask-list [data-act="c-ask"]');
      await tap(rows.nth(0), 'никогда row 1');
      await shot('why-not-ask-hard-selected');
      await tap('#actionbar [data-act="primary"]', 'Дальше (ask hard)');
    }
    info = await screenInfo();
  }

  // ---------- today ----------
  if (info.step === 'today') {
    await shot('today');
    info = await record('today');
    const moods = page.locator('.content .chips').nth(0).locator('.chip');
    await tap(moods.nth(0), 'mood 1');
    const avoid = page.locator('.content .chips').nth(1).locator('.chip');
    if (await avoid.count()) await tap(avoid.nth(0), 'avoid 1');
    await shot('today-selected');
    await tap('#actionbar [data-act="primary"]', 'Дальше (today)');
    info = await screenInfo();
  }

  // ---------- playback ----------
  if (info.step === 'playback') {
    await shot('playback');
    info = await record('playback');
    await textCheck('playback');
    const removes = page.locator('[data-act="remove"]');
    if (await removes.count()) {
      await tap(removes.nth(0), 'Убрать (first line)');
      await shot('playback-after-remove');
      await record('playback-after-remove');
    }
    // back test from playback
    await tap('#back-btn', 'Назад (from playback)');
    await shot('playback-back');
    await record('playback-back');
    const t = await screenInfo();
    if (t.step === 'playback') { /* remove is a step; back returned to pre-remove playback */ }
    else await tap('#actionbar [data-act="primary"]', 'Дальше (return to playback)');
    await tap('#actionbar [data-act="primary"]', 'Да, подбирай');
    info = await screenInfo();
  }

  // ---------- result ----------
  await sleep(3000);
  await shot('result');
  await shot('result-full', { full: true });
  info = await record('result');
  await textCheck('result');
  const resultText = await page.evaluate(() => ({
    hero: document.querySelector('.hero')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 500),
    alts: [...document.querySelectorAll('.alt')].map((a) => a.textContent.replace(/\s+/g, ' ').trim().slice(0, 160)),
    fork: document.querySelector('.fork')?.textContent.replace(/\s+/g, ' ').trim(),
    sieves: document.querySelector('.sieves')?.textContent.replace(/\s+/g, ' ').trim(),
    detail: (document.querySelector('#inspector .detail') ?? document.querySelector('#detail-inline .detail'))?.textContent.replace(/\s+/g, ' ').trim().slice(0, 2500),
  }));
  log.notes.push(`[result] ${JSON.stringify(resultText)}`);

  if (info.step === 'result') {
    // detail on phone is inline; scroll to it
    if (width === 390) {
      await page.locator('#detail-inline').scrollIntoViewIfNeeded().catch(() => {});
      await sleep(500);
      await shot('result-detail-inline');
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    // fork
    if (await page.locator('.fork').count()) {
      await tap('.fork .seg', 'fork option 1');
      await sleep(1500);
      await shot('result-after-fork');
      await record('result-after-fork');
    }
    // alternative
    const alts = page.locator('.alt');
    if (await alts.count()) {
      await tap(alts.nth(0), 'alt 1');
      await sleep(800);
      await shot('result-alt-focused');
      if (width === 390) { await page.locator('#detail-inline').scrollIntoViewIfNeeded().catch(() => {}); await sleep(400); await shot('result-alt-detail-inline'); }
      await tap('.hero', 'hero (back to top pick)');
    }
    // В Моё
    await tap('[data-act="take"]:visible', 'В Моё');
    await shot('result-after-take');
    // Уже играл/смотрел
    await tap('[data-act="played"]:visible', 'Уже играл/смотрел');
    await shot('result-played-ask');
    await tap('[data-act="reaction"][data-r="like"]:visible', 'Понравилось');
    await sleep(2000);
    await shot('result-after-played');
    await record('result-after-played');
    // Не сейчас
    await tap('[data-act="not-now"]:visible', 'Не сейчас');
    await sleep(2000);
    await shot('result-after-notnow');
    await record('result-after-notnow');
    // Почему не показал
    const why = page.locator('#search-why');
    await why.scrollIntoViewIfNeeded();
    await why.fill(WHYNOT[domain]);
    log.taps++;
    await sleep(1200);
    await shot('whynot-search');
    const wopts = page.locator('#suggest-why .opt');
    if (await wopts.count()) {
      await tap(wopts.first(), 'whynot result');
      await sleep(1500);
      await page.locator('#whynot-out').scrollIntoViewIfNeeded();
      await shot('whynot-answer');
      const out = await page.locator('#whynot-out').textContent();
      log.notes.push(`[whynot "${WHYNOT[domain]}"] ${out.replace(/\s+/g, ' ').trim()}`);
    } else {
      log.notes.push(`[whynot "${WHYNOT[domain]}"] no suggestions`);
      await page.keyboard.press('Escape');
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    // sidebar taste
    if (width === 390) { await tap('#menu-btn', 'menu'); await shot('drawer-at-result'); await tap('#sidebar-close', 'close'); }
    // Back from result
    await tap('#back-btn', 'Назад (from result)');
    await shot('result-back');
    await record('result-back');
    await tap('#actionbar [data-act="primary"]', 'Да, подбирай (again)');
    await sleep(2500);
    await shot('result-again');
    await record('result-again');
  }

  // ---------- Заново ----------
  await tap('#restart-btn', 'Заново');
  await sleep(400);
  await shot('restart-dialog');
  await tap('#confirm [value="cancel"]', 'Отмена');
  await tap('#restart-btn', 'Заново');
  await tap('#confirm-ok', 'Начать заново (ok)');
  await shot('after-restart');
  await record('after-restart');

  // ---------- Моё ----------
  await page.goto(`${BASE}/pick/#my`, { waitUntil: 'networkidle' });
  await sleep(1500);
  await shot('my');
  await record('my');
  const tabs = page.locator('.my-tabs .seg');
  const tn = await tabs.count();
  const tabNames = await tabs.allTextContents();
  log.notes.push(`[my tabs] ${tabNames.map((t) => t.replace(/\s+/g, ' ').trim()).join(' | ')}`);
  for (let i = 0; i < tn; i++) {
    await tap(page.locator('.my-tabs .seg').nth(i), `my tab ${i + 1}`);
    await shot(`my-tab-${i + 1}`);
    await record(`my-tab-${i + 1}`);
  }
  await tap(page.locator('.my-tabs .seg').nth(0), 'my tab all');
  // select, move, remove, undo
  if (await page.locator('.my-row').count()) {
    await tap('.my-row [data-act="my-select"]', 'my select');
    await shot('my-selected');
    const liked = page.locator('[data-act="my-liked"]');
    if (await liked.count()) { await tap(liked.first(), 'my: Зашло'); await shot('my-after-liked'); await record('my-after-liked'); }
    await tap('[data-act="my-remove"]', 'my: Убрать');
    await shot('my-after-remove');
    await record('my-after-remove');
    if (await page.locator('[data-act="my-undo"]').count()) { await tap('[data-act="my-undo"]', 'Вернуть'); await shot('my-after-undo'); await record('my-after-undo'); }
  }
  await tap('#back-btn', 'Назад (from my)');
  await shot('my-back');
  await record('my-back');
} catch (err) {
  log.notes.push(`ERROR: ${err.stack}`);
  await shot('error').catch(() => {});
} finally {
  fs.writeFileSync(path.join(dir, 'log.json'), JSON.stringify(log, null, 2));
  console.log(`done ${run}: ${log.shots.length} shots, ${log.screens.length} screens, ${log.taps} taps, errors=${log.consoleErrors.length}`);
  console.log(log.notes.filter((n) => n.startsWith('ERROR')).join('\n'));
  await browser.close();
}
