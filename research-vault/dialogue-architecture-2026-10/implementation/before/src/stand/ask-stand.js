// Stand for the adaptive questions (plan step 5, research-vault/akinator-picker-2026-10/SUMMARY.md).
// Synthetic people (people.js) go through what the dialogue asks: ten familiar titles with reactions, «за что»
// about two of them (loved first), «что не так» about one; then they answer the adaptive questions honestly.
// Besides the hidden taste (two liked features, one disliked) each person has a mood for tonight: for every
// curated pair of the domain («в напряжении или спокойное») one side with probability 1/4 each, no preference
// with 1/2. A hit has a liked feature, not the disliked one, and not the opposite side of tonight's mood; the fixed
// screens never ask the mood any more (plan step 3), so only the adaptive questions can learn it. After every
// question the shown titles are scored, so one pass gives the curve «hits against the number of questions» for 0–5
// questions. A pair is answered by tonight's side, else by the side the person likes (or that is not the disliked
// feature), else «всё равно»; facts get «всё равно»; «уже видел?» by whether the person knows the title.
// The row «настроение известно» applies the whole mood before the result: the most questions about it can give.
//
// Usage: node src/stand/ask-stand.js [game|film|series|all] [people=100] [--grid] [--noise 0.15] [--set name=value ...] [--games catalog.json] [--truth catalog.json] [--screen catalog-screen.json] [--pages coverage|site]
//   names: tau, K, pStop (belief.js), M, gMin (ask.js), okayInfer (profile.js). --grid runs the parameter sweep
//   and writes research-vault/akinator-picker-2026-10/eval/stand-<date>.md.
//   --screen <catalog-screen.json> runs on another version of the screen data. --live-pool draws the tastes from the
//   current tags instead of the frozen src/stand/pools.json (people.js); such runs do not compare across data.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ASK, nextQuestion } from '../core/ask.js';
import { BELIEF } from '../core/belief.js';
import { loadCatalogs } from '../core/catalog.js';
import { applyAnswer, initialState, MAX_WHY, MAX_WHY_NOT, profileOf, sessionOf } from '../core/dialogue.js';
import { TASTE } from '../core/profile.js';
import { seedItems } from '../core/questions.js';
import { choose, rankAll } from '../core/recommend.js';
import { ROOT } from '../lib/fsx.js';
import { createPeople } from './people.js';

const MAX_ASK = 5;
const MOOD_SIDE = 0.25; // probability of each side of a curated pair in tonight's mood

