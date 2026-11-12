async page=>{
 const base='http://127.0.0.1:5196',root='.playwright-mcp/ui-visual-2026-11-05/raw';
 const notes=[], problems=[];
 const check=(ok,name)=>{notes.push({name,ok:Boolean(ok)});if(!ok)problems.push(name);};
 const at=sel=>page.locator(sel).first(), click=sel=>at(sel).click({timeout:6000});
 const idle=()=>page.waitForFunction(()=>document.querySelector('#main')?.getAttribute('aria-busy')==='false',null,{timeout:8000});
 const shot=async(name,fullPage=false)=>{await page.mouse.move(2,2);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:root+'/'+name+'.png',fullPage,animations:'disabled'});};
 const size=(width,height)=>page.setViewportSize({width,height});
 const qa='visual_extra_'+Date.now();
 const goto=(url)=>page.goto(base+url+(url.includes('?')?'&':'?')+'qa_run='+qa);
 const pick=async(domain)=>{
  await goto('/pick/watch/?domain='+domain);
  await at('#answer-form [data-act=option]').waitFor();
  await click('#answer-form [data-act=option]');await click('[data-first-next]');await idle();
  if(!await at('[data-act=confirm]').count()){
   await click('#answer-form [data-act=option]');
   await page.getByRole('button',{name:'Дальше',exact:true}).click();await idle();
  }
  await at('[data-act=confirm]').waitFor();
 };
 try{
  for(const [width,height] of [[390,705],[1440,900]]){
   await size(width,height);await page.goto(base+'/library/?qa_run=empty'+qa+width);
   await page.getByText('Здесь будут твои планы',{exact:true}).waitFor();
   check(!await at('.library-search').count()&&!await at('.library-count').count(),'empty library hides search and zero counters '+width);
   await shot('final-empty-library-'+width,true);
   for(const [path,key] of [['/design/','design'],['/design-v2/','design-v2']]){
    await page.goto(base+path);await shot('archive-'+key+'-'+width,true);
   }
  }
  await size(390,705);await pick('cartoon');
  await click('[data-act=toggle-context]');await click('.game-context-editor>summary');
  const fields=at('#context-form');
  const select=async(name,label)=>{
   await fields.locator('label:has(select[name='+name+']) [role=combobox]').click();
   await page.getByRole('option',{name:label,exact:true}).click();
  };
  await select('company','С детьми');
  await fields.locator('[name=childAge]').fill('8');
  await select('format','Один мультфильм');
  check(await fields.locator('[name=childAge]').isVisible()&&!await fields.locator('[name=commitment]').isVisible(),'conditional fields for family film');
  await at('#context-form').scrollIntoViewIfNeeded();await shot('final-cartoon-family-context-390',true);
  await fields.locator('button[type=submit]').click();await idle();
  check(await at('#understanding').innerText().then(t=>t.includes('С детьми')&&t.includes('8')),'family context is reflected in the request');
  await shot('final-cartoon-family-applied-390',true);

  await pick('film');await click('[data-act=confirm]');await at('.game-proposal').waitFor();await idle();
  const ids=()=>page.locator('[data-card-id]').evaluateAll(xs=>xs.map(x=>x.dataset.cardId).join());
  const original=await ids();
  await click('.game-proposal [data-act=library-save]');
  await click('#action-controls [data-act=focus-correction]');
  await at('#request-editor textarea').fill('Хочется более короткую историю с простым сюжетом.');
  await click('#request-editor button[type=submit]');await idle();
  await at('[data-act=confirm]').waitFor();
  check(!await at('.selection-review').isVisible(),'survey hides outside the result');
  await shot('final-corrected-review-390',true);
  const toggle=at('[data-act=toggle-context]');
  if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
  await click('[data-act=restore-correction]');await at('.game-proposal').waitFor();
  check((await ids())===original,'restore correction returns the same four titles');
  await shot('final-correction-restored-390');
  await goto('/library/');await at('#find-title').fill('Проверка фокуса без совпадений');
  await page.getByText('Нет совпадений',{exact:true}).waitFor();
  const focus=await at('#find-title').evaluate(e=>({input:getComputedStyle(e).outlineStyle,group:getComputedStyle(e.closest('.library-search')).outlineStyle}));
  check(focus.input==='none'&&focus.group==='solid','single visible search focus ring');
  await shot('final-library-focus-390');
  await size(320,640);await shot('final-library-focus-320');
  await at('#find-title').fill('');
  return {notes,problems};
 }catch(e){return {failure:e.message,notes,problems,body:(await page.locator('body').innerText()).slice(0,1000)};}
}
