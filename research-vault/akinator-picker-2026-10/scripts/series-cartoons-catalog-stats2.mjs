import { readFileSync } from 'node:fs';
const raw = JSON.parse(readFileSync('E:/project/TASTIQ/data/catalog-screen.json', 'utf8'));
const items = raw.items;
const present = (v) => v && v.r >= 0.5 && v.c >= 0.5;
for (const domain of ['series', 'cartoon']) {
  const set = items.filter((x) => x.domain === domain);
  const cnt = (f) => set.filter((x) => present(x.features?.[f])).length;
  const n5 = set.filter((x) => Object.keys(x.features ?? {}).length >= 5).length;
  const llm = set.filter((x) => x.llm).length;
  const genome = set.filter((x) => Object.values(x.features ?? {}).some((v) => String(v.src).includes('genome'))).length;
  console.log(`\n== domain ${domain}: ${set.length} titles; >=5 features: ${n5}; llm: ${llm}; genome: ${genome}`);
  for (const f of ['humor.funny', 'tone.lighthearted', 'tone.feelgood', 'cognitive.low', 'structure.procedural', 'structure.serialized', 'tension.low', 'tension.high', 'content.family', 'audience.kids', 'audience.adult', 'tone.creepy', 'content.violence', 'content.disturbing', 'tone.dark', 'characters.friendship', 'characters.ensemble', 'humor.silly', 'length.short', 'length.long']) console.log(`  ${f}: ${cnt(f)}`);
  const comedies = set.filter((x) => (x.genres ?? []).includes('Comedy'));
  console.log(`  genre Comedy: ${comedies.length}; humor.funny present among them: ${comedies.filter((x) => present(x.features?.['humor.funny'])).length}; Comedy with llm: ${comedies.filter((x) => x.llm).length}`);
  if (domain === 'cartoon') {
    const q = set.filter((x) => x.released && x.quality >= 0.62);
    console.log(`  cartoons kind=series: ${set.filter((x) => x.kind === 'series').length}; kind=film: ${set.filter((x) => x.kind === 'film').length}`);
    console.log(`  content.family r>=0.5 (sieve 5 test): ${set.filter((x) => x.features?.['content.family']?.r >= 0.5).length}`);
    const noFam = set.filter((x) => !(x.features?.['content.family']?.r >= 0.5) && (x.genres ?? []).includes('Family'));
    console.log(`  genre Family but no content.family>=0.5 (cut by «Смотрю с детьми»): ${noFam.length}; e.g. ${noFam.slice(0, 8).map((x) => x.ru ?? x.name).join(' | ')}`);
    const fakeToons = set.filter((x) => x.kind === 'film' && ['tt0461770', 'tt0087332', 'tt0047977'].includes(x.id)).map((x) => x.name);
    console.log('  live-action in cartoons check:', fakeToons.join(', '));
  }
  if (domain === 'series') {
    const sitcomish = set.filter((x) => (x.genres ?? []).includes('Comedy') && x.kind === 'series' && !(x.genres ?? []).includes('Animation'));
    console.log(`  live-action Comedy series: ${sitcomish.length}; with any of lighthearted/feelgood/cognitive.low present: ${sitcomish.filter((x) => ['tone.lighthearted', 'tone.feelgood', 'cognitive.low'].some((f) => present(x.features?.[f]))).length}`);
  }
}
