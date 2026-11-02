// Splits a tagging run into id lists for agents (data/tagging/AGENT.md): the ids that have an input in the run and
// no output yet in any run of the same kind (run*, screen-run*), so an agent never tags a title twice.
// Usage: node src/pipeline/tag-batches.js <run> [size=70] [--append] [--retag]  → data/tagging/<run>/batch-<n>.txt
// --append keeps the lists already written (agents may be working on them), skips the ids they hold and numbers the
// new lists after them, so tagging can start while s05 is still writing inputs. Without it the lists are rewritten.
// --retag lists titles already tagged in other runs too (a run of richer inputs for titles tagged from thin ones):
// only outputs of this run count as done, and 06-tag-ingest merges the runs.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DATA } from '../lib/fsx.js';

const RUN = process.argv[2];
const SIZE = Number(process.argv.slice(3).find((a) => !a.startsWith('--')) ?? 70);
const APPEND = process.argv.includes('--append');
const RETAG = process.argv.includes('--retag');
if (!RUN) throw new Error('Usage: node src/pipeline/tag-batches.js <run> [size] [--append]');

const TAG_DIR = resolve(DATA, 'tagging');
const screen = RUN.startsWith('screen-run');
const runs = readdirSync(TAG_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && (screen ? d.name.startsWith('screen-run') : /^run\d+$/.test(d.name)))
  .filter((d) => !RETAG || d.name === RUN)
  .map((d) => d.name);
const done = new Set(runs.flatMap((run) => {
  const out = resolve(TAG_DIR, run, 'out');
  return existsSync(out) ? readdirSync(out).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)) : [];
}));
const lists = readdirSync(resolve(TAG_DIR, RUN)).filter((f) => /^batch-\d+\.txt$/.test(f));
const listed = new Set(APPEND ? lists.flatMap((f) => readFileSync(resolve(TAG_DIR, RUN, f), 'utf8').split(/\s+/).filter(Boolean)) : []);
const first = APPEND ? Math.max(-1, ...lists.map((f) => Number(f.match(/\d+/)[0]))) + 1 : 0;
const todo = readdirSync(resolve(TAG_DIR, RUN, 'in')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).filter((id) => !done.has(id) && !listed.has(id));

const batches = [];
for (let i = 0; i < todo.length; i += SIZE) batches.push(todo.slice(i, i + SIZE));
batches.forEach((ids, n) => writeFileSync(resolve(TAG_DIR, RUN, `batch-${first + n}.txt`), ids.join('\n') + '\n', 'utf8'));
console.log(`${RUN}: ${todo.length} titles to tag (${done.size} already tagged elsewhere${APPEND ? `, ${listed.size} already listed` : ''}), ${batches.length} lists of up to ${SIZE} from batch-${first}`);
