async (page, config={}) => {
  const width = config.width ?? 390;
  const height = config.height ?? (width===390 ? 705 : 900);
  const set = config.set ?? 'before';
  const base = 'http://127.0.0.1:5196';
  const root = '.playwright-mcp/ui-visual-2026-11-05/raw';
  const run = 'visual_'+set+'_'+width+'_'+Date.now();
  const routes = {game:'/pick/game/',film:'/pick/watch/?domain=film',series:'/pick/watch/?domain=series',cartoon:'/pick/watch/?domain=cartoon'};
  const seen = [], errors = [];
  const at = (sel)=>page.locator(sel).first();
  const action = (name)=>at('[data-act="'+name+'"]');
  const click = (sel)=>at(sel).click({timeout:5000});
  const button = name=>page.getByRole('button',{name,exact:true}).first();
  const idle = ()=>page.waitForFunction(()=>document.querySelector('#main')?.getAttribute('aria-busy')==='false',null,{timeout:8000});
  const cards = ()=>page.locator('[data-card-id]');
  const currentIds = ()=>cards().evaluateAll(items=>items.map(e=>e.dataset.cardId));
  const showImage = async()=> {
    await page.locator('.game-poster img, .library-cover img').evaluateAll(images=>images.forEach(img=>img.loading='eager'));
    await page.evaluate(async()=>Promise.race([
      Promise.allSettled([...document.querySelectorAll('.game-poster img, .library-cover img')].map(img=>img.decode())),
      new Promise(resolve=>setTimeout(resolve,2500))
    ]));
  };
  const place = async (selector)=>{
    if(!selector){await page.evaluate(()=>scrollTo(0,0));return;}
    await at(selector).waitFor();
    await at(selector).evaluate(el=>{
      const shell=document.querySelector('.app-shell');
      const top=shell?.getBoundingClientRect().height??0;
      scrollTo(0,scrollY+el.getBoundingClientRect().top-top-12);
    });
  };
  const shot = async (domain,label,{selector,full=false,keepScroll=false}={})=>{
    if(!keepScroll)await place(selector);
    await page.mouse.move(2,2);
    await page.evaluate(()=>document.fonts.ready);
    const filename=set+'-'+width+'-'+domain+'-'+label+'.png';
    await page.screenshot({path:root+'/'+filename,fullPage:full,animations:'disabled'});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    seen.push({domain,label,filename,overflow});
  };
  const resultScroll = async(domain)=>{
    await showImage();await place();
    const {extent,header}=await page.evaluate(()=>({extent:document.documentElement.scrollHeight,header:document.querySelector('.app-shell')?.offsetHeight??0}));
    const step=height-header-56;
    for(let offset=0,i=0;;i++){
      await page.evaluate(y=>scrollTo(0,y),offset);
      await shot(domain,'result-'+String(i).padStart(2,'0'),{keepScroll:true});
      if(offset+height>=extent)break;
      offset=Math.min(offset+step,extent-height);
    }
  };
  const failureHandler = msg=>errors.push(msg.message);
  page.on('pageerror',failureHandler);
  let blockMore = false, holdConfirm = false, releaseTransport;
  const transport = async route=>{
    const type=route.request().postDataJSON()?.action?.type;
    if(type==='confirm'&&holdConfirm){
      holdConfirm=false;
      await new Promise(resolve=>{releaseTransport=resolve;setTimeout(resolve,4000);});
    }
    if(type==='more'&&blockMore){
      blockMore=false;
      await route.abort('failed');return;
    }
    await route.continue();
  };
  await page.route(/\/api\/(?:media-)?conversation$/,transport);
  await page.setViewportSize({width,height});
  const openLibrary = view=>page.goto(base+'/library/?view='+view+'&qa_run='+run);
  try {
    for(const domain of config.domains ?? Object.keys(routes)){
      await page.goto(base+routes[domain]+(domain==='game'?'?':'&')+'qa_run='+run);
      await at('[data-first-next]').waitFor();
      await click('#domain-switch');await shot(domain,'01-domain-menu');await page.keyboard.press('Escape');
      await click('#answer-form [data-act=option]');
      await click('[data-disclosure=answer-own]>summary');
      await page.locator('#answer-text').fill('Хочется увлекательной истории без спешки, чтобы вечером можно было спокойно переключиться и отдохнуть.');
      await click('[data-disclosure=answer-genres]>summary');
      await click('[data-disclosure=answer-avoids]>summary');
      if(set!=='before'){
        await page.waitForFunction(()=>document.querySelector('.game-answer-extras')?.nextElementSibling?.matches('.game-first-actions'));
      }
      await shot(domain,'02-first-options',{full:true});
      await click('.game-example>summary');
      await page.locator('#game-search').fill({game:'Portal',film:'Властелин колец',series:'Чернобыль',cartoon:'Аркейн'}[domain]);
      await at('[data-act=example]').waitFor();
      await shot(domain,'03-example-search',{selector:'.game-example'});
      await click('[data-act=example]');
      if(!(await at('#answer-text').inputValue()).includes('Пример:'))throw Error('Example not added');
      await page.locator('#answer-text').fill('Хочется увлекательной истории без спешки, чтобы вечером можно было спокойно переключиться и отдохнуть.');
      await click('[data-first-next]');await idle();
      for(let step=0;step<7&&!await action('confirm').count();step++){
        await shot(domain,'04-step-'+step,{full:true});
        const options = at('#answer-form [data-act=option]');
        if(await options.count()){
          const group=page.locator('#answer-form [data-id=group]');
          if(domain==='game'&&await group.count())await group.click();else await options.click();
          await button('Дальше').click();await idle();
        } else if(await action('review').isEnabled()){
          await action('review').click();await idle();
        } else {
          throw Error('No way to advance '+domain);
        }
      }
      await action('confirm').waitFor();
      await shot(domain,'05-review',{full:true});
      await click('#action-controls [data-act=focus-correction]');
      await at('#request-editor').waitFor();
      const correction=page.locator('#request-editor textarea[name=correction]');
      await correction.fill('Давай что-нибудь легче и короче, чтобы не нужно было запоминать много имён.');
      await shot(domain,'06-correction',{selector:'#request-editor'});
      await click('#request-editor [data-act=cancel-correction]');
      if(domain==='game'||domain==='film'){
        holdConfirm=true;
        await action('confirm').click();
        await at('#processing').waitFor();
        await shot(domain,'07-loading',{selector:'#processing'});
        releaseTransport?.();
      }else await action('confirm').click();
      await at('.game-proposal').waitFor();
      await idle();
      const original=await currentIds();
      if(original.length!==4)throw Error('Expected 4 real catalog cards '+domain);
      await resultScroll(domain);
      const top=cards().first(), second=cards().nth(1);
      await top.locator('[data-act=library-save]').click();
      await top.locator('[data-act=library-save][aria-pressed=true]').waitFor();
      await top.locator('.evening-rating>summary').click();
      await top.locator('[data-act=evening-fit][data-v=conditional]').click();
      await top.locator('[data-act=evening-fit][aria-pressed=true]').waitFor();
      await top.locator('.evening-feedback-note>summary').click();
      await top.locator('[name=note]').fill('Проверяю длинную заметку: причина подходит, но на этот вечер хочется более короткого варианта.');
      await shot(domain,'08-rating',{selector:'.game-proposal:first-of-type .evening-rating'});
      await top.locator('[data-act=evening-choose][data-v=on]').click();
      await top.locator('[data-act=evening-start]').waitFor();
      await top.locator('[data-act=evening-start]').click();
      await top.locator('[data-act=evening-start][aria-pressed=true]').waitFor();
      await top.locator('.evening-outcome>summary').click();
      await shot(domain,'09-chosen',{selector:'.game-proposal:first-of-type .evening-controls'});
      await top.locator('[data-act=evening-outcome]').first().click();
      await second.locator('[data-act=familiar-mark]').click();
      await second.locator('[data-act=replace-one]').waitFor();
      await showImage();
      await shot(domain,'10-marked',{selector:'.game-card-pending'});
      await second.locator('[data-act=replace-one]').click();await idle();
      const after=await currentIds();
      if(after[1]===original[1]||after.some((id,i)=>i!==1&&id!==original[i]))throw Error('Replacement changed wrong slots '+domain);
      if(set!=='before'){
        await at('[data-inline-undo]').waitFor({timeout:5000});
        const inline=await second.locator('[data-inline-undo]').count();
        if(inline!==1)throw Error('Undo is outside the replaced slot '+domain);
        await showImage();
        await shot(domain,'11-replaced',{selector:'[data-card-id="'+after[1]+'"]'});
      }else await shot(domain,'11-replaced',{selector:'#actions'});
      await action('undo-replacement').click();await idle();
      if((await currentIds()).join()!==original.join())throw Error('Undo lost original results '+domain);
      await second.locator('[data-act=familiar-unmark]').click();
      await second.locator('[data-act=familiar-mark]').waitFor();
      await click('.game-result-tools>summary');
      await shot(domain,'12-tools',{selector:'.game-result-browse'});
      if(domain==='film'){
        blockMore=true;
        await click('.game-result-browse [data-act=more]');
        await at('#error').waitFor();await shot(domain,'13-error',{selector:'#error'});
        await action('retry').click();await idle();
        if((await currentIds()).some(id=>original.includes(id)))throw Error('More returned a repeat');
        await action('undo-replacement').click();await idle();
      }
      await click('.selection-review [data-act=selection-verdict]');
      if(set!=='before'&&!await page.evaluate(()=>Boolean(document.querySelector('#actions').compareDocumentPosition(document.querySelector('.selection-review'))&Node.DOCUMENT_POSITION_FOLLOWING))){
        throw Error('The survey is ahead of the result actions');
      }
      await click('.selection-review details>summary');
      await at('.selection-review [name=note]').fill('Комментарий для проверки в изолированном режиме.');
      await shot(domain,'14-review-form',{selector:'.selection-review'});
      await click('.selection-review button[type=submit]');
      await page.waitForFunction(()=>/Сохран|Отзыв|Отправ/.test(document.querySelector('[data-selection-review-status]')?.textContent??''));
      await click('.game-session-menu>summary');
      await shot(domain,'15-restart-menu');
    }
    if(config.library!==false) {
      await openLibrary('board');await click('[data-act=lane][data-lane=tonight]');await at('.board-card').waitFor();await showImage();await shot('library','01-populated',{full:true});
      if(width<=760)await action('filters').click();
      await shot('library','02-filters',{selector:'.library-filters'});
      await page.locator('#find-title').fill('Точно нет такого названия в тесте');
      await page.getByText('Нет совпадений',{exact:true}).waitFor();await shot('library','03-no-match',{selector:'.library-filters'});
      await action('clear').click();
      await click('.board-card .card-details>summary');
      await shot('library','04-card-details',{selector:'.board-card'});
      await openLibrary('history');await at('.history-selection').waitFor();await showImage();await shot('library','05-archive',{full:true});
      await click('[data-act=view][data-view=evenings]');
      await at('.library-evening').waitFor({timeout:6000});
      await shot('library','06-evenings',{full:true});
    }
    return {set,width,height,seen,errors,transport:await page.request.get(base+'/__qa-transport').then(r=>r.json())};
  }catch(error){
    return {failure:error.message,set,width,height,seen,errors,url:page.url(),body:await page.locator('body').innerText().then(t=>t.slice(0,1100))};
  }finally{
    await page.unroute(/\/api\/(?:media-)?conversation$/,transport);
    page.off('pageerror',failureHandler);
  }
}
