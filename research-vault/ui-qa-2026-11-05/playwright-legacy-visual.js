async (page) => {
  const evidence = [];
  const output = '.playwright-mcp/ui-visual-2026-11-05/raw';
  for (const viewport of [{ width: 320, height: 640 }, { width: 1440, height: 900 }]) {
    const touch = viewport.width === 320;
    const context = await page.context().browser().newContext({
      viewport, isMobile: touch, hasTouch: touch, deviceScaleFactor: 1
    });
    try {
      const legacy = await context.newPage();
      const errors = [];
      legacy.on('pageerror', error => errors.push(error.message));
      const press = target => touch ? target.tap({ timeout: 4500 }) : target.click({ timeout: 4500 });
      const wait = selector => legacy.locator(selector).first().waitFor({ timeout: 8000 });
      const shot = async stage => {
        await legacy.evaluate(() => scrollTo(0, 0));
        await legacy.screenshot({
          path: output + '/legacy-final-' + stage + '-' + viewport.width + '.png',
          fullPage: true, animations: 'disabled'
        });
      };
      const artwork = async selector => {
        const images = legacy.locator(selector);
        await images.evaluateAll(items => items.forEach(image => image.loading = 'eager'));
        return images.evaluateAll(async items => {
          await Promise.race([
            Promise.allSettled(items.map(image => image.decode())),
            new Promise(resolve => setTimeout(resolve, 5000))
          ]);
          return items.filter(image => image.naturalWidth > 0).map(image => {
            const frame = image.parentElement;
            const blur = frame.querySelector('.p-bg');
            return {
              ratio: image.naturalWidth / image.naturalHeight,
              fit: getComputedStyle(image).objectFit,
              background: getComputedStyle(frame).backgroundColor,
              blurHidden: !blur || getComputedStyle(blur).display === 'none'
            };
          });
        });
      };

      await legacy.goto('http://127.0.0.1:5196/pick/?legacy=1&qa_run=off');
      await press(legacy.locator('#side-domains [data-v=series]'));
      for (const step of ['time', 'company']) {
        const selector = 'body[data-legacy-step=' + step + '] .legacy-answer-list button';
        await wait(selector);
        await press(legacy.locator(selector).first());
      }
      await wait('.acard .react');
      const taste = await artwork('.acard > .poster > .p-img');
      await shot('taste');
      const reactions = await legacy.locator('.acard .react').evaluateAll(buttons => ({
        count: buttons.length,
        minHeight: Math.min(...buttons.map(button => button.getBoundingClientRect().height)),
        overflow: Math.max(0, ...buttons.map(button => button.getBoundingClientRect().right
          - button.closest('.acard').getBoundingClientRect().right)),
        normalLineCounts: buttons.filter(button => button.textContent === 'нормально').map(button => {
          const range = document.createRange();
          range.selectNodeContents(button);
          return range.getClientRects().length;
        })
      }));
      await press(legacy.getByRole('button', { name: 'не видел', exact: true }).first());
      await wait('.acard .react[aria-pressed=true]');
      for (let attempt = 0; attempt < 6 && !await legacy.locator('.conversation-proposal').count(); attempt++) {
        if (await legacy.locator('.legacy-thinking').isVisible()) break;
        const primary = legacy.locator('#actionbar [data-act=primary]:enabled').first();
        await press(await primary.count() ? primary : legacy.locator('.legacy-answer-list button:enabled').first());
        await legacy.waitForTimeout(200);
      }
      await wait('.conversation-proposal');
      const result = await artwork('.conversation-proposal > .poster > .p-img');
      await shot('result');
      const details = legacy.locator('.conversation-proposal-details').first();
      await press(details.locator(':scope > summary'));
      if (await details.getAttribute('open') === null) throw Error('Facts did not open');
      const overflow = await legacy.evaluate(() =>
        Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
      if (!taste.some(image => image.ratio > 1) || !taste.some(image => image.ratio < 1)
        || !result.length || [...taste, ...result].some(image => image.fit !== 'contain'
          || image.background !== 'rgba(0, 0, 0, 0)' || !image.blurHidden)
        || reactions.count !== 32 || reactions.overflow || reactions.normalLineCounts.some(count => count !== 1)
        || touch && reactions.minHeight < 44 || overflow || errors.length) {
        throw Error(JSON.stringify({ viewport, reactions, taste, result, overflow, errors }));
      }
      evidence.push({ viewport, touch, reactions, taste, result, factsOpened: true, overflow, errors });
    } finally {
      await context.close();
    }
  }
  return evidence;
}
