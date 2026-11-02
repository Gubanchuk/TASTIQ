// Plays one persona through the real dialogue API. Usage: node games-run.mjs p1 careful [seed]
// careful: answers every screen as the person would, using only what the screen offers (chips, search, free text via /api/parse).
// lazy: skips what can be skipped, taps at most 1–2 things on the first page, ignores the fork.
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Run } from './games-lib.mjs';
import { PERSONAS } from './games-personas.mjs';

const [, , personaId = 'p1', mode = 'careful', seedArg = '424242'] = process.argv;
const P = PERSONAS[personaId];
const careful = mode === 'careful';
const seed = Number(seedArg);
const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '..', `games-${personaId}-${mode}`);

const run = new Run(`${personaId}-${mode}`);
const summary = { persona: P.name, mode, seed, missingChips: [], parsed: [], searched: [], unanswerable: [], picks: [], whyAsked: [], whyNotAsked: [] };

const byLabel = (opts) => Object.fromEntries((opts ?? []).map((o) => [o.value, o.label]));

async function pickScreen(kind) {
  // kind: 'liked' | 'disliked'. The person taps what they know on the page, pages once (careful), then searches.
  const pool = kind === 'liked' ? P.loved : P.disliked;
  const selected = [];
  const shownIds = new Set();
  const maxPages = careful ? 2 : 1;
  for (let page = 0; page < maxPages; page++) {
    const s = run.screen;
    for (const x of s.items) shownIds.add(x.id);
    const hits = s.items.filter((x) => pool[x.id] && !selected.includes(x.id)).map((x) => x.id);
    selected.push(...hits);
    run.note(`${kind} page ${page + 1}: ${s.items.length} titles, known ${kind}: ${hits.length} (${hits.map((id) => pool[id].q).join(', ') || 'none'})`);
    if (!careful && selected.length) break;
    if (page + 1 < maxPages || (!careful && !selected.length && page === 0)) {
      await run.send({ type: 'more', ids: s.items.map((x) => x.id) }, 'tapped «Показать другие»');
      if (!careful) { // lazy: one more page only if the first had nothing
        const s2 = run.screen;
        for (const x of s2.items) shownIds.add(x.id);
        const hits2 = s2.items.filter((x) => pool[x.id]).map((x) => x.id);
        selected.push(...hits2.slice(0, 2));
        run.note(`${kind} page 2 (lazy fallback): known: ${hits2.length}`);
        break;
      }
    }
  }
  if (!careful) selected.splice(2); // lazy: at most two taps
  if (careful) {
    const want = Object.keys(pool).filter((id) => !selected.includes(id));
    const budget = kind === 'liked' ? 5 : 3;
    for (const id of want.slice(0, budget)) {
      const found = await run.search(pool[id].q);
      const hit = found.find((x) => x.id === id);
      summary.searched.push({ kind, q: pool[id].q, found: Boolean(hit), top: found[0]?.name ?? null, position: hit ? found.indexOf(hit) + 1 : null });
      if (hit) selected.push(id);
    }
  }
  if (!careful && kind === 'liked' && !selected.length) {
    const id = Object.keys(pool)[0];
    const found = await run.search(pool[id].q);
    if (found.find((x) => x.id === id)) selected.push(id);
    summary.searched.push({ kind, q: pool[id].q, found: Boolean(found.find((x) => x.id === id)), lazyFallback: true });
  }
  summary.picks.push({ kind, selected: selected.map((id) => pool[id]?.q ?? id), shown: shownIds.size });
  if (!selected.length && kind === 'disliked') return run.send({ type: 'skip' }, 'nothing known on the page; skipped');
  return run.send({ type: 'pick', ids: selected, shownIds: [...shownIds] }, `picked ${selected.length}: ${selected.map((id) => pool[id].q).join(', ')}`);
}

