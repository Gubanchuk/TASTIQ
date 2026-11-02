// Engine confidence today: dialogues through the API, then the full ranking locally (rankAll) for the
// same state to see how many candidates survive the sieves and how flat the scores are.
import { writeFileSync, mkdirSync } from 'node:fs';
import { loadCatalogs } from 'file:///E:/project/TASTIQ/src/core/catalog.js';
import { rankAll, confidenceLabel } from 'file:///E:/project/TASTIQ/src/core/recommend.js';

const API = 'http://localhost:5173/api/dialogue';
const OUT = 'C:/Users/Dusik/AppData/Local/Temp/claude/E--project-TASTIQ/316e07fd-614b-4eb4-a3ec-2c92111b7da4/scratchpad/out';
mkdirSync(OUT, { recursive: true });

async function call(state, action) {
  const res = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(action ? { state, action } : {}) });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

const log = [];
const note = (s) => { log.push(s); console.log(s); };

async function dialogue(domain, scenario) {
  let { state, screen } = await call(null, null);
  ({ state, screen } = await call(state, { type: 'choose', value: domain }));
  if (screen.step === 'platform') ({ state, screen } = await call(state, { type: 'choose', value: 'windows' }));
  // genres: take the first two options when the scenario wants them, else skip
  const genreOpts = screen.options.map((o) => o.value);
  ({ state, screen } = await call(state, scenario.genres ? { type: 'genres', values: genreOpts.slice(0, scenario.genres) } : { type: 'skip' }));
  const likedScreen = screen;
  const seeds = likedScreen.items.map((i) => ({ id: i.id, name: i.ru ?? i.name }));
  const liked = seeds.slice(0, scenario.liked);
  ({ state, screen } = await call(state, { type: 'pick', ids: liked.map((x) => x.id), shownIds: seeds.map((x) => x.id) }));
  const reasonsGiven = [];
  let i = 0;
  while (screen.step === 'why') {
    const chips = screen.options.map((o) => o.value);
    const values = scenario.reasons ? chips.slice(0, scenario.reasons) : [];
    reasonsGiven.push({ item: screen.item.ru ?? screen.item.name, chips: screen.options.map((o) => o.label), picked: values });
    ({ state, screen } = await call(state, { type: 'reasons', values, love: i === 0 && scenario.love }));
    i++;
  }
  // disliked screen
  const dislikeSeeds = screen.items.map((x) => ({ id: x.id, name: x.ru ?? x.name }));
  const disliked = dislikeSeeds.slice(0, scenario.disliked);
  if (disliked.length) {
    ({ state, screen } = await call(state, { type: 'pick', ids: disliked.map((x) => x.id), shownIds: dislikeSeeds.map((x) => x.id) }));
    while (screen.step === 'why_not') {
      const complaints = screen.options.map((o) => o.value);
      const issues = complaints.slice(0, scenario.issues ?? 1).map((f, k) => ({ f, hard: Boolean(scenario.hard && k === 0) }));
      ({ state, screen } = await call(state, { type: 'issues', issues, badQuality: false }));
    }
  } else {
    ({ state, screen } = await call(state, { type: 'skip' }));
  }
  // today
  if (scenario.moods || scenario.avoid) ({ state, screen } = await call(state, { type: 'today', values: scenario.moods ?? [], avoid: scenario.avoid ?? [] }));
  else ({ state, screen } = await call(state, { type: 'skip' }));
  const playback = screen.lines;
  ({ state, screen } = await call(state, { type: 'choose', value: 'confirm' }));
  const r = screen.result;
  return { state, playback, seeds, liked, reasonsGiven, disliked, result: r };
}

const SCENARIOS = {
  'A: ничего не ответил (все скипы)': { liked: 0, disliked: 0 },
  'B: 1 понравился + 2 причины': { liked: 1, reasons: 2 },
  'C: 2 понравились (обожаю) + 1 не зашёл + настроение': { liked: 2, reasons: 2, love: true, disliked: 1, issues: 1, moodKey: 'relax' },
  'D: 3 понравились + 2 не зашли (1 стоп) + настроение + избегать': { liked: 3, reasons: 3, love: true, disliked: 2, issues: 2, hard: true, moodKey: 'relax', avoidKey: 'dark', genres: 2 },
};

