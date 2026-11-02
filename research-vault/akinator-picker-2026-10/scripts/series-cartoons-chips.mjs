// Usage: node series-cartoons-chips.mjs <domain> id1 id2 ...  -> like chips + complaint chips per title (state hack)
import { post, describe } from './series-cartoons-lib.mjs';

const [domain, ...ids] = process.argv.slice(2);
let { state } = await post('/api/dialogue', {});
({ state } = await post('/api/dialogue', { state, action: { type: 'choose', value: domain } }));
({ state } = await post('/api/dialogue', { state, action: { type: 'genres', values: [] } }));
for (const id of ids) {
  const r = await post('/api/dialogue', { state: { ...state, step: 'why', liked: [id], whyIndex: 0 } });
  console.log(describe(r.screen).split('\n').filter((l) => l.startsWith('item') || l.startsWith('options')).join('\n'));
  const r2 = await post('/api/dialogue', { state: { ...state, step: 'why_not', disliked: [id], whyIndex: 0 } });
  console.log(describe(r2.screen).split('\n').filter((l) => l.startsWith('options') || l.startsWith('categories')).map((l) => '  not: ' + l).join('\n'));
}
