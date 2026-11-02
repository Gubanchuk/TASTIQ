// Hours at review vs the length tags the LLM gave: can hours stand in for a missing length tag, and for which games?
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const ROOT = 'E:/project/TASTIQ';
const { loadCatalogs } = await import(pathToFileURL(resolve(ROOT, 'src/core/catalog.js')).href);
const { DATA } = await import(pathToFileURL(resolve(ROOT, 'src/lib/fsx.js')).href);
const games = loadCatalogs({ screenPath: resolve(DATA, '__none__.json') }).game;
const present = (v) => v && v.r >= 0.5 && v.c >= 0.5;
const has = (g, f) => present(g.features[f]);
const hours = (g) => (g.medianHoursAtReview != null && g.medianHoursAtReview > 0 ? g.medianHoursAtReview : null);
const all = games.items.filter((g) => g.released && g.quality >= games.domain.qualityFloor && hours(g) != null);
const q = (xs, p) => { const v = [...xs].sort((a, b) => a - b); return v[Math.floor((v.length - 1) * p)]; };
const dist = (xs) => `n ${xs.length}: p10 ${q(xs, 0.1)} p25 ${q(xs, 0.25)} med ${q(xs, 0.5)} p75 ${q(xs, 0.75)} p90 ${q(xs, 0.9)}`;
const H = (test) => all.filter(test).map(hours);
console.log('hours by LLM length tag (games with hours):');
for (const f of ['length.short', 'length.long', 'length.endless']) console.log(`  ${f}: ${dist(H((g) => has(g, f)))}`);
console.log('hours by play mode:');
for (const f of ['social.solo', 'social.coop', 'social.pvp', 'story.central']) console.log(`  ${f}: ${dist(H((g) => has(g, f)))}`);
const story = (g) => has(g, 'story.central') || (has(g, 'social.solo') && !has(g, 'social.pvp') && !has(g, 'length.endless'));
console.log(`  story-like (story.central, or solo without pvp/endless): ${dist(H(story))}`);
console.log(`  not story-like: ${dist(H((g) => !story(g)))}`);
// Precision of thresholds against the tags, within story-like games that have a tag
const tagged = all.filter((g) => story(g) && (has(g, 'length.short') || has(g, 'length.long')));
const rule = (h) => (h <= 10 ? 'short' : h >= 40 ? 'long' : null);
let agree = 0, disagree = 0, none = 0;
const wrong = [];
for (const g of tagged) {
  const r = rule(hours(g));
  const t = has(g, 'length.short') ? 'short' : 'long';
  if (!r) none++; else if (r === t) agree++; else { disagree++; wrong.push(`${g.name} (${hours(g)} ч, тег ${t})`); }
}
console.log(`story-like with a tag: ${tagged.length}; rule ≤10/≥40 agrees ${agree}, disagrees ${disagree}, between ${none}; disagreements: ${wrong.slice(0, 12).join('; ')}`);
// Coverage the rule would add among the head (top-500), story-like only
const head = games.items.filter((g) => g.released && g.quality >= games.domain.qualityFloor).sort((a, b) => b.popularity - a.popularity).slice(0, 500);
const noTag = (g) => !has(g, 'length.short') && !has(g, 'length.long') && !has(g, 'length.endless');
const gain = head.filter((g) => noTag(g) && story(g) && hours(g) != null && rule(hours(g)));
console.log(`head 500: without any length tag ${head.filter(noTag).length}; of them story-like with hours and inside the rule: ${gain.length} (short ${gain.filter((g) => rule(hours(g)) === 'short').length}, long ${gain.filter((g) => rule(hours(g)) === 'long').length})`);
for (const n of ['Persona 4 Golden', 'The Witcher 3: Wild Hunt', 'Disco Elysium - The Final Cut', 'Firewatch', 'Portal 2', 'What Remains of Edith Finch', 'Stardew Valley', 'Counter-Strike 2', 'Hades', 'The Outer Worlds', 'Divinity: Original Sin 2 - Definitive Edition', 'Tales from the Borderlands', "Baldur's Gate 3", 'Red Dead Redemption 2', 'Life is Strange - Episode 1', 'Detroit: Become Human']) {
  const g = games.items.find((x) => x.name === n || x.name.startsWith(n));
  if (g) console.log(`  ${g.name}: ${hours(g) ?? '-'} ч; tags ${['length.short', 'length.long', 'length.endless'].filter((f) => has(g, f)).join(',') || '-'}; story-like ${story(g)}; rule ${hours(g) ? rule(hours(g)) : '-'}`);
}
