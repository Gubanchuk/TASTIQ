// Shared runner for the film persona tests: talks to the live dialogue API, keeps the client-side state,
// records every screen and every action with the persona's note, and writes a JSON + Markdown transcript.
import { writeFileSync } from 'node:fs';

const BASE = 'http://localhost:5173';
export const OUT_DIR = 'C:/Users/Dusik/AppData/Local/Temp/claude/E--project-TASTIQ/316e07fd-614b-4eb4-a3ec-2c92111b7da4/scratchpad/pw-scripts';

export async function api(path, body) {
  const res = await fetch(BASE + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}

export const search = (q) => api(`/api/search?domain=film&q=${encodeURIComponent(q)}`);
export const parse = (text) => api('/api/parse', { text, domain: 'film' });

const name = (c) => `${c.ru ?? c.name}${c.ru && c.name !== c.ru ? ` / ${c.name}` : ''} (${c.year})`;

export function describe(screen) {
  const s = screen;
  const lines = [`[${s.step}] ${s.title}`];
  if (s.hint) lines.push(`  hint: ${s.hint}`);
  if (s.progress) lines.push(`  progress: ${s.progress}`);
  if (s.item) lines.push(`  item: ${name(s.item)}`);
  if (s.options?.length) lines.push(`  options: ${s.options.map((o) => `${o.label} [${o.value}]`).join(' | ')}`);
  if (s.categories?.length) lines.push(`  categories (не люблю такое вообще): ${s.categories.map((o) => `${o.label} [${o.value}]`).join(' | ')}`);
  if (s.avoid?.length) lines.push(`  avoid: ${s.avoid.map((o) => `${o.label} [${o.value}]`).join(' | ')}`);
  if (s.items?.length) lines.push(`  items: ${s.items.map((c) => `${name(c)} {${c.id}}`).join(' | ')}`);
  if (s.canSkip) lines.push('  canSkip: yes');
  if (s.freeText) lines.push('  freeText: yes');
  if (s.lines) lines.push(...s.lines.map((l) => `  > ${l}`));
  if (s.result) {
    const r = s.result;
    const card = (t, tag) => {
      if (!t) return `  ${tag}: (none)`;
      const out = [`  ${tag}: ${name(t)} {${t.id}} score=${t.score} label=«${t.labelText}» ${t.genres.join(',')} ${t.rating ?? ''} ${t.runtime ? t.runtime + ' мин' : ''}`];
      out.push(`     parts: ${JSON.stringify(t.parts)}`);
      for (const x of t.explanation.reasons) out.push(`     + ${x.text}`);
      for (const x of t.explanation.risks) out.push(`     - ${x.text}`);
      for (const x of t.explanation.info) out.push(`     i ${x.text}`);
      return out.join('\n');
    };
    lines.push(card(r.top, 'TOP'));
    r.alternatives.forEach((a, i) => lines.push(card(a, `ALT${i + 1}`)));
    lines.push(`  fork: ${r.fork ? `${r.fork.text} → ${r.fork.options.map((o) => `${o.label} [${o.f}] favours ${o.favours}`).join(' | ')} (margin ${r.fork.margin?.toFixed(3)})` : 'none'}`);
    lines.push(`  sieves removed: ${r.sieves.map((x) => `${x.name}: ${x.removed}`).join('; ')}; considered ${r.considered}`);
    lines.push(`  taste confirmed: ${r.taste.confirmed.map((x) => `${x.label} w=${x.w} (${x.sources.join(', ')})`).join('; ') || '—'}`);
    lines.push(`  taste inferred: ${r.taste.inferred.map((x) => `${x.label} w=${x.w}`).join('; ') || '—'}`);
    lines.push(`  dislikes: ${r.taste.dislikes.map((x) => `${x.label} (${x.sources.join(', ')})`).join('; ') || '—'}; hardNo: ${r.taste.hardNo.map((x) => x.label).join('; ') || '—'}`);
  }
  return lines.join('\n');
}

export class Run {
  constructor(label) {
    this.label = label;
    this.state = null;
    this.screen = null;
    this.log = [];
    this.screens = 0;
    this.notes = [];
  }
  async step(action, note = '') {
    const out = await api('/api/dialogue', { state: this.state, action });
    this.state = out.state;
    this.screen = out.screen;
    this.screens++;
    this.log.push({ n: this.screens, action, note, screen: out.screen });
    return out.screen;
  }
  note(text) { this.notes.push(text); this.log.push({ note: text }); }
  why(id) { return api('/api/why', { state: this.state, id }); }

  /** Picks the chips the persona would say among what the screen offers; reports what it wanted but could not say. */
  chooseChips(screen, wanted, { max = 99 } = {}) {
    const offered = new Set(screen.options.map((o) => o.value));
    const chosen = wanted.filter((f) => offered.has(f)).slice(0, max);
    const missing = wanted.filter((f) => !offered.has(f));
    return { chosen, missing, offeredLabels: screen.options.map((o) => o.label) };
  }

  toMarkdown() {
    const out = [`# ${this.label}`, ''];
    for (const e of this.log) {
      if (!e.screen) { out.push(`> NOTE: ${e.note}`, ''); continue; }
      out.push(`## Экран ${e.n}`);
      out.push('```');
      out.push(`action: ${JSON.stringify(e.action)}`);
      if (e.note) out.push(`persona: ${e.note}`);
      out.push('```');
      out.push('```');
      out.push(describe(e.screen));
      out.push('```');
      out.push('');
    }
    return out.join('\n');
  }
  save(file) {
    writeFileSync(`${OUT_DIR}/${file}.json`, JSON.stringify({ label: this.label, screens: this.screens, log: this.log, finalState: this.state }, null, 1), 'utf8');
    writeFileSync(`${OUT_DIR}/${file}.md`, this.toMarkdown(), 'utf8');
  }
}

export function resultIds(screen) {
  const r = screen.result;
  return [r.top?.id, ...r.alternatives.map((a) => a.id)].filter(Boolean);
}

/** For every target: in catalog (by id), shown in result, and the /api/why answer if not shown. */
export async function checkTargets(run, targets, shownIds) {
  const rows = [];
  for (const t of targets) {
    const shown = shownIds.includes(t.id);
    const why = shown ? null : await run.why(t.id);
    rows.push({ ...t, shown, why });
  }
  return rows;
}

export function fmtWhy(w) {
  if (!w) return 'shown';
  if (w.error) return `error: ${w.error}`;
  if (w.removedBy) return `removed by sieve ${w.removedBy.sieve} «${w.sieveName}»: ${w.removedBy.reason}`;
  return `rank ${w.rank} of ${w.of}, score ${w.score} vs leader ${w.leaderScore}; parts ${JSON.stringify(Object.fromEntries(Object.entries(w.parts).map(([k, v]) => [k, Number(v.toFixed(3))])))}; matches: ${w.matches.map((m) => `${m.label}${m.confirmed ? '*' : ''} +${m.contribution}`).join(', ') || '—'}; penalties: ${w.penalties.map((p) => `${p.label} −${p.contribution}`).join(', ') || '—'}`;
}
