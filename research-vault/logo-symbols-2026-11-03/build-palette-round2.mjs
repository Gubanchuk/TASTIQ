import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const root=new URL('./',import.meta.url);
const previous=JSON.parse(await readFile(new URL('palette-options.json',root),'utf8'));
const reference=previous.find(palette=>palette.id==='02');
assert.ok(reference,'Keep the original cobalt reference');
const palettes=[
  {...reference,reference:true},
  {id:'05',name:'Ультрафиолет',primary:'#6429DE',ink:'#25183C',paper:'#F5F1FF',dark:'#21133E',inverse:'#EDE2FF',accent:'#C6EF6D'},
  {id:'06',name:'Лазурь',primary:'#007EA7',ink:'#102F3E',paper:'#EFFAFF',dark:'#102D3A',inverse:'#CBF0FF',accent:'#8EDDE8'},
  {id:'07',name:'Мандарин',primary:'#EA6500',ink:'#302117',paper:'#FFF9F2',dark:'#2D1E14',inverse:'#FFE6CB',accent:'#FFC66B'},
  {id:'08',name:'Лайм и графит',primary:'#252C13',ink:'#1B2210',paper:'#DBFA68',dark:'#18200F',inverse:'#D9FC5A',accent:'#A4C925'}
];
await writeFile(new URL('palette-options-v2.json',root),JSON.stringify(palettes,null,2)+'\n');
let html=await readFile(new URL('palettes.html',root),'utf8');
html=html.replace('<title>TASTIQ — четыре палитры</title>','<title>TASTIQ — новые палитры и кобальт</title>');
html=html.replace('<h1>Четыре палитры TASTIQ</h1>','<h1>Ещё четыре палитры</h1>');
html=html.replace('Тот же медведь 5B и написание 02. Меняется только цвет.','Кобальтовый 02 остаётся в отборе. Новые варианты — 05–08.');
html=html.replace(/<div class="group" aria-label="Показать палитры">[\s\S]*?<\/div>/,`<div class="group" aria-label="Показать палитры"><button data-filter="all" aria-pressed="true">Все</button>${palettes.map(palette=>`<button data-filter="${palette.id}" aria-pressed="false">${palette.id}</button>`).join('')}</div>`);
html=html.replace('Сравнение четырёх палитр','Кобальт и четыре новые палитры');
html=html.replace('Варианты ниже относятся к бренду; это не изменение цветов основного сайта.','Прежние 01, 03 и 04 отклонены. Форма знака и букв сохранена; цвета сайта здесь не меняются.');
html=html.replace('Палитра пока не выбрана.','Окончательная палитра пока не выбрана.');
html=html.replace('<a href="/selected/">Чёрно-белая основа</a>','<a href="/selected/">Чёрно-белая основа</a> · <a href="/palettes/">Первая серия</a>');
html=html.replace("fetch('/palette-options.json')","fetch('/palette-options-v2.json')");
html=html.replace('<article class="card" data-palette=','<article class="card${palette.reference ? \' reference\' : \'\'}" data-palette=');
html=html.replace('<h2>${palette.id} · ${palette.name}</h2>','<div><h2>${palette.id} · ${palette.name}</h2>${palette.reference ? \'<small>Остаётся в отборе</small>\' : \'\'}</div>');
html=html.replace('    .card[hidden] { display: none; }','    .card[hidden] { display: none; }\n    .card.reference { grid-column: 1 / -1; }\n    .cards:not(.single) .reference .light { min-height: 126px; padding-top: 14px; }\n    .cards:not(.single) .reference .inverted, .cards:not(.single) .reference .header-label, .cards:not(.single) .reference .sample-header, .cards:not(.single) .reference .codes { display: none; }\n    .card-title small { display: block; margin-top: 4px; font-size: 12px; opacity: .7; }');
const start=html.indexOf("        const canvas=document.createElement('canvas');");
const end=html.indexOf('        const blob=await',start);
assert.ok(start>=0&&end>start,'Expected the original PNG export block');
const comparisonExport=`        const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1620;
        const context=canvas.getContext('2d');context.fillStyle='#EAEAE5';context.fillRect(0,0,2048,1620);
        const reference=palettes.find(palette=>palette.reference);
        context.fillStyle=reference.paper;context.fillRect(48,48,1952,300);
        context.fillStyle=reference.ink;context.font='600 30px system-ui,sans-serif';context.fillText('02 · Кобальт — остаётся в отборе',86,105);
        await drawSvg(context,coloredSvg(reference),614,130,820);
        const newPalettes=palettes.filter(palette=>!palette.reference);
        for(let index=0;index<newPalettes.length;index++) {
          const palette=newPalettes[index],x=48+(index%2)*996,y=388+Math.floor(index/2)*612,w=956,h=572;
          context.fillStyle=palette.paper;context.fillRect(x,y,w,h);
          context.fillStyle=palette.ink;context.font='600 30px system-ui,sans-serif';context.fillText(palette.id+' · '+palette.name,x+38,y+58);
          for(const [colorIndex,color] of [palette.primary,palette.ink,palette.paper,palette.accent].entries()) {
            context.beginPath();context.arc(x+w-150+colorIndex*30,y+48,10,0,Math.PI*2);context.fillStyle=color;context.fill();
          }
          await drawSvg(context,coloredSvg(palette),x+68,y+130,820);
          context.fillStyle=palette.ink;context.font='18px system-ui,sans-serif';context.fillText(palette.primary+'  ·  '+palette.ink+'  ·  '+palette.paper,x+38,y+408);
          context.fillStyle=palette.dark;context.fillRect(x,y+h-112,w,112);
          await drawSvg(context,coloredSvg(palette,true),x+(w-340)/2,y+h-96,340);
        }
`;
html=html.slice(0,start)+comparisonExport+html.slice(end);
html=html.replace('TASTIQ-palettes-${mode}.png','TASTIQ-palettes-round2-${mode}.png');
await writeFile(new URL('palettes-v2.html',root),html);
console.log('Round 2: original cobalt02 retained; four new palettes05–08. Previous series preserved.');