const catalogs = loadCatalogs();
const report = {};
for (const domain of ['game', 'film', 'series', 'cartoon']) {
  report[domain] = {};
  for (const [name, sc0] of Object.entries(SCENARIOS)) {
    const sc = { ...sc0 };
    if (sc.moodKey) sc.moods = [sc.moodKey];
    if (sc.avoidKey) sc.avoid = [sc.avoidKey];
    const d = await dialogue(domain, sc);
    const { state, result } = d;
    const profile = { answers: state.answers, corrections: state.corrections, preferences: state.preferences };
    const session = { ...state.session, platform: state.platform };
    const { ranked, removed } = rankAll(catalogs[domain], profile, session);
    const scores = ranked.map((x) => x.score);
    const top1 = scores[0];
    const within = (p) => scores.filter((s) => s >= top1 * (1 - p)).length;
    const withReason = ranked.filter((x) => x.matches.length > 0 || x.moodHits.some((h) => h.sign > 0)).length;
    const confirmedMatch = ranked.filter((x) => x.matches.some((m) => m.confirmed)).length;
    const margin = ranked[1] ? (ranked[0].score - ranked[1].score) / Math.max(Math.abs(ranked[0].score), 1e-6) : 1;
    const labels = { strong: 0, likely: 0, try: 0 };
    for (const [k, x] of ranked.slice(0, 50).entries()) labels[confidenceLabel(x, k === 0 ? margin : 0)]++;
    const row = {
      seeds: d.seeds.map((s) => s.name),
      liked: d.liked.map((s) => s.name),
      reasonsGiven: d.reasonsGiven,
      disliked: d.disliked.map((s) => s.name),
      playback: d.playback,
      api: {
        considered: result.considered,
        sieves: result.sieves.map((s) => `${s.id}:${s.removed}`).join(' '),
        top: result.top && { name: result.top.ru ?? result.top.name, score: result.top.score, parts: result.top.parts, label: result.top.label, reasons: result.top.explanation.reasons.map((r) => r.text), risks: result.top.explanation.risks.map((r) => r.text) },
        alternatives: result.alternatives.map((a) => ({ name: a.ru ?? a.name, score: a.score, label: a.label })),
        fork: result.fork ? { text: result.fork.text, options: result.fork.options.map((o) => o.label) } : null,
      },
      ranking: {
        candidates: ranked.length,
        removed,
        top1,
        top2: scores[1],
        top10: scores[9],
        top50: scores[49],
        top100: scores[99],
        gapTop1Top2Pct: Math.round(margin * 1000) / 10,
        gapTop1Top10Pct: scores[9] != null ? Math.round(((top1 - scores[9]) / Math.abs(top1)) * 1000) / 10 : null,
        within5pct: within(0.05),
        within10pct: within(0.1),
        within20pct: within(0.2),
        withReason,
        confirmedMatch,
        priorShareTop1: Math.round((ranked[0].parts.prior / Math.max(Math.abs(ranked[0].score), 1e-6)) * 100),
        labelsTop50: labels,
        top10: ranked.slice(0, 10).map((x) => `${x.game.ru ?? x.game.name} ${x.score.toFixed(3)} fit=${x.parts.fit.toFixed(2)} mood=${x.parts.mood.toFixed(2)} prior=${x.parts.prior.toFixed(2)} ${confidenceLabel(x, 0)}`),
      },
    };
    report[domain][name] = row;
    note(`${domain} | ${name}: candidates=${ranked.length} considered(api)=${result.considered} top1=${top1?.toFixed(3)} top10=${scores[9]?.toFixed(3)} gap1-2=${row.ranking.gapTop1Top2Pct}% gap1-10=${row.ranking.gapTop1Top10Pct}% within10%=${within(0.1)} withReason=${withReason} confirmedMatch=${confirmedMatch} label=${result.top?.label} fork=${Boolean(result.fork)}`);
  }
}
writeFileSync(`${OUT}/dialogues.json`, JSON.stringify(report, null, 1));
writeFileSync(`${OUT}/dialogues.log`, log.join('\n'));
