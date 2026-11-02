// Walks the real UI as persona 1 (series) and persona 2 (cartoon) and screenshots every screen.
// Usage: node series-cartoons-shots.mjs <shotsDir>
import { chromium } from 'file:///C:/Users/Dusik/AppData/Local/Temp/claude/E--project-TASTIQ/316e07fd-614b-4eb4-a3ec-2c92111b7da4/scratchpad/pw-lib/node_modules/playwright-core/index.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
mkdirSync(dir, { recursive: true });
const b = await chromium.launch({ channel: 'chrome' });

async function walk(label, viewport, persona) {
  const ctx = await b.newContext({ viewport, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  let n = 0;
  const shot = async (name) => { n++; const f = join(dir, `series-cartoons-${label}-${String(n).padStart(2, '0')}-${name}.png`); await p.screenshot({ path: f, fullPage: true }); console.log('shot', f); };
  const clickText = async (text, exact = true) => { await p.getByRole('button', { name: text, exact }).first().click(); await p.waitForTimeout(500); };
  const next = async () => { await p.locator('[data-act="primary"]').first().click(); await p.waitForTimeout(900); };
  const title = async () => (await p.locator('#q-title').first().textContent().catch(() => '')) ?? '';
  try {
    await p.goto('http://localhost:5173/');
    await p.waitForTimeout(800);
    await shot('landing');
    await p.goto(`http://localhost:5173/pick/?start=${persona.domain}`);
    await p.waitForTimeout(1200);
    await shot('genres');
    for (const g of persona.genres) await clickText(g);
    await next();
    await shot('liked');
    // Mark known liked titles that are on screen (by card title text); page through up to 3 pages.
    let marked = 0;
    for (let page = 0; page < 3 && marked < 3; page++) {
      for (const t of persona.liked) {
        const card = p.locator('button.pcard').filter({ hasText: t }).first();
        if (await card.count() && marked < 3) { await card.click(); marked++; await p.waitForTimeout(200); }
      }
      if (marked < 3 && page < 2) { await p.locator('[data-act="more"]').first().click(); await p.waitForTimeout(900); }
    }
    // Search for one own title through the UI search box.
    if (marked < 3 && persona.search) {
      const input = p.locator('[data-search-input]').first();
      await input.fill(persona.search);
      await p.waitForTimeout(900);
      await shot('liked-search');
      const opt = p.locator('#suggest-' + (await input.getAttribute('data-search-input'))).locator('[role="option"], button').first();
      if (await opt.count()) { await opt.click(); marked++; await p.waitForTimeout(400); }
    }
    await shot('liked-marked');
    await next();
    // why screens (up to 3)
    for (let i = 0; i < 3; i++) {
      const t = await title();
      if (!t.startsWith('За что')) break;
      await shot(`why${i + 1}`);
      let ticked = 0;
      for (const label of persona.reasons) {
        const chip = p.locator('button.chip').filter({ hasText: label }).first();
        if (await chip.count() && ticked < 3) { await chip.click(); ticked++; await p.waitForTimeout(150); }
      }
      if (i === 0) { const love = p.locator('[data-act="love"]').first(); if (await love.count()) await love.click(); }
      if (i === 0) await shot(`why${i + 1}-ticked`);
      await next();
    }
    if ((await title()).startsWith('А что не зашло')) {
      await shot('disliked');
      let picked = 0;
      for (const t of persona.disliked) {
        const card = p.locator('button.pcard').filter({ hasText: t }).first();
        if (await card.count() && picked < 1) { await card.click(); picked++; }
      }
      if (!picked && persona.dislikeSearch) {
        const input = p.locator('[data-search-input]').first();
        await input.fill(persona.dislikeSearch);
        await p.waitForTimeout(900);
        const opt = p.locator('.suggest').locator('[role="option"], button').first();
        if (await opt.count()) { await opt.click(); picked++; await p.waitForTimeout(400); }
      }
      if (picked) await next(); else await p.locator('[data-act="skip"]').first().click();
      await p.waitForTimeout(800);
    }
    for (let i = 0; i < 2; i++) {
      const t = await title();
      if (!t.startsWith('Что не понравилось')) break;
      await shot(`whynot${i + 1}`);
      for (const label of persona.issues) {
        const chip = p.locator('button.chip').filter({ hasText: label }).first();
        if (await chip.count()) { await chip.click(); await p.waitForTimeout(150); }
      }
      await shot(`whynot${i + 1}-ticked`);
      await next();
      // «никогда» is a second screen after Дальше: tick the hard one (or «Ничего из этого»), then Дальше.
      if (await p.locator('[data-act="c-ask"]').count()) {
        await shot(`whynot${i + 1}-hard`);
        const hardRow = p.locator('[data-act="c-ask"]').filter({ hasText: persona.hard }).first();
        if (await hardRow.count()) await hardRow.click(); else await p.locator('[data-act="c-ask"][data-v=""]').first().click();
        await p.waitForTimeout(300);
        await shot(`whynot${i + 1}-hard-ticked`);
        await next();
      }
    }
    if ((await title()).startsWith('Что сегодня')) {
      await shot('today');
      for (const label of persona.today) { const chip = p.locator('button.chip').filter({ hasText: label }).first(); if (await chip.count()) await chip.click(); }
      await shot('today-ticked');
      await next();
    }
    if ((await title()).startsWith('Вот как я тебя вижу')) { await shot('playback'); await next(); await p.waitForTimeout(1500); }
    await shot('result');
    // Scroll down for alternatives, fork and "почему не"
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await p.waitForTimeout(300);
    // why-not lookup for a target
    const why = p.locator('[data-search-input="why"]').first();
    if (await why.count() && persona.whyQuery) {
      await why.fill(persona.whyQuery);
      await p.waitForTimeout(900);
      const opt = p.locator('#suggest-why').locator('[role="option"], button').first();
      if (await opt.count()) { await opt.click(); await p.waitForTimeout(900); }
      await shot('result-whynot');
    }
    await p.goto('http://localhost:5173/pick/#my');
    await p.waitForTimeout(1000);
    await shot('my');
  } catch (e) {
    console.error(label, 'ERROR', e.message);
    await shot('error');
  }
  await ctx.close();
}

const lena = { domain: 'series', genres: ['комедии'], liked: ['Друзья', 'Офис', 'Как я встретил вашу маму', 'В лучшем мире', 'Теория большого взрыва', 'Бруклин 9-9', 'Американская семейка'], search: 'Парки и зоны', reasons: ['смешно', 'тёплое, доброе', 'дружба', 'много героев'], disliked: ['Игра престолов', 'Во все тяжкие'], dislikeSearch: 'Игра престолов', issues: ['много крови', 'всё время на нервах', 'тяжёлое, мрачное'], hard: 'много крови', today: ['Хочу расслабиться', 'Фоном, не вникая', 'Без жестокости'], whyQuery: 'Superstore' };
const andrey = { domain: 'cartoon', genres: ['семейное', 'комедии'], liked: ['История игрушек', 'Головоломка', 'Зверополис', 'В поисках Немо', 'Шрек', 'Гадкий я'], search: 'Зверополис', reasons: ['для всей семьи', 'смешно', 'тёплое, доброе'], disliked: ['Коралина', 'Кошмар перед Рождеством'], dislikeSearch: 'Коралина', issues: ['страшно', 'тяжёлое, мрачное'], hard: 'страшно', today: ['Смотрю с детьми', 'Хочу посмеяться', 'Ничего страшного'], whyQuery: 'Клаус' };

await walk('lena-phone', { width: 390, height: 844 }, lena);
await walk('andrey-desktop', { width: 1280, height: 800 }, andrey);
await b.close();
