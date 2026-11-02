// UX walkthrough "b": films and series, desktop/phone, light/dark.
// usage: node b-walk.mjs <domain> <width> <height> <scheme> <mode:full|min> <tag>
import { chromium } from 'file:///C:/Users/Dusik/AppData/Local/Temp/claude/E--project-TASTIQ/316e07fd-614b-4eb4-a3ec-2c92111b7da4/scratchpad/pw-lib/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const [domain = 'film', W = '1440', H = '900', scheme = 'light', mode = 'full', tagArg] = process.argv.slice(2);
const tag = tagArg ?? `${domain}-${W}x${H}-${scheme}-${mode}`;
const BASE = 'http://localhost:5173';
const shotDir = path.join('C:/Users/Dusik/AppData/Local/Temp/claude/E--project-TASTIQ/316e07fd-614b-4eb4-a3ec-2c92111b7da4/scratchpad/shots/b', tag);
fs.mkdirSync(shotDir, { recursive: true });
const phone = Number(W) < 700;

const SEARCH = { film: 'матрица', series: 'во все тяжкие' };
const WHY_SEARCH = { film: 'начало', series: 'игра престолов' };
const FREE = { film: 'за атмосферу и неожиданные повороты, но затянуто', series: 'за персонажей и юмор, но много воды' };

const log = { tag, domain, W, H, scheme, mode, screens: [], taps: 0, consoleErrors: [], failedRequests: [], notes: [] };
let n = 0;

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: Number(W), height: Number(H) }, colorScheme: scheme, locale: 'ru-RU', deviceScaleFactor: 1, isMobile: phone, hasTouch: phone });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') log.consoleErrors.push(m.text()); });
page.on('requestfailed', (r) => log.failedRequests.push(`${r.method()} ${r.url()} ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400) log.failedRequests.push(`${r.status()} ${r.url()}`); });

const note = (s) => { log.notes.push(s); console.log('NOTE', s); };
async function settle(ms = 200) {
  await page.waitForFunction(() => !document.body.classList.contains('is-busy'), null, { timeout: 40000 }).catch(() => note('settle timeout'));
  await page.waitForTimeout(ms);
}
async function dump(label) {
  return page.evaluate((label) => {
    const t = (sel) => [...document.querySelectorAll(sel)].filter((e) => e.offsetParent !== null || e.closest('dialog[open]')).map((e) => e.textContent.replace(/\s+/g, ' ').trim());
    return {
      label,
      url: location.href,
      toolbar: document.querySelector('#toolbar-title')?.textContent.trim() ?? null,
      title: document.querySelector('#q-title')?.textContent.trim() ?? null,
      hint: t('.q-hint'),
      groupTitles: t('.group-title'),
      chips: t('.chips .chip'),
      rowLabels: t('.row-label'),
      cards: t('.pcard-title'),
      actionbar: t('#actionbar button'),
      toolbarBtns: t('#toolbar button'),
      stepsSummary: document.querySelector('.steps-sum')?.textContent.trim() ?? null,
      taste: document.querySelector('#side-taste')?.innerText.replace(/\s+/g, ' ').trim() ?? null,
      inspector: (document.querySelector('#inspector')?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 1500),
      hero: document.querySelector('.hero')?.innerText.replace(/\s+/g, ' ').trim() ?? null,
      alts: t('.alt'),
      sieves: t('.sieves .row'),
      fork: document.querySelector('.fork')?.innerText.replace(/\s+/g, ' ').trim() ?? null,
      content: (document.querySelector('#content')?.innerText ?? '').replace(/[ \t]+/g, ' ').trim().slice(0, 6000),
      scrollH: document.documentElement.scrollHeight,
      contentScrollH: document.querySelector('#content')?.scrollHeight ?? null,
      contentClientH: document.querySelector('#content')?.clientHeight ?? null,
      hasHScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      dialog: document.querySelector('dialog[open]')?.innerText.replace(/\s+/g, ' ').trim() ?? null,
      state: (() => { try { const s = JSON.parse(localStorage.getItem('tastiq.site')); return s ? { step: s.step, liked: s.liked, disliked: s.disliked, whyIndex: s.whyIndex, genres: s.genres } : null; } catch { return null; } })(),
    };
  }, label);
}
async function shot(name, { full = false, wait = 0 } = {}) {
  if (wait) await page.waitForTimeout(wait);
  n++;
  const file = path.join(shotDir, `${String(n).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file, fullPage: full });
  const d = await dump(name);
  d.shot = file;
  d.taps = log.taps;
  log.screens.push(d);
  console.log(`[${n}] ${name} :: step=${d.state?.step} title=${JSON.stringify(d.title)} taps=${log.taps}`);
  return d;
}
async function tap(locator, what, { settleAfter = true } = {}) {
  const loc = typeof locator === 'string' ? page.locator(locator).first() : locator;
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await loc.click({ timeout: 10000 });
  log.taps++;
  if (settleAfter) await settle();
  return loc;
}
const step = async () => (await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('tastiq.site'))?.step; } catch { return null; } }));
const primary = () => page.locator('#actionbar [data-act="primary"]');
const visible = (sel) => page.locator(sel).locator('visible=true').first();

