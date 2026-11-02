import { readFileSync } from 'node:fs';
const raw = JSON.parse(readFileSync('E:/project/TASTIQ/data/catalog-screen.json', 'utf8'));
console.log('top keys:', Object.keys(raw).join(','));
const items = raw.items ?? raw.titles ?? [];
console.log('items:', items.length, 'sample keys:', Object.keys(items[0] ?? {}).join(','));
const present = (v) => v && v.r >= 0.5 && v.c >= 0.5;
const byId = new Map(items.map((x) => [x.id, x]));
const show = (id) => {
  const x = byId.get(id);
  if (!x) return console.log(id, 'NOT IN CATALOG');
  const feats = Object.entries(x.features ?? {}).sort((a, b) => b[1].r * b[1].c - a[1].r * a[1].c).map(([f, v]) => `${f}(${v.r.toFixed(2)}/${v.c.toFixed(2)}${v.src ? ':' + (Array.isArray(v.src) ? v.src.join('+') : v.src) : ''})`);
  console.log(`\n${id} ${x.name} [${x.kind}] genres=${(x.genres ?? []).join('/')} q=${x.quality?.toFixed?.(2)} pop=${x.popularity?.toFixed?.(2)} nFeat=${feats.length} llm=${x.llm ?? x.tagged ?? ''}\n  ${feats.join(' ')}`);
};
for (const id of ['tt4477976', 'tt14218830', 'tt10986410', 'tt1439629', 'tt0165598', 'tt10638036', 'tt0108778', 'tt0417349', 'tt4729430', 'tt12801262', 'tt7979580', 'tt2245084', 'tt0461770', 'tt0198781', 'tt0120363', 'tt2953050']) show(id);
// Dr Horrible: find by name
const dr = items.find((x) => /Dr\. Horrible/i.test(x.name)); if (dr) show(dr.id);
const ns = items.filter((x) => /^North (&|and) South$/i.test(x.name) || x.ru === 'Север и Юг'); for (const x of ns) show(x.id);
for (const kind of ['series', 'cartoon']) {
  const set = items.filter((x) => x.kind === kind);
  const cnt = (f) => set.filter((x) => present(x.features?.[f])).length;
  const n5 = set.filter((x) => Object.keys(x.features ?? {}).length >= 5).length;
  console.log(`\n== ${kind}: ${set.length} titles, >=5 features: ${n5}`);
  for (const f of ['humor.funny', 'tone.lighthearted', 'tone.feelgood', 'cognitive.low', 'structure.procedural', 'tension.low', 'content.family', 'audience.kids', 'tone.creepy', 'content.violence', 'characters.friendship', 'humor.silly', 'format.animation']) console.log(`  ${f}: ${cnt(f)}`);
  const comedies = set.filter((x) => (x.genres ?? []).includes('Comedy'));
  console.log(`  genre Comedy: ${comedies.length}, of them with humor.funny present: ${comedies.filter((x) => present(x.features?.['humor.funny'])).length}, with cognitive.low: ${comedies.filter((x) => present(x.features?.['cognitive.low'])).length}`);
}
