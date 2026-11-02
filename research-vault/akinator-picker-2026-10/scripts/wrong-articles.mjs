// Read-only: finds screen tagging inputs whose Wikipedia article is likely about another title (a bad IMDb id in
// Wikidata or in our catalog). Three independent signals per input:
//   year  — the catalog year (±1) appears nowhere in the article paragraphs;
//   title — the article title, without its "(… series)" tail, matches neither the catalog name nor the original title;
//   share — the catalog summary ("s") shares few distinctive words with the article (only when the summary has ≥ 6).
// An input is suspect when at least two of the three signals fire: one alone is common on right articles (a foreign
// original title, an article that never repeats the year, a short or odd summary), while «The Passage» → «Lorong
// Waktu» shares the year 2019 and fails the other two. Prints the suspects for a human check and writes them as
// JSON next to the run folder.
//
// Usage: node research-vault/akinator-picker-2026-10/scripts/wrong-articles.mjs [run=screen-run2] [--all]
//   --all prints every input with a missing year, not only the suspects.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = 'E:/project/TASTIQ/data';
const args = process.argv.slice(2);
const run = args.find((a) => !a.startsWith('--')) ?? 'screen-run2';
const STOP = new Set('about after again against their there these those which while where would could should being other every under until world young lives finds first story people years family series season seasons episode episodes follows group local small house began comes takes friend friends brings around becomes'.split(' '));
const norm = (s) => String(s ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const words = (s) => new Set(norm(s).split(' ').filter((w) => w.length >= 5 && !STOP.has(w)));
const bare = (s) => norm(s).replace(/^(the|a|an) /, '');

const screen = JSON.parse(readFileSync(resolve(ROOT, 'catalog-screen.json'), 'utf8'));
const byId = new Map(screen.items.map((g) => [g.id, g]));
const dir = resolve(ROOT, 'tagging', run, 'in');
const rows = [];
for (const f of readdirSync(dir)) {
  const j = JSON.parse(readFileSync(resolve(dir, f), 'utf8'));
  const g = byId.get(j.id);
  const text = (j.paragraphs ?? []).map((p) => p.text).join(' ');
  const article = decodeURIComponent((j.source ?? '').split('/wiki/')[1] ?? '').replace(/_/g, ' ');
  const articleTitle = bare(article.replace(/\s*\([^)]*\)\s*$/, ''));
  const names = [j.name, g?.original, g?.name, ...(g?.aliases ?? [])].filter(Boolean).map(bare);
  const year = j.year ?? g?.year;
  const yearFound = year == null || [year - 1, year, year + 1].some((y) => text.includes(String(y)));
  const titleOk = names.some((n) => n === articleTitle || n.includes(articleTitle) || articleTitle.includes(n));
  const sw = words(j.s ?? '');
  const lower = norm(text);
  const share = sw.size >= 6 ? [...sw].filter((w) => lower.includes(w)).length / sw.size : null;
  const lowShare = share != null && share < 0.15;
  const suspect = [!yearFound, !titleOk, lowShare].filter(Boolean).length >= 2;
  if (suspect || (args.includes('--all') && !yearFound)) {
    rows.push({ id: j.id, name: j.name, year, article, yearFound, titleOk, share: share == null ? null : Number(share.toFixed(2)), lead: text.slice(0, 160), suspect });
  }
}
rows.sort((a, b) => Number(a.titleOk) - Number(b.titleOk) || (a.share ?? 1) - (b.share ?? 1));
for (const r of rows) console.log(`${r.suspect ? 'SUSPECT' : 'year?  '}\t${r.id}\t${r.year}\t${r.name}\t->\t${r.article}\tyear ${r.yearFound ? 'ok' : 'NO'}\ttitle ${r.titleOk ? 'ok' : 'NO'}\tshare ${r.share ?? '-'}\n\t\t${r.lead}`);
console.log(`\n${rows.filter((r) => r.suspect).length} suspects of ${readdirSync(dir).length} inputs`);
writeFileSync(resolve(ROOT, 'tagging', run, 'wrong-article-suspects.json'), JSON.stringify(rows.filter((r) => r.suspect), null, 2) + '\n', 'utf8');
