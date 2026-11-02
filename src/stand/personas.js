// Persona runs (plan step 0, research-vault/akinator-picker-2026-10/SUMMARY.md, section 6).
// The six personas of the 2026-10-21 hit tests play the dialogue through reduce/screen directly, with the seed fixed in
// each mode, so a run gives the same screens and the same pick every time. A persona answers only with what the screen
// offers, plus its free text through the same parser the client uses. What it knows about tonight (time, company,
// stops), what it prefers when asked «это или то» and which facts it would answer are set per persona; how it behaves
// (pages flipped, searches, which reactions, chips, free text) per mode in src/stand/personas/<id>.json, first taken
// from the agents' run scripts, then moved to the step 3 and step 4 screens.
//
// Usage: node src/stand/personas.js [all|film|game|series|cartoon|<persona id>] [--mode careful|lazy] [--tag step1]
// Prints one line per run and writes research-vault/akinator-picker-2026-10/eval/<date>[-<filter>][-<tag>].md.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadCatalogs } from '../core/catalog.js';
import { initialState, profileOf, reduce, screen, searchInDomain, sessionOf } from '../core/dialogue.js';
import { parseFreeText } from '../core/parse-text.js';
import { whyNot } from '../core/recommend.js';
import { DATA, ROOT } from '../lib/fsx.js';
import { fillPicks, playedIds, removedIds } from '../server/public/shared/fill-picks.js';

const PERSONAS_DIR = resolve(ROOT, 'src', 'stand', 'personas');
const EVAL_DIR = resolve(ROOT, 'research-vault', 'akinator-picker-2026-10', 'eval');
const TODAY_RISK = 'Сегодня ты просил другое';
const SEEN_TAPS = 12; // «Уже смотрел» taps a persona makes on the result before giving up

export function loadPersonas() {
  return readdirSync(PERSONAS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(resolve(PERSONAS_DIR, f), 'utf8')));
}

/**
 * Plays one persona in one mode. Taps count what a person presses: every reaction on a title, chip, stop, pair answer
 * and answer to an adaptive question is one tap, a "никогда" complaint two (double tap), opening «Ещё причины» one, a typed search or free
 * text one, «Бросил» one, and every Next / Skip / choice / «Показать другие» button one.
 */
