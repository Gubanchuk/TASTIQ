// Read-only: loads the games catalog with the project's own code and prints the full ranking for a finished run's state.
// Usage: node games-rank.mjs <run json> [n]
import { readFileSync } from 'node:fs';
import { makeCatalog } from 'file:///E:/project/TASTIQ/src/core/catalog.js';
import { rankAll } from 'file:///E:/project/TASTIQ/src/core/recommend.js';

const [, , file, nArg = '25'] = process.argv;
const report = JSON.parse(readFileSync(file, 'utf8'));
const s = report.finalState;
const raw = JSON.parse(readFileSync('E:/project/TASTIQ/data/catalog.json', 'utf8'));
const catalog = makeCatalog(raw, 'game');
const { ranked } = rankAll(catalog, { answers: s.answers, corrections: s.corrections, preferences: s.preferences }, { ...s.session, platform: s.platform });
const label = (f) => catalog.dict.featureById.get(f)?.label ?? f;
ranked.slice(0, Number(nArg)).forEach((r, i) => {
  const g = r.game;
  console.log(`${String(i + 1).padStart(2)} ${g.name} (${g.id}) score ${r.score.toFixed(2)} fit ${r.parts.fit.toFixed(2)} pen ${r.parts.penalty.toFixed(2)} mood ${r.parts.mood.toFixed(2)} prior ${r.parts.prior.toFixed(2)} | h ${g.medianHoursAtReview ?? '?'} | coop ${g.features['social.coop']?.r ?? '-'} pvp ${g.features['social.pvp']?.r ?? '-'} | ${r.matches.filter((m) => m.confirmed).map((m) => label(m.f)).join(', ')}`);
});
for (const id of Object.keys(report.summary ? (report.targets ?? []).reduce((a, t) => ({ ...a, [t.id]: 1 }), {}) : {})) {
  const i = ranked.findIndex((r) => r.game.id === id);
  console.log(`target ${id}: rank ${i + 1}`);
}
