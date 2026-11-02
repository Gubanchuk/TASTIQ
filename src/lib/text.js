const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ', '&apos;': "'" };

/** Steam store HTML to plain text. */
export function htmlToText(html = '') {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|h\d|div)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e] ?? ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

/** Steam review BBCode to plain text. */
export function bbcodeToText(text = '') {
  return text
    .replace(/\[\/?(h\d|b|i|u|s|strike|spoiler|noparse|hr|list|olist|table|tr|td|th|quote|code|url[^\]]*|img[^\]]*)\]/gi, ' ')
    .replace(/\[\*\]/g, '\n- ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

export function truncate(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.7 ? cut.slice(0, lastSpace) : cut) + ' …';
}

/** Russian plural form: plural(3, 'серия', 'серии', 'серий') → 'серии'. */
export function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export const episodesRu = (n) => `${n} ${plural(n, 'серия', 'серии', 'серий')}`;

// A type word, then nothing, ", country, year" or " 1934 года". "(фильм первый)" numbers a film series and stays.
const TITLE_NOTE = /\s*\((?:(?:документальный )?фильм|мультфильм|телесериал|сериал|мультсериал|аниме)(?:,[^)]*| \d{4}[^)]*)?\)$|\s*\(\d{4}\)$/;

/** Wikidata labels carry disambiguation notes: "Тони (фильм, 1935)" → "Тони". Brackets that are part of the title stay. */
export const stripTitleNote = (title) => title?.replace(TITLE_NOTE, '') ?? title;

/** Lowercase, unify quotes and dashes, collapse whitespace: used to check that a quote is verbatim. */
export function normalizeForMatch(text = '') {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»„“”"'’`]/g, '')
    .replace(/[–—-]/g, '-')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

const LATIN = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };

/** Russian letters to Latin, for titles typed in Russian letters: «портал» → «portal». */
export const transliterate = (text = '') => [...text].map((ch) => LATIN[ch] ?? ch).join('');

/** Levenshtein distance, stopping early once it exceeds max. */
export function editDistance(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** Title normalization for search: "The Witcher® 3: Wild Hunt" → "witcher 3 wild hunt". */
export function normalizeTitle(text = '') {
  return normalizeForMatch(text)
    .replace(/[®™©]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/^(the|a) /, '')
    .trim();
}

const EDITION_WORDS =
  /\b(remastered|remaster|special|definitive|enhanced|complete|ultimate|deluxe|anniversary|legendary|director s cut|goty|game of the year|legacy|edition|redux|classic|hd|reforged|royal|gold)\b/g;

/** Groups editions of one work: "Skyrim Special Edition" and "Skyrim" share a key. */
export function workKey(name = '') {
  return normalizeTitle(name).replace(EDITION_WORDS, ' ').replace(/\s+/g, ' ').trim();
}