try {
  // ---- landing
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await shot('landing', { wait: 2500 });
  await shot('landing-full', { full: true });
  await tap(`.door[data-domain="${domain}"]`, 'door', { settleAfter: false });
  await page.waitForSelector('#q-title', { timeout: 30000 });
  await settle();
  await shot('genres', { wait: 800 });
  if (mode === 'full' && !phone) {
    await tap('[data-act="steps"]', 'steps toggle');
    await shot('genres-steps-open');
  }
  if (mode === 'full' && phone) {
    await tap('#menu-btn', 'menu');
    await shot('genres-drawer');
    await tap('#sidebar-close', 'close drawer');
  }

  // ---- genres
  const chips = page.locator('.chips .chip');
  const nChips = await chips.count();
  const pickIdx = mode === 'full' ? [0, 2] : [0];
  for (const i of pickIdx) if (i < nChips) await tap(chips.nth(i), 'genre chip', { settleAfter: false });
  await shot('genres-selected');
  await tap(primary(), 'Дальше (genres)');

  // ---- liked
  await shot('liked', { wait: 3000 });
  if (mode === 'full') await shot('liked-full', { full: true });
  const cards = page.locator('.pcard');
  await tap(cards.nth(0), 'card 1', { settleAfter: false });
  await tap(cards.nth(1), 'card 2', { settleAfter: false });
  if (mode === 'full') {
    // search own title
    await page.fill('#search-pick', SEARCH[domain]);
    log.taps++;
    await page.waitForSelector('#suggest-pick:not([hidden]) .opt', { timeout: 8000 }).catch(() => note('search: no suggestions appeared'));
    await shot('liked-search-suggest', { wait: 1200 });
    const opt = page.locator('#suggest-pick .opt').first();
    if (await opt.count()) await tap(opt, 'search opt', { settleAfter: false });
    await shot('liked-after-search', { wait: 600 });
    // show others
    await tap('[data-act="more"]', 'Показать другие');
    await shot('liked-more', { wait: 2500 });
    if (phone) await shot('liked-more-full', { full: true });
  }
  await shot('liked-selected');
  await tap(primary(), 'Дальше (liked)');

  // ---- why loop
  let whyN = 0;
  while ((await step()) === 'why' && whyN < 5) {
    whyN++;
    await shot(`why-${whyN}`, { wait: 1200 });
    if (mode === 'full' && phone && whyN === 1) await shot(`why-${whyN}-full`, { full: true });
    const wchips = page.locator('#qbody .chips .chip');
    const wc = await wchips.count();
    if (mode === 'full' && whyN === 1) {
      if (wc > 0) await tap(wchips.nth(0), 'why chip 1', { settleAfter: false });
      if (wc > 1) await tap(wchips.nth(1), 'why chip 2', { settleAfter: false });
      // free text
      await tap('summary[data-fk="freetext"]', 'open freetext', { settleAfter: false });
      await page.fill('#free', FREE[domain]);
      log.taps++;
      await shot(`why-${whyN}-freetext-typed`);
      await tap('[data-fk="parse"]', 'Разобрать', { settleAfter: false });
      await page.waitForFunction(() => { const p = document.querySelector('#parsed'); return p && p.textContent && !/Разбираю/.test(p.textContent); }, null, { timeout: 15000 }).catch(() => note('parse: no result'));
      await shot(`why-${whyN}-parsed`, { wait: 300 });
      const add = page.locator('.chip-add').first();
      if (await add.count()) { await tap(add, 'add parsed', { settleAfter: false }); await shot(`why-${whyN}-added`); }
      await shot(`why-${whyN}-full`, { full: true });
      await tap(primary(), 'Дальше (why 1)');
      // if the "никогда" question appeared (issues were added), answer it
      if (await page.locator('.ask-list').count()) {
        await shot(`why-${whyN}-ask-never`);
        await tap('.ask-none [data-act="c-ask"]', 'Ничего из этого', { settleAfter: false });
        await tap(primary(), 'Дальше (ask)');
      }
    } else if (mode === 'full' && whyN === 2) {
      if (wc > 0) await tap(wchips.nth(0), 'why chip', { settleAfter: false });
      await tap('[data-act="love"]', 'Обожаю', { settleAfter: false });
      await shot(`why-${whyN}-love`);
      await tap(primary(), 'Дальше (why 2)');
    } else if (mode === 'full') {
      await tap('[data-act="skip"]', 'Не знаю');
    } else {
      if (wc > 0) await tap(wchips.nth(0), 'why chip', { settleAfter: false });
      await tap(primary(), 'Дальше (why)');
    }
  }

  // ---- disliked
  if ((await step()) === 'disliked') {
    await shot('disliked', { wait: 2500 });
    if (mode === 'full') {
      await tap(page.locator('.pcard').nth(0), 'dislike card', { settleAfter: false });
      await shot('disliked-selected');
      await tap(primary(), 'Дальше (disliked)');
    } else {
      await tap('[data-act="skip"]', 'Ничего такого');
    }
  }

  // ---- why_not loop
  let wnN = 0;
  while ((await step()) === 'why_not' && wnN < 3) {
    wnN++;
    await shot(`whynot-${wnN}`, { wait: 1000 });
    if (phone) await shot(`whynot-${wnN}-full`, { full: true });
    const groups = page.locator('[data-cgroup]');
    const c1 = groups.nth(0).locator('.chip');
    if (await c1.count()) await tap(c1.nth(0), 'complaint 1', { settleAfter: false });
    const cat = page.locator('[data-cgroup="categories"] .chip');
    if (await cat.count()) await tap(cat.nth(0), 'category', { settleAfter: false });
    await shot(`whynot-${wnN}-selected`);
    await tap(primary(), 'Дальше (whynot)', { settleAfter: false });
    await page.waitForTimeout(300);
    if (await page.locator('.ask-list').count()) {
      await shot(`whynot-${wnN}-ask-never`);
      if (wnN === 1) {
        // test back to marks
        await tap('[data-act="c-back"]', 'Назад к отметкам', { settleAfter: false });
        await shot(`whynot-${wnN}-back-to-marks`);
        await tap(primary(), 'Дальше again', { settleAfter: false });
        await page.waitForTimeout(300);
      }
      const first = page.locator('.ask-list [data-act="c-ask"]').first();
      await tap(first, 'never: first', { settleAfter: false });
      await shot(`whynot-${wnN}-never-selected`);
      await tap(primary(), 'Дальше (ask never)');
    } else {
      await settle();
    }
  }

  // ---- today
  if ((await step()) === 'today') {
    await shot('today', { wait: 500 });
    if (phone) await shot('today-full', { full: true });
    if (mode === 'full') {
      const moods = page.locator('[aria-label="Настроение"] .chip');
      if (await moods.count()) await tap(moods.nth(1), 'mood', { settleAfter: false });
      const avoid = page.locator('[aria-label="Сегодня не хочется"] .chip');
      if (await avoid.count()) await tap(avoid.nth(0), 'avoid', { settleAfter: false });
      await shot('today-selected');
      await tap(primary(), 'Дальше (today)');
    } else {
      await tap('[data-act="skip"]', 'Пропустить (today)');
    }
  }

  // ---- playback
  if ((await step()) === 'playback') {
    await shot('playback', { wait: 500 });
    await shot('playback-full', { full: true });
    if (mode === 'full') {
      const rm = page.locator('[data-act="remove"]').first();
      if (await rm.count()) { await tap(rm, 'Убрать line'); await shot('playback-removed'); }
      // back
      await tap('#back-btn', 'Назад');
      await shot('back-from-playback', { wait: 500 });
      // reload mid-dialogue
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector('#q-title', { timeout: 30000 });
      await settle(600);
      await shot('after-reload', { wait: 1500 });
      // move forward again to playback
      if ((await step()) === 'today') {
        if (await primary().isEnabled()) await tap(primary(), 'Дальше (today again)'); else await tap('[data-act="skip"]', 'Пропустить');
      } else if ((await step()) === 'why_not') {
        await tap('[data-act="skip"]', 'skip');
      }
      let guard = 0;
      while ((await step()) !== 'playback' && guard++ < 6) {
        const s = await step();
        note(`after reload at step ${s}, pushing forward`);
        if (await page.locator('[data-act="skip"]').count()) await tap('[data-act="skip"]', 'skip'); else await tap(primary(), 'primary');
      }
      await shot('playback-again');
    }
    await tap(primary(), 'Да, подбирай');
  }

  // ---- result
  await shot('result', { wait: 3000 });
  await shot('result-full', { full: true });
  if (mode === 'full') {
    const fork = page.locator('.fork .seg');
    if (await fork.count()) {
      note('fork question shown');
      await tap(fork.nth(0), 'fork option 1');
      await shot('result-after-fork', { wait: 2000 });
    } else note('no fork question on result');
    // alternative
    const alt = page.locator('.alt').first();
    if (await alt.count()) { await tap(alt, 'alt card', { settleAfter: false }); await shot('result-alt-focused', { wait: 1500 }); if (phone) await shot('result-alt-focused-full', { full: true }); }
    // В Моё
    const take = visible('[data-act="take"]');
    if (await take.count()) { await tap(take, 'В Моё', { settleAfter: false }); await shot('result-taken', { wait: 400 }); }
    // Уже смотрел
    const played = visible('[data-act="played"]');
    if (await played.count()) {
      await tap(played, 'Уже смотрел', { settleAfter: false });
      await shot('result-played-ask', { wait: 300 });
      const like = visible('[data-act="reaction"][data-r="like"]');
      if (await like.count()) { await tap(like, 'Понравилось'); await shot('result-after-played', { wait: 2000 }); }
    }
    // Не сейчас
    const nn = visible('[data-act="not-now"]');
    if (await nn.count()) { await tap(nn, 'Не сейчас'); await shot('result-after-notnow', { wait: 2000 }); }
    // Почему не показал
    const why = page.locator('#search-why');
    if (await why.count()) {
      await why.scrollIntoViewIfNeeded();
      await page.fill('#search-why', WHY_SEARCH[domain]);
      log.taps++;
      await page.waitForSelector('#suggest-why:not([hidden]) .opt', { timeout: 8000 }).catch(() => note('why search: no suggestions'));
      await shot('result-why-suggest', { wait: 800 });
      const o = page.locator('#suggest-why .opt').first();
      if (await o.count()) {
        await tap(o, 'why opt', { settleAfter: false });
        await page.waitForSelector('#whynot-out .whynot-card', { timeout: 15000 }).catch(() => note('whynot: no card'));
        await shot('result-whynot', { wait: 300 });
      }
    }
    await shot('result-end-full', { full: true });
    // back from result
    await tap('#back-btn', 'Назад from result');
    await shot('back-from-result', { wait: 500 });
    // forward again then restart
    await tap(primary(), 'Да, подбирай again');
    await shot('result-again', { wait: 2000 });
    await tap('#restart-btn', 'Заново', { settleAfter: false });
    await page.waitForTimeout(300);
    await shot('restart-dialog');
    await tap('#confirm-ok', 'confirm restart');
    await shot('after-restart', { wait: 800 });
    // domain screen via /pick/
    await page.goto(`${BASE}/pick/`, { waitUntil: 'load' });
    await page.waitForSelector('#q-title', { timeout: 30000 });
    await settle(500);
    await shot('pick-domain-screen');
    // brand → landing
    await tap('a.brand', 'brand → landing', { settleAfter: false });
    await page.waitForSelector('#doors', { timeout: 30000 });
    await shot('landing-return', { wait: 2000 });
    // landing → Моё
    await tap('#my-link', 'Моё from landing', { settleAfter: false });
    await page.waitForSelector('#q-title', { timeout: 30000 });
    await shot('my', { wait: 1500 });
    await shot('my-full', { full: true });
    const tabs = page.locator('[data-act="my-tab"]');
    for (let i = 0; i < (await tabs.count()); i++) { await tap(tabs.nth(i), `my tab ${i}`, { settleAfter: false }); await shot(`my-tab-${i}`, { wait: 300 }); }
    await tap('#back-btn', 'К подбору', { settleAfter: false });
    await shot('my-back-to-pick', { wait: 500 });
  }
} catch (err) {
  note(`ERROR: ${err.stack ?? err}`);
  await page.screenshot({ path: path.join(shotDir, `ERR-${n + 1}.png`) }).catch(() => {});
} finally {
  fs.writeFileSync(path.join(shotDir, 'log.json'), JSON.stringify(log, null, 2));
  console.log(`TAPS=${log.taps} SCREENS=${log.screens.length} consoleErrors=${log.consoleErrors.length} failedRequests=${log.failedRequests.length}`);
  await browser.close();
}
