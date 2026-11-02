// Drives one persona through the live dialogue twice: careful (honest, uses search + chips + free text)
// and lazy (skips everything skippable, minimal clicks). Produces transcripts and a target check.
import { Run, checkTargets, describe, fmtWhy, parse, resultIds } from './films-lib.js';

const ids = (items) => items.map((x) => x.id);
const nameOf = (c) => `${c.ru ?? c.name} (${c.year})`;

export async function runCareful(p) {
  const run = new Run(`${p.name} — careful`);
  let s = await run.step(null, 'открыли /pick/');
  run.state.seed = p.seed;
  s = await run.step({ type: 'choose', value: 'film' }, 'Посмотреть фильм');

  // genres
  const genreOffered = s.options.map((o) => o.value);
  const genreChosen = p.genres.filter((g) => genreOffered.includes(g));
  const genreMissing = p.genres.filter((g) => !genreOffered.includes(g));
  if (genreMissing.length) run.note(`genres: хотели ещё ${genreMissing.join(', ')}, таких кнопок нет`);
  s = await run.step({ type: 'genres', values: genreChosen }, `${p.genresNote} → ${genreChosen.join(', ')}`);

  // liked: searched own titles first (asked "за что" in this order), plus ticks on the shown page
  const shownLiked = s.items.filter((c) => p.alsoLiked.includes(c.id)).map((c) => c.id);
  const likedIds = [...p.liked.map((x) => x.id), ...shownLiked.filter((id) => !p.liked.some((x) => x.id === id))];
  run.note(`liked page shows: ${s.items.map(nameOf).join(' | ')}. Из них узнали и зашло: ${s.items.filter((c) => shownLiked.includes(c.id)).map(nameOf).join(', ') || 'ничего'}. Остальное нашли через поиск.`);
  s = await run.step({ type: 'pick', ids: likedIds, known: {}, shownIds: ids(s.items) }, p.likedNote);

  // why (up to 3)
  while (s.step === 'why') {
    const entry = p.liked.find((x) => x.id === s.item.id) ?? { wanted: [], words: '', love: false };
    const { chosen, missing, offeredLabels } = run.chooseChips(s, entry.wanted);
    let values = [...chosen];
    let parsedNote = '';
    if (entry.freeText) {
      const out = await parse(entry.freeText);
      const added = out.positive.map((x) => x.f).filter((f) => !values.includes(f));
      values.push(...added);
      parsedNote = ` | free text «${entry.freeText}» → parse: +${out.positive.map((x) => x.label).join(', ') || '—'}; −${out.negative.map((x) => x.label).join(', ') || '—'}; understood=${out.understood}`;
    }
    run.note(`why «${nameOf(s.item)}»: offered [${offeredLabels.join(' | ')}]; persona says: ${entry.words}; chosen ${JSON.stringify(values)}; wanted but not offered: ${missing.join(', ') || '—'}${parsedNote}`);
    s = await run.step({ type: 'reasons', values, love: Boolean(entry.love), issues: [] }, entry.words);
  }

  // disliked
  run.note(`disliked page shows: ${s.items.map(nameOf).join(' | ')}`);
  s = await run.step({ type: 'pick', ids: p.disliked.map((x) => x.id), known: {}, shownIds: ids(s.items) }, p.dislikedNote);

  while (s.step === 'why_not') {
    const entry = p.disliked.find((x) => x.id === s.item.id) ?? { complaints: [], categories: [], words: '' };
    const offered = new Set(s.options.map((o) => o.value));
    const cats = new Set(s.categories.map((o) => o.value));
    const complaints = entry.complaints.filter((f) => offered.has(f));
    const missing = entry.complaints.filter((f) => !offered.has(f));
    const categories = (entry.categories ?? []).filter((c) => cats.has(c.f));
    const catMissing = (entry.categories ?? []).filter((c) => !cats.has(c.f)).map((c) => c.f);
    const issues = [...complaints.map((f) => ({ f, hard: false })), ...categories];
    run.note(`why_not «${nameOf(s.item)}»: complaints offered [${s.options.map((o) => o.label).join(' | ')}]; categories [${s.categories.map((o) => o.label).join(' | ')}]; persona says: ${entry.words}; chosen ${JSON.stringify(issues)}; wanted but not offered: ${[...missing, ...catMissing].join(', ') || '—'}`);
    s = await run.step({ type: 'issues', issues, badQuality: Boolean(entry.badQuality) }, entry.words);
  }

  // today
  run.note(`today offered moods [${s.options.map((o) => o.label).join(' | ')}], avoid [${s.avoid.map((o) => o.label).join(' | ')}]; persona: ${p.todayNote}`);
  s = await run.step({ type: 'today', values: p.today.moods, avoid: p.today.avoid }, p.todayNote);

  // playback
  run.note(`playback lines:\n${s.lines.map((l) => '  > ' + l).join('\n')}`);
  s = await run.step({ type: 'choose', value: 'confirm' }, 'Да, подбирай');

  const results = [{ tag: 'result', screen: s }];
  if (s.result.fork && p.forkAnswer) {
    const f = p.forkAnswer(s.result.fork);
    run.note(`fork: «${s.result.fork.text}» ${s.result.fork.options.map((o) => o.label).join(' / ')} → persona answers ${f ?? 'ни то ни другое'}`);
    s = await run.step({ type: 'fork', f }, 'ответ на развилку');
    results.push({ tag: 'after fork', screen: s });
  }
  const shown = [...new Set(results.flatMap((r) => resultIds(r.screen)))];
  const targets = await checkTargets(run, p.targets, shown);
  run.save(`${p.file}-careful`);
  return { run, results, targets, shown };
}

