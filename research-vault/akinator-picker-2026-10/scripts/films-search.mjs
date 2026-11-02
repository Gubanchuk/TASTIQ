// Search film titles in the catalog. Usage: node films-search.mjs "title1" "title2" ...
const BASE = 'http://localhost:5173';
const queries = process.argv.slice(2);
for (const q of queries) {
  const res = await fetch(`${BASE}/api/search?domain=film&q=${encodeURIComponent(q)}`);
  const items = await res.json();
  const top = items.slice(0, 4).map((x) => `${x.id} | ${x.ru ?? ''} / ${x.name} (${x.year}) ${x.rating ?? ''} [${(x.genres ?? []).join(',')}]`);
  console.log(`== ${q}: ${items.length} hits`);
  for (const t of top) console.log('   ' + t);
}
