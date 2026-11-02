// Screen catalog: films, series and cartoons with aspect vectors, from
//   IMDb (titles, votes, rating, runtime, episodes, Russian names),
//   MovieLens Tag Genome (viewer-grounded tag relevance) and MovieLens user tags,
//   TVmaze (status, network, genres, summary), Wikidata (country, Russian names, animated or live-action).
// Japanese animation is split into its own "anime" domain and left out of this version's catalogs.
import { createReadStream, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { ANIME_TAGS, GENOME_TAG_FEATURES, IMDB_GENRE_FEATURES, TVMAZE_GENRE_FEATURES } from '../../aspects/genome-tags.js';
import { SCREEN_DICTIONARY_VERSION, SCREEN_FEATURES, SCREEN_FEATURE_BY_ID } from '../../aspects/screen.js';
import { computeIdf } from '../../core/idf.js';
import { DATA, RAW, readJson, writeJson } from '../../lib/fsx.js';
import { episodesRu, htmlToText, stripTitleNote, truncate } from '../../lib/text.js';

const ML = resolve(RAW, 'movielens', 'ml-latest');
const GENOME_MIN = 0.35; // genome relevance below this is "not about this film"
const C = { genome: 0.75, usertag: 0.45, genre: 0.6, tvmaze: 0.6, fact: 1 };
const QUALITY_PRIOR_VOTES = 3000;
const QUALITY_PRIOR_MEAN = 6.6;

const base = readJson(resolve(RAW, 'screen-base.json'));
const byImdb = new Map(base.map((t) => [t.imdb, t]));
const wikidata = readJson(resolve(RAW, 'screen-wikidata.json'), {});
const tvmaze = new Map(readJson(resolve(RAW, 'tvmaze-shows.json')).filter((s) => s.imdb).map((s) => [s.imdb, s]));
// Episode length when IMDb has none at series level: TVmaze average first, then the median of IMDb episodes
// (s02b-episode-runtime.js).
const episodeRuntime = readJson(resolve(RAW, 'episode-runtime.json'), {});
const runtimeOf = (t, show) => t.runtime ?? (t.type === 'movie' ? null : show?.runtime ?? episodeRuntime[t.imdb] ?? null);
// LLM tags from Wikipedia paragraphs (s05-wikipedia.js → agents → 06-tag-ingest.js screen).
const llm = readJson(resolve(DATA, 'tagging', 'llm-tags-screen.json'), {});

function wikiMeta(id) {
  const path = resolve(DATA, 'tagging', 'screen-run1', 'in', `${id}.json`);
  if (!existsSync(path)) return { sections: new Map(), source: null };
  const input = readJson(path);
  return { sections: new Map(input.paragraphs.map((p) => [p.id, p.section])), source: input.source };
}

/** Minimal CSV line parser (MovieLens quotes fields that contain commas). */
function parseCsv(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

async function eachCsv(file, fn) {
  const rl = createInterface({ input: createReadStream(resolve(ML, file)), crlfDelay: Infinity });
  let first = true;
  for await (const line of rl) {
    if (first) { first = false; continue; }
    fn(parseCsv(line));
  }
}

console.log('movielens links…');
const movieToImdb = new Map();
await eachCsv('links.csv', ([movieId, imdbId]) => {
  const id = `tt${imdbId}`;
  if (byImdb.has(id)) movieToImdb.set(movieId, id);
});

console.log('genome…');
const genomeTags = new Map();
await eachCsv('genome-tags.csv', ([tagId, tag]) => genomeTags.set(tagId, tag));
const genome = new Map(); // imdb → [{tag, rel}]
await eachCsv('genome-scores.csv', ([movieId, tagId, rel]) => {
  const imdb = movieToImdb.get(movieId);
  if (!imdb) return;
  const tag = genomeTags.get(tagId);
  const r = Number(rel);
  if (r < GENOME_MIN || !(tag in GENOME_TAG_FEATURES || ANIME_TAGS.has(tag))) return;
  if (!genome.has(imdb)) genome.set(imdb, []);
  genome.get(imdb).push({ tag, rel: r });
});
console.log(`  genome for ${genome.size} titles`);

console.log('user tags…');
const userTags = new Map(); // imdb → Map(tag → count)
await eachCsv('tags.csv', ([, movieId, rawTag]) => {
  const imdb = movieToImdb.get(movieId);
  if (!imdb) return;
  const tag = (rawTag ?? '').trim().toLowerCase();
  if (!tag) return;
  if (!userTags.has(imdb)) userTags.set(imdb, new Map());
  const m = userTags.get(imdb);
  m.set(tag, (m.get(tag) ?? 0) + 1);
});
console.log(`  user tags for ${userTags.size} titles`);

const round = (x) => Math.round(x * 1000) / 1000;

// LLM features checked by hand and found to be misread quotes (research-vault/akinator-picker-2026-10/SUMMARY.md,
// cartoon tagging of 2026-10-28): the quote is real, the reading is not.
const LLM_REJECTED = {
  tt0106115: ['audience.adult'], // Rocko's Modern Life: "helping pave the way for adult animation"
  tt0217590: ['audience.adult'], // The Adventures of Mowgli (1973): "appeared more adult" than Disney's
  tt3183630: ['audience.adult'], // The Boy and the World: "resonating deeply with adults"
};
// «Для взрослых» on an animated title from an LLM quote holds only when the quote says the work is made for adults
// ("adult animated sitcom", "intended for adult audiences", "rated R"). Reviews of family films praise jokes that
// "tickle adults even more than kids" (Toy Story) and the tagger read that as adult animation: 33 of 255 cartoons
// on 2026-10-28.
const ADULT_SAYS = [
  /\badult\b[^.]{0,40}\b(animated|animation|sitcom|series|film|comedy|drama|cartoon|anthology|satire|horror|fantasy)\b/i,
  /rated R\b|R-rated|TV-MA|adults[- ]only|mature audiences|sexual|adult content|(intended for|aimed at) (an )?adult audiences?|toward adults instead of children|for adults\b(?! who)/i,
  /(aimed at|appeal more to|intended for) adults (perhaps )?(more|rather) than (to )?(children|kids)|not (aimed at|intended for|meant for|suitable for) (young )?(children|kids)/i,
];
const ADULT_AND_KIDS = /\b(as well as|both|and) (children|kids|adults)\b|\b(children|kids) and adults\b|\badults and (children|kids)\b|appeal(ing)? to adults|for the adults who/i;
const adultQuote = (q) => ADULT_SAYS.some((r) => r.test(q)) && !ADULT_AND_KIDS.test(q);
// Not a story despite IMDb's Animation genre: the Netflix game show Floor Is Lava.
const NOT_STORIES = new Set(['tt12370124']);

function buildFeatures(t, show) {
  const slots = {};
  const add = (f, r, source, ev, confidence = C[source]) => {
    if (!SCREEN_FEATURE_BY_ID.has(f) || r <= 0) return;
    const s = (slots[f] ??= { r: 0, sources: new Map(), ev: [] });
    s.r = Math.max(s.r, Math.min(1, r));
    s.sources.set(source, Math.max(s.sources.get(source) ?? 0, confidence));
    if (ev && s.ev.length < 3) s.ev.push(ev);
  };

  for (const { tag, rel } of genome.get(t.imdb) ?? []) {
    for (const [f, strength] of GENOME_TAG_FEATURES[tag] ?? []) {
      add(f, strength * Math.min(1, (rel - GENOME_MIN) / 0.5), 'genome', { id: `genome:${tag}`, kind: 'genome', q: tag, rel: round(rel) });
    }
  }
  const tags = userTags.get(t.imdb);
  if (tags) {
    const max = Math.max(...tags.values());
    for (const [tag, n] of tags) {
      if (n < 2) continue;
      for (const [f, strength] of GENOME_TAG_FEATURES[tag] ?? []) {
        add(f, strength * Math.min(1, n / max / 0.5), 'usertag', { id: `usertag:${tag}`, kind: 'usertag', q: tag, n });
      }
    }
  }
  const tagged = llm[t.imdb];
  if (tagged) {
    const meta = wikiMeta(t.imdb);
    for (const [f, v] of Object.entries(tagged.features)) {
      if (LLM_REJECTED[t.imdb]?.includes(f)) continue;
      if (f === 'audience.adult' && t.genres.includes('Animation') && !v.ev.some((e) => adultQuote(e.q))) continue;
      const mean = v.rs.reduce((a, b) => a + b, 0) / v.rs.length;
      const evidenceFactor = Math.min(1, v.ev.length / 2);
      // One run, agreement not measured for screen tags yet: same neutral 0.75 as games.
      const confidence = (0.5 + 0.5 * evidenceFactor) * 0.75;
      for (const [i, e] of v.ev.entries()) {
        add(f, i === 0 ? mean / 3 : 0.001, 'llm', { id: `wiki:${e.id}`, kind: e.id === 's' ? 'summary' : 'wiki', q: e.q, section: meta.sections.get(e.id) ?? null, url: meta.source }, confidence);
      }
    }
  }

  for (const g of t.genres) for (const [f, strength] of IMDB_GENRE_FEATURES[g] ?? []) add(f, strength, 'genre', { id: `genre:${g}`, kind: 'genre', q: g });
  for (const g of show?.genres ?? []) for (const [f, strength] of TVMAZE_GENRE_FEATURES[g] ?? []) add(f, strength, 'tvmaze', { id: `tvmaze:${g}`, kind: 'genre', q: g });

  const isSeries = t.type !== 'movie';
  if (!isSeries && t.runtime) {
    if (t.runtime <= 95) add('length.short', 1, 'fact', { id: 'fact:runtime', kind: 'fact', q: `${t.runtime} мин` });
    if (t.runtime >= 150) add('length.long', 1, 'fact', { id: 'fact:runtime', kind: 'fact', q: `${t.runtime} мин` });
  }
  if (isSeries && t.episodes) {
    if (t.episodes <= 10) add('length.short', 1, 'fact', { id: 'fact:episodes', kind: 'fact', q: episodesRu(t.episodes) });
    if (t.episodes >= 60) add('length.long', 1, 'fact', { id: 'fact:episodes', kind: 'fact', q: episodesRu(t.episodes) });
  }
  if (isSeries) {
    const status = show?.status ?? (t.endYear ? 'Ended' : null);
    if (status === 'Ended') add('completeness.ended', 1, 'fact', { id: 'fact:status', kind: 'fact', q: 'закончен' });
    if (status === 'Running' || status === 'To Be Determined') add('completeness.running', 1, 'fact', { id: 'fact:status', kind: 'fact', q: 'ещё выходит' });
  }
  // No "for adults" by default: IMDb leaves Family off most Pixar and Disney films. Adult comes from tags only.
  if (t.genres.includes('Animation') && (t.genres.includes('Family') || (show?.genres ?? []).includes('Children'))) {
    add('audience.kids', 0.6, 'genre', { id: 'genre:Animation', kind: 'genre', q: 'Animation, Family' });
  }

  const out = {};
  for (const [f, s] of Object.entries(slots)) {
    const c = 1 - [...s.sources.values()].reduce((acc, p) => acc * (1 - p), 1);
    out[f] = { r: round(s.r), c: round(c), src: [...s.sources.keys()], ev: s.ev };
  }
  return out;
}

function domainOf(t, show) {
  const live = t.type === 'movie' ? 'film' : 'series';
  if (!t.genres.includes('Animation')) return live;
  const wd = wikidata[t.imdb];
  // Live action with animated parts ("Enchanted"). A missing animated class alone proves nothing:
  // Wikidata has The Iron Giant as a plain film, so without the hybrid genre IMDb's Animation stands.
  if (wd?.hybrid && !wd.animated) return live;
  const animeByGenome = (genome.get(t.imdb) ?? []).some((g) => ANIME_TAGS.has(g.tag) && g.rel >= 0.5);
  const animeByShow = (show?.genres ?? []).includes('Anime') || (show?.language === 'Japanese' && show?.type === 'Animation');
  if (wd?.countries?.includes('JP') || animeByGenome || animeByShow) return 'anime';
  return 'cartoon';
}

const items = base.filter((t) => !NOT_STORIES.has(t.imdb)).map((t) => {
  const show = tvmaze.get(t.imdb);
  const wd = wikidata[t.imdb];
  const quality = (t.rating * t.votes + QUALITY_PRIOR_MEAN * QUALITY_PRIOR_VOTES) / (t.votes + QUALITY_PRIOR_VOTES) / 10;
  return {
    id: t.imdb,
    domain: domainOf(t, show),
    kind: t.type === 'movie' ? 'film' : 'series',
    name: t.name,
    ru: stripTitleNote(t.ru ?? wd?.ru ?? null),
    original: t.original,
    year: t.year,
    endYear: t.endYear,
    released: true,
    runtime: runtimeOf(t, show),
    episodes: t.episodes,
    seasons: t.seasons,
    genres: t.genres,
    network: show?.network ?? null,
    status: show?.status ?? null,
    summary: show?.summary ? truncate(htmlToText(show.summary), 400) : null,
    image: show?.image ?? null,
    link: `https://www.imdb.com/title/${t.imdb}/`,
    reviews: { total: t.votes, ratio: round(t.rating / 10), desc: `IMDb ${t.rating}` },
    quality: round(quality),
    popularity: round(Math.log10(t.votes + 1)),
    work: t.imdb,
    tagged: genome.has(t.imdb) || Boolean(llm[t.imdb]),
    llm: Boolean(llm[t.imdb]),
    features: buildFeatures(t, show),
  };
});

const { df, idf } = computeIdf(items, SCREEN_FEATURES);
const count = (fn) => items.filter(fn).length;
const stats = {
  titles: items.length,
  film: count((x) => x.domain === 'film'),
  series: count((x) => x.domain === 'series'),
  cartoon: count((x) => x.domain === 'cartoon'),
  anime: count((x) => x.domain === 'anime'),
  withGenome: count((x) => genome.has(x.id)),
  withLlm: count((x) => x.llm),
  withRussianName: count((x) => x.ru),
  meanFeatures: round(items.reduce((a, x) => a + Object.keys(x.features).length, 0) / items.length),
};

writeJson(resolve(DATA, 'catalog-screen.json'), {
  dictionaryVersion: SCREEN_DICTIONARY_VERSION,
  builtAt: new Date().toISOString(),
  sources: ['IMDb non-commercial datasets', 'MovieLens Tag Genome and tags (research licence)', 'TVmaze (CC BY-SA)', 'Wikidata (CC0)'],
  stats,
  df,
  idf,
  items,
}, false);
console.log(`Screen catalog: ${JSON.stringify(stats)}`);
