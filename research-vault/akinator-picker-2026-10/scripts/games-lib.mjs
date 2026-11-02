// Shared helpers for the persona runs against the live TASTIQ API (no browser, same actions the picker UI sends).
export const BASE = process.env.TASTIQ_URL ?? 'http://localhost:5173';

export async function api(path, body) {
  const res = await fetch(BASE + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}

export function describeResult(r) {
  const lines = [];
  const pick = (p, tag) => {
    lines.push(`  ${tag}: ${p.name} (${p.id}) ${p.year ?? ''} — ${p.labelText} [score ${p.score}; fit ${p.parts.fit} pen ${p.parts.penalty} mood ${p.parts.mood} prior ${p.parts.prior}]`);
    for (const x of p.explanation.reasons) lines.push(`      + ${x.text}`);
    for (const x of p.explanation.risks) lines.push(`      ! ${x.text}`);
    for (const x of p.explanation.info) lines.push(`      i ${x.text}`);
  };
  if (!r.top) { lines.push('  (empty result)'); return lines; }
  pick(r.top, 'TOP');
  r.alternatives.forEach((a, i) => pick(a, `ALT${i + 1}`));
  if (r.fork) lines.push(`  FORK: ${r.fork.text} → ${r.fork.options.map((o) => `${o.label} (${o.f}, favours ${o.favours})`).join(' / ')}`);
  lines.push(`  sieves: ${r.sieves.map((s) => `${s.name}: −${s.removed}`).join('; ')}; considered ${r.considered}`);
  return lines;
}

export function describe(screen) {
  const s = screen;
  const lines = [`[${s.step}] ${s.title ?? ''}${s.progress ? ` (${s.progress})` : ''}`];
  if (s.hint) lines.push(`  hint: ${s.hint}`);
  if (s.item) lines.push(`  item: ${s.item.name} (${s.item.id})`);
  if (s.options) lines.push(`  options: ${s.options.map((o) => (o.label ?? o) + (o.value ? ` [${o.value}]` : '')).join(' | ')}`);
  if (s.categories?.length) lines.push(`  categories: ${s.categories.map((o) => `${o.label} [${o.value}]`).join(' | ')}`);
  if (s.avoid?.length) lines.push(`  avoid: ${s.avoid.map((o) => `${o.label} [${o.value}]`).join(' | ')}`);
  if (s.items) lines.push(`  items: ${s.items.map((x) => `${x.name} (${x.id})`).join(' | ')}`);
  if (s.lines) lines.push(...s.lines.map((l) => `  > ${l}`));
  if (s.result) lines.push(...describeResult(s.result));
  return lines.join('\n');
}

export class Run {
  constructor(name) {
    this.name = name;
    this.state = null;
    this.screen = null;
    this.log = [];
    this.notes = [];
    this.screens = 0;
    this.taps = 0;
  }
  record(action, extra) {
    this.screens++;
    this.log.push({ n: this.screens, action, extra, screen: this.screen, text: describe(this.screen) });
  }
  async start(seed) {
    const out = await api('/api/dialogue', {});
    out.state.seed = seed; // the client keeps state; a fixed seed makes the title pages reproducible
    this.state = out.state;
    this.screen = out.screen;
    this.record(null);
  }
  async send(action, extra) {
    const out = await api('/api/dialogue', { state: this.state, action });
    this.state = out.state;
    this.screen = out.screen;
    this.taps++;
    this.record(action, extra);
    return out.screen;
  }
  note(text) { this.notes.push(text); }
  search(q) { return api(`/api/search?domain=${this.state.domain}&q=${encodeURIComponent(q)}`); }
  parse(text) { return api('/api/parse', { text, domain: this.state.domain }); }
  why(id) { return api('/api/why', { state: this.state, id }); }
  text() {
    return this.log.map((e) => `--- screen ${e.n}${e.action ? ` (after ${JSON.stringify(e.action)})` : ''}${e.extra ? `\n  note: ${e.extra}` : ''}\n${e.text}`).join('\n\n');
  }
}