export function play(P, modeName, catalogs) {
  const M = P.modes[modeName];
  const catalog = catalogs[P.domain];
  const lovedById = new Map(P.loved.map((x) => [x.id, x]));
  const dislikedById = new Map(P.disliked.map((x) => [x.id, x]));
  const seenIds = new Set((P.alsoSeen ?? []).map((x) => x.id));
  let state = { ...initialState(), seed: M.seed };
  let scr = screen(state, catalogs);
  const run = { persona: P, mode: modeName, seed: M.seed, screens: 1, taps: 0, asks: 0, actions: [], log: [], results: [] };
  let whyCount = 0;
  let shown = null; // what the result screen shows: after «Уже смотрел» the other cards keep their places, as on the site

  const send = (action, taps) => {
    run.log.push({ step: scr.step, item: scr.item?.id ?? null, question: scr.step === 'ask' ? scr : null, action });
    state = reduce(state, action, catalogs);
    scr = screen(state, catalogs);
    run.actions.push(action);
    run.taps += taps;
    if (!run.results.length) run.screens++;
    if (scr.step === 'result') {
      shown = shown ? fillPicks(shown, scr.result, removedIds(state), playedIds(state)) : scr.result;
      run.results.push(shown);
    }
  };
  const found = (x) => searchInDomain(state, catalogs, x.q).some((c) => c.id === x.id);

  // Anchors: the persona reacts to the titles it knows on each page it flips, then searches for the rest.
  function anchors(plan = {}) {
    const reactionOf = (id) => {
      const loved = lovedById.get(id);
      if (loved) return loved.love && plan.love ? 'love' : 'like';
      if (plan.searchDisliked !== undefined || plan.dislikes) if (dislikedById.has(id)) return 'dislike';
      if (plan.seen && seenIds.has(id)) return 'like';
      return null;
    };
    const marked = [];
    const shown = [];
    const has = (id) => marked.some((m) => m.id === id);
    for (let page = 1; ; page++) {
      const ids = scr.items.map((x) => x.id);
      shown.push(...ids);
      for (const id of ids) {
        const reaction = reactionOf(id);
        if (reaction && !has(id) && marked.length < (plan.maxTicks ?? Infinity)) marked.push({ id, reaction });
      }
      if (page >= (plan.pages ?? 1) || (plan.untilHit && marked.length)) break;
      send({ type: 'more', ids }, 1);
    }
    const searched = [];
    let searches = 0;
    const search = (pool, budget, reaction) => {
      let hits = 0;
      for (const x of pool) {
        if (!x.q || has(x.id) || searched.some((m) => m.id === x.id)) continue;
        if (hits >= (budget === true ? Infinity : budget)) break;
        searches++;
        if (found(x)) { searched.push({ id: x.id, reaction: reaction(x) }); hits++; }
      }
    };
    if (plan.searchLoved) search(P.loved, plan.searchLoved, (x) => reactionOf(x.id));
    if (plan.searchDisliked) search(P.disliked, plan.searchDisliked, () => 'dislike');
    let marks = plan.searchFirst ? [...searched, ...marked] : [...marked, ...searched];
    // Nothing familiar on the page: the person types their first favourite rather than go on blind (once: on the
    // extra page it has done that already).
    if (!marks.length && !scr.extra) {
      const first = P.loved.find((x) => x.q);
      searches++;
      if (first && found(first)) marks = [{ id: first.id, reaction: reactionOf(first.id) }];
    }
    return send({ type: 'react', marks, shownIds: [...new Set(shown)] }, marks.length + searches + 1);
  }

  // «За что»: one tap on the pair when it names the persona's reasons; a careful persona opens «Ещё причины» for the rest.
  function why(plan = {}) {
    const me = lovedById.get(scr.item.id);
    whyCount++;
    if (!me || (plan.screens && whyCount > plan.screens)) return send({ type: 'skip' }, 1);
    const reasons = me.reasons ?? [];
    const values = scr.pair.map((o) => o.value).filter((f) => reasons.includes(f));
    let taps = values.length ? 1 : 0;
    const offered = new Set(scr.options.map((o) => o.value));
    const rest = reasons.filter((f) => offered.has(f) && !values.includes(f)).slice(0, Math.max(0, (plan.maxChips ?? Infinity) - values.length));
    if (plan.expand && rest.length) {
      values.push(...rest);
      taps += 1 + rest.length;
    }
    const issues = [];
    if (plan.text && me.text) {
      // The parser's chips are shown for confirmation; the person keeps those it agrees with.
      const parsed = parseFreeText(me.text, catalog.dict);
      const agree = (f) => (plan.text === 'reasons' ? reasons.includes(f) : !me.accept || me.accept.includes(f));
      taps += 1;
      for (const x of parsed.positive) if (!values.includes(x.f) && agree(x.f)) { values.push(x.f); taps++; }
      if (plan.text === 'all') for (const x of parsed.negative) if (agree(x.f)) { issues.push({ f: x.f, hard: Boolean(x.hard) }); taps++; }
    }
    if (!values.length && !issues.length) return send({ type: 'skip' }, Math.max(1, taps));
    return send({ type: 'reasons', values, issues, ...(plan.text && me.text ? { text: me.text } : {}) }, taps + 1);
  }

  function whyNotScreen(plan = {}) {
    const me = dislikedById.get(scr.item.id);
    const offered = new Set([...scr.options, ...(scr.categories ?? [])].map((o) => o.value));
    const issues = (me?.issues ?? []).filter((x) => offered.has(x.f)).map((x) => ({ f: x.f, hard: Boolean(x.hard) }));
    let typed = 0;
    if (plan.text && me?.text) {
      const p = parseFreeText(me.text, catalog.dict);
      const parsed = plan.text === 'negatives' ? p.negative : [...p.positive, ...p.negative];
      typed = 1;
      for (const x of parsed) {
        if ((!me.accept || me.accept.includes(x.f)) && !issues.some((i) => i.f === x.f)) issues.push({ f: x.f, hard: Boolean(x.hard) });
      }
    }
    const tried = Boolean(me?.tried);
    if (!issues.length && !tried) return send({ type: 'skip' }, 1 + typed);
    return send({ type: 'issues', issues, badQuality: false, tried, ...(plan.text && me?.text ? { text: me.text } : {}) }, issues.reduce((n, x) => n + (x.hard ? 2 : 1), 0) + typed + Number(tried) + 1);
  }

  // Adaptive questions: a pair by the persona's preference order, else by which side it named more often as a reason
  // for its loved titles, avoiding a side it complained about; a fact if the persona has an answer; «уже видел» by
  // what the persona has seen. Otherwise «всё равно».
  const named = (f) => P.loved.filter((x) => (x.reasons ?? []).includes(f)).length;
  const complained = (f) => P.disliked.some((x) => (x.issues ?? []).some((i) => i.f === f));
  function pick(values) {
    const preferred = (P.prefer ?? []).find((f) => values.includes(f));
    if (preferred) return preferred;
    const [a, b] = values;
    if (complained(a) !== complained(b)) return complained(a) ? b : a;
    if (named(a) !== named(b)) return named(a) > named(b) ? a : b;
    return null;
  }
  function ask() {
    run.asks++;
    const offered = new Set(scr.options.map((o) => o.value));
    let value = null;
    if (scr.kind === 'pair' || scr.kind === 'lean') value = pick(scr.options.map((o) => o.value));
    if (scr.kind === 'fact') value = P.facts?.[scr.qid.slice('fact:'.length)] ?? null;
    if (scr.kind === 'guess') {
      const id = scr.qid.slice('guess:'.length);
      value = dislikedById.has(id) ? 'dislike' : lovedById.has(id) || seenIds.has(id) ? 'like' : 'no';
    }
    if (value && offered.has(value)) send({ type: 'answer', qid: scr.qid, value }, 1);
    else send({ type: 'skip' }, 1);
  }

  for (let guard = 0; scr.step !== 'result'; guard++) {
    if (guard > 60) throw new Error(`${P.id} ${modeName}: dialogue does not reach the result`);
    switch (scr.step) {
      case 'domain': send({ type: 'choose', value: P.domain }, 1); break;
      case 'platform': send({ type: 'choose', value: P.platform ?? 'windows' }, 1); break;
      case 'time':
      case 'company': {
        const value = P.situation?.[scr.step];
        if (value && scr.options.some((o) => o.value === value)) send({ type: 'choose', value }, 1);
        else send({ type: 'skip' }, 1);
        break;
      }
      case 'context': {
        const value=P.situation?.[scr.contextKey];
        if(value && scr.options.some(o=>o.value===value))send({type:'choose',value},1);
        else send({type:'skip'},1);
        break;
      }
      case 'anchors': anchors(M.anchors); break;
      case 'why': why(M.why); break;
      case 'why_not': whyNotScreen(M.whyNot); break;
      case 'ask': ask(); break;
      case 'stops': {
        const offered = new Set(scr.options.map((o) => o.value));
        const values = M.stops ? (P.stops ?? []).filter((f) => offered.has(f)) : [];
        if (values.length) send({ type: 'stops', values }, values.length + 1);
        else send({ type: 'skip' }, 1);
        break;
      }
      default: throw new Error(`${P.id} ${modeName}: no answer for step ${scr.step}`);
    }
  }

  // The result: the persona taps «Уже смотрел» on a card it has seen, one at a time (each tap recomputes), and with
  // `result.rate` also says «понравилось / не зашло» about its loved and disliked titles; until no seen card is left
  // or the taps run out. A card from `alsoSeen` gets no reaction: the persona has no opinion on it.
  const seenAll = new Set([...lovedById.keys(), ...dislikedById.keys(), ...seenIds]);
  const seenOn = (r) => [r.top, ...r.alternatives].filter((c) => c && seenAll.has(c.id));
  run.dialogueActions = run.actions.length; // the actions up to the first result, what src/stand/personas-ai.js replays
  run.firstCount = [shown.top, ...shown.alternatives].filter(Boolean).length;
  run.seenFirst = seenOn(shown).length;
  run.seenTaps = 0;
  for (let n = 0; n < SEEN_TAPS; n++) {
    const c = seenOn(shown)[0];
    if (!c) break;
    send({ type: 'played', id: c.id }, 1);
    run.seenTaps++;
    const reaction = !M.result?.rate ? null : dislikedById.has(c.id) ? 'dislike' : lovedById.has(c.id) ? 'like' : null;
    if (reaction) {
      send({ type: 'rate_played', id: c.id, reaction }, 1);
      run.seenTaps++;
    }
  }
  run.seenLeft = seenOn(shown).length;

  run.finalState = state;
  return measure(run, catalog);
}

