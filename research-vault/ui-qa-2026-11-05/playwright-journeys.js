async (page) => {
 const base='http://127.0.0.1:5194', evidence=[], errors=[], bill=[];
 const widths=[[1440,900],[1024,768],[820,768],[761,720],[760,720],[446,820],[390,705],[320,640],[390,430]];
 const routes={home:'/',start:'/pick/start/',game:'/pick/game/',film:'/pick/watch/?domain=film',series:'/pick/watch/?domain=series',cartoon:'/pick/watch/?domain=cartoon',library:'/library/',legacy:'/pick/?legacy=1&qa_run=off'};
 const run='qa1105_'+Date.now(), live=['game','film','series','cartoon'], path=d=>routes[d]+(routes[d].includes('?')?'&':'?')+'qa_run='+run;
 const check=(ok,label,extra=null)=>{evidence.push({label,ok:Boolean(ok),extra}); if(!ok)throw Error(label+' '+JSON.stringify(extra));};
 const resize=([width,height])=>page.setViewportSize({width,height});
 const goto=url=>page.goto(base+url,{waitUntil:'domcontentloaded'});
 const button=name=>page.getByRole('button',{name,exact:true});
 const main=()=>page.locator('#main h1');
 const idle=()=>page.waitForFunction(()=>document.querySelector('#main')?.getAttribute('aria-busy')==='false');
 const cards=()=>page.locator('[data-card-id]');
 const idList=()=>cards().evaluateAll(items=>items.map(e=>e.dataset.cardId));
 const measure=()=>page.evaluate(()=>{
  const root=document.documentElement, rect=e=>e.getBoundingClientRect();
  const elements=[...document.querySelectorAll('button:not(:disabled),summary,a[href],input,select,textarea')].filter(e=>{let r=rect(e);for(let x=e.parentElement;x;x=x.parentElement){if(x.matches('details:not([open])')&&!x.querySelector(':scope>summary')?.contains(e))return false;}return r.width&&r.height&&getComputedStyle(e).visibility==='visible'&&!e.matches('.skip,.library-skip');});
  const overflow=root.scrollWidth-root.clientWidth;
  const clipped=elements.filter(e=>{const r=rect(e);return r.right>root.clientWidth+2||r.left < -2;}).map(e=>e.innerText.trim().slice(0,80)||e.getAttribute('aria-label'));
  return {overflow,clipped,controls:elements.length};
 });
 const geometry=async label=>{const v=await measure();check(v.overflow<=1&&!v.clipped.length,label,v);};
 const shot=(name)=>page.screenshot({path:'research-vault/ui-qa-2026-11-05/'+name+'.png',animations:'disabled'});
 const click=async sel=>{await page.locator(sel).click({timeout:7000});};
 const imgLoaded=async()=>{await page.locator('.game-proposal img').evaluateAll(images=>images.forEach(e=>e.loading='eager'));await page.waitForFunction(()=>[...document.querySelectorAll('.game-proposal img')].every(e=>e.complete),null,{timeout:8000}).catch(()=>{});};
 const inView=async e=>e.evaluate(node=>{const r=node.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.text().startsWith('TASTIQ_QA_METER '))bill.push(JSON.parse(m.text().slice(16)));});
 const results=[];
 try{
  for(const size of widths){
   await resize(size);
   for(const [key,url] of Object.entries(routes)){
    await goto(key==='legacy'?url:url+(url.includes('?')?'&':'?')+'qa_run='+run+'_entry');
    await page.locator('h1').first().waitFor();
    await page.evaluate(()=>document.fonts.ready);
    await geometry('entry '+key+' '+size.join('×'));
    if(size[0]===390&&size[1]===705)await shot('final-entry-'+key+'-390');
   }
  }
  for(const route of ['/design/','/design-v2/']){
   await goto(route); check(await page.locator('body').innerText().then(x=>x.trim().length>100),'reference route '+route);
  }
  for(const [w,h] of [[390,705],[1440,900]]){
   await resize([w,h]);
   for(const target of ['header .btn-primary','.landing-action']){await goto('/');await click(target);await page.waitForURL('**/pick/start/');check(true,'landing action '+target+' '+w);}
   for(const d of live){
    await goto('/pick/start/');await click('main nav a[href="'+routes[d]+'"]');await main().waitFor();check(page.url().includes(routes[d]),'start tile '+d+' '+w);
    await goto('/');await click('.door[data-domain='+d+']');await main().waitFor();check(page.url().includes(routes[d]),'landing tile '+d+' '+w);
    await goto('/');await click('.final-choice[href="'+routes[d]+'"]');await main().waitFor();check(page.url().includes(routes[d]),'footer tile '+d+' '+w);
   }
  }
  for(const size of [[390,705],[1440,900]]){
   await resize(size);
   for(const domain of live){
    await goto(path(domain)+'_'+size[0]);await main().waitFor();await page.locator('[data-first-next]').waitFor();
    const menu=page.locator('.game-session-menu');
    check(!await page.locator('#restart').isVisible(),'restart hidden by default '+domain+' '+size[0]);
    await page.locator('#domain-switch').focus();await page.keyboard.press('Enter');check(await page.locator('#domain-menu').isVisible(),'domain opens via Enter '+domain+' '+size[0]);await page.keyboard.press('Escape');check(!await page.locator('#domain-menu').isVisible(),'domain closes via Escape '+domain+' '+size[0]);
    const form=page.locator('#answer-form'),moods=form.getByRole('group',{name:'Чего хочется сегодня'});
    await moods.getByRole('button').first().click();check(await moods.getByRole('button').first().getAttribute('aria-pressed')==='true','visible selected option '+domain+' '+size[0]);
    const next=page.locator('[data-first-next]');if(size[0]===390){await page.evaluate(()=>scrollTo(0,0));check(await inView(next),'first Next in viewport '+domain);}
    await click('[data-disclosure=answer-genres]>summary');await geometry('genres '+domain+' '+size[0]);
    await click('[data-disclosure=answer-avoids]>summary');await geometry('exclusions '+domain+' '+size[0]);
    await click('[data-disclosure=answer-own]>summary');
    const note='Хочется спокойного вечера и увлекательной истории.';
    await page.locator('#answer-text').fill(note);
    await page.reload();await page.locator('#answer-text').waitFor();check(await page.locator('#answer-text').inputValue()===note,'own draft reload '+domain+' '+size[0]);
    await page.locator('#answer-text').press('Control+Enter');await idle();
    for(let i=0;i<10;i++){
     if(await page.locator('[data-act=confirm]').count())break;
     const review=page.locator('[data-act=review]');
     if(await review.count()&&await review.isEnabled()){await review.click();await page.locator('[data-act=confirm]').waitFor();break;}
     await page.locator('#answer-form [data-act=option]').first().click();await button('Дальше').click();await idle();await geometry('question '+domain+' '+size[0]+' '+i);
    }
    await geometry('review '+domain+' '+size[0]);await click('[data-act=confirm]');await cards().first().waitFor();await idle();await imgLoaded();
    const original=await idList();check(original.length===4,'four catalog cards '+domain+' '+size[0],original);
    await geometry('result '+domain+' '+size[0]);await page.evaluate(()=>scrollTo(0,0));
    const first=cards().first(),second=cards().nth(1);
    const top=await first.evaluate(e=>Math.round(e.getBoundingClientRect().top));
    check(top<size[1],'first result on initial viewport '+domain+' '+size[0],top);
    check(await first.locator('[data-act=evening-choose]').isVisible()&&!await first.locator('[data-act=evening-fit]').first().isVisible(),'choose visible, optional ratings closed '+domain+' '+size[0]);
    await first.locator('[data-act=copy-title]').click();
    await page.waitForFunction(()=>/Скопировано|Скопируй/.test(document.querySelector('[data-copy-status]')?.textContent??''));
    if(size[0]===390){
     const toggle=page.locator('[data-act=toggle-context]');
     await toggle.click();check(await page.locator('#understanding').isVisible(),'request opens '+domain);
     await toggle.click();check(!await page.locator('#understanding').isVisible(),'request collapses '+domain);
    }
    await first.locator('.evening-rating>summary').click();await first.locator('[data-act=evening-fit]').first().click();
    await first.locator('[data-act=evening-fit][aria-pressed=true]').waitFor();
    check(await first.locator('.evening-rating').getAttribute('open')!==null,'rating stays open after updating '+domain+' '+size[0]);
    await first.locator('.evening-feedback-note>summary').click();await first.locator('[name=note]').fill('Проверка переноса строки и черновика.');
    await page.reload();await first.waitFor();await first.locator('.evening-rating>summary').click();
    if(!await first.locator('[name=note]').isVisible())await first.locator('.evening-feedback-note>summary').click();
    check((await first.locator('[name=note]').inputValue()).startsWith('Проверка'),'rating note restores after reload '+domain+' '+size[0]);
    await first.locator('[data-act=library-save]').click();await first.locator('[data-act=library-save][aria-pressed=true]').waitFor();
    await first.locator('[data-act=evening-choose][data-v=on]').click();await first.locator('[data-act=evening-start]').waitFor();
    await first.locator('[data-act=evening-start]').click();await first.locator('[data-act=evening-start][aria-pressed=true]').waitFor();
    await first.locator('.evening-outcome>summary').click();await first.locator('[data-act=evening-outcome]').first().click();await first.locator('[data-act=evening-outcome][aria-pressed=true]').waitFor();await geometry('chosen and rated '+domain+' '+size[0]);
    await second.locator('[data-act=familiar-mark]').click();await second.locator('[data-act=replace-one]').waitFor();check((await idList()).join()===original.join(),'mark preserves four titles '+domain+' '+size[0]);
    await second.locator('[data-act=familiar-unmark]').click();await second.locator('[data-act=familiar-mark]').waitFor();
    await click('.game-result-tools>summary');await click('[data-act=copy-selection]');await page.waitForFunction(()=>document.querySelector('[data-selection-copy-status]')?.textContent.trim().length>0);
    await geometry('copy disclosure '+domain+' '+size[0]);
    await menu.locator('summary').click();await page.keyboard.press('Escape');check(!await menu.getAttribute('open'),'session menu closes with Escape '+domain+' '+size[0]);
    await menu.locator('summary').click();await click('#restart');await page.locator('[data-first-next]').waitFor();
    await page.reload();await page.locator('[data-first-next]').waitFor();await menu.locator('summary').click();
    await click('#restore');await cards().first().waitFor();check((await idList()).join()===original.join(),'restart/reload/restore retains exact cards '+domain+' '+size[0]);
    results.push({domain,width:size[0],top,ids:original});
    if(domain==='film'&&size[0]===390){
     await page.evaluate(()=>scrollTo(0,0));await shot('final-film-result-top-390');
     await goto('/library/?view=history&qa_run='+run+'_'+size[0]);await page.locator('.history-selection').first().waitFor();await geometry('history populated mobile');
     await page.locator('.history-selection a').first().click();await cards().first().waitFor();
     check((await idList()).join()===original.join(),'archive opens same result');
     await goto('/library/?qa_run='+run+'_'+size[0]);await page.locator('.board-card').first().waitFor();await click('[data-act=filters]');await geometry('library filters populated mobile');
     await page.locator('#find-title').fill('несуществующая-строка-qa');await page.getByText('Нет совпадений',{exact:true}).waitFor();await click('[data-focus=filters-reset]');
     const remove=page.locator('.board-card [data-act=remove]').first(),removed=await remove.getAttribute('data-focus');
     await remove.click();await click('[data-act=undo]');await page.locator('[data-focus="'+removed+'"]').waitFor();
     await click('[data-view=evenings]');await page.locator('.library-evening').first().waitFor();await geometry('library evenings populated mobile');await shot('final-library-evenings-390');
    }
   }
  }
  return {evidence,results,errors,bill:bill.map(x=>({action:x.action,status:x.status,billing:x.billing}))};
 }catch(error){return {failure:error.message,url:page.url(),main:await page.locator('body').innerText().then(x=>x.slice(0,1800)),evidence,results,errors,bill};}
}
