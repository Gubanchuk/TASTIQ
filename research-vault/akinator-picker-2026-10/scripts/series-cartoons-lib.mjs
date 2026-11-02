// Shared driver for persona runs against the TASTIQ dialogue API (stateless: client keeps state).
import { writeFileSync } from 'node:fs';

const API = process.env.TASTIQ_API ?? 'http://localhost:5173';

export async function post(path, body) {
  const res = await fetch(`${API}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}
export async function search(domain, q) {
  const res = await fetch(`${API}/api/search?domain=${domain}&q=${encodeURIComponent(q)}`);
  return res.json();
}
export async function parse(domain, text) {
  return post('/api/parse', { text, domain });
}
export async function why(state, id) {
  return post('/api/why', { state, id });
}

const name = (x) => `${x.ru ?? x.name}${x.ru && x.ru !== x.name ? ` / ${x.name}` : ''} (${x.year ?? '?'}, ${x.id})`;

/** Compact human-readable dump of a screen. */
export function describe(screen) {
  const out = [`## [${screen.step}] ${screen.title}`];
  if (screen.hint) out.push(`hint: ${screen.hint}`);
  if (screen.progress) out.push(`progress: ${screen.progress}`);
  if (screen.item) out.push(`item: ${name(screen.item)}`);
  if (screen.options) out.push(`options: ${screen.options.map((o) => `[${o.value}] ${o.label}`).join(' | ')}`);
  if (screen.categories) out.push(`categories: ${screen.categories.map((o) => `[${o.value}] ${o.label}`).join(' | ')}`);
  if (screen.avoid) out.push(`avoid: ${screen.avoid.map((o) => `[${o.value}] ${o.label}`).join(' | ')}`);
  if (screen.items) out.push(`items: ${screen.items.map((x, i) => `${i + 1}. ${name(x)} [${(x.genres ?? []).join(',')}] ${x.rating ?? ''}`).join('\n       ')}`);
  if (screen.lines) out.push(`lines:\n  - ${screen.lines.join('\n  - ')}`);
  if (screen.canSkip) out.push('canSkip: yes');
  if (screen.freeText) out.push('freeText: yes');
  if (screen.result) out.push(describeResult(screen.result));
  return out.join('\n');
}

export function describeResult(r) {
  const out = [];
  const one = (t, tag) => {
    if (!t) return `${tag}: (none)`;
    const lines = [`${tag}: ${name(t)} [${(t.genres ?? []).join(',')}] ${t.rating ?? ''} ${t.seasons ? `${t.seasons} сез.` : ''} ${t.episodes ? `${t.episodes} эп.` : ''} ${t.runtime ? `${t.runtime} мин` : ''} ${t.status ?? ''}`];
    lines.push(`   label: ${t.labelText} (score ${t.score}; fit ${t.parts.fit}, penalty ${t.parts.penalty}, mood ${t.parts.mood}, prior ${t.parts.prior})`);
    for (const x of t.explanation.reasons) lines.push(`   + ${x.text}`);
    for (const x of t.explanation.risks) lines.push(`   ! ${x.text}`);
    for (const x of t.explanation.info) lines.push(`   i ${x.text}`);
    return lines.join('\n');
  };
  out.push(one(r.top, 'TOP'));
  r.alternatives.forEach((a, i) => out.push(one(a, `ALT${i + 1}`)));
  if (r.fork) out.push(`fork: ${r.fork.text} -> ${r.fork.options.map((o) => `[${o.f}] ${o.label} (favours ${o.favours})`).join(' | ')} (margin ${r.fork.margin.toFixed(3)})`);
  else out.push('fork: none');
  out.push(`sieves: ${r.sieves.map((s) => `${s.name}: -${s.removed}`).join('; ')}; considered ${r.considered}`);
  out.push(`taste.confirmed: ${r.taste.confirmed.map((x) => `${x.label} (${x.w}; ${x.sources.join(', ')})`).join('; ') || '(none)'}`);
  out.push(`taste.inferred: ${r.taste.inferred.map((x) => `${x.label} (${x.w})`).join('; ') || '(none)'}`);
  out.push(`taste.dislikes: ${r.taste.dislikes.map((x) => `${x.label} (${x.sources.join(', ')})`).join('; ') || '(none)'}`);
  out.push(`taste.hardNo: ${r.taste.hardNo.map((x) => x.label).join('; ') || '(none)'}`);
  return out.join('\n');
}

/** A run: a sequence of steps; each step is a function (screen, state) -> action | null (null = stop). */
export async function play(label, decide, logPath) {
  const log = [];
  let { state, screen } = await post('/api/dialogue', {});
  let screens = 0;
  for (let i = 0; i < 40; i++) {
    screens++;
    const text = describe(screen);
    log.push({ screen, state: structuredClone(state) });
    console.log(`\n=== ${label} / screen ${screens}\n${text}`);
    const action = await decide(screen, state, screens);
    if (!action) break;
    console.log(`>>> action: ${JSON.stringify(action)}`);
    log[log.length - 1].action = action;
    ({ state, screen } = await post('/api/dialogue', { state, action }));
  }
  if (logPath) writeFileSync(logPath, JSON.stringify(log, null, 1), 'utf8');
  return { state, screen, screens, log };
}

/** Chip picking helpers. */
export const byLabel = (options, ...needles) => options.filter((o) => needles.some((n) => o.label.toLowerCase().includes(n.toLowerCase())));
export const byValue = (options, ...values) => options.filter((o) => values.includes(o.value));
