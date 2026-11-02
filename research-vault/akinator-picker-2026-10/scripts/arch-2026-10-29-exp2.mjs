// Architect experiments 2026-10-29, part 2 (read-only on the project).
// A. Length coverage of games: hours and length.* tags, overall, in the head, and among each game run's 60 leaders.
// B. Films by year bucket: share with LLM tags and with 5+ confident features (does «свежее» have anything to pick?).
// C. Lazy personas with one more anchors page (emulated by cloning the persona modes).
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const ROOT = 'E:/project/TASTIQ';
const mod = (p) => import(pathToFileURL(resolve(ROOT, p)).href);
const { loadCatalogs } = await mod('src/core/catalog.js');
const { play, loadPersonas } = await mod('src/stand/personas.js');
const { profileOf, sessionOf } = await mod('src/core/dialogue.js');
const { rankAll } = await mod('src/core/recommend.js');

const catalogs = loadCatalogs();
const personas = loadPersonas();
const present = (v) => v && v.r >= 0.5 && v.c >= 0.5;
const pct = (a, b) => `${a}/${b} (${b ? Math.round((100 * a) / b) : 0}%)`;

console.log('=== A. Games: length coverage ===');
const games = catalogs.game;
const hours = (g) => g.medianHoursAtReview != null && g.medianHoursAtReview > 0;
const lenTag = (g) => Object.keys(g.features).some((f) => f.startsWith('length.') && present(g.features[f]));
const lenFeatures = [...games.dict.featureById.values()].filter((f) => f.id.startsWith('length.') || f.id.startsWith('session.')).map((f) => `${f.id} «${f.label}»`);
console.log('length/session features in dict:', lenFeatures.join(', '));
const all = games.items.filter((g) => g.released && g.quality >= games.domain.qualityFloor);
const head = [...all].sort((a, b) => b.popularity - a.popularity).slice(0, 500);
console.log(`all above floor ${all.length}: hours ${pct(all.filter(hours).length, all.length)}, length tag ${pct(all.filter(lenTag).length, all.length)}, either ${pct(all.filter((g) => hours(g) || lenTag(g)).length, all.length)}`);
console.log(`head 500 by popularity: hours ${pct(head.filter(hours).length, 500)}, length tag ${pct(head.filter(lenTag).length, 500)}, either ${pct(head.filter((g) => hours(g) || lenTag(g)).length, 500)}`);
const tail = all.filter((g) => !head.includes(g));
console.log(`tail ${tail.length}: hours ${pct(tail.filter(hours).length, tail.length)}, length tag ${pct(tail.filter(lenTag).length, tail.length)}`);
console.log('time options for games in dict:', JSON.stringify(games.domain.time ?? null), '| pairs:', (games.dict.pairs ?? []).map((p) => `${p.a}|${p.b}`).join(', '));

const runs = [];
for (const P of personas) for (const mode of ['careful', 'lazy']) runs.push(play(P, mode, catalogs));
for (const run of runs.filter((r) => r.persona.domain === 'game')) {
  const st = run.finalState;
  const { ranked } = rankAll(games, profileOf(st), sessionOf(st));
  const top = ranked.slice(0, 60).map((r) => r.game);
  const long = top.filter((g) => hours(g) && g.medianHoursAtReview >= 30).length;
  const short = top.filter((g) => (hours(g) && g.medianHoursAtReview <= 12) || present(g.features['length.short'])).length;
  const lead = ranked[0].game;
  console.log(`${run.persona.id} ${run.mode}: top-60 hours ${top.filter(hours).length}, length tag ${top.filter(lenTag).length}, either ${top.filter((g) => hours(g) || lenTag(g)).length}; long(≥30h) ${long}, short(≤12h or tag) ${short} | leader ${lead.name}: hours ${lead.medianHoursAtReview ?? '-'}, tags ${Object.keys(lead.features).filter((f) => f.startsWith('length.')).join(',') || '-'}`);
  for (const t of run.persona.targets) {
    const g = games.byId.get(t.id);
    console.log(`   target ${t.name}: hours ${g.medianHoursAtReview ?? '-'}, length tags ${Object.entries(g.features).filter(([f]) => f.startsWith('length.')).map(([f, v]) => `${f} r${v.r} c${v.c}`).join(', ') || '-'}, confident features ${Object.values(g.features).filter(present).length}`);
  }
}

