// Usage: node series-cartoons-search.mjs <domain> "q1" "q2" ...   (or --parse <domain> "text")
import { search, parse } from './series-cartoons-lib.mjs';

const [mode, ...rest] = process.argv.slice(2);
if (mode === '--parse') {
  const [domain, ...texts] = rest;
  for (const t of texts) console.log(`"${t}" ->`, JSON.stringify(await parse(domain, t)));
} else {
  const domain = mode;
  for (const q of rest) {
    const r = await search(domain, q);
    console.log(`== ${q}: ${r.slice(0, 4).map((x) => `${x.id} ${x.ru ?? x.name} / ${x.name} (${x.year}, ${x.kind}, ${x.rating})`).join(' ; ') || '(nothing)'}`);
  }
}
