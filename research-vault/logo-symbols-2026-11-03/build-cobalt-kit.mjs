import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const root=new URL('./',import.meta.url);
const palette=JSON.parse(await readFile(new URL('palette-options.json',root),'utf8')).find(option=>option.id==='02');
assert.equal(palette.primary,'#3154D6');
const kit=new URL('brand-cobalt-v1/',root);
await mkdir(new URL('svg/',kit),{recursive:true});
await mkdir(new URL('png/',kit),{recursive:true});
for(const kind of ['logo','symbol','wordmark']){
  const original=await readFile(new URL(`exports/tastiq-${kind}.svg`,root),'utf8');
  for(const [suffix,color]of [['cobalt',palette.primary],['inverse',palette.inverse],['white','#FFFFFF'],['black','#000000']]){
    await writeFile(new URL(`svg/tastiq-${kind}-${suffix}.svg`,kit),original.replace('fill="#000"',`fill="${color}"`));
  }
  if(kind==='logo'){
    let index=0;
    const accent=original.replace(/<path\b/g,()=>`<path fill="${index++===0?palette.primary:palette.ink}"`);
    await writeFile(new URL('svg/tastiq-logo-accent.svg',kit),accent);
  }
}
await writeFile(new URL('svg/favicon.svg',kit),await readFile(new URL('svg/tastiq-symbol-cobalt.svg',kit)));
const colors={brand:'TASTIQ',selectedSymbol:'5B',selectedWordmark:'02 — uppercase',selectedPalette:'02 — Кобальт',...palette};
await writeFile(new URL('palette.json',kit),JSON.stringify(colors,null,2)+'\n');
await writeFile(new URL('tokens.css',kit),`:root {\n  --tastiq-primary: ${palette.primary};\n  --tastiq-ink: ${palette.ink};\n  --tastiq-paper: ${palette.paper};\n  --tastiq-dark: ${palette.dark};\n  --tastiq-on-dark: ${palette.inverse};\n  --tastiq-accent: ${palette.accent};\n}\n`);
await writeFile(new URL('README.md',kit),`# TASTIQ — Кобальт\n\nВыбрано владельцем 03.11.2026: медведь5B, прописное написание02 и палитра02 «Кобальт».\n\nОсновной логотип целиком кобальтовый. На тёмном фоне используется светлая обратная версия. SVG содержит контуры знака и букв, шрифт устанавливать не требуется.\n\n|Роль|Цвет|\n|---|---|\n|Основной|${palette.primary}|\n|Текст|${palette.ink}|\n|Светлый фон|${palette.paper}|\n|Тёмный фон|${palette.dark}|\n|Логотип на тёмном фоне|${palette.inverse}|\n|Дополнительный|${palette.accent}|\n\nВ svg/: logo — связка, symbol — медведь, wordmark — надпись. cobalt/inverse — основные цветные версии, black/white — монохромные. logo-accent — дополнительная версия с цветным знаком и тёмной надписью. favicon.svg — отдельный знак для вкладки браузера.\n\nВ png/: прозрачные логотипы4560×1108, знак1024×1024, favicon16/32, apple-touch-icon180 и превью на двух фонах. PNG отрисованы из этих SVG нативным браузером.\n\nМасштабировать с сохранением пропорций; внутренний просвет медведя остаётся прозрачным. Палитра и токены приложены отдельно, чтобы переносить их в интерфейс отдельным изменением. История поиска и генеративные эскизы в комплект не включены.\n`);
console.log('Cobalt SVG package prepared. PNG rendering follows in the native browser.');
