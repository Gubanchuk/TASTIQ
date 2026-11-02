// Read-only: game inputs from Wikipedia (data/tagging/run3) whose article may be about another game. A suspect is an
// input where the article title shares no word with the game name or the lead paragraph does not name the game.
// Noisy: the wikitext cleaner drops a title wrapped in a template ({{Nihongo|Final Fantasy VII|…}}), so many leads start
// with "is a 1997 role-playing game" and get listed; on 2026-10-28 64 listed, 1 wrong (Magicite → Final Fantasy).
// Usage: node research-vault/akinator-picker-2026-10/scripts/wrong-articles-games.mjs
import { readdirSync, readFileSync } from 'node:fs';
const DIR = 'E:/project/TASTIQ/data/tagging/run3/in';
const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'edition', 'remastered', 'definitive', 'game', 'year', 'goty', 'deluxe', 'complete', 'hd', 'enhanced', 'final', 'cut', 'collection']);
const words = (s) => new Set(String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w)));
const out = [];
for (const f of readdirSync(DIR)) {
  const j = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8'));
  const title = decodeURIComponent((j.source ?? '').split('/wiki/')[1] ?? '').replace(/_/g, ' ');
  const name = words(j.name);
  const shared = [...words(title)].some((w) => name.has(w));
  const lead = (j.paragraphs[0]?.text ?? '').toLowerCase();
  const named = [...name].filter((w) => lead.includes(w)).length >= Math.min(2, name.size);
  // A redirect can land on another article under the same title (Magicite → Final Fantasy), so the lead must name the game.
  if (!named || !shared) out.push(`${j.appid} ${j.name} → ${title}`);
}
console.log(`${out.length} suspects of ${readdirSync(DIR).length} inputs`);
console.log(out.join('\n'));
