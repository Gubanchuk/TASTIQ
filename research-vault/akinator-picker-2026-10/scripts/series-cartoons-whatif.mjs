// What-if on a finished run: load final state, apply result-screen actions, print the new result and target ranks.
// Usage: node series-cartoons-whatif.mjs <run-json> '<action json>' [more actions...]
import { readFileSync } from 'node:fs';
import { post, describeResult, why } from './series-cartoons-lib.mjs';

const [file, ...actions] = process.argv.slice(2);
const run = JSON.parse(readFileSync(file, 'utf8'));
let state = run.finalState;
for (const a of actions) {
  const action = JSON.parse(a);
  ({ state } = await post('/api/dialogue', { state, action }));
  console.log(`applied ${a}`);
}
const { screen } = await post('/api/dialogue', { state });
console.log(describeResult(screen.result));
const targets = state.domain === 'series' ? ['tt10986410', 'tt1826940', 'tt14218830'] : ['tt12801262', 'tt2953050', 'tt7979580'];
const shown = [screen.result.top?.id, ...screen.result.alternatives.map((x) => x.id)];
for (const id of targets) {
  const w = await why(state, id);
  console.log(`target ${w.name}: ${shown.includes(id) ? 'SHOWN' : 'not shown'} rank ${w.rank} score ${w.score} penalties ${JSON.stringify(w.penalties)}`);
}