export async function runLazy(p) {
  const run = new Run(`${p.name} — lazy`);
  let s = await run.step(null, 'открыли /pick/');
  run.state.seed = p.seed + 1;
  s = await run.step({ type: 'choose', value: 'film' }, 'Посмотреть фильм');
  s = await run.step({ type: 'skip' }, 'пропустил «что обычно смотришь»');

  // liked: tick what is recognised on the page; one «ещё» if nothing; no search
  let picks = s.items.filter((c) => p.lazyKnown.includes(c.id));
  run.note(`liked page 1: ${s.items.map(nameOf).join(' | ')} → узнал и зашло: ${picks.map(nameOf).join(', ') || 'ничего'}`);
  if (!picks.length) {
    s = await run.step({ type: 'more', ids: ids(s.items) }, 'ничего знакомого, нажал «ещё»');
    picks = s.items.filter((c) => p.lazyKnown.includes(c.id));
    run.note(`liked page 2: ${s.items.map(nameOf).join(' | ')} → узнал и зашло: ${picks.map(nameOf).join(', ') || 'ничего'}`);
  }
  picks = picks.slice(0, 2);
  s = await run.step({ type: 'pick', ids: ids(picks), known: {}, shownIds: ids(s.items) }, `отметил ${picks.map(nameOf).join(', ') || 'ничего'}, дальше`);

  while (s.step === 'why') {
    const first = s.options[0];
    const honest = p.lazyWhy?.(s.item.id, s.options);
    const value = honest ?? first?.value;
    run.note(`why «${nameOf(s.item)}»: offered [${s.options.map((o) => o.label).join(' | ')}] → ткнул «${s.options.find((o) => o.value === value)?.label ?? '—'}»`);
    s = await run.step({ type: 'reasons', values: value ? [value] : [], love: false, issues: [] }, 'один чип, дальше');
  }
  if (s.step === 'disliked') s = await run.step({ type: 'skip' }, 'пропустил «что не зашло»');
  if (s.step === 'today') s = await run.step({ type: 'skip' }, 'пропустил «что сегодня»');
  run.note(`playback lines:\n${s.lines.map((l) => '  > ' + l).join('\n')}`);
  s = await run.step({ type: 'choose', value: 'confirm' }, 'Да, подбирай');
  const results = [{ tag: 'result', screen: s }];
  if (s.result.fork) run.note(`fork shown («${s.result.fork.text}» ${s.result.fork.options.map((o) => o.label).join(' / ')}), lazy user ignores it`);
  const shown = resultIds(s);
  const targets = await checkTargets(run, p.targets, shown);
  run.save(`${p.file}-lazy`);
  return { run, results, targets, shown };
}

export function printSummary(label, { run, results, targets }) {
  console.log(`\n===== ${label} (${run.screens} screens) =====`);
  for (const n of run.notes) console.log('NOTE', n);
  for (const r of results) { console.log(`--- ${r.tag}`); console.log(describe(r.screen)); }
  console.log('--- targets');
  for (const t of targets) console.log(`${t.name} {${t.id}}: ${t.shown ? 'SHOWN' : fmtWhy(t.why)}`);
}