async function whyScreen() {
  const s = run.screen;
  const id = s.item.id;
  const me = P.loved[id];
  const offered = byLabel(s.options);
  const chosen = me.reasons.filter((f) => offered[f]);
  const missing = me.reasons.filter((f) => !offered[f]);
  const record = { item: s.item.name, offered: Object.values(offered), chosen: chosen.map((f) => offered[f]), missing, extra: [] };
  if (!careful) {
    // lazy: one chip on the first "why", skip the others
    if (summary.whyAsked.length > 0) { summary.whyAsked.push({ item: s.item.name, skipped: true }); return run.send({ type: 'skip' }, 'lazy: skipped «за что»'); }
    const one = chosen[0] ?? s.options[0]?.value;
    summary.whyAsked.push({ ...record, chosen: [offered[one]] });
    return run.send({ type: 'reasons', values: one ? [one] : [], love: false, issues: [] }, `lazy: one chip «${offered[one]}»`);
  }
  const values = [...chosen];
  if (missing.length && me.text) {
    const p = await run.parse(me.text);
    const added = p.positive.filter((x) => !values.includes(x.f));
    for (const x of added) values.push(x.f);
    record.extra = added.map((x) => x.label);
    record.parseNegative = p.negative.map((x) => x.label);
    summary.parsed.push({ step: 'why', item: s.item.name, text: me.text, understood: p.understood, positive: p.positive.map((x) => x.label), negative: p.negative.map((x) => x.label) });
  }
  if (missing.length) summary.missingChips.push({ step: 'why', item: s.item.name, missing, offered: Object.values(offered) });
  summary.whyAsked.push(record);
  return run.send({ type: 'reasons', values, love: Boolean(me.love), issues: [] }, `chips: ${values.map((f) => offered[f] ?? `+${f}`).join(', ')}${me.love ? ' + обожаю' : ''}`);
}

async function whyNotScreen() {
  const s = run.screen;
  const id = s.item.id;
  const me = P.disliked[id];
  const offered = { ...byLabel(s.options), ...byLabel(s.categories) };
  const chosen = me.issues.filter((x) => offered[x.f]);
  const missing = me.issues.filter((x) => !offered[x.f]).map((x) => x.f);
  const issues = [...chosen];
  const record = { item: s.item.name, offered: s.options.map((o) => o.label), categories: (s.categories ?? []).map((o) => o.label), chosen: chosen.map((x) => `${offered[x.f]}${x.hard ? ' (никогда)' : ''}`), missing, extra: [] };
  if (missing.length && me.text) {
    const p = await run.parse(me.text);
    const added = [...p.negative, ...p.positive].filter((x) => !issues.some((i) => i.f === x.f));
    for (const x of added) issues.push({ f: x.f, hard: Boolean(x.hard) });
    record.extra = added.map((x) => x.label);
    summary.parsed.push({ step: 'why_not', item: s.item.name, text: me.text, understood: p.understood, positive: p.positive.map((x) => x.label), negative: p.negative.map((x) => x.label) });
  }
  if (missing.length) summary.missingChips.push({ step: 'why_not', item: s.item.name, missing, offered: record.offered, categories: record.categories });
  summary.whyNotAsked.push(record);
  return run.send({ type: 'issues', issues, badQuality: false }, `issues: ${issues.map((x) => `${offered[x.f] ?? `+${x.f}`}${x.hard ? ' (никогда)' : ''}`).join(', ')}`);
}

