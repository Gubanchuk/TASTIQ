// How common are the flaw tags that penalised the targets, among films that could be shown (q >= 0.62)?
import { readFileSync } from 'node:fs';
const raw = JSON.parse(readFileSync('E:/project/TASTIQ/data/catalog-screen.json', 'utf8'));
const films = raw.items.filter((x) => x.domain === 'film' && x.quality >= 0.62);
const byPop = [...films].sort((a, b) => b.popularity - a.popularity);
const top = byPop.slice(0, 1000);
const has = (x, f, min) => (x.features[f]?.r ?? 0) >= min;
const pct = (arr, f, min) => `${arr.filter((x) => has(x, f, min)).length} из ${arr.length} (${Math.round(100 * arr.filter((x) => has(x, f, min)).length / arr.length)}%)`;
console.log(`фильмов с q>=0.62: ${films.length}; топ-1000 по популярности:`);
for (const [f, min] of [['story.weak', 0.5], ['story.weak', 0.67], ['pace.draggy', 0.5], ['tension.high', 0.5], ['aesthetic.effects', 0.5], ['tone.cheesy', 0.5], ['ending.weak', 0.5], ['cognitive.low', 0.34]]) {
  console.log(`  ${f} r>=${min}: топ-1000 ${pct(top, f, min)}; все ${pct(films, f, min)}`);
}
const scifi = top.filter((x) => has(x, 'world.scifi', 0.67));
console.log(`\nтоп-1000, фантастика (world.scifi r>=0.67): ${scifi.length}; из них story.weak r>=0.67: ${pct(scifi, 'story.weak', 0.67)}; aesthetic.effects r>=0.5: ${pct(scifi, 'aesthetic.effects', 0.5)}`);
const slow = top.filter((x) => has(x, 'pace.slow', 0.67));
console.log(`топ-1000, неторопливые (pace.slow r>=0.67): ${slow.length}; из них pace.draggy r>=0.5: ${pct(slow, 'pace.draggy', 0.5)}`);
const both = top.filter((x) => has(x, 'cognitive.high', 0.5) && has(x, 'cognitive.low', 0.34));
console.log(`топ-1000, и «заставляет думать» r>=0.5, и «не напрягаясь» r>=0.34 одновременно: ${both.length}`);
// tag sources for the whole film set
const src = new Map();
for (const x of films) for (const v of Object.values(x.features)) for (const s of v.src ?? []) src.set(s, (src.get(s) ?? 0) + 1);
console.log(`\nисточники признаков у фильмов q>=0.62: ${[...src].map(([k, v]) => `${k} ${v}`).join(', ')}`);
const llm = films.filter((x) => Object.values(x.features).some((v) => (v.src ?? []).includes('llm')));
console.log(`фильмов с хотя бы одним llm-признаком: ${llm.length}; с >=5 признаками: ${films.filter((x) => Object.keys(x.features).length >= 5).length}`);
// romance + scifi crossover: how many candidates exist for the couple at all
const cross = films.filter((x) => has(x, 'characters.romance', 0.67) && has(x, 'world.scifi', 0.67));
console.log(`\nфильмов с любовная линия r>=0.67 И фантастика r>=0.67: ${cross.length}; топ по популярности: ${cross.sort((a, b) => b.popularity - a.popularity).slice(0, 15).map((x) => `${x.ru ?? x.name} (${x.year})`).join('; ')}`);
