// Freezes the stands' feature pools (people.js) into src/stand/pools.json, so that the same synthetic people meet
// later versions of the data. Rerun only to move the stands to a new pool on purpose: results before and after the
// move do not compare.
//
// Usage: node src/stand/freeze-pools.js [--screen <catalog-screen.json>] [--games <catalog.json>]
//   Without paths it freezes the current data. The pools of 2026-10-27 were frozen from the screen catalog as it was
//   before the series re-tagging of 2026-10-26 (the one the stand of 2026-10-24 ran on) and the current games catalog.
import { writeFileSync } from 'node:fs';
import { loadCatalogs } from '../core/catalog.js';
import { livePool, POOLS_FILE } from './people.js';

const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const screenPath = option('--screen');
const gamesPath = option('--games');
const catalogs = loadCatalogs({ screenPath, gamesPath });

const domains = {};
for (const [id, catalog] of Object.entries(catalogs)) {
  domains[id] = livePool(catalog);
  console.log(`${id}: ${domains[id].likeable.length} likeable, ${domains[id].dislikeable.length} dislikeable`);
}
const out = {
  frozen: new Date().toISOString().slice(0, 10),
  from: { screen: screenPath ?? 'data/catalog-screen.json', games: gamesPath ?? 'data/catalog.json' },
  domains,
};
writeFileSync(POOLS_FILE, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`записано: ${POOLS_FILE.pathname}`);
