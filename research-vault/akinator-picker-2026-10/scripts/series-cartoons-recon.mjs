// Reconnaissance: what screens offer for series and cartoons, and which chips key titles get.
import { post, describe, search, parse } from './series-cartoons-lib.mjs';

const domain = process.argv[2] ?? 'series';
const genres = (process.argv[3] ?? '').split(',').filter(Boolean);
const ids = (process.argv[4] ?? '').split(',').filter(Boolean);

let { state, screen } = await post('/api/dialogue', {});
({ state, screen } = await post('/api/dialogue', { state, action: { type: 'choose', value: domain } }));
console.log(describe(screen));
({ state, screen } = await post('/api/dialogue', { state, action: { type: 'genres', values: genres } }));
console.log(describe(screen));
// second page
const shown = screen.items.map((x) => x.id);
const r2 = await post('/api/dialogue', { state, action: { type: 'more', ids: shown } });
console.log('--- page 2');
console.log(describe(r2.screen));

// like chips for key titles (state hack: step why with liked=[id])
for (const id of ids) {
  const s = { ...state, step: 'why', liked: [id], whyIndex: 0 };
  const r = await post('/api/dialogue', { state: s });
  console.log('\n--- like chips');
  console.log(describe(r.screen));
  const s2 = { ...state, step: 'why_not', disliked: [id], whyIndex: 0 };
  const r3 = await post('/api/dialogue', { state: s2 });
  console.log('--- complaint chips');
  console.log(describe(r3.screen));
}
// today screen
const s3 = { ...state, step: 'today' };
console.log('\n' + describe((await post('/api/dialogue', { state: s3 })).screen));
