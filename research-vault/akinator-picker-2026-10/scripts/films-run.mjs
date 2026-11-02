// Plays a persona through the real dialogue API, mirroring what the picker UI sends.
// Usage: node films-run.mjs <couple|cinephile> <careful|lazy> [seed]
// Writes <persona>-<mode>.log.md and .json next to this script.
import { writeFileSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const [personaName, mode, seedArg] = process.argv.slice(2);
if (!['couple', 'cinephile'].includes(personaName) || !['careful', 'lazy'].includes(mode)) {
  console.error('usage: node films-run.mjs <couple|cinephile> <careful|lazy> [seed]');
  process.exit(1);
}

const PERSONAS = {
  couple: {
    genres: ['genre:Romance', 'genre:Drama', 'genre:Sci-Fi'],
    // order = priority when searching own titles (the first three asked get "за что")
    liked: ['tt0338013', 'tt0816692', 'tt1798709', 'tt1375666', 'tt0112471', 'tt1856101', 'tt0335266', 'tt3659388', 'tt3783958', 'tt0470752'],
    love: new Set(['tt0338013', 'tt0816692']),
    // honest "за что" per title, in the order they would name them; at most 4 ticked
    reasons: {
      tt0338013: ['characters.romance', 'tone.melancholic', 'story.nonlinear', 'tone.whimsical', 'characters.acting', 'cognitive.high'],
      tt0816692: ['world.space', 'cognitive.high', 'tone.epic', 'aesthetic.soundtrack', 'ending.strong', 'aesthetic.beautiful'],
      tt1798709: ['characters.romance', 'tone.melancholic', 'cognitive.high', 'world.scifi', 'characters.acting'],
      tt1375666: ['story.complex', 'story.twist', 'cognitive.high', 'aesthetic.effects', 'tension.high'],
      tt0112471: ['story.dialogue', 'characters.romance', 'tone.melancholic', 'cognitive.high'],
      tt1856101: ['aesthetic.beautiful', 'tone.atmospheric', 'world.scifi', 'cognitive.high', 'aesthetic.soundtrack'],
      tt0335266: ['tone.melancholic', 'tone.atmospheric', 'characters.acting', 'aesthetic.beautiful'],
      tt3659388: ['world.space', 'humor.funny', 'tone.inspiring', 'tension.high'],
      tt3783958: ['aesthetic.soundtrack', 'characters.romance', 'tone.melancholic', 'aesthetic.beautiful'],
      tt0470752: ['story.twist', 'tension.high', 'cognitive.high', 'world.scifi'],
    },
    freeText: {
      tt0338013: 'про любовь, но по-умному и без соплей, грустно и странно',
      tt0816692: 'про космос и про отца с дочкой, музыка и финал до мурашек',
      tt1798709: 'тихая, грустная, про одиночество и любовь, заставляет думать',
    },
    disliked: ['tt0418279', 'tt1099212', 'tt2322441', 'tt1840309'],
    complaints: {
      tt0418279: { soft: ['story.weak', 'humor.silly', 'aesthetic.effects', 'story.predictable'], hard: [] },
      tt1099212: { soft: ['characters.unlikeable', 'story.predictable', 'pace.draggy'], hard: ['tone.cheesy'] },
      tt2322441: { soft: ['story.weak', 'content.sexual'], hard: [] },
      tt1840309: { soft: ['story.predictable', 'story.weak'], hard: [] },
    },
    hardCategories: new Set(),
    badQuality: new Set(),
    moods: ['think'],
    avoid: ['scary', 'long'],
    forkPriority: ['characters.romance', 'cognitive.high', 'world.scifi', 'story.complex', 'tone.melancholic', 'story.twist', 'aesthetic.beautiful', 'story.dialogue'],
    targets: ['tt0119177', 'tt2543164', 'tt2194499'],
    extraWhy: ['tt2884206', 'tt0414993'],
  },
  cinephile: {
    genres: ['genre:Drama', 'genre:Mystery'],
    liked: ['tt0166924', 'tt0079944', 'tt0118694', 'tt0090756', 'tt0060827', 'tt0109424', 'tt0069293', 'tt0072443', 'tt0074486', 'tt0212712'],
    love: new Set(['tt0166924', 'tt0079944', 'tt0118694']),
    reasons: {
      tt0166924: ['tone.whimsical', 'story.complex', 'tone.atmospheric', 'aesthetic.stylized', 'cognitive.high', 'story.nonlinear'],
      tt0079944: ['pace.slow', 'cognitive.high', 'aesthetic.beautiful', 'tone.atmospheric', 'story.dialogue', 'tone.whimsical'],
      tt0118694: ['aesthetic.stylized', 'tone.melancholic', 'aesthetic.beautiful', 'pace.slow', 'aesthetic.soundtrack'],
      tt0090756: ['tone.whimsical', 'aesthetic.stylized', 'tone.dark', 'tone.atmospheric', 'tone.creepy'],
      tt0060827: ['cognitive.high', 'story.complex', 'aesthetic.beautiful', 'tone.whimsical'],
      tt0109424: ['aesthetic.stylized', 'tone.melancholic', 'aesthetic.soundtrack', 'tone.whimsical'],
      tt0069293: ['pace.slow', 'cognitive.high', 'tone.atmospheric', 'world.space'],
      tt0072443: ['aesthetic.beautiful', 'story.nonlinear', 'tone.whimsical', 'cognitive.high'],
      tt0074486: ['tone.whimsical', 'tone.atmospheric', 'aesthetic.stylized', 'tone.creepy'],
      tt0212712: ['aesthetic.stylized', 'tone.melancholic', 'pace.slow', 'aesthetic.beautiful'],
    },
    freeText: {
      tt0166924: 'за авторский почерк, сновидческое, ничего не объясняет и не надо',
      tt0079944: 'медленно, созерцательно, каждый кадр как картина, философия',
      tt0118694: 'стильно снято, невысказанное, музыка и цвет',
    },
    disliked: ['tt4154796', 'tt2109248', 'tt0369610', 'tt2527338', 'tt2820852'],
    complaints: {
      tt4154796: { soft: ['story.predictable', 'humor.silly', 'length.long'], hard: ['aesthetic.effects'] },
      tt2109248: { soft: ['story.weak', 'pace.draggy', 'story.predictable'], hard: ['aesthetic.effects'] },
      tt0369610: { soft: ['story.weak', 'story.predictable'], hard: ['aesthetic.effects'] },
      tt2527338: { soft: ['story.predictable', 'story.weak'], hard: [] },
      tt2820852: { soft: ['story.weak'], hard: [] },
    },
    hardCategories: new Set(['world.superhero']),
    badQuality: new Set(),
    moods: ['think'],
    avoid: [],
    forkPriority: ['aesthetic.stylized', 'tone.whimsical', 'tone.atmospheric', 'pace.slow', 'cognitive.high', 'aesthetic.beautiful', 'story.complex', 'tone.melancholic', 'story.nonlinear'],
    targets: ['tt1441395', 'tt2076220', 'tt7984734'],
    extraWhy: ['tt0054632', 'tt0060176'],
  },
};
const P = PERSONAS[personaName];
const lazy = mode === 'lazy';
const MAX_TICK = 4;

const log = [];
const json = { persona: personaName, mode, screens: [], result: null, why: {} };
const out = (s = '') => { log.push(s); };
let screens = 0;

async function api(path, body) {
  const res = await fetch(BASE + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
  if (!res.ok) throw new Error(`${path} ${res.status} ${await res.text()}`);
  return res.json();
}
const search = (q) => api(`/api/search?domain=film&q=${encodeURIComponent(q)}`);
const parse = (text) => api('/api/parse', { text, domain: 'film' });

let state = null;
let screen = null;
async function send(action) {
  const r = await api('/api/dialogue', { state, action });
  state = r.state;
  screen = r.screen;
  screens++;
  json.screens.push({ n: screens, action, step: screen.step, title: screen.title, options: screen.options?.map((o) => o.label), items: screen.items?.map((x) => `${x.ru ?? x.name} (${x.year})`) });
  return r;
}
const cardName = (x) => `${x.ru ?? x.name} (${x.year})`;
const labelOf = (opts, f) => opts.find((o) => o.value === f)?.label ?? f;

function showScreen() {
  out(`\n### Экран ${screens}: ${screen.step} — «${screen.title}»`);
  if (screen.hint) out(`_${screen.hint}_`);
  if (screen.progress) out(`прогресс: ${screen.progress}`);
  if (screen.options) out(`варианты: ${screen.options.map((o) => o.label).join(' | ')}`);
  if (screen.categories?.length) out(`категории (никогда?): ${screen.categories.map((o) => o.label).join(' | ')}`);
  if (screen.avoid) out(`избегать: ${screen.avoid.map((o) => o.label).join(' | ')}`);
  if (screen.items) out(`тайтлы: ${screen.items.map(cardName).join('; ')}`);
  if (screen.lines) for (const l of screen.lines) out(`> ${l}`);
}
function act(text) { out(`**Ответ:** ${text}`); }

// ---------- run ----------
await send(undefined);
if (seedArg) state.seed = Number(seedArg);
showScreen();
act('Посмотреть фильм');
await send({ type: 'choose', value: 'film' });
showScreen();

// genres
if (lazy) { act('пропустить'); await send({ type: 'skip' }); }
else {
  act(P.genres.map((g) => labelOf(screen.options, g)).join(', '));
  await send({ type: 'genres', values: P.genres });
}
showScreen();

// liked: tick known titles on the page; careful: one more page + search own favourites
async function pickKnown(kind, known, maxMore, maxSearch) {
  const picked = [];
  let shownAll = [];
  let pages = 0;
  for (;;) {
    const ids = screen.items.map((x) => x.id);
    shownAll = [...new Set([...shownAll, ...ids])];
    const hits = screen.items.filter((x) => known.includes(x.id));
    out(`узнали на экране: ${hits.length ? hits.map(cardName).join('; ') : 'ничего'}`);
    for (const h of hits) if (!picked.includes(h.id)) picked.push(h.id);
    if (pages >= maxMore) break;
    pages++;
    act('Ещё (показать другие)');
    await send({ type: 'more', ids });
    showScreen();
  }
  const searched = [];
  for (const id of known) {
    if (searched.length >= maxSearch) break;
    if (picked.includes(id)) continue;
    const q = QUERIES[id];
    const found = await search(q);
    const hit = found.find((x) => x.id === id);
    out(`поиск «${q}» → ${found.slice(0, 3).map(cardName).join('; ')} ${hit ? '✓' : '✗ не нашли'}`);
    if (hit) { picked.push(id); searched.push(id); }
  }
  if (!picked.length && kind === 'liked') {
    // the liked screen has no skip: a hurried user types one favourite
    const id = known[0];
    const found = await search(QUERIES[id]);
    out(`ничего не узнали, пришлось искать «${QUERIES[id]}» → ${found[0] ? cardName(found[0]) : 'пусто'}`);
    if (found.find((x) => x.id === id)) picked.push(id);
  }
  return { picked, shownAll };
}
const QUERIES = {
  tt0338013: 'вечное сияние', tt0816692: 'интерстеллар', tt1798709: 'она', tt1375666: 'начало', tt0112471: 'перед рассветом',
  tt1856101: 'бегущий по лезвию 2049', tt0335266: 'трудности перевода', tt3659388: 'марсианин', tt3783958: 'ла-ла ленд', tt0470752: 'из машины',
  tt0418279: 'трансформеры', tt1099212: 'сумерки', tt2322441: 'пятьдесят оттенков', tt1840309: 'дивергент',
  tt0166924: 'малхолланд', tt0079944: 'сталкер', tt0118694: 'любовное настроение', tt0090756: 'синий бархат', tt0060827: 'персона',
  tt0109424: 'чунгкингский', tt0069293: 'солярис', tt0072443: 'зеркало', tt0074486: 'голова-ластик', tt0212712: '2046',
  tt4154796: 'мстители финал', tt2109248: 'трансформеры эпоха', tt0369610: 'мир юрского периода', tt2527338: 'скайуокер восход', tt2820852: 'форсаж 7',
};

{
  const { picked, shownAll } = await pickKnown('liked', P.liked, lazy ? 1 : 2, lazy ? 0 : 4);
  act(`отметили: ${picked.map((id) => QUERIES[id]).join(', ') || 'ничего'}`);
  await send({ type: 'pick', ids: picked, shownIds: shownAll });
}

// why ×N
while (screen.step === 'why') {
  showScreen();
  const id = screen.item.id;
  const offered = screen.options.map((o) => o.value);
  const wanted = (P.reasons[id] ?? []).filter((f) => offered.includes(f));
  const missing = (P.reasons[id] ?? []).filter((f) => !offered.includes(f));
  if (missing.length) out(`чипов не хватило бы на: ${missing.join(', ')}`);
  let values = lazy ? wanted.slice(0, 1) : wanted.slice(0, MAX_TICK);
  let issues = [];
  if (!lazy && P.freeText[id]) {
    const p = await parse(P.freeText[id]);
    out(`свободный текст «${P.freeText[id]}» → понял: +${p.positive.map((x) => x.label).join(', ') || '—'}; −${p.negative.map((x) => x.label).join(', ') || '—'}`);
    // the person clicks only the parsed chips they agree with and that are not ticked yet
    const agree = p.positive.filter((x) => (P.reasons[id] ?? P.forkPriority).includes(x.f) && !values.includes(x.f)).map((x) => x.f);
    if (agree.length) { values = [...values, ...agree]; out(`добавили из разбора: ${agree.join(', ')}`); }
  }
  if (!values.length && lazy) { act('Не знаю (пропустить)'); await send({ type: 'skip' }); continue; }
  const love = !lazy && P.love.has(id);
  act(`${values.map((f) => labelOf(screen.options, f)).join(', ') || '—'}${love ? ' + «Обожаю»' : ''}`);
  await send({ type: 'reasons', values, love, issues });
}

// disliked
showScreen();
if (lazy) { act('Ничего такого (пропустить)'); await send({ type: 'skip' }); }
else {
  const { picked, shownAll } = await pickKnown('disliked', P.disliked, 1, 2);
  if (!picked.length) { act('Ничего такого'); await send({ type: 'skip' }); }
  else { act(`отметили: ${picked.map((id) => QUERIES[id]).join(', ')}`); await send({ type: 'pick', ids: picked, shownIds: shownAll }); }
}

while (screen.step === 'why_not') {
  showScreen();
  const id = screen.item.id;
  const offered = screen.options.map((o) => o.value);
  const c = P.complaints[id] ?? { soft: [], hard: [] };
  const soft = c.soft.filter((f) => offered.includes(f));
  const hard = c.hard.filter((f) => offered.includes(f));
  const missing = [...c.soft, ...c.hard].filter((f) => !offered.includes(f));
  if (missing.length) out(`жалоб не хватило бы на: ${missing.join(', ')}`);
  const cats = screen.categories.filter((o) => P.hardCategories.has(o.value)).map((o) => o.value);
  const issues = [...soft.map((f) => ({ f, hard: false })), ...hard.map((f) => ({ f, hard: true })), ...cats.map((f) => ({ f, hard: true }))];
  act(`${issues.map((x) => `${labelOf([...screen.options, ...screen.categories], x.f)}${x.hard ? ' (никогда)' : ''}`).join(', ') || 'Не знаю'}`);
  if (!issues.length) await send({ type: 'skip' });
  else await send({ type: 'issues', issues, badQuality: P.badQuality.has(id) });
}

// today
showScreen();
if (lazy) { act('пропустить'); await send({ type: 'skip' }); }
else {
  act(`${P.moods.map((m) => labelOf(screen.options, m)).join(', ')}${P.avoid.length ? ' / избегать: ' + P.avoid.map((a) => labelOf(screen.avoid, a)).join(', ') : ''}`);
  await send({ type: 'today', values: P.moods, avoid: P.avoid });
}

// playback
showScreen();
act('Да, подбирай');
await send({ type: 'choose', value: 'confirm' });

function showResult(tag) {
  const r = screen.result;
  out(`\n### Экран ${screens}: result (${tag}) — «${screen.title}», рассмотрено ${r.considered}, сита: ${r.sieves.map((s) => `${s.id}:${s.removed}`).join(' ')}`);
  const show = (x, role) => {
    out(`\n**${role}: ${x.ru ?? x.name} (${x.year})** — ${x.labelText}, score ${x.score} (fit ${x.parts.fit}, pen ${x.parts.penalty}, mood ${x.parts.mood}, prior ${x.parts.prior}), ${x.rating}, ${x.runtime} мин, жанры ${x.genres.join('/')}`);
    for (const e of x.explanation.reasons) out(`  + ${e.text}`);
    for (const e of x.explanation.risks) out(`  − ${e.text}`);
  };
  if (r.top) show(r.top, 'ТОП'); else out('ТОП: пусто');
  r.alternatives.forEach((a, i) => show(a, `Альт ${i + 1}`));
  if (r.fork) out(`\nВопрос-развилка: «${r.fork.text}» → ${r.fork.options.map((o) => o.label).join(' / ')}`);
  json.result = { tag, top: r.top && { id: r.top.id, name: r.top.ru ?? r.top.name, label: r.top.label, score: r.top.score }, alternatives: r.alternatives.map((a) => ({ id: a.id, name: a.ru ?? a.name, label: a.label, score: a.score })), fork: r.fork, taste: r.taste, considered: r.considered, sieves: r.sieves };
}
showResult('первый');

if (screen.result.fork) {
  const f = screen.result.fork;
  const choice = P.forkPriority.find((p) => f.options.some((o) => o.f === p));
  const opt = choice ? f.options.find((o) => o.f === choice) : f.options[0];
  act(`развилка: «${opt.label}»`);
  await send({ type: 'fork', f: opt.f });
  showResult('после развилки');
  if (screen.result.fork) {
    const f2 = screen.result.fork;
    const choice2 = P.forkPriority.find((p) => f2.options.some((o) => o.f === p));
    const opt2 = choice2 ? f2.options.find((o) => o.f === choice2) : f2.options[0];
    act(`развилка 2: «${opt2.label}»`);
    await send({ type: 'fork', f: opt2.f });
    showResult('после развилки 2');
  }
}

// taste as the engine sees it
const t = screen.result.taste;
out(`\n**Вкус по мнению системы:** подтверждено: ${t.confirmed.map((x) => `${x.label} ${x.w}`).join('; ') || '—'} | выведено: ${t.inferred.map((x) => `${x.label} ${x.w}`).join('; ') || '—'} | не нравится: ${t.dislikes.map((x) => x.label).join('; ') || '—'} | никогда: ${t.hardNo.map((x) => x.label).join('; ') || '—'} | уже смотрел: ${t.consumed}`);

// targets
out(`\n### Цели: где они`);
const shownIds = new Set([screen.result.top?.id, ...screen.result.alternatives.map((a) => a.id)].filter(Boolean));
for (const id of [...P.targets, ...P.extraWhy]) {
  const w = await api('/api/why', { state, id });
  json.why[id] = w;
  const tag = P.targets.includes(id) ? 'ЦЕЛЬ' : 'доп.';
  if (w.error) { out(`- ${tag} ${id}: ${w.error}`); continue; }
  if (w.removedBy) { out(`- ${tag} ${w.name}: ${shownIds.has(id) ? 'ПОКАЗАН' : 'не показан'}; убрало сито ${w.removedBy.sieve} «${w.sieveName}»: ${w.removedBy.reason}`); continue; }
  out(`- ${tag} ${w.name}: ${shownIds.has(id) ? 'ПОКАЗАН' : 'не показан'}; место ${w.rank} из ${w.of}, score ${w.score} (лидер ${w.leaderScore}); fit ${w.parts.fit.toFixed(2)} pen ${w.parts.penalty.toFixed(2)} mood ${w.parts.mood.toFixed(2)} prior ${w.parts.prior.toFixed(2)}; совпало: ${w.matches.map((m) => `${m.label}${m.confirmed ? '✓' : ''} ${m.contribution}`).join(', ') || '—'}; штрафы: ${w.penalties.map((p) => `${p.label} ${p.contribution}`).join(', ') || '—'}`);
}
out(`\nЭкранов всего: ${screens}`);

const dir = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
writeFileSync(`${dir}/films-${personaName}-${mode}.log.md`, log.join('\n'), 'utf8');
writeFileSync(`${dir}/films-${personaName}-${mode}.json`, JSON.stringify({ ...json, finalState: state }, null, 1), 'utf8');
console.log(log.join('\n'));
