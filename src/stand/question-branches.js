// Exhaust all answer/skip branches of the frozen question audit. No HTTP or model calls.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadCatalogs } from '../core/catalog.js';
import { applyAnswer, profileOf, sessionOf } from '../core/dialogue.js';
import { nextQuestion } from '../core/ask.js';
import { rankAll, choose } from '../core/recommend.js';
import { checkSieves } from '../core/sieves.js';

const dir = resolve('research-vault/taste-quality-strategy-2026-10/eval/questions-v1');
const target = resolve(dir, process.argv[2] ?? 'branches.json');
assert.equal(existsSync(target), false, 'Do not overwrite evidence');
const { cases } = JSON.parse(readFileSync(resolve(dir, 'cases.frozen.json'), 'utf8'));
const catalogs = loadCatalogs();
const results = [];
for (const c of cases) {
  const cat = catalogs[c.state.domain], nodes = [], terminal = [];
  function visit(state, path) {
    assert.ok(state.asked.length <= 3, 'question cap');
    const profile = profileOf(state), session = sessionOf(state), rank = rankAll(cat, profile, session);
    const picked = choose(rank.ranked).picked.map(r => r.game.id);
    for (const id of picked) assert.equal(checkSieves(cat.byId.get(id), rank.taste, session, cat), null);
    const q = nextQuestion(cat, profile, session, { asked: state.asked, rank });
    if (!q) { terminal.push({ path, asked: state.asked, picked, eligible: rank.ranked.length }); return; }
    assert.ok(!state.asked.includes(q.id), 'no repeated question');
    assert.notEqual(q.kind, 'pair', 'no arbitrary permanent taste choice');
    if (q.kind === 'lean') {
      assert.ok(cat.dict.pairs.some(x => q.id === `lean:${x.a}|${x.b}`), 'authored choice');
      const answered = [...(session.leans ?? []).flatMap(x => [x.f, x.against]),
        ...(session.intent?.wants ?? []).map(x => x.f), ...(session.intent?.avoids ?? []).map(x => x.f)];
      assert.ok(!answered.some(f => q.id.split(/[:|]/).includes(f)), 'do not repeat resolved intent');
    }
    const node = { path, qid: q.id, text: q.text, leader: rank.ranked[0]?.game.id, outcomes: [] };
    nodes.push(node);
    for (const value of [...q.options.map(o => o.value), null]) {
      const next = structuredClone(state);
      if (value === null) next.asked.push(q.id); else applyAnswer(next, q, value);
      assert.deepEqual(next.stops, state.stops, 'questions cannot weaken hard stops');
      if (q.kind !== 'guess' || value === null || value === 'no') assert.deepEqual(profileOf(next), profile);
      if (value === null) assert.deepEqual(sessionOf(next), session);
      const childRank = rankAll(cat, profileOf(next), sessionOf(next));
      node.outcomes.push({ value: value ?? 'skip', leader: childRank.ranked[0]?.game.id });
      visit(next, [...path, { qid: q.id, value: value ?? 'skip' }]);
    }
    if (q.kind !== 'guess') assert.ok(node.outcomes.some(x => x.leader !== node.leader), 'every asked question can really change the leader');
  }
  visit(structuredClone(c.state), []);
  results.push({ id: c.id, source: c.source, nodes, terminal });
  console.log(JSON.stringify({ id: c.id, questionStates: nodes.length, completePaths: terminal.length }));
}
writeFileSync(target, JSON.stringify({ at: new Date().toISOString(), paidCalls: 0, cases: results }, null, 2) + '\n');
