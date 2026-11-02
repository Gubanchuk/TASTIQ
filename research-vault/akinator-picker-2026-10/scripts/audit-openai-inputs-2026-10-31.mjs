// Read-only/offline investigation. Writes the actual model inputs and target ranks, never calls an AI API.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadCatalogs } from '../../../src/core/catalog.js';
import { candidatesOf } from '../../../src/ai/pick.js';
import { describeCandidates, describePerson } from '../../../src/ai/prompt.js';
import { stateAtFirstResult } from '../../../src/stand/diagnose.js';
import { loadPersonas, play } from '../../../src/stand/personas.js';
import { ROOT } from '../../../src/lib/fsx.js';

const catalogs = loadCatalogs();
const audits = [];
for (const P of loadPersonas().filter((p) => ['game', 'cartoon'].includes(p.domain))) for (const mode of ['careful', 'lazy']) {
  const run = play(P, mode, catalogs);
  const state = stateAtFirstResult(run, catalogs);
  const catalog = catalogs[P.domain];
  const { rows, ranked } = candidatesOf(catalog, state);
  const liked = Object.entries(state.answers).filter(([,a]) => ['love','like'].includes(a.reaction)).map(([id]) => catalog.byId.get(id)).filter(Boolean);
  const targetRows = P.targets.map((t) => {
    const index = ranked.findIndex((r) => r.game.id === t.id);
    const row = ranked[index];
    return { ...t, rank: index + 1, inList: rows.some((r) => r.game.id === t.id), hoursAtReview: row?.game.medianHoursAtReview,
      parts: row?.parts, matches: row?.matches.map(({f,contribution,confirmed})=>({f,contribution,confirmed})),
      penalties: row?.penalties, mood: row?.moodHits, features: row?.game.features,
      promptLine: row ? describeCandidates([row],catalog,liked) : null };
  });
  const audit = { persona: P.id, mode, state, personText: describePerson(state,catalog), candidatesText: describeCandidates(rows,catalog,liked), targets: targetRows };
  audits.push(audit);
  console.log(JSON.stringify({persona:P.id,mode,person:audit.personText,targets:targetRows.map(({name,rank,inList,hoursAtReview,parts,matches,mood,promptLine})=>({name,rank,inList,hoursAtReview,parts,matches,mood,promptLine}))}));
}
writeFileSync(resolve(ROOT,'research-vault/akinator-picker-2026-10/eval/2026-10-31-input-audit.json'),JSON.stringify(audits,null,2)+'\n');
