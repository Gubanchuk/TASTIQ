// Offline stand with synthetic players / viewers (people.js): they answer the first screen honestly by a hidden taste.
// Compares asking «за что» with not asking and with a genre baseline; src/stand/ask-stand.js adds the dialogue's
// adaptive questions.
//
// Usage: node src/stand/simulate.js [domain=game] [people=200]
import { editionsOf, loadCatalogs } from '../core/catalog.js';
import { seedItems } from '../core/questions.js';
import { recommend } from '../core/recommend.js';
import { createPeople } from './people.js';

const DOMAIN = process.argv[2] ?? 'game';
const PEOPLE = Number(process.argv[3] ?? 200);
const catalog = loadCatalogs()[DOMAIN];
const { makePerson, answer, hit, strong } = createPeople(catalog);

/** Baseline: popular, well-rated titles sharing a genre with liked ones ("люблю RPG — вот RPG"). */
function genreBaseline(answers, k) {
  const consumed = new Set(Object.entries(answers).filter(([, a]) => a.reaction !== 'unknown').flatMap(([id]) => editionsOf(catalog, id)));
  const liked = Object.entries(answers).filter(([, a]) => a.reaction === 'love' || a.reaction === 'like').map(([id]) => catalog.byId.get(id));
  const genres = new Set(liked.flatMap((g) => g.genres.filter((x) => !['Action', 'Indie', 'Free to Play', 'Early Access', 'Drama'].includes(x))));
  return catalog.items
    .filter((g) => g.released && !consumed.has(g.id) && g.quality >= catalog.domain.qualityFloor && g.genres.some((x) => genres.has(x)))
    .sort((a, b) => b.popularity + 3 * b.quality - (a.popularity + 3 * a.quality))
    .slice(0, k);
}

const variants = ['с «за что»', 'без «за что»', 'по жанру'];
const totals = Object.fromEntries(variants.map((v) => [v, { hit1: 0, hit4: 0, strong4: 0, n: 0 }]));
const bySeeds = {};
const score = (t, p, shown) => {
  t.n++;
  t.hit1 += shown[0] && hit(p, shown[0]) ? 1 : 0;
  t.hit4 += shown.filter((g) => hit(p, g)).length / Math.max(1, shown.length);
  t.strong4 += shown.some((g) => strong(p, g)) ? 1 : 0;
};

for (let i = 0; i < PEOPLE; i++) {
  const person = makePerson();
  const seeds = [...seedItems(catalog, { n: 10, seed: 1000 + i }), ...seedItems(catalog, { n: 10, seed: 5000 + i })];
  const unique = [...new Map(seeds.map((g) => [g.id, g])).values()];
  for (const withReasons of [true, false]) {
    const answers = {};
    for (const g of unique.slice(0, 10)) answers[g.id] = answer(person, g, withReasons);
    const r = recommend(catalog, { answers }, {});
    score(totals[withReasons ? 'с «за что»' : 'без «за что»'], person, [r.top, ...r.alternatives].filter(Boolean).map((x) => catalog.byId.get(x.id)));
    if (!withReasons) score(totals['по жанру'], person, genreBaseline(answers, 4));
  }
  for (const n of [3, 5, 10, 15, 20]) {
    const answers = {};
    for (const g of unique.slice(0, n)) answers[g.id] = answer(person, g, true);
    const r = recommend(catalog, { answers }, {});
    const shown = [r.top, ...r.alternatives].filter(Boolean).map((x) => catalog.byId.get(x.id));
    const row = (bySeeds[n] ??= { hit4: 0, n: 0 });
    row.n++;
    row.hit4 += shown.filter((g) => hit(person, g)).length / Math.max(1, shown.length);
  }
}

const pct = (x, n) => `${((x / n) * 100).toFixed(0)}%`;
console.log(`Домен: ${DOMAIN}, ${catalog.items.length} тайтлов. Синтетических людей: ${PEOPLE}. Скрытый вкус: 2 любимых признака и 1 нелюбимый. Отвечают на 10 тайтлов.\n`);
console.log('Вариант        | первый в точку | доля попаданий в 4 показанных | хотя бы один с обоими любимыми');
for (const v of variants) {
  const t = totals[v];
  console.log(`${v.padEnd(14)} | ${pct(t.hit1, t.n).padStart(14)} | ${pct(t.hit4, t.n).padStart(29)} | ${pct(t.strong4, t.n).padStart(30)}`);
}
console.log('\nСколько тайтлов ответить на первом экране (с «за что»): доля попаданий в 4 показанных');
for (const [n, row] of Object.entries(bySeeds)) console.log(`  ${String(n).padStart(2)}: ${pct(row.hit4, row.n)}`);
