import {readFileSync,writeFileSync} from 'node:fs';
const raw=JSON.parse(readFileSync(new URL('../../../data/catalog.json',import.meta.url),'utf8'));
const live=JSON.parse(readFileSync(new URL('../../familiar-games-2026-11/live/plan.json',import.meta.url),'utf8'));
const fold=value=>String(value??'').toLowerCase().replace(/ё/g,'е').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const cases=['Skyrim','Скайрим','RDR2','BG3','Ведьмак3','Ведьмак 3','The Elder Scrolls V: Skyrim Special Edition','Baldur’s Gate 3','Red Dead Redemption 2','control','portal','Я хочу контроль над героем, а не портал в другой мир','Portal 2','Skyrim Special Edition','The Elder Scrolls V: Skyrim'];
const report={at:new Date().toISOString(),catalogItems:raw.items.length,method:'Current pre-change conversation-service exact name/ru/original substring at word boundaries; no API',
  cases:cases.map(text=>({text,matches:raw.items.filter(g=>[g.name,g.ru,g.original].filter(Boolean).map(fold).filter(n=>n.length>=3).some(n=>` ${fold(text)} `.includes(` ${n} `))).map(g=>({id:g.id,name:g.name,ru:g.ru,work:g.work}))})),
  canonicalTargets:raw.items.filter(g=>/skyrim|baldur.*gate 3|red dead redemption 2|witcher.*3|control|^portal/i.test(g.name)).map(g=>({id:g.id,name:g.name,ru:g.ru,aliases:g.aliases,work:g.work})),
  liveSkyrim:(live.state?.facts??live.facts??[]).filter(f=>/skyrim/i.test(JSON.stringify(f)))};
writeFileSync(new URL('./before.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
process.stdout.write(JSON.stringify(report,null,2));