async function main() {
  await run.start(seed);
  let guard = 0;
  while (run.screen.step !== 'result' && guard++ < 40) {
    const s = run.screen;
    switch (s.step) {
      case 'domain': await run.send({ type: 'choose', value: 'game' }); break;
      case 'platform': await run.send({ type: 'choose', value: 'windows' }); break;
      case 'genres':
        if (careful) await run.send({ type: 'genres', values: P.genres }, `genres: ${P.genres.join(', ')}`);
        else await run.send({ type: 'skip' }, 'lazy: skipped genres');
        break;
      case 'liked': await pickScreen('liked'); break;
      case 'why': await whyScreen(); break;
      case 'disliked':
        if (careful) await pickScreen('disliked');
        else await run.send({ type: 'skip' }, 'lazy: skipped «не зашло»');
        break;
      case 'why_not': await whyNotScreen(); break;
      case 'today':
        if (careful) await run.send({ type: 'today', values: P.today.values, avoid: P.today.avoid }, `today: ${P.today.values.join(', ')}; avoid: ${P.today.avoid.join(', ')}`);
        else await run.send({ type: 'skip' }, 'lazy: skipped «что сегодня»');
        break;
      case 'playback': await run.send({ type: 'choose', value: 'confirm' }, 'confirmed «Да, подбирай»'); break;
      default: throw new Error(`unexpected step ${s.step}`);
    }
  }
  const results = [];
  const snapshot = (tag) => {
    const r = run.screen.result;
    results.push({ tag, top: r.top, alternatives: r.alternatives, fork: r.fork, sieves: r.sieves, considered: r.considered, taste: r.taste });
  };
  snapshot('first');
  if (careful && run.screen.result.fork) {
    const f = run.screen.result.fork;
    const pref = P.forkPref.find((x) => f.options.some((o) => o.f === x));
    const answer = pref ?? '';
    await run.send({ type: 'fork', f: answer || null }, `fork «${f.text}»: ${answer ? f.options.find((o) => o.f === answer).label : 'Одинаково'}`);
    snapshot('after fork');
    if (run.screen.result.fork) {
      const f2 = run.screen.result.fork;
      const pref2 = P.forkPref.find((x) => f2.options.some((o) => o.f === x));
      await run.send({ type: 'fork', f: pref2 || null }, `fork 2 «${f2.text}»: ${pref2 ? f2.options.find((o) => o.f === pref2).label : 'Одинаково'}`);
      snapshot('after fork 2');
    }
  }
  const finalResult = results.at(-1);
  const shownIds = new Set(results.flatMap((r) => [r.top?.id, ...r.alternatives.map((a) => a.id)]).filter(Boolean));
  const targets = [];
  for (const [id, name] of Object.entries(P.targets)) {
    const inCatalog = (await run.search(name.replace(/ \(.*\)$/, ''))).some((x) => x.id === id);
    const shown = shownIds.has(id);
    const why = await run.why(id);
    targets.push({ id, name, inCatalog, shown, why });
  }
  const report = { summary: { ...summary, screens: run.screens, taps: run.taps, notes: run.notes }, results, targets, finalState: run.state };
  writeFileSync(`${out}.json`, JSON.stringify(report, null, 1), 'utf8');
  writeFileSync(`${out}.log.txt`, `${run.text()}\n\nNOTES\n${run.notes.join('\n')}\n\nTARGETS\n${JSON.stringify(targets, null, 1)}\n\nSUMMARY\n${JSON.stringify(report.summary, null, 1)}`, 'utf8');
  console.log(`${run.name}: ${run.screens} screens, ${run.taps} taps`);
  console.log(results.map((r) => `${r.tag}: TOP ${r.top?.name} (${r.top?.labelText}); ALT ${r.alternatives.map((a) => a.name).join(' / ')}${r.fork ? `; fork: ${r.fork.options.map((o) => o.label).join(' vs ')}` : ''}`).join('\n'));
  console.log('targets: ' + targets.map((t) => `${t.name}: ${t.shown ? 'SHOWN' : t.why.removedBy ? `removed by sieve ${t.why.removedBy.sieve} (${t.why.removedBy.reason})` : `rank ${t.why.rank}/${t.why.of}, score ${t.why.score} vs leader ${t.why.leaderScore}`}`).join(' | '));
  console.log(`files: ${out}.json, ${out}.log.txt`);
}

main().catch((e) => { console.error(e); process.exit(1); });