// Tonight's mood comes from its own generator, so the people and their answers stay those of simulate.js.
function moodOf(catalog, person, index) {
  let state = 777 + index;
  const rand = () => ((state = (state * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const sides = [];
  for (const pair of catalog.dict.pairs ?? []) {
    const r = rand();
    let side = r < MOOD_SIDE ? pair.a : r < 2 * MOOD_SIDE ? pair.b : null;
    if (person.likes.includes(pair.a) || person.likes.includes(pair.b)) side = person.likes.includes(pair.a) ? pair.a : pair.b;
    if (side) sides.push({ f: side, against: side === pair.a ? pair.b : pair.a, label: pair.labels[side === pair.a ? 0 : 1] });
  }
  return sides;
}
const DEFAULTS = { tau: BELIEF.tau, K: BELIEF.K, pStop: BELIEF.pStop, M: ASK.M, gMin: ASK.gMin, okayInfer: TASTE.okayInfer };

// Parameters live in module objects; a run sets them and puts them back.
function withParams(set, fn) {
  const saved = { ...DEFAULTS };
  const p = { ...DEFAULTS, ...set };
  Object.assign(BELIEF, { tau: p.tau, K: p.K, pStop: p.pStop });
  Object.assign(ASK, { M: p.M, gMin: p.gMin });
  TASTE.okayInfer = p.okayInfer;
  try { return fn(); } finally {
    Object.assign(BELIEF, { tau: saved.tau, K: saved.K, pStop: saved.pStop });
    Object.assign(ASK, { M: saved.M, gMin: saved.gMin });
    TASTE.okayInfer = saved.okayInfer;
  }
}

/** One pass of the stand: totals per number of questions allowed (0..MAX_ASK). */
// `truth`: the catalog whose tags the people answer by and the judge scores by, when the engine picks from another
// one; comparing two engines' catalogs with one judge keeps a data change from moving the yardstick.
// `pages`: 'coverage' (two coverage pages merged to ten titles, as the stand always did) or 'site' (as the site does
// since 29.10: the eight best known titles, then one more page only when fewer than two of them are known).
export function runStand(catalog, { people = 100, set = {}, noise = 0, pool = 'frozen', truth = catalog, pages = 'coverage' } = {}) {
  return withParams(set, () => {
    const { makePerson, answer, hit: tasteHit, strong: tasteStrong, has, rand } = createPeople(truth, { pool });
    const T = (g) => truth.byId.get(g.id) ?? g;
    const blank = () => ({ hit1: 0, strong1: 0, hit4: 0, strong4: 0, seen1: 0, asked: 0 });
    const rows = Array.from({ length: MAX_ASK + 1 }, blank);
    const known = blank();
    const fits = (person, g) => person.mood.every((m) => !has(T(g), m.against));
    const hit = (person, g) => tasteHit(person, T(g)) && fits(person, g);
    const strong = (person, g) => tasteStrong(person, T(g)) && fits(person, g);
    const score = (person, shown) => ({
      hit1: shown[0] && hit(person, shown[0]) ? 1 : 0,
      strong1: shown[0] && strong(person, shown[0]) ? 1 : 0,
      hit4: shown.filter((g) => hit(person, g)).length / Math.max(1, shown.length),
      strong4: shown.some((g) => strong(person, g)) ? 1 : 0,
      seen1: shown[0] && person.known.has(shown[0].id) ? 1 : 0,
    });

    const reply = (person, q) => {
      if (q.kind === 'lean' || q.kind === 'pair') {
        const [a, b] = q.options.map((o) => o.value);
        const side = person.mood.find((m) => (m.f === a && m.against === b) || (m.f === b && m.against === a));
        let v = side ? side.f : null;
        if (!v && person.likes.includes(a) !== person.likes.includes(b)) v = person.likes.includes(a) ? a : b;
        else if (!v && (a === person.dislike) !== (b === person.dislike)) v = a === person.dislike ? b : a;
        if (v && noise && rand() < noise) v = v === a ? b : a; // an answer that contradicts the taste
        return v;
      }
      if (q.kind === 'guess') {
        const id = q.id.slice('guess:'.length);
        if (!person.known.has(id)) return 'no';
        return tasteHit(person, T(catalog.byId.get(id))) ? 'like' : 'dislike';
      }
      return null;
    };

    for (let i = 0; i < people; i++) {
      const person = makePerson();
      person.mood = moodOf(truth, person, i);
      // The pages of known titles come from the truth catalog too: a data change also reshuffles them (new features
      // change the coverage gain), and that would hide what the engine itself does with the data.
      let unique;
      if (pages === 'site') {
        unique = seedItems(truth, { n: 8, first: true });
        if (unique.filter((g) => person.known.has(g.id)).length < 2) unique = [...unique, ...seedItems(truth, { n: 8, answered: unique.map((g) => g.id), seed: 1000 + i })];
      } else {
        const seeds = [...seedItems(truth, { n: 10, seed: 1000 + i }), ...seedItems(truth, { n: 10, seed: 5000 + i })];
        unique = [...new Map(seeds.map((g) => [g.id, g])).values()].slice(0, 10);
      }
      // As the dialogue asks: reactions to all ten, «за что» about two (loved first), «что не так» about one.
      const full = unique.map((g) => [g.id, answer(person, T(g), true)]);
      const liked = [...full.filter(([, a]) => a.reaction === 'love'), ...full.filter(([, a]) => a.reaction === 'like')].slice(0, MAX_WHY).map(([id]) => id);
      const disliked = full.filter(([, a]) => a.reaction === 'dislike').slice(0, MAX_WHY_NOT).map(([id]) => id);
      const answers = Object.fromEntries(full.map(([id, a]) => {
        if (a.reaction === 'love' || a.reaction === 'like') return [id, { reaction: a.reaction, reasons: liked.includes(id) ? a.reasons ?? [] : [], issues: [] }];
        if (a.reaction === 'dislike') return [id, { reaction: 'dislike', issues: disliked.includes(id) ? a.issues ?? [] : [] }];
        return [id, a];
      }));
      const state = { ...initialState(), domain: catalog.domain.id, step: 'ask', answers, shown: unique.map((g) => g.id) };
      const all = structuredClone(state);
      all.situation.leans = person.mood.map((m) => ({ ...m }));
      const best = score(person, choose(rankAll(catalog, profileOf(all), sessionOf(all)).ranked).picked.map((r) => r.game));
      for (const key of Object.keys(best)) known[key] += best[key];

      let stopped = false;
      let last = null;
      for (let k = 0; k <= MAX_ASK; k++) {
        if (!stopped || !last) {
          const rank = rankAll(catalog, profileOf(state), sessionOf(state));
          const shown = choose(rank.ranked).picked.map((r) => r.game);
          last = score(person, shown);
          if (k < MAX_ASK && !stopped) {
            const q = nextQuestion(catalog, profileOf(state), sessionOf(state), { asked: state.asked, shown: state.shown, rank }, { max: MAX_ASK });
            if (!q) stopped = true;
            else {
              const v = reply(person, q);
              if (v) applyAnswer(state, q, v);
              else state.asked.push(q.id);
            }
          }
        }
        const row = rows[k];
        for (const key of ['hit1', 'strong1', 'hit4', 'strong4', 'seen1']) row[key] += last[key];
        row.asked += Math.min(k, state.asked.length);
      }
    }
    const norm = (r) => Object.fromEntries(Object.entries(r).map(([key, v]) => [key, v / people]));
    return { people, rows: rows.map(norm), known: norm(known) };
  });
}

const pct = (x) => `${Math.round(x * 100)}%`;
const curveTable = (res) => [
  '| Вопросов не больше | Первый в точку | Первый с обоими любимыми | Попаданий в 4 | Хотя бы один из 4 с обоими | Первый уже знаком | Задано в среднем |',
  '|---|---|---|---|---|---|---|',
  ...res.rows.map((r, k) => `| ${k} | ${pct(r.hit1)} | ${pct(r.strong1)} | ${pct(r.hit4)} | ${pct(r.strong4)} | ${pct(r.seen1)} | ${r.asked.toFixed(2)} |`),
  `| настроение известно | ${pct(res.known.hit1)} | ${pct(res.known.strong1)} | ${pct(res.known.hit4)} | ${pct(res.known.strong4)} | ${pct(res.known.seen1)} | — |`,
];

// One parameter at a time around the defaults (a full grid would take hours on films).
const GRID = [
  { name: 'pStop', values: [0.3, 0.5, 0.7, 1.01] },
  { name: 'tau', values: [0.05, 0.1, 0.2] },
  { name: 'M', values: [3, 5, 10] },
  { name: 'gMin', values: [0, 0.02, 0.05, 0.1] },
  { name: 'K', values: [30, 60, 120] },
  { name: 'okayInfer', values: [0.25, 0.5, 1] },
];

async function main() {
  const args = process.argv.slice(2);
  const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
  const values = new Set(['--noise', '--set', '--screen', '--games', '--truth', '--pages'].flatMap((o) => args.map((a, i) => (a === o ? i + 1 : -1))).filter((i) => i > 0));
  const positional = args.filter((a, i) => !a.startsWith('--') && !values.has(i));
  const which = positional[0] ?? 'all';
  const people = Number(positional[1] ?? 100);
  const noise = Number(option('--noise') ?? 0);
  const set = Object.fromEntries(args.flatMap((a, i) => (a === '--set' ? [args[i + 1].split('=')] : [])).map(([k, v]) => [k, Number(v)]));
  const domains = which === 'all' ? ['game', 'film', 'series'] : [which];
  const catalogs = loadCatalogs({ gamesPath: option('--games') ?? undefined, screenPath: option('--screen') ?? undefined });
  // --truth <games catalog>: people and judge read tags from it (games only), the engine picks from --games.
  const truthGames = option('--truth') ? loadCatalogs({ gamesPath: option('--truth'), screenPath: resolve(ROOT, 'data', '__not_needed__.json') }).game : null;
  const pool = args.includes('--live-pool') ? 'live' : 'frozen';
  const poolNote = pool === 'live' ? 'признаки вкуса по текущим тегам' : 'признаки вкуса из pools.json';

  if (!args.includes('--grid')) {
    for (const d of domains) {
      const res = runStand(catalogs[d], { people, set, noise, pool, truth: d === 'game' && truthGames ? truthGames : catalogs[d], pages: option('--pages') ?? 'coverage' });
      console.log(`\n${d}, ${people} человек, ${JSON.stringify({ ...DEFAULTS, ...set })}${noise ? `, шум ${noise}` : ''}, ${poolNote}`);
      console.log(curveTable(res).join('\n'));
    }
    return;
  }

  const date = new Date().toISOString().slice(0, 10);
  const out = [`# Стенд уточнений, ${date}`, '', `Команда: \`node src/stand/ask-stand.js ${args.join(' ')}\`. Люди и их ответы описаны в шапке \`src/stand/ask-stand.js\`; один и тот же набор людей для всех настроек.`, ''];
  for (const d of domains) {
    const base = runStand(catalogs[d], { people, noise, pool });
    out.push(`## ${d}`, '', `Стартовые значения ${JSON.stringify(DEFAULTS)}, ${poolNote}.`, '', ...curveTable(base), '');
    out.push('Один параметр за раз, при лимите 3 вопроса:', '', '| Параметр | Значение | Первый в точку | Первый с обоими любимыми | Попаданий в 4 | Первый уже знаком | Задано в среднем |', '|---|---|---|---|---|---|---|');
    for (const g of GRID) {
      for (const v of g.values) {
        const res = v === DEFAULTS[g.name] ? base : runStand(catalogs[d], { people, set: { [g.name]: v }, noise, pool });
        const r = res.rows[3];
        out.push(`| ${g.name} | ${v} | ${pct(r.hit1)} | ${pct(r.strong1)} | ${pct(r.hit4)} | ${pct(r.seen1)} | ${r.asked.toFixed(2)} |`);
        console.log(d, g.name, v, JSON.stringify(r));
      }
    }
    out.push('');
  }
  const dir = resolve(ROOT, 'research-vault', 'akinator-picker-2026-10', 'eval');
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, `stand-${date}${noise ? `-noise${noise}` : ''}.md`);
  writeFileSync(file, out.join('\n') + '\n', 'utf8');
  console.log(`отчёт: ${file}`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(ROOT, 'src', 'stand', 'ask-stand.js')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
