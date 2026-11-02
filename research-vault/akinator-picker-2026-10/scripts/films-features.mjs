// Dump feature vectors of given film ids from the catalog file (read-only).
import { readFileSync } from 'node:fs';
const ids = process.argv.slice(2);
const raw = JSON.parse(readFileSync('E:/project/TASTIQ/data/catalog-screen.json', 'utf8'));
const byId = new Map(raw.items.map((x) => [x.id, x]));
for (const id of ids) {
  const it = byId.get(id);
  if (!it) { console.log(`== ${id}: NOT FOUND`); continue; }
  const feats = Object.entries(it.features)
    .sort((a, b) => b[1].r * b[1].c - a[1].r * a[1].c)
    .map(([f, v]) => `${f} r${v.r.toFixed(2)} c${v.c.toFixed(2)} [${(v.src ?? []).join('/')}]`);
  console.log(`== ${id} ${it.ru ?? ''} / ${it.name} (${it.year}) q=${it.quality?.toFixed(2)} pop=${it.popularity?.toFixed(2)} votes=${it.reviews?.total} rating=${it.reviews?.desc} rt=${it.runtime} genres=${(it.genres ?? []).join(',')} nfeat=${feats.length}`);
  for (const f of feats) console.log('   ' + f);
}
