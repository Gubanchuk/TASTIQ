async (page, config = {}) => {
  const set = config.set ?? 'before';
  const widths = config.widths ?? [360];
  const domains = config.domains ?? ['game'];
  const base = 'http://127.0.0.1:5196';
  const root = 'E:/project/TASTIQ/research-vault/mobile-spacing-2026-11-05';
  const results = [], errors = [];
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  const idle = () => page.waitForFunction(() => document.querySelector('#main')?.getAttribute('aria-busy') === 'false');
  const action = name => page.locator('[data-act="' + name + '"]').first();
  const rects = async selectors => page.evaluate(selectors => Object.fromEntries(selectors.map(sel => {
    const el = document.querySelector(sel);
    return [sel, el ? { ...el.getBoundingClientRect().toJSON(), padding: getComputedStyle(el).padding, marginLeft: getComputedStyle(el).marginLeft } : null];
  })), selectors);
  const record = (name, pass, detail) => results.push({name, pass, detail});
  const shot = async name => {
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({path:root + '/' + set + '-' + name + '.png', fullPage:false, animations:'disabled'});
  };
  const place = async selector => page.locator(selector).first().evaluate(el => {
    scrollTo(0, scrollY + el.getBoundingClientRect().top - (document.querySelector('.app-shell')?.offsetHeight ?? 0) - 12);
  });
  try {
    for (const width of widths) for (const domain of domains) {
      await page.setViewportSize({width, height:width <= 760 ? 740 : 900});
      const run = 'spacing_' + set + '_' + width + '_' + domain + '_' + Date.now();
      const route = domain === 'game' ? '/pick/game/?' : '/pick/watch/?domain=' + domain + '&';
      await page.goto(base + route + 'qa_run=' + run);
      await page.locator('[data-first-next]').waitFor();
      await page.locator('#answer-form [data-act=option]').first().click();
      await page.locator('[data-first-next]').click(); await idle();
      for (let step = 0; step < 8 && !await action('confirm').count(); step++) {
        if (await page.locator('#answer-form [data-act=option]').count()) {
          await page.locator('#answer-form [data-act=option]').first().click();
        } else if (await page.locator('#answer-text').count()) {
          await page.locator('#answer-text').fill('Хочется увлекательной истории на вечер.');
        }
        const buttons = await rects(['#action-controls', '#action-controls .btn-primary', '#action-controls .btn-secondary', '.game-back']);
        const p = buttons['#action-controls .btn-primary'], s = buttons['#action-controls .btn-secondary'];
        if (p && s && width <= 760) {
          record(width + '-' + domain + '-question-actions-' + step, Math.abs(p.x-s.x)<1 && Math.abs(p.width-s.width)<1, buttons);
          await place('#actions');
          if(step === (domain==='game'?2:0)) await shot(width + '-' + domain + '-question-actions');
        }
        await page.locator('#action-controls .btn-primary').click(); await idle();
      }
      await action('confirm').waitFor();
      await place('#actions');
      const review = await rects(['#action-controls .btn-primary', '#action-controls .btn-secondary']);
      const p = review['#action-controls .btn-primary'], s = review['#action-controls .btn-secondary'];
      if(width<=760) record(width+'-'+domain+'-review-actions', Math.abs(p.x-s.x)<1 && Math.abs(p.width-s.width)<1, review);
      await shot(width + '-' + domain + '-review');
      let release;
      const hold = async route => { await new Promise(resolve=>{release=resolve;setTimeout(resolve,5000)}); await route.continue(); };
      await page.route(/\/api\/(?:media-)?conversation$/,hold,{times:1});
      await action('confirm').click(); await page.locator('#processing').waitFor();
      await place('#processing');await shot(width + '-' + domain + '-loading');release?.();
      await page.locator('.game-proposal').first().waitFor();await idle();
      await page.locator('.game-proposal [data-act=library-save]').first().click();
      await place('#actions');
      const result = await rects(['#action-controls .btn-primary', '#action-controls .btn-secondary']);
      if(width<=760) record(width+'-'+domain+'-result-actions', Math.abs(result['#action-controls .btn-primary'].x-result['#action-controls .btn-secondary'].x)<1, result);
      await shot(width + '-' + domain + '-result-actions');
      await page.locator('.game-session-menu>summary').click();
      await action('restart').click();
      await page.locator('[data-first-next]').waitFor();
      await page.locator('#restore:not([hidden])').waitFor({state:'attached'});
      await page.evaluate(()=>scrollTo(0,0));
      await page.locator('.game-session-menu>summary').click();
      const header = await rects(['.app-shell', '.app-domain-control', '.app-shell-actions', '.app-session-actions']);
      const menu=header['.app-session-actions'];
      record(width+'-'+domain+'-restorable-menu',menu.x>=8&&menu.right<=width-8,header);
      if(width<=760)record(width+'-'+domain+'-two-header-rows',Math.abs(header['.app-domain-control'].y-header['.app-shell-actions'].y)<2,header);
      await shot(width + '-' + domain + '-restorable-menu');
      await page.keyboard.press('Escape');
      record(width+'-'+domain+'-escape',!await page.locator('.game-session-menu[open]').count());
      await page.locator('.game-session-menu>summary').click();
      await action('restore-previous').click();await page.locator('.game-proposal').first().waitFor();await idle();
      record(width+'-'+domain+'-restore',await page.locator('[data-card-id]').count()===4);
      await page.locator('#domain-switch').click();
      const domainMenu=(await rects(['#domain-menu']))['#domain-menu'];
      record(width+'-'+domain+'-domain-menu',domainMenu.x>=8&&domainMenu.right<=width-8,domainMenu);
      await page.keyboard.press('Escape');
      record(width+'-'+domain+'-overflow',await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=1);
      if (domain!==domains[0])continue;
      await page.goto(base+'/library/?qa_run='+run);
      await page.locator('#library-app[aria-busy=false]').waitFor();
      await page.evaluate(async()=>{
        const {createLibraryStore}=await import('/shared/library-store.js');
        const {qaStorage}=await import('/shared/qa-session.js');
        const store=createLibraryStore({storage:qaStorage(localStorage)});
        store.save({id:'qa-wildlands',domain:'game',title:"Tom Clancy’s Ghost Recon Wildlands",year:2017});
        store.save({id:'qa-arma',domain:'game',title:'Arma 3',year:2013});
      });
      await page.reload();await page.locator('.board-card').first().waitFor();
      await shot(width+'-library-top');
      const controls=await rects(['.board-card-actions .custom-select-trigger','.board-card-actions .library-remove']);
      const select=controls['.board-card-actions .custom-select-trigger'],remove=controls['.board-card-actions .library-remove'];
      record(width+'-library-control-gap',remove.x-select.right>=6,controls);
      record(width+'-library-control-height',Math.abs(select.height-remove.height)<1,controls);
      await place('.board-card');await shot(width+'-library-card');
      if(width<=760){await action('filters').click();await shot(width+'-library-filters');}
      const first=page.locator('.board-card').first();
      await first.locator('.custom-select-trigger').click();
      const options=await page.locator('.custom-select-menu').boundingBox();
      record(width+'-library-select-menu',options.x>=0&&options.x+options.width<=width,options);
      await page.getByRole('option',{name:'На этот вечер',exact:true}).click();
      await page.locator('[data-act=lane][data-lane=tonight]').click();
      await page.locator('.board-card').first().waitFor();
      record(width+'-library-move',await page.locator('.board-card').count()===1);
      await page.locator('.board-card .library-remove').click();
      await action('undo').click();await page.locator('.board-card').waitFor();
      record(width+'-library-remove-undo',await page.locator('.board-card').count()===1);
    }
  } finally {page.off('pageerror',onError);}
  const report={set,widths,domains,results,errors,paidCalls:0};
  return {...report,checks:results.length,failed:results.filter(r=>!r.pass)};
}
