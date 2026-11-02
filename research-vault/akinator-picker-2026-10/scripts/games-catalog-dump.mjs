// Dumps catalog facts and features for the given game ids (analysis only, reads data/catalog.json).
import { readFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync('E:/project/TASTIQ/data/catalog.json', 'utf8'));
const items = Array.isArray(raw) ? raw : raw.items ?? raw.games ?? [];
const byId = new Map(items.map((g) => [g.id, g]));
const ids = process.argv.slice(2);

if (!ids.length) {
  console.log('items:', items.length);
  console.log('keys of first item:', Object.keys(items[0]));
  console.log(JSON.stringify(items[0], null, 1).slice(0, 2500));
  const dota = items.filter((g) => /dota/i.test(g.name));
  console.log('dota matches:', dota.map((g) => [g.id, g.name]));
  process.exit(0);
}

for (const id of ids) {
  const g = byId.get(id);
  if (!g) { console.log(`\n### ${id}: NOT IN CATALOG`); continue; }
  const feats = Object.entries(g.features ?? {}).sort((a, b) => b[1].r * b[1].c - a[1].r * a[1].c);
  const present = feats.filter(([, v]) => v.r >= 0.5 && v.c >= 0.5);
  console.log(`\n### ${id} ${g.name} (${g.year ?? '?'}) ru=${g.ru ?? '-'} released=${g.released} quality=${g.quality?.toFixed(2)} popularity=${g.popularity?.toFixed(2)} reviews=${g.reviews?.total} ${g.reviews?.desc ?? ''} medianHours=${g.medianHoursAtReview ?? '-'} platforms=${JSON.stringify(g.platforms)} llm=${g.tagged ?? g.llm ?? '?'}`);
  console.log(`features total=${feats.length}, present(r>=.5,c>=.5)=${present.length}`);
  for (const [f, v] of feats.slice(0, 25)) console.log(`  ${f.padEnd(26)} r=${v.r.toFixed(2)} c=${v.c.toFixed(2)} src=${(v.src ?? []).join(',')}`);
}
