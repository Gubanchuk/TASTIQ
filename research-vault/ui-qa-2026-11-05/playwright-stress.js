async (page,config={})=>{
 const base='http://127.0.0.1:5195', run='qa_stress_'+Date.now(), path=base+'/pick/watch/?domain=series&qa_run='+run;
 const evidence=[], failures=[], errors=[];
 const check=(value,label,details)=>{evidence.push({label,ok:Boolean(value),details});if(!value)failures.push(label);};
 const long='Очень длинное название сериала: история героев, которым предстоит невероятное приключение';
 const unbroken='СверхдлиннаяСтрокаБезПробелов'.repeat(4);
 const reason='У героев есть ясная цель, история развивается постепенно, и к серии можно вернуться на следующем вечере. '.repeat(3).trim();
 const caveat='Первая серия вводит много героев. Если сегодня хочется чего-то лёгкого, это может утомить.';
 const picture=(w,h,color)=>'<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><rect width="100%" height="100%" fill="'+color+'"/><rect x="3%" y="3%" width="94%" height="94%" stroke="white" stroke-width="4" fill="none"/><circle cx="50%" cy="50%" r="8%" fill="white"/></svg>';
 const ctl=(name)=>page.getByRole('button',{name,exact:true}), imageURL=i=>base+'/__qa-art-'+i+'.svg';
 await page.route('**/__qa-art-*.svg',async route=>{
   const i=Number(route.request().url().match(/art-(\d)/)?.[1]);
   if(i===3)return route.fulfill({status:404,body:'offline test'});
   const shapes=[[180,360,'#3154d6'],[680,180,'#18314a'],[240,240,'#4a653e']];
   return route.fulfill({status:200,contentType:'image/svg+xml',body:picture(...shapes[i])});
 });
 let releaseFailure;
 let failMore=false;
 const transport=async route=>{
  const req=route.request().postDataJSON();
  if(req?.action?.type==='more'&&failMore){
   failMore=false;
   await new Promise(resolve=>{releaseFailure=resolve;setTimeout(resolve,5000);});
   return route.abort('failed');
  }
  const rsp=await route.fetch();const data=await rsp.json();
  for(const result of [data.state?.result,data.screen?.result]){
   if(!result?.top)continue;
   [result.top,...result.alternatives].forEach((c,i)=>{
    Object.assign(c,{ru:i===0?long:i===1||i===2?unbroken:c.ru,genres:i===0?['Документальный',unbroken]:c.genres,
     poster:i===2?null:imageURL(i),image:null,ai:{...c.ai,reason,caveat}});
   });
  }
  await route.fulfill({response:rsp,json:data});
 };
 await page.route('**/api/media-conversation',transport);
 const wait=()=>page.waitForFunction(()=>document.querySelector('#main')?.getAttribute('aria-busy')==='false');
 const output=config.output??'research-vault/ui-qa-2026-11-05';
 const shot=key=>page.screenshot({path:output+'/final-stress-'+key+'.png',animations:'disabled'});
 const cardShot=async (article,key)=>{
  await article.evaluate(e=>{const header=document.querySelector('.app-shell');scrollTo(0,scrollY+e.getBoundingClientRect().top-(header?.offsetHeight??0)-8);});
  await page.mouse.move(2,2);
  await shot(key);
 };
 const get=()=>page.evaluate(()=>{
  const box=e=>{const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),right:Math.round(r.right)};};
  return {overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth, cards:[...document.querySelectorAll('.game-proposal')].map(e=>{
   const boxArt=e.querySelector('.game-poster'), img=e.querySelector('img'), head=e.querySelector('.game-card-heading'), why=e.querySelector('.game-card-reason'), warn=e.querySelector('.game-caveat');
   return {id:e.dataset.cardId,card:box(e),art:box(boxArt),head:box(head.querySelector('h2')),reason:box(why),caveat:box(warn),fallback:boxArt.classList.contains('game-poster-fallback'),artVisible:!!boxArt.getClientRects().length,natural:img?[img.naturalWidth,img.naturalHeight]:null,fit:img?getComputedStyle(img).objectFit:null,img:img?box(img):null,artBackground:getComputedStyle(boxArt).backgroundColor};
  })};
 });
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.setViewportSize({width:390,height:705});
  await page.goto(path);
  await page.locator('#answer-form [data-act=option]').first().click();await ctl('Дальше').click();await wait();
  if(!await page.locator('[data-act=confirm]').count())await ctl('Проверить запрос').click();
  await page.locator('[data-act=confirm]').click();await page.locator('.game-proposal').first().waitFor();await wait();
  await page.locator('.game-poster img').evaluateAll(images=>images.forEach(e=>e.loading='eager'));
  await page.waitForFunction(()=>document.querySelectorAll('.game-poster-fallback').length>=2);
  for(const [w,h] of [[320,640],[390,705],[390,430],[446,820],[760,720],[761,720],[820,768],[1024,768],[1440,900]]){
   await page.setViewportSize({width:w,height:h});
   await page.evaluate(()=>document.fonts.ready);
   const data=await get();
   check(data.overflow<=1,'no page overflow '+w+'×'+h,data.overflow);
   check(data.cards.length===4&&data.cards.every(c=>c.reason.w>0&&c.reason.right<=c.card.right&&c.caveat.right<=c.card.right),'all reasons and caveats fit '+w+'×'+h,data.cards);
   check(data.cards[0].fit==='contain'&&data.cards[0].natural?.join()==='180,360'&&data.cards[1].fit==='contain'&&data.cards[1].natural?.join()==='680,180','whole portrait and landscape '+w+'×'+h);
   if(config.expectNaturalFrame)check(data.cards.slice(0,2).every(c=>c.img?.h&&Math.abs(c.img.w/c.img.h-c.natural[0]/c.natural[1])<.14&&c.artBackground==='rgba(0, 0, 0, 0)'),
    'natural proportions on a transparent surface '+w+'×'+h,data.cards.slice(0,2).map(c=>({img:c.img,natural:c.natural,background:c.artBackground})));
   if(config.expectNaturalFrame&&w<=520)check(data.cards[0].head.w>=data.cards[0].card.w-45&&data.cards[0].head.y<data.cards[0].art.y,
    'long phone title takes the full width above the art '+w+'×'+h,data.cards[0].head);
   check(!data.cards[2].artVisible&&data.cards[3].fallback&&data.cards[3].artVisible,'no phantom space without URL, bounded 404 '+w+'×'+h);
   if(w<=760)check(data.cards[0].art.h===98&&data.cards[3].art.h===98&&data.cards.every(c=>c.reason.x===c.caveat.x&&c.reason.w>=Math.min(500,c.card.w-45)),'mobile image and full-width text '+w+'×'+h);
   if((w===390&&h===705)||w===1440||(config.expectNaturalFrame&&[320,761,1024].includes(w))){
    await page.evaluate(()=>scrollTo(0,0));await shot('top-'+w);
    const article=page.locator('.game-proposal').first();
    if(config.expectNaturalFrame)await cardShot(article,'long-'+w);
    else await article.screenshot({path:output+'/final-stress-long-'+w+'.png',animations:'disabled'});
    if(config.expectNaturalFrame){
     for(const i of [1,2,3])await cardShot(page.locator('.game-proposal').nth(i),'card'+i+'-'+w);
    }
   }
  }
  await page.setViewportSize({width:390,height:705});
  const ids=async()=>page.locator('[data-card-id]').evaluateAll(list=>list.map(e=>e.dataset.cardId).join());
  const before=await ids();
  const withoutArt=page.locator('[data-card-id]').nth(2);
  await withoutArt.locator('[data-act=familiar-mark]').click();
  await withoutArt.locator('[data-act=replace-one]').waitFor();
  for(const [width,height] of [[320,640],[390,705],[761,720],[1024,768],[1440,900]]){
   await page.setViewportSize({width,height});
   const pending=await withoutArt.locator('.game-pending-identity h2').evaluate(e=>{
    const r=e.getBoundingClientRect(), parent=e.closest('.game-pending-identity').getBoundingClientRect();
    return {text:Math.round(r.width),row:Math.round(parent.width),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
   });
   check(pending.text===pending.row&&pending.overflow<=1,'marked long title without a poster at '+width,pending);
  }
  await page.setViewportSize({width:390,height:705});
  await withoutArt.locator('[data-act=familiar-unmark]').click();
  await withoutArt.locator('[data-act=familiar-mark]').waitFor();
  failMore=true;await page.locator('.game-result-browse [data-act=more]').click();
  await page.locator('#processing').waitFor();
  check(await page.locator('#processing').innerText().then(t=>t.includes('Ищу другие варианты')),'loading identifies the current action');
  await shot('loading-390');
  releaseFailure?.();
  await page.locator('#error').waitFor();check((await ids())===before,'network error preserves visible result');
  await page.locator('#error [data-act=retry]').click();await wait();
  const more=await ids();
  const moreUndo=page.locator('[data-act=undo-replacement]');
  if(await moreUndo.count()){
    check(more!==before&&more.split(',').every(id=>!before.split(',').includes(id)),'more returns unseen results');
    await moreUndo.click();await wait();check((await ids())===before,'undo more restores original IDs');
  }else check(false,'fixture retry should return a new batch',await page.locator('#error').innerText().catch(()=>null));
  const a=page.locator('[data-card-id]').nth(1);await a.locator('[data-act=familiar-mark]').click();await a.locator('[data-act=replace-one]').waitFor();await a.locator('[data-act=replace-one]').click();await wait();
  const after=(await ids()).split(','), prior=before.split(',');
  check(after.length===prior.length&&after[1]!==prior[1]&&after.every((id,i)=>i===1||id===prior[i]),'one replacement changes only its slot',{before:prior,after});
  if(await moreUndo.count()){await moreUndo.click();await wait();check((await ids())===before,'undo single replacement restores all slots');}
  const transportProof=await page.request.get(base+'/__qa-transport').then(res=>res.json());
  check(transportProof.paid===0&&transportProof.stubbed.filter(x=>x==='tastiq_picks').length>=3,'catalog picks executed through the local model substitute',transportProof);
  return {evidence,failures,errors,transport:transportProof};
 }catch(e){return {failure:e.message,evidence,failures,errors,body:await page.locator('body').innerText().then(t=>t.slice(0,1400))};}
 finally{await page.unroute('**/api/media-conversation',transport);await page.unroute('**/__qa-art-*.svg');}
}