console.log('\n=== B. Films by year: LLM tags and 5+ confident taste features ===');
const screen = catalogs.film;
const likeable = new Set([...screen.dict.featureById.values()].filter((f) => f.like && !f.risk).map((f) => f.id));
const films = screen.items.filter((g) => g.released && g.quality >= screen.domain.qualityFloor && g.kind === 'film');
const buckets = [[0, 1999], [2000, 2009], [2010, 2014], [2015, 2018], [2019, 2021], [2022, 2026]];
const conf = (g) => Object.entries(g.features).filter(([f, v]) => present(v) && likeable.has(f)).length;
const hasLLM = (g) => Boolean(g.llm) || Object.values(g.features).some((v) => (v.sources ?? v.src ?? []).some?.((s) => /llm|wiki/i.test(String(s))));
console.log('sample film feature value keys:', JSON.stringify(Object.values(films[0].features)[0]), '| item keys:', Object.keys(films[0]).join(','));
for (const [a, b] of buckets) {
  const xs = films.filter((g) => g.year >= a && g.year <= b);
  const pop = [...xs].sort((x, y) => y.popularity - x.popularity).slice(0, 300);
  console.log(`${a}–${b}: films ${xs.length}; 5+ taste features ${pct(xs.filter((g) => conf(g) >= 5).length, xs.length)}; top-300 by popularity: 5+ ${pct(pop.filter((g) => conf(g) >= 5).length, pop.length)}, median taste features ${[...pop.map(conf)].sort((x, y) => x - y)[Math.floor(pop.length / 2)] ?? '-'}`);
}
// what the engine would show a film-lover who answers «свежее»: share of 2019+ among the top-60 of the couple/cinephile runs with era=new
for (const run of runs.filter((r) => r.persona.domain === 'film')) {
  const st = run.finalState;
  const sess = { ...sessionOf(st), era: 'new' };
  const { ranked } = rankAll(screen, profileOf(st), sess);
  const top = ranked.slice(0, 20).map((r) => r.game.year);
  console.log(`${run.persona.id} ${run.mode} with era=new: top-20 years ${top.join(' ')} | 2019+ among top-20: ${top.filter((y) => y >= 2019).length}`);
}

console.log('\n=== C. Lazy personas with one more anchors page ===');
const med = (xs) => { const v = [...xs].sort((a, b) => a - b); return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2; };
const base = runs.filter((r) => r.mode === 'lazy');
const more = personas.map((P) => {
  const Q = structuredClone(P);
  const a = Q.modes.lazy.anchors;
  a.pages = (a.untilHit ? 1 : a.pages ?? 1) + 1;
  a.untilHit = false;
  if (a.maxTicks != null) a.maxTicks += 2;
  return play(Q, 'lazy', catalogs);
});
for (let i = 0; i < base.length; i++) {
  const a = base[i], b = more[i];
  const marks = (r) => r.actions.find((x) => x.type === 'react')?.marks.length ?? 0;
  const shown = (r) => r.targets.filter((t) => t.shown).length;
  console.log(`${a.persona.id} lazy: marks ${marks(a)}→${marks(b)}, screens ${a.screens}→${b.screens}, taps ${a.taps}→${b.taps}, targets shown ${shown(a)}→${shown(b)}, best ${a.best?.why.rank}→${b.best?.why.rank}, top ${a.results[0].top.ru ?? a.results[0].top.name} → ${b.results[0].top.ru ?? b.results[0].top.name}`);
}
const tot = (rs) => rs.reduce((n, r) => n + r.targets.filter((t) => t.shown).length, 0);
console.log(`lazy totals: targets shown ${tot(base)}→${tot(more)}, median best ${med(base.map((r) => r.best.why.rank))}→${med(more.map((r) => r.best.why.rank))}`);
