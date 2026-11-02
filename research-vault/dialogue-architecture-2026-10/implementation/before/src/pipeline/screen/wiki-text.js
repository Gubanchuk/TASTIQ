// Wikipedia article text → paragraphs for LLM tagging: section choice and the wikitext cleaner shared by
// s05-wikipedia.js (screen) and the games pipeline.
import { truncate } from '../../lib/text.js';

export const KEEP = /reception|critical|response|review|legacy|themes|style|tone|format|premise|synopsis|overview|accolades|influence|cancel|ending|final season|conclusion/i;
export const SKIP = /cast|episodes|ratings|home media|soundtrack|merchandise|references|external|see also|notes|further reading|broadcast|release|production|development|filming|casting|music$|awards|nominations|viewership/i;
export const PREMISE = /premise|synopsis|overview|format/i;

// A subsection takes its parent's verdict unless its own heading is wanted or skipped: reviews of popular
// series sit under "Reception → Critical response → Season 1…4", and judged by "Season 1" alone they were
// dropped (Ted Lasso had 3 paragraphs of 19, found 2026-10-28). Premise text is capped so that per-season
// synopses do not crowd out the reception.
// opts { keep, skip, premise, premiseCap } swap the screen defaults for another domain (games); the defaults
// keep the screen output unchanged.
export function paragraphs(extract, { keep: KEEP_RE = KEEP, skip: SKIP_RE = SKIP, premise: PREMISE_RE = PREMISE, premiseCap = 3 } = {}) {
  // exsectionformat=wiki marks headings as "== Title =="; wikitext uses the same marks.
  const parts = extract.split(/\n(?===+[^=]+=+\s*\n)/);
  const groups = { lead: [], premise: [], rest: [] };
  const stack = []; // { level, keep, group } of the open headings
  for (const [i, part] of parts.entries()) {
    const mark = i === 0 ? null : /^(=+)\s*([^=]+?)\s*=+/.exec(part);
    const heading = i === 0 ? 'lead' : (mark?.[2] ?? '');
    let group = 'lead';
    if (i > 0) {
      const level = mark?.[1].length ?? 2;
      while (stack.length && stack.at(-1).level >= level) stack.pop();
      const parent = stack.at(-1);
      const keep = SKIP_RE.test(heading) ? false : KEEP_RE.test(heading) ? true : Boolean(parent?.keep);
      group = PREMISE_RE.test(heading) ? 'premise' : parent?.keep ? parent.group : 'rest';
      stack.push({ level, keep, group });
      if (!keep) continue;
    }
    const text = part.replace(/^=+[^=]+=+\s*\n/, '');
    for (const p of text.split(/\n+/).map((x) => x.trim()).filter((x) => x.length > 80)) {
      groups[group].push({ section: heading, text: truncate(p, 700) });
    }
  }
  // Lead and reception carry most of the signal; cap the input size.
  return [...groups.lead.slice(0, 4), ...groups.premise.slice(0, premiseCap), ...groups.rest].slice(0, 14);
}

// Section choice for video games: what the game is (gameplay, plot, setting) and what critics and players said.
// "release" is skipped except in "Release and reception", which carries the reviews.
export const GAME_SECTIONS = {
  keep: /gameplay|plot|story|synopsis|premise|setting|reception|critical|reviews|legacy|themes|style|accolades/i,
  skip: /^(?!.*reception).*(development|production|release|marketing|sales|soundtrack|music|references|external|see also|notes|further reading|awards|nominations|merchandise|adaptation|\bsequels?\b|\bports?\b|\bversions?\b)/i,
  premise: /gameplay|plot|story|synopsis|premise|setting/i,
  premiseCap: 5,
};

const UA = 'TASTIQ-prototype/0.1 (game recommender research)';

/**
 * Plain text of an English Wikipedia article via action=raw; follows #REDIRECT for two hops, null when absent.
 * action=raw also answers 429 now and then (Retry-After 1 s seen 2026-10-28), so 429 and 5xx are retried.
 */
