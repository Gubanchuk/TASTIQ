// Counterfactuals over a saved final state: change session moods/avoid/preferences, re-run the result
// screen through the stateless API, print top-4 and the rank of the persona's targets.
// Usage: node games-whatif.mjs <p1|p2> <careful|lazy>
import { readFileSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const OUT = 'C:/Users/Dusik/AppData/Local/Temp/claude/E--project-TASTIQ/316e07fd-614b-4eb4-a3ec-2c92111b7da4/scratchpad/out';
const [, , p, mode] = process.argv;
const run = JSON.parse(readFileSync(`${OUT}/games-${p}-${mode}.json`, 'utf8'));
const base = run.finalState;
const targets = run.targets.map((t) => ({ id: t.id, name: t.name }));

async function api(path, body) {
  const res = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return res.json();
}

const VARIANTS = {
  p1: [
    { name: 'as played (story+relax, avoid hard)', patch: (s) => s },
    { name: 'story only, avoid hard', patch: (s) => ({ ...s, session: { ...s.session, moods: ['story'], avoid: ['hard'] } }) },
    { name: 'story + finishable, avoid hard', patch: (s) => ({ ...s, session: { ...s.session, moods: ['story', 'finishable'], avoid: ['hard'] } }) },
    { name: 'story + short_session, avoid hard', patch: (s) => ({ ...s, session: { ...s.session, moods: ['story', 'short_session'], avoid: ['hard'] } }) },
    { name: 'story + relax, avoid hard + long', patch: (s) => ({ ...s, session: { ...s.session, moods: ['story', 'relax'], avoid: ['hard', 'long'] } }) },
    { name: 'as played + preference length.short (a fork "короткая?")', patch: (s) => ({ ...s, preferences: [...s.preferences, { f: 'length.short' }] }) },
    { name: 'as played + Firewatch and Edith Finch confirmed length.short (if MAX_WHY were 5)', patch: (s) => { const a = structuredClone(s.answers); a['steam:383870'] = { reaction: 'like', reasons: ['story.central', 'length.short', 'loop.dialogue', 'characters.memorable'] }; a['steam:501300'] = { reaction: 'like', reasons: ['story.central', 'length.short'] }; return { ...s, answers: a }; } },
    { name: 'as played + grind as hard no (never)', patch: (s) => { const a = structuredClone(s.answers); a['steam:2344520'].issues = [{ f: 'progression.grind', hard: true }, { f: 'pace.repetitive', hard: false }]; return { ...s, answers: a }; } },
  ],
  p2: [
    { name: 'as played', patch: (s) => s },
    { name: 'friend only (no adrenaline)', patch: (s) => ({ ...s, session: { ...s.session, moods: ['friend'], avoid: [] } }) },
    { name: 'friend + preference humor.funny (fork "смешное или напряжённое")', patch: (s) => ({ ...s, preferences: [...s.preferences, { f: 'humor.funny' }] }) },
    { name: 'friend + preference tone.creepy', patch: (s) => ({ ...s, preferences: [...s.preferences, { f: 'tone.creepy' }] }) },
    { name: 'as played + "played" Left 4 Dead 1 (same series as L4D2)', patch: (s) => ({ ...s, corrections: [...s.corrections, { id: 'steam:500', kind: 'played', reaction: 'like' }] }) },
    { name: 'as played + "played" L4D1, Dying Light, Barotrauma (he names what he already played)', patch: (s) => ({ ...s, corrections: [...s.corrections, { id: 'steam:500', kind: 'played', reaction: 'like' }, { id: 'steam:239140', kind: 'played', reaction: 'like' }, { id: 'steam:602960', kind: 'played', reaction: 'played' }] }) },
    { name: 'as played + avoid long (he wants something for tonight, not a 60h game)', patch: (s) => ({ ...s, session: { ...s.session, avoid: ['long'] } }) },
  ],
};

for (const v of VARIANTS[p]) {
  const state = { ...v.patch(structuredClone(base)), step: 'result' };
  const out = await api('/api/dialogue', { state, action: null });
  const r = out.screen.result;
  const line = (t) => t && `${t.name} [${t.label}] ${t.score}`;
  console.log(`\n## ${v.name}`);
  console.log(`  TOP: ${line(r.top)}`);
  r.alternatives.forEach((a, i) => console.log(`  ALT${i + 1}: ${line(a)}`));
  if (r.fork) console.log(`  FORK: ${r.fork.options.map((o) => o.label).join(' | ')}`);
  for (const t of targets) {
    const why = await api('/api/why', { state, id: t.id });
    console.log(`  target ${t.name}: ${why.removedBy ? 'REMOVED by sieve ' + why.removedBy.sieve + ' ' + why.removedBy.reason : 'rank ' + why.rank + '/' + why.of + ' score ' + why.score}`);
  }
}