function measure(run, catalog) {
  const P = run.persona;
  const s = run.finalState;
  const cards = new Map();
  for (const r of run.results) for (const c of [r.top, ...r.alternatives].filter(Boolean)) if (!cards.has(c.id)) cards.set(c.id, c);
  const first = run.results[0] ? new Set([run.results[0].top, ...run.results[0].alternatives].filter(Boolean).map((c) => c.id)) : new Set();
  run.targets = P.targets.map((t) => ({ ...t, shown: cards.has(t.id), first: first.has(t.id), why: whyNot(catalog, t.id, profileOf(s), sessionOf(s)) }));
  const ranked = run.targets.filter((t) => t.why.rank).sort((a, b) => a.why.rank - b.why.rank);
  run.best = ranked[0] ?? null;
  run.shownCount = cards.size;
  run.todayRisk = [...cards.values()].filter((c) => c.explanation.risks.some((x) => x.text.startsWith(TODAY_RISK)));
  return run;
}

const title = (c) => c.ru ?? c.name;
const topLine = (run) => {
  const first = run.results[0]?.top;
  const last = run.results.at(-1)?.top;
  if (!first) return '(пусто)';
  return first.id === last.id ? title(first) : `${title(first)} → ${title(last)}`;
};

export function line(run) {
  const best = run.best ? `${run.best.why.rank} (${run.best.name})` : 'нет: все цели убраны ситами';
  const asks = run.asks ? ` (уточнений ${run.asks})` : '';
  return `${run.persona.id} ${run.mode}: экранов ${run.screens}${asks}, нажатий ${run.taps} | топ ${topLine(run)} | целей ${run.targets.filter((t) => t.shown).length}/3`
    + ` | лучший ранг ${best} | ${seenText(run)} | «${TODAY_RISK}» ${run.todayRisk.length}/${run.shownCount}`;
}

