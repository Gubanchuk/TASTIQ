// Checks that src/stand/personas.js plays the personas exactly as the agents' drivers did on 2026-10-21:
// for every run the final dialogue state must equal the one saved in eval/baseline-2026-10-21.json.
// Valid only on the engine and data of that day; after step 1 the states are expected to differ.
// Usage (from the repo root): node --max-old-space-size=8192 research-vault/akinator-picker-2026-10/scripts/personas-verify.mjs
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..', '..');
const { loadCatalogs } = await import(pathToFileURL(resolve(root, 'src/core/catalog.js')));
const { loadPersonas, play } = await import(pathToFileURL(resolve(root, 'src/stand/personas.js')));
const baseline = JSON.parse(readFileSync(resolve(here, '..', 'eval', 'baseline-2026-10-21.json'), 'utf8')).runs;

// Drivers sent "skip" or an empty answer interchangeably and repeated shown ids; both reduce to the same profile.
const norm = (s) => ({
  domain: s.domain, platform: s.platform, genres: s.genres, liked: s.liked, disliked: s.disliked, seed: s.seed,
  corrections: s.corrections, preferences: s.preferences, session: s.session, shown: [...new Set(s.shown)].sort(),
  answers: Object.fromEntries(Object.entries(s.answers).sort().map(([id, a]) => [id, {
    reaction: a.reaction, reasons: a.reasons ?? [], badQuality: Boolean(a.badQuality),
    issues: (a.issues ?? []).map((x) => ({ f: x.f, hard: Boolean(x.hard) })),
  }])),
});

const catalogs = loadCatalogs();
let differ = 0;
for (const p of loadPersonas()) {
  for (const mode of Object.keys(p.modes)) {
    const a = norm(play(p, mode, catalogs).finalState);
    const b = norm(baseline[`${p.id} ${mode}`].finalState);
    const keys = Object.keys(a).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
    if (keys.length) differ++;
    console.log(`${p.id} ${mode}: ${keys.length ? `differs in ${keys.join(', ')}` : 'same state'}`);
  }
}
console.log(differ ? `${differ} runs differ from 2026-10-21` : 'all runs match 2026-10-21');
process.exit(differ ? 1 : 0);
