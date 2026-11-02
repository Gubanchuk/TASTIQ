// Peek at the shape of catalog items: keys, a sample item per domain, top-level stats.
import { readFileSync } from 'node:fs';

const games = JSON.parse(readFileSync('E:/project/TASTIQ/data/catalog.json', 'utf8'));
const screen = JSON.parse(readFileSync('E:/project/TASTIQ/data/catalog-screen.json', 'utf8'));
const posters = JSON.parse(readFileSync('E:/project/TASTIQ/data/posters.json', 'utf8'));

const out = {};
out.gamesTop = Object.fromEntries(Object.entries(games).filter(([k]) => k !== 'items' && k !== 'df' && k !== 'idf').map(([k, v]) => [k, v]));
out.screenTop = Object.fromEntries(Object.entries(screen).filter(([k]) => k !== 'items' && k !== 'df' && k !== 'idf').map(([k, v]) => [k, v]));
out.gamesCount = games.items.length;
out.screenCount = screen.items.length;
out.postersCount = Object.keys(posters).length;

const keyCount = (items) => {
  const m = new Map();
  for (const it of items) for (const k of Object.keys(it)) m.set(k, (m.get(k) ?? 0) + 1);
  return Object.fromEntries([...m].sort((a, b) => b[1] - a[1]));
};
out.gameKeys = keyCount(games.items);
out.screenKeys = keyCount(screen.items);

const sampleFull = games.items.find((g) => g.llm || g.tagged);
const sampleTail = games.items.find((g) => !g.llm && !g.tagged);
const strip = (it) => {
  const c = { ...it };
  if (c.features) {
    const fs = Object.entries(c.features).slice(0, 4);
    c.features = Object.fromEntries(fs);
    c.featureCount = Object.keys(it.features).length;
  }
  for (const k of ['reviews']) if (c[k] && typeof c[k] === 'object') c[k] = { ...c[k] };
  if (Array.isArray(c.reviewTexts)) c.reviewTexts = c.reviewTexts.length;
  return c;
};
out.sampleGameFull = strip(sampleFull);
out.sampleGameTail = strip(sampleTail);
for (const d of ['film', 'series', 'cartoon']) {
  out[`sample_${d}_llm`] = strip(screen.items.find((x) => x.domain === d && x.llm));
  out[`sample_${d}_plain`] = strip(screen.items.find((x) => x.domain === d && !x.llm && !x.tagged));
}
console.log(JSON.stringify(out, null, 1).slice(0, 14000));