const seenText = (run) => `уже видел ${run.seenFirst} из ${run.firstCount} → ${run.seenLeft}${run.seenTaps ? `, нажатий ${run.seenTaps}` : ''}`;
const targetsTotal = (runs) => {
  const count = (key) => runs.reduce((n, r) => n + r.targets.filter((t) => t[key]).length, 0);
  return `целей показано ${count('shown')} из ${runs.length * 3} (в первой четвёрке ${count('first')})`;
};

const median = (xs) => {
  const v = [...xs].sort((a, b) => a - b);
  return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
};

// Answers in words, so a reader (or the rating agent, eval/BRIEF.md) sees what the persona told the picker.
const REACTION_TEXT = { love: 'обожаю', like: 'нормально', dislike: 'не моё', unknown: 'не видел' };

function answersText(run, catalog) {
  const { featureById, company, stops } = catalog.dict;
  const label = (f) => featureById.get(f)?.label ?? f;
  const name = (id) => title(catalog.byId.get(id));
  const time = catalog.domain.time ?? [];
  const lines = [];
  for (const { step, item, action: a } of run.log) {
    if (step === 'time') lines.push(`время: ${a.type === 'skip' ? 'не знаю' : time.find((t) => t.id === a.value)?.label ?? a.value}`);
    if (step === 'company') lines.push(`с кем: ${a.type === 'skip' ? 'не важно' : company.find((c) => c.id === a.value)?.label ?? a.value}`);
    if (a.type === 'react') lines.push(`знакомое: ${a.marks.map((m) => `${name(m.id)} (${REACTION_TEXT[m.reaction]})`).join(', ') || '—'}`);
    if (step === 'why') lines.push(`за что «${name(item)}»: ${a.type === 'skip' ? 'не знаю' : [...a.values.map(label), ...a.issues.map((x) => `−${label(x.f)}`)].join(', ')}`);
    if (step === 'why_not') lines.push(`что не так с «${name(item)}»: ${a.type === 'skip' ? 'не знаю' : [a.tried ? 'бросил' : '', ...a.issues.map((x) => `${label(x.f)}${x.hard ? ' (никогда)' : ''}`)].filter(Boolean).join(', ')}`);
    if (step === 'stops') lines.push(`точно не надо: ${a.type === 'skip' ? 'всё можно' : a.values.map((f) => stops.find((x) => x.f === f)?.label ?? f).join(', ')}`);
    if (step === 'ask') {
      const q = run.log.find((x) => x.action === a)?.question;
      lines.push(`«${q.title}»: ${a.type === 'skip' ? 'всё равно' : q.options.find((o) => o.value === a.value)?.label ?? a.value}`);
    }
  }
  return lines;
}

