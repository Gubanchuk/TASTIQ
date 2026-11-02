// Plays a persona through the real dialogue API (http://localhost:5173) and writes a transcript.
// Usage: node games-driver.mjs <p1|p2> <careful|lazy>
import { writeFileSync, mkdirSync } from 'node:fs';
import { PERSONAS } from './games-personas.mjs';

const BASE = 'http://localhost:5173';
const OUT = 'C:/Users/Dusik/AppData/Local/Temp/claude/E--project-TASTIQ/316e07fd-614b-4eb4-a3ec-2c92111b7da4/scratchpad/out';
mkdirSync(OUT, { recursive: true });

async function api(path, body) {
  const res = await fetch(BASE + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const data = await res.json();
  if (!res.ok) throw new Error(`${path}: ${data.error ?? res.statusText}`);
  return data;
}
const search = (domain, q) => api(`/api/search?domain=${domain}&q=${encodeURIComponent(q)}`);
const parse = (domain, text) => api('/api/parse', { text, domain });

const [, , personaKey, mode] = process.argv;
const persona = PERSONAS[personaKey];
if (!persona || !['careful', 'lazy'].includes(mode)) throw new Error('usage: node games-driver.mjs <p1|p2> <careful|lazy>');
const plan = persona[mode];

const transcript = [];
let state = null;
let scr = null;
let screens = 0;

async function step(action, note) {
  const out = await api('/api/dialogue', { state, action });
  state = out.state;
  scr = out.screen;
  screens++;
  transcript.push({ n: screens, sent: action, note, screen: summarize(scr) });
  return scr;
}

function summarize(s) {
  const base = { step: s.step, title: s.title, hint: s.hint, progress: s.progress, canSkip: s.canSkip };
  if (s.options) base.options = s.options.map((o) => `${o.value}=${o.label}`);
  if (s.categories) base.categories = s.categories.map((o) => `${o.value}=${o.label}`);
  if (s.avoid) base.avoid = s.avoid.map((o) => `${o.value}=${o.label}`);
  if (s.items) base.items = s.items.map((x) => `${x.id} ${x.ru ?? x.name} (${x.year ?? '?'})`);
  if (s.item) base.item = `${s.item.id} ${s.item.ru ?? s.item.name}`;
  if (s.lines) base.lines = s.lines;
  if (s.result) base.result = resultSummary(s.result);
  return base;
}

function resultSummary(r) {
  const one = (t) => t && {
    id: t.id, name: t.name, ru: t.ru, year: t.year, label: t.labelText, score: t.score, parts: t.parts, price: t.price, genres: t.genres,
    reasons: t.explanation.reasons.map((x) => x.text), risks: t.explanation.risks.map((x) => x.text), info: t.explanation.info.map((x) => x.text),
  };
  return { top: one(r.top), alternatives: r.alternatives.map(one), fork: r.fork && { text: r.fork.text, options: r.fork.options.map((o) => `${o.f}=${o.label} → ${o.favours}`) }, sieves: r.sieves.map((s) => `${s.id} ${s.name}: ${s.removed}`), considered: r.considered, taste: r.taste };
}

const log = (...a) => console.log(...a);

// ---------------- play ----------------
await step(null, 'open');
await step({ type: 'choose', value: 'game' }, 'domain: game');
await step({ type: 'choose', value: persona.platform }, 'platform');

// genres
if (plan.genres === 'skip') await step({ type: 'skip' }, 'genres: skip');
else {
  const offered = scr.options.map((o) => o.value);
  const chosen = plan.genres.filter((f) => offered.includes(f));
  const missing = plan.genres.filter((f) => !offered.includes(f));
  await step({ type: 'genres', values: chosen }, `genres chosen=${chosen.join(',')} missing=${missing.join(',') || '-'}`);
}

// liked
const notes = [];
async function pickScreen(kind, knownIds, searchList, allowMore) {
  let shownAll = [];
  let ticks = [];
  let pages = 0;
  while (true) {
    const items = scr.items.map((x) => x.id);
    shownAll.push(...items);
    const hits = items.filter((id) => knownIds.includes(id));
    ticks.push(...hits);
    pages++;
    notes.push(`${kind} page ${pages}: shown ${items.length}, recognised ${hits.length} (${hits.join(',') || '-'})`);
    if (ticks.length >= 1 || !allowMore || pages >= allowMore) break;
    await step({ type: 'more', ids: items }, `${kind}: ещё (page ${pages})`);
  }
  const searched = [];
  for (const q of searchList ?? []) {
    const found = await search('game', q.q);
    const hit = found.find((x) => x.id === q.id);
    notes.push(`search "${q.q}" → ${found.slice(0, 3).map((x) => `${x.id} ${x.name}`).join(' | ')} → ${hit ? 'found' : 'NOT FOUND'}`);
    if (hit && !ticks.includes(hit.id)) searched.push(hit.id);
  }
  const ids = [...ticks, ...searched];
  if (!ids.length && kind === 'disliked') return step({ type: 'skip' }, 'disliked: skip (nothing recognised)');
  if (!ids.length) return step({ type: 'pick', ids: [], shownIds: shownAll }, `${kind}: nothing recognised, sent empty pick`);
  return step({ type: 'pick', ids, shownIds: shownAll }, `${kind}: pick ${ids.join(',')} (ticks=${ticks.length}, searched=${searched.length})`);
}

await pickScreen('liked', persona.loved.map((x) => x.id), plan.searchLiked, plan.morePages);

// why loop
const answered = [];
while (scr.step === 'why') {
  const id = scr.item.id;
  const spec = persona.loved.find((x) => x.id === id);
  const offered = scr.options.map((o) => o.value);
  if (plan.whyMode === 'skip') { await step({ type: 'skip' }, `why ${id}: skip`); continue; }
  let values = spec.reasons.filter((f) => offered.includes(f));
  const missing = spec.reasons.filter((f) => !offered.includes(f));
  let extra = [];
  let parsed = null;
  if (plan.whyMode === 'one') values = values.slice(0, 1);
  if (plan.whyMode === 'full' && spec.text) {
    parsed = await parse('game', spec.text);
    extra = parsed.positive.map((p) => p.f).filter((f) => !values.includes(f));
    values = [...values, ...extra];
  }
  answered.push({ id, offered: scr.options.map((o) => `${o.value}=${o.label}`), wanted: spec.reasons, chosen: values, missingChips: missing, text: spec.text, parsed: parsed && { positive: parsed.positive.map((p) => `${p.f} (${p.keyword})`), negative: parsed.negative.map((p) => `${p.f} (${p.keyword})`) } });
  await step({ type: 'reasons', values, love: plan.whyMode === 'full' ? Boolean(spec.love) : false, issues: parsed ? parsed.negative.map((n) => ({ f: n.f, hard: n.hard })) : [] }, `why ${id}: ${values.join(',') || '(none)'} love=${plan.whyMode === 'full' && spec.love} missing=${missing.join(',') || '-'} parsed+=${extra.join(',') || '-'}`);
}

// disliked
if (plan.disliked === 'skip') await step({ type: 'skip' }, 'disliked: skip');
else await pickScreen('disliked', persona.disliked.map((x) => x.id), plan.searchDisliked, 1);

const complaints = [];
while (scr.step === 'why_not') {
  const id = scr.item.id;
  const spec = persona.disliked.find((x) => x.id === id);
  const offered = [...scr.options, ...scr.categories].map((o) => o.value);
  let issues = spec.issues.filter((i) => offered.includes(i.f));
  const missing = spec.issues.filter((i) => !offered.includes(i.f)).map((i) => i.f);
  let parsed = null;
  if (plan.whyMode === 'full' && spec.text) {
    parsed = await parse('game', spec.text);
    for (const n of parsed.negative) if (!issues.some((i) => i.f === n.f)) issues.push({ f: n.f, hard: n.hard });
  }
  complaints.push({ id, offered: scr.options.map((o) => `${o.value}=${o.label}`), categories: scr.categories.map((o) => `${o.value}=${o.label}`), wanted: spec.issues, chosen: issues, missingChips: missing, text: spec.text, parsed: parsed && { positive: parsed.positive.map((p) => `${p.f} (${p.keyword})`), negative: parsed.negative.map((p) => `${p.f} (${p.keyword})${p.hard ? ' HARD' : ''}`) } });
  await step({ type: 'issues', issues, badQuality: false }, `why_not ${id}: ${issues.map((i) => i.f + (i.hard ? '!' : '')).join(',') || '(none)'} missing=${missing.join(',') || '-'}`);
}

// today
if (scr.step !== 'today') throw new Error('expected today, got ' + scr.step);
if (plan.today === 'skip') await step({ type: 'skip' }, 'today: skip');
else {
  const moods = scr.options.map((o) => o.value);
  const avoids = scr.avoid.map((o) => o.value);
  const values = plan.today.moods.filter((m) => moods.includes(m));
  const avoid = plan.today.avoid.filter((a) => avoids.includes(a));
  await step({ type: 'today', values, avoid }, `today: moods=${values.join(',') || '-'} avoid=${avoid.join(',') || '-'}; offered moods=${moods.join(',')} avoid=${avoids.join(',')}`);
}

// playback
const playback = scr.lines;
await step({ type: 'choose', value: 'confirm' }, 'playback: confirm');

// result + fork
const results = [{ stage: 'initial', result: scr.result }];
if (scr.result.fork && plan.fork) {
  const choice = plan.fork(scr.result.fork);
  await step({ type: 'fork', f: choice }, `fork answered: ${choice ?? 'neither'}`);
  results.push({ stage: 'after fork', result: scr.result });
}

// targets
const targets = [];
for (const t of persona.targets) {
  const why = await api('/api/why', { state, id: t.id });
  const shownIn = results.map((r) => [r.result.top?.id, ...r.result.alternatives.map((a) => a.id)]);
  targets.push({ ...t, shown: shownIn.some((ids) => ids.includes(t.id)), why });
}
const extraWhy = [];
for (const t of persona.extraWhy ?? []) extraWhy.push({ ...t, why: await api('/api/why', { state, id: t.id }) });

const out = { persona: personaKey, mode, screens, notes, answered, complaints, playback, results: results.map((r) => ({ stage: r.stage, result: resultSummary(r.result) })), targets, extraWhy, transcript, finalState: state };
const file = `${OUT}/games-${personaKey}-${mode}.json`;
writeFileSync(file, JSON.stringify(out, null, 2), 'utf8');

// readable summary
log(`\n==== ${personaKey} ${mode}: ${screens} screens ====`);
for (const t of transcript) log(`#${t.n} [${t.screen.step}] ${t.note ?? ''}`);
log('\n-- notes'); for (const n of notes) log('  ' + n);
log('\n-- playback'); for (const l of playback ?? []) log('  ' + l);
for (const r of results) {
  const R = resultSummary(r.result);
  log(`\n-- result (${r.stage}): considered ${R.considered}; sieves ${R.sieves.join('; ')}`);
  const show = (t, tag) => { if (!t) return; log(`  ${tag}: ${t.id} ${t.name} (${t.year ?? '?'}) [${t.label}] score=${t.score} parts=${JSON.stringify(t.parts)}`); for (const x of t.reasons) log('      + ' + x); for (const x of t.risks) log('      - ' + x); for (const x of t.info) log('      i ' + x); };
  show(R.top, 'TOP');
  R.alternatives.forEach((a, i) => show(a, `ALT${i + 1}`));
  if (R.fork) log(`  FORK: ${R.fork.text} ${R.fork.options.join(' | ')}`);
}
log('\n-- targets');
for (const t of targets) log(`  ${t.id} ${t.name}: shown=${t.shown} why=${JSON.stringify(t.why)}`);
for (const t of extraWhy) log(`  extra ${t.id} ${t.name}: why=${JSON.stringify(t.why)}`);
log(`\nsaved ${file}`);
