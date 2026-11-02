// Read-only check: how many features (and how much r·c mass) the titles that keep winning carry,
// versus the persona targets. Reads data/catalog-screen.json directly, nothing is written to the project.
import { readFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync('E:/project/TASTIQ/data/catalog-screen.json', 'utf8'));
const items = Array.isArray(raw) ? raw : raw.items ?? raw.titles ?? Object.values(raw).find(Array.isArray);
console.log('keys:', Array.isArray(raw) ? 'array' : Object.keys(raw).join(','), 'items:', items.length);
const sample = items.find((x) => x.id === 'tt0246578');
console.log('sample keys:', Object.keys(sample).join(','));
console.log('feature sample:', JSON.stringify(Object.entries(sample.features ?? {}).slice(0, 2)));

const WANT = {
  tt0246578: 'Donnie Darko', tt0414993: 'The Fountain', tt0137523: 'Fight Club', tt1334260: 'Never Let Me Go', tt1441395: 'Under the Skin', tt0069762: 'Badlands',
  tt0468569: 'The Dark Knight', tt1182345: 'Moon', tt0816692: 'Interstellar', tt0107048: 'Groundhog Day', tt1631867: 'Edge of Tomorrow',
  tt2194499: 'About Time', tt0119177: 'Gattaca', tt0118884: 'Contact', tt7282468: 'Burning', tt14039582: 'Drive My Car',
};
const present = (v) => v && v.r >= 0.5 && v.c >= 0.5;
const rows = [];
for (const it of items) {
  if (!WANT[it.id]) continue;
  const fs = Object.entries(it.features ?? {});
  const mass = fs.reduce((a, [, v]) => a + v.r * v.c, 0);
  const srcs = {};
  for (const [, v] of fs) for (const s of v.src ?? []) srcs[s] = (srcs[s] ?? 0) + 1;
  rows.push({ id: it.id, name: WANT[it.id], year: it.year, features: fs.length, present: fs.filter(([, v]) => present(v)).length, mass: mass.toFixed(2), quality: it.quality?.toFixed(3), votes: it.reviews?.total, srcs: JSON.stringify(srcs), llm: Boolean(it.llm || fs.some(([, v]) => (v.src ?? []).includes('llm'))) });
}
rows.sort((a, b) => b.present - a.present);
console.table(rows);

// distribution across the film catalog: how many films have >= N present features
const films = items.filter((x) => x.kind === 'film');
const counts = films.map((x) => Object.values(x.features ?? {}).filter(present).length);
const hist = {};
for (const c of counts) { const b = c >= 30 ? '30+' : c >= 20 ? '20-29' : c >= 10 ? '10-19' : c >= 5 ? '5-9' : c >= 1 ? '1-4' : '0'; hist[b] = (hist[b] ?? 0) + 1; }
console.log('films by number of present features:', JSON.stringify(hist), 'of', films.length);