function cardText(c, role) {
  const out = [`- ${role}: ${title(c)} (${c.year ?? '?'}) — ${c.labelText}`];
  for (const x of c.explanation.reasons) out.push(`  - + ${x.text}`);
  for (const x of c.explanation.risks) out.push(`  - − ${x.text}`);
  return out;
}

export function report(runs, catalogs, command) {
  const date = new Date().toISOString().slice(0, 10);
  const bests = runs.filter((r) => r.best).map((r) => r.best.why.rank);
  const out = [
    `# Прогон персон, ${date}`,
    '',
    `Команда: \`${command}\`. Персоны и поведение режимов: \`src/stand/personas/*.json\`. Seed зафиксирован в каждом режиме, диалог идёт через \`reduce\`/\`screen\` без сервера, поэтому повторный запуск на том же коде и данных даёт ту же таблицу.`,
    '',
    '| Прогон | Экранов | Нажатий | Топ | Целей показано | Лучший ранг цели | Уже видел: в первой четвёрке → осталось | «Сегодня ты просил другое» |',
    '|---|---|---|---|---|---|---|---|',
    ...runs.map((r) => `| ${r.persona.name}, ${r.mode} | ${r.screens}${r.asks ? ` (уточн. ${r.asks})` : ''} | ${r.taps} | ${topLine(r)} | ${r.targets.filter((t) => t.shown).map((t) => `${t.name}${t.first ? '' : ' (после замен)'}`).join(', ') || '0'} | ${r.best ? `${r.best.name} ${r.best.why.rank}` : 'все убраны ситами'} | ${r.seenFirst} из ${r.firstCount} → ${r.seenLeft}${r.seenTaps ? ` (нажатий ${r.seenTaps})` : ''} | ${r.todayRisk.length} из ${r.shownCount} |`),
    '',
    `Итого: ${targetsTotal(runs)}; медиана лучшего ранга цели ${bests.length ? median(bests) : '—'} (${[...bests].sort((a, b) => a - b).join(', ')}).`,
    '',
    'Как считается:',
    '- Экраны — от выбора домена до результата включительно, каждая страница «Показать другие» отдельно; в скобках, сколько из них уточняющие вопросы.',
    '- Нажатия — реакция на тайтл, чип, стоп, ответ пары и развилки по одному; «никогда» два (второй тап); «Ещё причины», набранный поиск, свободный текст и «Бросил» по одному; каждая кнопка «Дальше», «Не знаю», «Показать другие» и выбор варианта один; на результате «Уже смотрел» и «понравилось / не зашло» после него по одному.',
    '- Уже видел — карточки из любимого, нелюбимого или `alsoSeen` персоны: человек их видел, но системе не сказал. На результате персона жмёт на таких «Уже смотрел» по одной, пока они не кончатся (не больше 12 раз); внимательная ещё и отвечает «понравилось» про любимое и «не зашло» про нелюбимое. «Осталось» — сколько таких карточек на экране после этого.',
    '- Целей показано — цели среди всех карточек, что персона видела, включая пришедшие на место убранных («после замен»). В итоге в скобках — сколько их было в первой четвёрке, до «Уже смотрел»: это число сравнимо с отчётами до 29.10.2026.',
    '- Лучший ранг цели — наименьшее место цели по `whyNot` на итоговом состоянии, после всех «Уже смотрел».',
    '- Оценка «обрадуется ли» не считается здесь: её ставит агент по `eval/BRIEF.md`.',
  ];
  for (const r of runs) {
    const catalog = catalogs[r.persona.domain];
    out.push('', `## ${r.persona.name}, ${r.mode} (\`${r.persona.id}\`, seed ${r.seed})`, '', `Кто: ${r.persona.who} Сегодня: ${r.persona.today}`, '', 'Ответы:');
    out.push(...answersText(r, catalog).map((l) => `- ${l}`));
    r.results.forEach((res, i) => {
      out.push('', i === 0 ? 'Результат:' : `После поправки ${i}:`);
      out.push(...cardText(res.top, 'Топ'), ...res.alternatives.flatMap((c, j) => cardText(c, `Альт ${j + 1}`)));
    });
    out.push('', 'Цели:');
    for (const t of r.targets) {
      const w = t.why;
      out.push(`- ${t.name}: ${t.shown ? 'показана; ' : ''}${w.removedBy ? `убрало сито «${w.sieveName}» (${w.removedBy.reason})` : `место ${w.rank} из ${w.of}, счёт ${w.score} против ${w.leaderScore} у лидера${w.penalties.length ? `; штрафы: ${w.penalties.map((p) => `${p.label} ${p.contribution}`).join(', ')}` : ''}`}`);
    }
  }
  return out.join('\n') + '\n';
}