export async function fetchPlainArticle(title, limiter, hops = 0) {
  const url = `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(title.replace(/ /g, '_'))}&action=raw`;
  for (let attempt = 0; attempt < 5; attempt++) {
    await limiter.wait();
    const res = await fetch(url, { headers: { 'User-Agent': UA } }).catch(() => null);
    if (res?.status === 429 || res?.status >= 500 || !res) {
      const wait = Number(res?.headers.get('retry-after')) || 0;
      await new Promise((r) => setTimeout(r, Math.min(30_000, Math.max(wait * 1000, 1000 * 2 ** attempt))));
      continue;
    }
    if (!res.ok) return null;
    const text = await res.text();
    const redirect = /^#REDIRECT\s*\[\[([^\]|#]+)/i.exec(text);
    if (redirect) return hops < 2 ? fetchPlainArticle(redirect[1].trim(), limiter, hops + 1) : null;
    return plainFromWikitext(text);
  }
  return null;
}

// SOURCE=raw reads the page's wikitext (index.php?action=raw) and strips the markup to plain text with the same
// "== Heading ==" lines. On 2026-10-28 the API answered 429 with Retry-After 8–34 s to every request from this
// machine for hours, while action=raw answered 200. The text differs from the API extract in details (no infobox,
// no template output), which the tagger does not need; quotes are checked against whatever text the input holds.
export function plainFromWikitext(w) {
  let t = w.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '');
  for (let prev = ''; prev !== t;) { prev = t; t = t.replace(/\{\{([^{}]*)\}\}/g, (_, body) => templateText(body)); } // nested, innermost first
  t = t.replace(/\{\|[\s\S]*?\n\|\}/g, ''); // tables
  for (let prev = ''; prev !== t;) { prev = t; t = t.replace(/\[\[(?:File|Image|Category):[^[\]]*(?:\[\[[^\]]*\]\][^[\]]*)*\]\]/gi, ''); }
  t = t.replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1').replace(/\[\[([^\]]*)\]\]/g, '$1');
  t = t.replace(/\[https?:\/\/[^\s\]]+ ([^\]]*)\]/g, '$1').replace(/\[https?:\/\/[^\]]*\]/g, '');
  t = t.replace(/'{2,5}/g, '').replace(/<[^>]+>/g, '').replace(/^[*#:;]+\s*/gm, '');
  return t.replace(/&nbsp;/g, ' ').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—').replace(/&amp;/g, '&').replace(/[ \t]+/g, ' ');
}

// Templates whose output is the article's own words, by name: which positional argument is the text. A lead often
// wraps the title ({{Nihongo|Final Fantasy VII|…}}); dropping it left "is a 1997 role-playing game" and made the
// wrong-article check list the input as a suspect. Every other template (citations, notes, infoboxes) produces nothing.
// transl takes 2 or 3 arguments ({{transl|ja|ALA-LC|text}}): the text is the last one (-1).
const TEXT_ARG = { nihongo: 1, 'nihongo foot': 1, nihongo2: 1, nihongo3: 1, nowrap: 1, 'visible anchor': 1, vanchor: 1, vgy: 1, ill: 1, 'interlanguage link': 1, lang: 2, transl: -1 };

function templateText(body) {
  const [name, ...args] = splitArgs(body);
  const at = TEXT_ARG[name.trim().toLowerCase().replace(/_/g, ' ')];
  if (!at) return '';
  const positional = args.filter((a) => !/^\s*[\w -]+=/.test(a));
  return (positional.at(at > 0 ? at - 1 : at) ?? '').trim();
}

// Template arguments split on "|" outside links: {{nihongo|[[Okami (video game)|Ōkami]]|…}} keeps the link whole.
function splitArgs(body) {
  const out = [''];
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    if (body.startsWith('[[', i)) { depth++; out[out.length - 1] += '[['; i++; continue; }
    if (body.startsWith(']]', i) && depth) { depth--; out[out.length - 1] += ']]'; i++; continue; }
    if (body[i] === '|' && !depth) out.push('');
    else out[out.length - 1] += body[i];
  }
  return out;
}