async function main() {
  const args = process.argv.slice(2);
  const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
  const modes = option('--mode') ? [option('--mode')] : ['careful', 'lazy'];
  const tag = option('--tag'); // names the report: eval/<date>-<tag>.md, e.g. the plan step it measures
  const values = new Set(['--mode', '--tag'].filter((o) => args.includes(o)).map((o) => args.indexOf(o) + 1));
  const filter = args.find((a, i) => !a.startsWith('--') && !values.has(i)) ?? 'all';
  const personas = loadPersonas().filter((p) => filter === 'all' || p.domain === filter || p.id === filter);
  if (!personas.length) throw new Error(`No persona for "${filter}"`);
  const domains = new Set(personas.map((p) => p.domain));
  const none = resolve(DATA, '__not_needed__.json'); // loadCatalogs skips a catalog whose file is missing
  const catalogs = loadCatalogs({ gamesPath: domains.has('game') ? undefined : none, screenPath: [...domains].some((d) => d !== 'game') ? undefined : none });

  const runs = [];
  for (const p of personas) {
    for (const mode of modes) {
      if (!p.modes[mode]) continue;
      const run = play(p, mode, catalogs);
      console.log(line(run));
      runs.push(run);
    }
  }
  const bests = runs.filter((r) => r.best).map((r) => r.best.why.rank);
  console.log(`\n${targetsTotal(runs)}; медиана лучшего ранга ${bests.length ? median(bests) : '—'}`);

  const suffix = (filter === 'all' && modes.length === 2 ? '' : `-${filter}${modes.length === 1 ? `-${modes[0]}` : ''}`) + (tag ? `-${tag}` : '');
  const file = resolve(EVAL_DIR, `${new Date().toISOString().slice(0, 10)}${suffix}.md`);
  mkdirSync(EVAL_DIR, { recursive: true });
  writeFileSync(file, report(runs, catalogs, `node src/stand/personas.js ${args.join(' ')}`.trim()), 'utf8');
  console.log(`отчёт: ${file}`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(ROOT, 'src', 'stand', 'personas.js')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
