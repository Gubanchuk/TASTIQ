// TASTIQ site (design «Нейтральный», chosen 2026-10-21). A bounded question workspace,
// with attached answer actions, a context panel and a drawer for sections and previous steps.
// All dialogue logic lives in the engine; this file only renders screens and turns clicks into actions.
// «Моё» (#my) is a second view over the same frame: saved titles and past picks, kept in this browser.
import { createClient } from '/shared/dialogue-client.js';
import { fillPicks, playedIds, removedIds, changesTaste } from '/shared/fill-picks.js';
import { hasAnswerContent } from '/shared/answer-memory.js';
import { createFeedbackStore, FEEDBACK_KEY } from '/shared/evening-feedback.js';
import { eveningControls, feedbackStatus } from '/shared/evening-view.js';
import { createAnchorDraft } from '/shared/anchor-draft.js';
import { createLibraryStore } from '/shared/library-store.js';
import { createResultViewState } from '/shared/result-view-state.js';
import { pickerEntryRoute } from '/shared/media-route.js';
import {qaLegacyTarget} from '/shared/qa-session.js';

if(qaLegacyTarget){location.replace(qaLegacyTarget);}else{

const $ = (sel, root = document) => root.querySelector(sel);
const resultView=createResultViewState();
const resultWishKey=()=>`${client.dialogueId}:${state?.domain??''}`;
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nf = new Intl.NumberFormat('ru-RU');
const plural = (n, [one, few, many]) => {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (b === 1 && a !== 11) return one;
  if (b >= 2 && b <= 4 && (a < 12 || a > 14)) return few;
  return many;
};

// ---------- icons: one stroke weight, drawn on a 24 grid ----------

const ICONS = {
  game: '<path d="M6 11h4M8 9v4M15 12h.01M18 10h.01"/><path d="M17.3 5H6.7a4 4 0 0 0-4 3.6C2.6 9.4 2 14.5 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.4-1.4A2 2 0 0 1 9.8 16h4.4a2 2 0 0 1 1.4.6L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.5-.6-6.6-.7-7.3A4 4 0 0 0 17.3 5Z"/>',
  film: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 7.5h4M3 12h18M3 16.5h4M17 7.5h4M17 16.5h4"/>',
  series: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="m17 2-5 5-5-5"/>',
  cartoon: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5s1.3 1.8 3.5 1.8 3.5-1.8 3.5-1.8M9 9.5h.01M15 9.5h.01"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  anime: '<path d="m12 3.5 2 5.4 5.6.4-4.3 3.7 1.4 5.6L12 15.5l-4.7 3.1 1.4-5.6-4.3-3.7 5.6-.4Z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>',
  chevR: '<path d="m9 18 6-6-6-6"/>',
  restart: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  off: '<circle cx="12" cy="12" r="8.5" stroke-dasharray="2.6 2.9"/>',
  minus: '<circle cx="12" cy="12" r="8.5"/><path d="M8 12h8"/>',
  ban: '<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/>',
  heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z"/>',
  alert: '<path d="M10.3 3.9 2.4 17.5a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  external: '<path d="M15 3h6v6M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  thumbUp: '<path d="M7 10v11"/><path d="M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.6l-2.3 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.8a2 2 0 0 0 1.8-1.1L12 2a3.1 3.1 0 0 1 3 3.9Z"/>',
  thumbDown: '<path d="M17 14V3"/><path d="M9 18.1 10 14H4.2a2 2 0 0 1-1.9-2.6l2.3-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.8a2 2 0 0 0-1.8 1.1L12 22a3.1 3.1 0 0 1-3-3.9Z"/>',
  tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4Z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  bubble: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  sidebar: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  laptop: '<rect x="4" y="4" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
  terminal: '<path d="m4 17 6-6-6-6M12 19h8"/>',
  deck: '<rect x="2" y="6" width="20" height="12" rx="3"/><path d="M8 10v4M6 12h4"/><circle cx="16.5" cy="12" r="1.5"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
  dash: '<path d="M7 12h10"/>',
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/>',
  sparkle: '<path d="M12 3.5 13.8 9a2 2 0 0 0 1.2 1.2l5.5 1.8-5.5 1.8a2 2 0 0 0-1.2 1.2L12 20.5 10.2 15A2 2 0 0 0 9 13.8L3.5 12 9 10.2A2 2 0 0 0 10.2 9Z"/>',
};
const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] ?? ''}</svg>`;

// ---------- vocabulary of the page (minimal UI words; everything else comes from the screen) ----------

const DOMAINS = [
  { id: 'game', short: 'Поиграть', icon: 'game', count: ['игра', 'игры', 'игр'], plural: 'Игры' },
  { id: 'film', short: 'Фильм', icon: 'film', count: ['фильм', 'фильма', 'фильмов'], plural: 'Фильмы' },
  { id: 'series', short: 'Сериал', icon: 'series', count: ['сериал', 'сериала', 'сериалов'], plural: 'Сериалы' },
  { id: 'cartoon', short: 'Мультфильм', icon: 'cartoon', count: ['мультфильм', 'мультфильма', 'мультфильмов'], plural: 'Мультфильмы' },
];
const DOMAIN_NOUN = { game: 'игра', film: 'фильм', series: 'сериал', cartoon: 'мультфильм' };
const LATER_ICON = { Почитать: 'book', Аниме: 'anime' };
const domainOf = (id) => DOMAINS.find((d) => d.id === id);
const PLATFORM = { windows: { short: 'ПК', icon: 'monitor' }, mac: { short: 'Mac', icon: 'laptop' }, linux: { short: 'Linux', icon: 'terminal' }, deck: { short: 'Steam Deck', icon: 'deck' } };
const STEP_LABEL = { domain: 'Что хочешь', platform: 'Платформа', time: 'Время', company: 'С кем', context:'Состав компании', anchors: 'Что знаешь', why: 'За что', why_not: 'Что не так', stops: 'Что точно не надо', ask: 'Уточню', result: 'Подбор' };
const stepsFor = (domain) => ['domain', ...(domain === 'game' ? ['platform'] : ['time']), 'company', ...((state?.situation?.company==='kids'||domain==='game'&&state?.situation?.company==='group')?['context']:[]), 'anchors', 'why', 'why_not', 'stops', 'ask', 'result'];
const REACTION_ICON = { love: 'heart', like: 'check', dislike: 'minus', unknown: 'dash' };
const SEARCH_EXAMPLE = { game: '«ведьмак 3», «portal»', film: '«матрица», «амели»', series: '«во все тяжкие», «тьма»', cartoon: '«шрек», «вверх»' };
const STEAM_RATING = {
  'Overwhelmingly Positive': 'крайне положительные', 'Very Positive': 'очень положительные', Positive: 'положительные',
  'Mostly Positive': 'в основном положительные', Mixed: 'смешанные', 'Mostly Negative': 'в основном отрицательные',
  Negative: 'отрицательные', 'Very Negative': 'очень отрицательные', 'Overwhelmingly Negative': 'крайне отрицательные',
};
const GENRE_RU = {
  Adventure: 'приключения', Animation: 'анимация', Biography: 'биография', Comedy: 'комедия', Crime: 'криминал',
  Documentary: 'документальный', Drama: 'драма', Family: 'семейный', Fantasy: 'фэнтези', History: 'история', Horror: 'ужасы',
  Music: 'музыка', Musical: 'мюзикл', Mystery: 'детектив', Romance: 'мелодрама', 'Sci-Fi': 'фантастика', Sport: 'спорт',
  Sports: 'спорт', Thriller: 'триллер', War: 'военный', Western: 'вестерн', 'Film-Noir': 'нуар', Short: 'короткий метр',
  Reality: 'реалити', 'Reality-TV': 'реалити', 'Talk-Show': 'ток-шоу', 'Game-Show': 'игровое шоу', News: 'новости',
  RPG: 'RPG', Indie: 'инди', Simulation: 'симулятор', Strategy: 'стратегия', Casual: 'казуальная', Racing: 'гонки',
  'Massively Multiplayer': 'MMO', 'Free to Play': 'бесплатная', 'Early Access': 'ранний доступ',
};

const nameOf = (c) => c?.ru ?? c?.name ?? '';
const originalOf = (c) => (c?.ru && c.name && c.name !== c.ru ? c.name : c?.original ?? null);
const genresOf = (c, domain) => (c?.genres ?? [])
  .filter((g) => !(domain === 'cartoon' && g === 'Animation'))
  .map((g) => (g === 'Action' ? (domain === 'game' ? 'экшен' : 'боевик') : GENRE_RU[g] ?? g.toLowerCase()));
const kindLabel = (c, domain) => {
  if ((c?.domain ?? domain) === 'cartoon') return 'мультфильм';
  return { game: 'игра', film: 'фильм', series: 'сериал' }[c?.kind] ?? '';
};
const kindIcon = (c, domain) => ((c?.domain ?? domain) === 'cartoon' ? 'cartoon' : c?.kind === 'game' ? 'game' : c?.kind === 'series' ? 'series' : 'film');
const runtimeText = (min) => (min >= 60 ? `${Math.floor(min / 60)} ч${min % 60 ? ` ${min % 60} мин` : ''}` : `${min} мин`);
const seasonsText = (p) => [
  p.seasons ? `${p.seasons} ${plural(p.seasons, ['сезон', 'сезона', 'сезонов'])}` : '',
  p.episodes ? `${p.episodes} ${plural(p.episodes, ['серия', 'серии', 'серий'])}` : '',
].filter(Boolean).join(', ');
const doneVerb = (domain) => (domain === 'game' ? 'играл' : 'смотрел');
const ratingOf = (c) => {
  if (!c?.rating) return null;
  if (STEAM_RATING[c.rating]) return ['Отзывы Steam', STEAM_RATING[c.rating]];
  const imdb = /^IMDb\s+([\d.]+)/.exec(c.rating);
  if (imdb) return ['IMDb', `${imdb[1].replace('.', ',')} из 10`];
  return ['Оценка', c.rating];
};
const looksEnglish = (q) => /^[\x20-\x7E‘-‟–—…]+$/.test(q ?? '');

// ---------- remembered names: titles and chip labels seen on earlier screens ----------

const META_KEY = 'tastiq.site.meta';
const meta = { titles: new Map(), labels: new Map() };
try {
  const saved = JSON.parse(localStorage.getItem(META_KEY));
  if (saved) {
    meta.titles = new Map(saved.titles ?? []);
    meta.labels = new Map(saved.labels ?? []);
  }
} catch { /* private mode: memory only */ }

let metaTimer;
function saveMeta() {
  clearTimeout(metaTimer);
  metaTimer = setTimeout(() => {
    const answered = new Set(Object.keys(state?.answers ?? {}));
    if (meta.titles.size > 600) {
      for (const id of meta.titles.keys()) {
        if (meta.titles.size <= 500) break;
        if (!answered.has(id)) meta.titles.delete(id);
      }
    }
    try { localStorage.setItem(META_KEY, JSON.stringify({ titles: [...meta.titles], labels: [...meta.labels] })); } catch { /* full or private */ }
  }, 300);
}
function rememberCard(c) {
  if (!c || typeof c !== 'object' || !c.id) return;
  const { id, name, ru, original, year, poster, image, kind, genres, rating } = c;
  meta.titles.set(id, { id, name, ru, original, year, poster, image, kind, genres, rating });
}
function rememberLabels(list) {
  for (const o of list ?? []) if (o && typeof o === 'object' && (o.value ?? o.f)) meta.labels.set(o.value ?? o.f, o.label);
}
function learn(s) {
  (s.items ?? []).forEach(rememberCard);
  rememberCard(s.item);
  rememberLabels(s.options);
  rememberLabels(s.pair);
  rememberLabels(s.categories);
  rememberLabels(s.avoid);
  const taste = s.taste ?? s.result?.taste;
  if (taste) for (const k of ['confirmed', 'inferred', 'dislikes', 'hardNo']) rememberLabels(taste[k]);
  if (['platform', 'time', 'company'].includes(s.step)) for (const o of s.options) meta.labels.set(`${s.step}:${o.value}`, o.label);
  if (s.result?.top) [s.result.top, ...s.result.alternatives].forEach(rememberCard);
  saveMeta();
}
const labelOf = (f) => counts?.[state?.domain]?.labels?.[f] ?? meta.labels.get(f) ?? f;
const titleOf = (id) => meta.titles.get(id);

// ---------- «Моё»: saved titles and what the person thought of them, in this browser only ----------

// localStorage 'tastiq.site.library'. The landing reads items.length from it: keep the key and the shape.
// { version: 1,
//   items: [{ id, domain, title, year, poster, image, kind, link, status: 'want' | 'liked' | 'disliked', addedAt, updatedAt,
//             answer?: the engine's «за что» / «что не так» answer, so the next dialogue does not ask again }],
//   history: [{ at, domain, topId, title, poster, image, alternatives: [{ id, title }] }] }
// Times are ISO strings. history holds the top pick of the last 30 results shown, oldest first.
const LIB_KEY = 'tastiq.site.library';
const HISTORY_MAX = 30;
let library = loadLibrary();
let planStore;
try { planStore = createLibraryStore({storage:localStorage}); } catch { planStore = createLibraryStore({}); }

function loadLibrary() {
  try {
    const x = JSON.parse(localStorage.getItem(LIB_KEY));
    if (x?.version === 1 && Array.isArray(x.items)) return { version: 1, items: x.items, history: Array.isArray(x.history) ? x.history : [] };
  } catch { /* unreadable or private mode: start empty */ }
  return { version: 1, items: [], history: [] };
}
function saveLibrary() {
  try { localStorage.setItem(LIB_KEY, JSON.stringify(library)); } catch { /* full or private: kept for this visit only */ }
}
const savedItem = (id) => library.items.find((x) => x.id === id);

function saveTitle(p, status) {
  const now = new Date().toISOString();
  const item = savedItem(p.id);
  if (item) {
    if (item.status !== status) delete item.answer; // «за что» does not fit «не зашло» and back
    Object.assign(item, { status, updatedAt: now });
  } else {
    library.items.unshift({
      id: p.id, domain: p.domain ?? state?.domain ?? null, title: nameOf(p), year: p.year ?? null, poster: p.poster ?? null,
      image: p.image ?? null, kind: p.kind ?? null, link: p.link ?? null, status, addedAt: now, updatedAt: now,
    });
  }
  saveLibrary();
}

function addHistory(r, domain) {
  const last = library.history.at(-1);
  if (last?.topId === r.top.id && last.domain === domain) return; // the same result rendered again
  library.history.push({
    at: new Date().toISOString(), domain, topId: r.top.id, title: nameOf(r.top), poster: r.top.poster ?? null, image: r.top.image ?? null,
    alternatives: r.alternatives.map((a) => ({ id: a.id, title: nameOf(a) })),
  });
  library.history = library.history.slice(-HISTORY_MAX);
  saveLibrary();
}

// A saved item drawn with the same poster and card code as engine cards.
const toCard = (x) => ({ id: x.id, name: x.title, year: x.year, poster: x.poster, image: x.image, kind: x.kind ?? (x.domain === 'game' ? 'game' : x.domain === 'series' ? 'series' : 'film'), domain: x.domain, genres: [] });
// Titles marked «Зашло» / «Не зашло» in «Моё» come preselected on the anchors screen of their domain.
const fromMine = (id) => {
  const x = savedItem(id);
  return x?.domain === state?.domain && (x.status === 'liked' || x.status === 'disliked');
};
const mineFor = () => library.items
  .filter((x) => fromMine(x.id) && !state?.answers?.[x.id])
  .map((x) => ({ card: toCard(x), r: x.status === 'disliked' ? 'dislike' : x.answer?.reaction === 'love' ? 'love' : 'like' }));

// What the person said about a title in «Моё» stays with it. Only answers that say something are kept:
// after «Не знаю» the title is asked again next time, behind the fresh picks.
function rememberAnswers(st) {
  let changed = false;
  for (const [id, a] of Object.entries(st?.answers ?? {})) {
    const item = savedItem(id);
    const kind = a.reaction === 'dislike' ? 'disliked' : a.reaction === 'like' || a.reaction === 'love' ? 'liked' : null;
    const says = hasAnswerContent(a);
    if (!item || !kind || item.domain !== st.domain || item.status !== kind || !says) continue;
    if (JSON.stringify(item.answer) === JSON.stringify(a)) continue;
    item.answer = a;
    changed = true;
  }
  if (changed) saveLibrary();
}

// Anchors: fresh marks go first, so «за что» is asked about them; titles from «Моё» bring their kept answers
// and are asked about only when there is none.
function reactAction(s) {
  const all = [...marks].map(([id, m]) => ({ id, reaction: m.r }));
  const known = Object.fromEntries(all.filter((m) => fromMine(m.id) && savedItem(m.id)?.answer).map((m) => [m.id, savedItem(m.id).answer]));
  return {
    type: 'react',
    marksMode: 'snapshot',
    marks: [...all.filter((m) => !fromMine(m.id)), ...all.filter((m) => fromMine(m.id))],
    known,
    shownIds: s.items.map((x) => x.id),
    note: $('#evening-note')?.value ?? ui.note ?? state?.situation?.note ?? '',
  };
}

// ---------- posters: portrait poster → landscape header (letterboxed) → typographic tile ----------

const toneOf = (key) => {
  let h = 0;
  for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return (Math.abs(h) % 4) + 1;
};
// Every screen re-renders its posters; images that already loaded are drawn visible at once, so a click
// does not flash the typographic fallback, and images that failed are not requested again.
const loadedImages = new Map(); // src → 'portrait' | 'landscape'
const failedImages = new Set();

function poster(c, { size = '', lazy = true, extra = '', domain = state?.domain } = {}) {
  const title = nameOf(c);
  const [src, alt = ''] = [c.poster, c.image].filter((u) => u && !failedImages.has(u));
  const shape = loadedImages.get(src);
  const letterbox = shape === 'landscape' && size !== 'poster-sm';
  const img = src
    ? (letterbox ? `<img class="p-bg" src="${esc(src)}" alt="" aria-hidden="true">` : '')
      + `<img class="p-img${shape ? ' is-loaded' : ''}" src="${esc(src)}"${alt ? ` data-alt="${esc(alt)}"` : ''} alt=""${lazy ? ' loading="lazy"' : ''} decoding="async">`
    : '';
  const frameClass = shape ? ` is-img${letterbox ? ' is-letterbox' : ''}` : '';
  return `<span class="poster ${size}${frameClass}" data-tone="${toneOf(c.id ?? title)}">`
    + `<span class="typo" aria-hidden="true"><span class="typo-title">${esc(title)}</span>`
    + `<span class="typo-foot"><span>${esc(c.year ?? '')}</span>${icon(kindIcon(c, domain))}</span>`
    + `<span class="typo-initial">${esc([...title.replace(/^[^\p{L}\p{N}]+/u, '')][0] ?? '')}</span></span>`
    + `${img}${extra}</span>`;
}

// load / error do not bubble, so listen in the capture phase for every poster on the page.
document.addEventListener('load', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.classList.contains('p-img')) return;
  const frame = img.parentElement;
  const landscape = img.naturalWidth > img.naturalHeight * 1.05;
  loadedImages.set(img.getAttribute('src'), landscape ? 'landscape' : 'portrait');
  if (landscape && !frame.classList.contains('poster-sm')) {
    frame.classList.add('is-letterbox');
    if (!frame.querySelector('.p-bg')) img.insertAdjacentHTML('beforebegin', `<img class="p-bg" src="${esc(img.currentSrc || img.src)}" alt="" aria-hidden="true">`);
  }
  img.classList.add('is-loaded');
  frame.classList.add('is-img');
}, true);
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement)) return;
  if (img.classList.contains('p-bg')) { img.remove(); return; }
  if (!img.classList.contains('p-img')) return;
  failedImages.add(img.getAttribute('src'));
  if (img.dataset.alt) {
    const next = img.dataset.alt;
    delete img.dataset.alt;
    img.src = next;
    return;
  }
  const frame = img.parentElement;
  frame?.classList.remove('is-letterbox', 'is-img');
  frame?.querySelector('.p-bg')?.remove();
  img.remove();
}, true);

// ---------- state ----------

const el = {
  sidebar: $('#sidebar'), scrim: $('#scrim'), domains: $('#side-domains'), steps: $('#side-steps'), taste: $('#side-taste'),
  toolbarTitle: $('#toolbar-title'), back: $('#back-btn'), restart: $('#restart-btn'), menu: $('#menu-btn'),
  content: $('#content'), actionbar: $('#actionbar'), inspector: $('#inspector'), announcer: $('#announcer'),
  stage: $('#legacy-stage'), thinking: $('#legacy-thinking'), main: $('#main'), header: $('#legacy-header'),
  confirm: $('#confirm'),
};

let screen = null;
let state = null;
let counts = null;            // catalog sizes from /api/meta
let busy = false;
let failed = null;            // set by the client's onError during a call
let error = null;             // message shown in the banner
let lastRun = null;
let pendingFocus = null;
let intentThinkingOwner = null;
let intentThinkingScroll = null;

const marks = new Map();      // anchors: id → { card, r }; survives «Показать другие» and Back
let found = new Map();        // titles found by search on the anchors screen, shown first
const memo = new Map();       // selections per screen, restored when the person comes back
let seeded = false;           // the anchors screen already got its titles from «Моё» in this dialogue
let ui = freshUi();
const narrow = window.matchMedia('(max-width: 1100px)');

// AI picker (src/ai/pick.js): the server says whether this browser may use it; each dialogue state and wish is
// asked once. The engine's result stays at hand for «Показать без нейросети».
const ai = { status: null, runs: new Map(), wish: '', off: false, engine: null, key: null };
const aiKeyOf = (st, wish) => JSON.stringify([st.domain, st.answers, st.situation, st.stops, st.preferences, st.corrections, st.session, st.platform, wish]);
const aiOn = () => Boolean(ai.status?.enabled) && !ai.off;
const aiRun = () => (aiOn() ? ai.runs.get(ai.key) : null);

let view = location.hash === '#my' ? 'my' : 'dialogue';
const my = { tab: null, selected: null, undo: null };
let dialogueScroll = null;    // where the dialogue was when «Моё» opened
let quiet = false;            // screens arriving during a scripted start are not drawn one by one

const STEPS_KEY = 'tastiq.site.steps';
let stepsOpen = false;
try { stepsOpen = localStorage.getItem(STEPS_KEY) === 'open'; } catch { /* closed by default */ }

function freshUi(key = '') {
  return { key, sel: new Set(), issues: new Map(), extra: [], extraIssues: [], bad: false, tried: false, more: false, profileOpen: false, parsed: null, parseText: '', note:state?.situation?.note??'', focusId: null, seen: null, whyOut: null };
}
const snapshot = () => ({ sel: [...ui.sel], issues: [...ui.issues], extra: ui.extra, extraIssues: ui.extraIssues, bad: ui.bad, tried: ui.tried, more: ui.more, parseText: ui.parseText,note:ui.note });
function restore(saved) {
  ui.sel = new Set(saved.sel);
  ui.issues = new Map(saved.issues);
  ui.extra = saved.extra;
  ui.extraIssues = saved.extraIssues;
  ui.bad = saved.bad;
  ui.tried = saved.tried ?? false;
  ui.more = saved.more ?? false;
  ui.parseText = saved.parseText ?? '';
  ui.note=saved.note??state?.situation?.note??'';
}
function screenKey(s) {
  if (s.step === 'why' || s.step === 'why_not') return `${s.step}:${s.item.id}`;
  if (s.step === 'anchors') return `anchors:${s.items.map((x) => x.id).join(',')}`;
  return s.step;
}

const client = createClient({
  storageKey: 'tastiq.site',
  onScreen,
  onError: (err) => { failed = err; },
});

let feedbackStorage;
try { feedbackStorage=localStorage; } catch { /* keep this visit in memory */ }
const anchorDraft=createAnchorDraft(feedbackStorage);
let anchorOwner=null;
const saveAnchorDraft=()=>anchorDraft.save(client.dialogueId,state?.domain,[...marks.values()]);
const feedback = createFeedbackStore({storage:feedbackStorage,send:run=>client.feedback(run),onChange:()=>{
  $$('[data-feedback-status]').forEach(el=>{el.textContent=feedbackStatus(feedback.status(el.dataset.feedbackStatus),feedback.persistent);});
}});
let activeEveningId=null, eveningRequestKey=null;
const feedbackOpen=new Map(), eveningOpen=new Map(), feedbackDrafts=new Map();
const meaningfulEvenings=()=>feedback.all().filter(r=>r.responses.length).reverse();
const eveningHtml=(run,id,history=false)=>eveningControls(run,id,{open:feedbackOpen.get(`${run?.id}:${id}`)??false,history,status:feedback.status(run?.id),persistent:feedback.persistent,draft:feedbackDrafts.get(`${run?.id}:${id}`)});
function observeEvening(result) {
  const key=JSON.stringify([client.dialogueId,state,result]);
  if(eveningRequestKey===key)return;
  eveningRequestKey=key;activeEveningId=null;
  void feedback.observe(client.dialogueId,state,result).then(run=>{
    if(eveningRequestKey!==key)return;
    activeEveningId=run?.id??null;
    if(view==='dialogue'&&screen?.step==='result')refreshDetail();
    void feedback.flush();
  });
}
async function updateEvening(t,action) {
  const rid=t.dataset.run,cid=t.dataset.id;
  if(!await feedback.update(rid,cid,action))return;
  if(action.type==='explain'){
    const draft=feedbackDrafts.get(`${rid}:${cid}`);
    if(draft?.note===action.note && (draft.reason||null)===action.reason)feedbackDrafts.delete(`${rid}:${cid}`);
  }
  if(action.type==='choose'&&action.value) {
    const p=resultPick(cid);if(p){planStore.save(p,{lane:'tonight',domain:state.domain});library=loadLibrary();}
  }
  const fk=['choose','start'].includes(action.type)?`evening-${action.type}:${rid}:${cid}:${action.value?'off':'on'}`:t.dataset.fk;
  if(view==='my')redrawMy(fk);else {render(false);focusFk(fk);}
  void feedback.flush();
}

function onScreen(s, st) {
  if(anchorOwner&&anchorOwner.id!==client.dialogueId)anchorDraft.clear(anchorOwner.id,anchorOwner.domain);
  if(st.domain)anchorOwner={id:client.dialogueId,domain:st.domain};
  screen = s;
  state = st;
  error = null;
  learn(s);
  if (s.step === 'domain') {
    marks.clear();
    found = new Map();
    memo.clear();
    seeded = false;
  }
  // What the person marked «Зашло» / «Не зашло» in «Моё» comes preselected, once per dialogue.
  if (s.step === 'anchors' && !seeded) {
    seeded = true;
    for (const m of anchorDraft.load(client.dialogueId,st.domain)??mineFor()) {
      rememberCard(m.card);
      marks.set(m.card.id, m);
    }
  }
  rememberAnswers(st);
  if (s.step === 'result' && s.result?.top) addHistory(s.result, st.domain);

  const key = screenKey(s);
  const isNew = key !== ui.key;
  if (isNew) {
    ui = freshUi(key);
    if (memo.has(key)) restore(memo.get(key));
    else if (s.step === 'stops') ui.sel = new Set(st.stops ?? []);
  }
  if (s.step === 'anchors') ui.note = st.situation?.note ?? '';
  if (s.step === 'result') {
    applyAi(s, st);
    syncFocus(s.result);
  } else ai.wish = '';
  if (!quiet) render(isNew);
}

// A fresh result screen carries the engine's picks; with the AI on, the model's picks replace them when ready.
// After «Уже смотрел» or «Не сейчас» the screen keeps what it showed, with the engine's next pick in the removed card's
// place (fillPicks), and the model is not asked again: its run serves the changed answers too.
function applyAi(s, st) {
  ai.engine = s.result;
  const keep = kept;
  kept = null;
  if (s.result?.top && aiOn()) {
    ai.key = aiKeyOf(st, ai.wish);
    if (keep?.run && !ai.runs.has(ai.key)) ai.runs.set(ai.key, keep.run);
    const run = ai.runs.get(ai.key);
    if (!run && (!keep || keep.invalidated)) startAi(ai.key); // plain removal is free; a changed evaluation needs a new selection
    else if (run?.result && !keep) s.result = fillPicks(run.result, s.result, removedIds(st), playedIds(st));
  }
  if (keep?.result?.top && s.result?.top) s.result = fillPicks(keep.result, s.result, removedIds(st), playedIds(st));
}

// What was on the screen when a card was removed (or a removal taken back): set right before the action, used up by
// the next result screen in applyAi.
let kept = null;

// A removal on the result («Уже смотрел», its reaction, «Вернуть», «Не сейчас»). If the action does not go through,
// nothing of it stays: no kept screen waiting for a later result, no note about a card that is still shown.
// Resolves true when it went through.
async function keepAndGo(action, trigger, { shown = screen.result, seen } = {}) {
  const before = ui.seen;
  if (seen !== undefined) ui.seen = seen;
  const run = aiRun();
  kept = changesTaste(action, state) ? { invalidated: true } : { result: shown, run: run && !run.pending ? run : null };
  // The details showed the removed card: they move to the card that takes its place, not to the leader.
  const cards = (r) => [r.top, ...r.alternatives];
  const slot = action.type === 'played' || action.type === 'not_now' ? cards(screen.result).findIndex((p) => p.id === action.id) : -1;
  const followSlot = slot >= 0 && ui.focusId === action.id;
  await go(action, trigger);
  if (!kept) {
    const next = followSlot ? cards(screen.result)[slot] : null;
    if (next) {
      ui.focusId = next.id;
      $$('[data-act="focus"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === ui.focusId)));
      refreshDetail();
    }
    // «Не сейчас» has no note: the keyboard stays where the card was.
    const there = slot >= 0 && action.type === 'not_now' ? cards(screen.result)[slot] : null;
    if (there) focusFk(`focus:${there.id}`);
    return true;
  }
  kept = null;
  ui.seen = before;
  pendingFocus = null;
  renderContent();
  $('#error-banner')?.focus();
  return false;
}

// Past this the engine's picks are shown with «Повторить»: the server finishes the request anyway and keeps the answer
// for an hour, so a retry a few seconds later is instant.
const AI_WAIT_MS = 15_000;

async function startAi(key, previous = []) {
  const run = { pending: true, wish: ai.wish, started: Date.now() };
  ai.runs.set(key, run);
  let timer;
  try {
    const late = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('не успела за 15 секунд')), AI_WAIT_MS); });
    const out = await Promise.race([client.aiPick({ wish: run.wish, previous }), late]);
    if (out.error) run.error = out.error;
    else run.result = out.result;
  } catch (err) {
    run.error = err.message || 'нет ответа от сервера';
  } finally {
    clearTimeout(timer);
  }
  run.pending = false;
  client.log('ai-done', { step: 'result', ms: Date.now() - run.started, ok: Boolean(run.result) });
  if (ai.key !== key || ai.off || screen?.step !== 'result' || view !== 'dialogue') return;
  if (run.result) {
    // Cards removed while the model was thinking stay removed.
    screen.result = fillPicks(run.result, ai.engine ?? run.result, removedIds(state), playedIds(state));
    ui.focusId = null; // the details follow the model's first pick, not the engine's leader focused while waiting
    syncFocus(screen.result);
    addHistory(screen.result, state.domain);
  }
  const inContent = el.content.contains(document.activeElement) || document.activeElement === document.body;
  render(false);
  if (inContent) $('#q-title')?.focus({ preventScroll: true });
  announce(run.result ? `Готово: первым «${nameOf(run.result.top)}».` : `Нейросеть не ответила: ${run.error}.`);
}

function syncFocus(r) {
  const ids = [r.top?.id, ...(r.alternatives ?? []).map((a) => a.id)].filter(Boolean);
  if (!ids.includes(ui.focusId)) ui.focusId = ids[0] ?? null;
}

// ---------- calls ----------

async function run(fn, trigger) {
  if (busy) return;
  busy = true;
  failed = null;
  lastRun = () => run(fn);
  document.body.classList.add('is-busy');
  const slow = setTimeout(() => document.body.classList.add('is-busy-visible'), 120);
  if (trigger?.classList.contains('btn')) {
    trigger.insertAdjacentHTML('afterbegin', '<span class="spinner" aria-hidden="true"></span>');
    trigger.setAttribute('aria-busy', 'true');
  }
  el.content.setAttribute('aria-busy', 'true');
  try {
    await fn();
  } catch (err) {
    failed = err;
  } finally {
    clearTimeout(slow);
    busy = false;
    document.body.classList.remove('is-busy', 'is-busy-visible');
    el.content.removeAttribute('aria-busy');
    trigger?.querySelector(':scope > .spinner')?.remove();
    trigger?.removeAttribute('aria-busy');
    if (failed) {
      error = failed.message || 'нет ответа от сервера';
      renderContent();
      renderActionbar();
      $('#error-banner')?.focus();
    }
  }
}

function go(action, trigger) {
  if (busy) return;
  if (ui.key) memo.set(ui.key, snapshot());
  return run(() => client.send(action), trigger);
}

function confirmDialog(title, text, ok) {
  $('#confirm-title').textContent = title;
  $('#confirm-text').textContent = text;
  $('#confirm-ok').textContent = ok;
  el.confirm.returnValue = '';
  el.confirm.showModal();
  return new Promise((resolve) => el.confirm.addEventListener('close', () => resolve(el.confirm.returnValue === 'ok'), { once: true }));
}

async function restartAll() {
  const progressed = screen && screen.step !== 'domain';
  if (progressed && !(await confirmDialog('Начать заново?', 'Ответы этого подбора сбросятся.', 'Начать заново'))) return;
  closeDrawer(false);
  await run(() => client.restart(), el.restart);
}

async function switchDomain(id) {
  if (busy) return;
  if (id === 'game') { location.href = '/pick/game/'; return; }
  if(['film','series','cartoon'].includes(id)&&new URLSearchParams(location.search).get('legacy')!=='1'){location.href=`/pick/watch/?domain=${id}`;return;}
  if (screen?.step === 'domain') { closeDrawer(false); return go({ type: 'choose', value: id }); }
  if (state?.domain === id) { closeDrawer(); return; }
  const progressed = !['domain', 'platform', 'time', 'company'].includes(screen?.step);
  const d = domainOf(id);
  if (progressed && !(await confirmDialog(`Начать заново: ${d.short.toLowerCase()}?`, 'Ответы этого подбора сбросятся.', 'Начать заново'))) return;
  closeDrawer(false);
  await run(async () => {
    await client.restart();
    if (!failed) await client.send({ type: 'choose', value: id });
  });
}

// «Моё» lives at #my over the same frame; the dialogue state is not touched while it is open.
function openMy() { location.assign('/library/'); }
function leaveMy() {
  history.pushState(null, '', location.pathname + location.search);
  syncView();
}
function syncView() {
  if(location.hash === '#my') { location.replace('/library/'); return; }
  const next = location.hash === '#my' ? 'my' : 'dialogue';
  closeDrawer(false);
  if (next === view) return;
  if (next === 'my') {
    dialogueScroll = { content: el.content.scrollTop, page: window.scrollY };
    Object.assign(my, { tab: null, selected: null, undo: null });
  }
  view = next;
  render(false);
  const back = next === 'dialogue' ? dialogueScroll : null;
  el.content.scrollTop = back?.content ?? 0;
  el.inspector.scrollTop = 0;
  window.scrollTo(0, back?.page ?? 0);
  $('#q-title')?.focus({ preventScroll: true });
}

// ---------- render ----------

function render(isNew) {
  const fk = document.activeElement?.dataset?.fk;
  renderSidebar();
  renderToolbar();
  renderContent();
  renderActionbar();
  renderInspector();
  if (isNew) {
    el.content.scrollTop = 0;
    el.inspector.scrollTop = 0;
    window.scrollTo(0, 0);
    if (pendingFocus) focusFk(pendingFocus);
    else $('#q-title')?.focus({ preventScroll: true });
  } else if (pendingFocus || fk) {
    if (!focusFk(pendingFocus ?? fk)) $('#q-title')?.focus({ preventScroll: true });
  }
  pendingFocus = null;
}

function focusFk(fk) {
  if (!fk) return false;
  const target = $$(`[data-fk="${CSS.escape(fk)}"]`).find((x) => x.offsetParent !== null);
  target?.focus({ preventScroll: true });
  return Boolean(target);
}

function announce(text) {
  el.announcer.textContent = '';
  requestAnimationFrame(() => { el.announcer.textContent = text; });
}

/* sidebar */

function renderSidebar() {
  const current = view === 'dialogue' ? state?.domain : null;
  const later = screen?.later ?? ['Почитать', 'Аниме'];
  el.domains.innerHTML = DOMAINS.map((d) => `<button class="side-item" type="button" data-act="side-domain" data-v="${d.id}" data-fk="side:${d.id}"${d.id === current ? ' aria-current="true"' : ''}>${icon(d.icon)}<span>${esc(d.plural)}</span></button>`).join('');

  if (!screen) { el.steps.innerHTML = ''; el.taste.innerHTML = ''; return; }
  // Steps are a disclosure: one summary row, the full list only for those who open it.
  const rows = stepRows();
  const at = rows.findIndex((r) => r.st === 'current');
  el.steps.innerHTML = `<button class="side-item steps-toggle" type="button" data-act="steps" data-fk="steps" aria-expanded="${stepsOpen}" aria-controls="steps-list">`
    + `${icon('chevR')}<span class="steps-sum"><span class="num">Шаг ${at + 1} из ${rows.length}</span> · <b>${esc(STEP_LABEL[screen.step])}</b></span></button>`
    + `<ol class="steps" id="steps-list"${stepsOpen ? '' : ' hidden'}>${rows.map((r) => `<li class="step is-${r.st}"${r.st === 'current' ? ' aria-current="step"' : ''}>`
    + `<span class="step-mark">${r.st === 'done' ? icon('check') : r.st === 'skipped' ? icon('dash') : '<span class="step-dot"></span>'}</span>`
    + `<span>${esc(STEP_LABEL[r.id])}</span>${r.value ? `<span class="step-value">${esc(r.value)}</span>` : ''}`
    + `<span class="sr-only">${{ done: ', пройдено', skipped: ', пропущено', current: ', сейчас', todo: '' }[r.st]}</span></li>`).join('')}</ol>`;

  el.taste.innerHTML = `<h2 class="side-title">Что я понял о тебе</h2><div class="taste">${tasteHtml()}</div>`;
}

function answersBy(reactions) {
  return Object.entries(state?.answers ?? {}).filter(([, a]) => reactions.includes(a.reaction));
}

function stepRows() {
  const list = stepsFor(state?.domain);
  const cur = list.indexOf(screen.step);
  const situation = state?.situation ?? {};
  const marked = Object.values(state?.answers ?? {}).filter((a) => a.reaction !== 'unknown').length;
  const skipped = {
    time: !situation.time,
    company: !situation.company,
    context: !situation.childAge && !situation.partySize,
    anchors: !marked,
    why: !state?.liked?.length,
    why_not: !state?.disliked?.length,
    stops: !state?.stops?.length,
    ask: !state?.asked?.length,
  };
  return list.map((id, i) => {
    let st = i < cur ? 'done' : i === cur ? 'current' : 'todo';
    if (st === 'done' && skipped[id]) st = 'skipped';
    let value = '';
    if (st === 'current' && screen.progress) value = screen.progress;
    else if (st === 'done') {
      if (id === 'domain') value = domainOf(state.domain)?.short ?? '';
      if (id === 'platform') value = PLATFORM[state.platform]?.short ?? '';
      if (id === 'time' && situation.time) value = labelOf(`time:${situation.time}`);
      if (id === 'company' && situation.company) value = labelOf(`company:${situation.company}`);
      if (id==='context')value=labelOf(situation.childAge?`childAge:${situation.childAge}`:`partySize:${situation.partySize}`);
      if (id === 'anchors') value = String(marked);
      if (id === 'stops' && state.stops?.length) value = String(state.stops.length);
      if (id === 'ask' && state.asked?.length) value = String(state.asked.length);
    }
    return { id, st, value };
  });
}

function tasteHtml() {
  const taste = screen.step === 'result' ? screen.result?.taste : null;
  const situation = state?.situation ?? {};
  const todayLabels = [situation.time ? labelOf(`time:${situation.time}`) : '', situation.company ? labelOf(`company:${situation.company}`) : '',situation.childAge?labelOf(`childAge:${situation.childAge}`):'',situation.partySize?labelOf(`partySize:${situation.partySize}`):'',situation.note??''].filter(Boolean);
  const group = (label, items, quiet = false) => (items.length
    ? `<div class="taste-group"><p class="taste-label">${esc(label)}</p><ul class="taste-items${quiet ? ' is-quiet' : ''}">${items.join('')}</ul></div>`
    : '');
  const li = (text, src) => `<li>${esc(text)}${src ? `<span class="src">${esc(src)}</span>` : ''}</li>`;

  if (taste) {
    return [
      group('Тебе важно', taste.confirmed.map((x) => li(x.label, x.sources.join(', ')))),
      group('Похоже, нравится', taste.inferred.slice(0, 4).map((x) => li(x.label)), true),
      group('Не нравится', taste.dislikes.map((x) => li(x.label, x.sources.join(', ')))),
      group('Никогда', taste.hardNo.map((x) => li(x.label, x.sources.join(', ')))),
      group('Сегодня', todayLabels.length ? [li(todayLabels.join(', '))] : []),
    ].join('') || '<p class="taste-empty">Пока ничего не понял.</p>';
  }

  const liked = answersBy(['like', 'love']).map(([id, a]) => li(
    `${nameOf(titleOf(id)) || id}${a.reaction === 'love' ? ' (обожаю)' : ''}`,
    (a.reasons ?? []).map(labelOf).join(', '),
  ));
  const disliked = answersBy(['dislike', 'tried']).map(([id, a]) => li(
    `${nameOf(titleOf(id)) || id}${a.reaction === 'tried' ? ' (бросил)' : ''}`,
    [...(a.issues ?? []).map((x) => `${labelOf(x.f)}${x.hard ? ' (никогда)' : ''}`), a.badQuality ? 'плохо сделано' : ''].filter(Boolean).join(', '),
  ));
  const html = [
    group('Сегодня', todayLabels.length ? [li(todayLabels.join(', '))] : []),
    group('Зашло', liked),
    group('Не зашло', disliked),
    group('Никогда', (state?.stops ?? []).length ? [li(state.stops.map(labelOf).join(', '))] : []),
  ].join('');
  return html || '<p class="taste-empty">Пока ничего. Ответь на пару вопросов, и здесь появится, что я понял.</p>';
}

/* toolbar */

function renderToolbar() {
  const mine = view === 'my';
  const phase=screen?.step==='result'?3:['time','platform','company','context'].includes(screen?.step)?1:screen?.step==='domain'||!screen?0:2;
  $('#legacy-progress').innerHTML=['Раздел','Условия','Твой вкус','Варианты'].map((label,i)=>`<li data-status="${i<phase?'done':i===phase?'current':'next'}"${i===phase?' aria-current="step"':''}><span class="progress-mark">${i<phase?icon('check'):i+1}</span><span>${label}</span></li>`).join('');
  document.body.dataset.legacyStep = mine ? 'my' : screen?.step ?? 'loading';
  document.body.dataset.legacyAi = String(!mine && Boolean(aiRun()?.pending));
  $('#workspace-pick').setAttribute('aria-current', mine ? 'false' : 'page');
  $('#workspace-my').setAttribute('aria-current', mine ? 'page' : 'false');
  const backLabel = mine ? 'К подбору' : 'Назад';
  el.back.innerHTML = `${icon('chevL')}<span class="label">${backLabel}</span>`;
  el.back.setAttribute('aria-label', backLabel);
  el.restart.setAttribute('aria-label', 'Заново');
  el.back.disabled = mine ? false : !client.canGoBack;
  el.back.dataset.act = 'back';
  el.restart.innerHTML = `${icon('restart')}<span class="label">Заново</span>`;
  el.restart.disabled = !screen || screen.step === 'domain';
  el.restart.hidden = mine;
  el.restart.dataset.act = 'restart';
  el.menu.innerHTML = icon('sidebar') + '<span>Разделы и шаги</span>';
  el.menu.dataset.act = 'menu';
  $('#sidebar-close').innerHTML = icon('x');
  $('#sidebar-close').dataset.act = 'menu-close';
  if (mine) { el.toolbarTitle.innerHTML = '<b>Библиотека</b>'; return; }
  if (!screen) { el.toolbarTitle.textContent = ''; return; }
  el.toolbarTitle.innerHTML = `<b>${esc(STEP_LABEL[screen.step])}</b>${screen.progress ? ` · ${esc(screen.progress)}` : ''}`;
}

/* content */

function head(s, hint = s.hint) {
  return `<h1 class="q-title" id="q-title" tabindex="-1">${esc(s.title)}</h1>${hint ? `<p class="q-hint">${esc(hint)}</p>` : ''}`;
}

function errorBanner() {
  return `<div class="banner" id="error-banner" role="alert" tabindex="-1">${icon('alert')}<div class="banner-text"><b>Не получилось связаться с сервером</b><span>${esc(error)}</span></div>`
    + `<button class="btn btn-secondary" type="button" data-act="retry">Повторить</button>`
    + `${screen ? '' : '<button class="btn btn-plain" type="button" data-act="hard-restart">Начать заново</button>'}</div>`;
}

function renderContent() {
  const s = screen;
  if (intentThinkingOwner !== null && (view !== 'dialogue' || s?.step !== 'anchors')) setIntentThinking(null);
  let html = error ? errorBanner() : '';
  if (view === 'my') {
    mountContent(`<div class="content-inner">${html}${myBody()}</div>`);
    return;
  }
  if (!s) {
    mountContent(`<div class="content-inner">${html || '<div class="legacy-thinking" role="status"><span class="legacy-thinking-signal" aria-hidden="true"><span class="spinner"></span></span><h1 class="q-title" id="q-title" tabindex="-1">Открываю подбор</h1><p>Восстанавливаю твой текущий шаг.</p></div>'}</div>`);
    return;
  }
  switch (s.step) {
    case 'domain': html += head(s) + domainBody(s); break;
    case 'platform': html += head(s) + platformBody(s); break;
    case 'time':
    case 'context':
    case 'company': html += head(s) + choiceBody(s); break;
    case 'anchors': html += head(s) + anchorsBody(s); break;
    case 'why':
    case 'why_not': html += itemQuestion(s); break;
    case 'stops': html += head(s) + `<div class="q-body">${chipGroup(s.options, 'sel', ui.sel, 'Что точно не надо')}${actionSlot()}</div>`; break;
    case 'ask': html += head(s) + askBody(s); break;
    case 'result': html += resultBody(s); break;
    default: html += head(s);
  }
  mountContent(`<div class="content-inner">${html}</div>`);
}

// Keep one action node and the existing handlers when an answer body is redrawn.
const actionSlot = () => '<div data-legacy-actions></div>';
function attachActions() {
  const slot = $('[data-legacy-actions]', el.content);
  if (slot) slot.replaceWith(el.actionbar);
  else if (!el.stage.contains(el.actionbar)) el.stage.append(el.actionbar);
}
function mountContent(html) {
  const resultSnapshot=resultView.capture(el.content,document.activeElement);
  el.actionbar.remove();
  el.content.innerHTML = html;
  attachActions();
  resultView.restore(resultSnapshot,el.content);
}

function setIntentThinking(owner, {restoreScroll = false} = {}) {
  const wasActive = intentThinkingOwner !== null;
  if (owner !== null && !wasActive) intentThinkingScroll = window.scrollY;
  intentThinkingOwner = owner;
  const active = owner !== null;
  el.stage.dataset.intentThinking = String(active);
  el.thinking.hidden = !active;
  el.content.inert = active;
  el.actionbar.inert = active;
  el.stage.removeAttribute('aria-busy');
  if (active || busy) el.content.setAttribute('aria-busy', 'true');
  else el.content.removeAttribute('aria-busy');
  if (active) {
    el.stage.scrollIntoView({block:'start'});
    el.thinking.focus({preventScroll:true});
  }
  else if (wasActive && intentThinkingScroll !== null) {
    if (restoreScroll) window.scrollTo(0, intentThinkingScroll);
    intentThinkingScroll = null;
  }
}

const chip = (o, act, on, fk = `${act}:${o.value}`) => `<button class="chip" type="button" data-act="${act}" data-v="${esc(o.value)}" data-fk="${esc(fk)}" aria-pressed="${on}">${esc(o.label)}</button>`;
const chipGroup = (options, act, set, label) => `<div class="chips" role="group" aria-label="${esc(label)}">${options.map((o) => chip(o, act, set.has(o.value))).join('')}</div>`;

function domainBody(s) {
  const rows = s.options.map((o) => {
    const d = domainOf(o.value);
    const n = counts?.[o.value]?.items;
    return `<button class="row" type="button" data-act="domain" data-v="${esc(o.value)}" data-fk="domain:${esc(o.value)}">`
      + `<span class="row-icon">${icon(d?.icon ?? 'film')}</span>`
      + `<span class="row-main"><span class="row-label">${esc(o.label)}</span>${n ? `<span class="row-sub num">${nf.format(n)} ${plural(n, d.count)} в каталоге</span>` : ''}</span>`
      + `<span class="row-chev">${icon('chevR')}</span></button>`;
  });
  const later = (s.later ?? []).map((l) => `<button class="row" type="button" disabled><span class="row-icon">${icon(LATER_ICON[l] ?? 'book')}</span>`
    + `<span class="row-main"><span class="row-label">${esc(l)}</span></span><span class="pill">скоро</span></button>`);
  return `<div class="q-body"><div class="list">${[...rows, ...later].join('')}</div></div>`;
}

function platformBody(s) {
  return `<div class="q-body"><div class="tiles" role="group" aria-label="Платформа">${s.options.map((o) => {
    const on = state.platform === o.value;
    return `<button class="tile" type="button" data-act="platform" data-v="${esc(o.value)}" data-fk="platform:${esc(o.value)}" aria-pressed="${on}">`
      + `${icon(PLATFORM[o.value]?.icon ?? 'monitor', 'i-l')}<span class="tile-label">${esc(o.label)}</span>`
      + `${on ? `<span class="tile-check">${icon('check')}</span>` : ''}</button>`;
  }).join('')}</div></div>`;
}

function cardMeta(c) {
  return [c.year, genresOf(c, state?.domain).slice(0, 2).join(', ')].filter(Boolean).join(' · ');
}

// «Сколько есть времени?», «Один или с кем-то?»: one tap answers and goes on.
function choiceBody(s) {
  const current = state?.situation?.[s.step];
  return `<div class="q-body"><div class="list legacy-answer-list" role="group" aria-label="${esc(s.title)}">${s.options.map((o) => {
    const on = current === o.value;
    return `<button class="row" type="button" data-act="choice" data-v="${esc(o.value)}" data-fk="choice:${esc(o.value)}" aria-pressed="${on}">`
      + `<span class="row-main"><span class="row-label">${esc(o.label)}</span></span><span class="row-chev">${icon(on ? 'check' : 'chevR')}</span></button>`;
  }).join('')}</div>${actionSlot()}</div>`;
}

// An adaptive question: one tap on an answer goes on; «Всё равно» is in the action bar.
function askBody(s) {
  return `<div class="q-body"><div class="list legacy-answer-list" role="group" aria-label="${esc(s.title)}">${s.options.map((o) => `<button class="row" type="button" data-act="answer" data-v="${esc(o.value)}" data-fk="answer:${esc(o.value)}">`
    + `<span class="row-main"><span class="row-label">${esc(o.label)}</span></span><span class="row-chev">${icon('chevR')}</span></button>`).join('')}</div>${actionSlot()}</div>`;
}

// A title the person may know, with four reactions under the poster.
function anchorCard(c) {
  const r = marks.get(c.id)?.r;
  const name = nameOf(c);
  return `<div class="pcard acard${r ? ' is-marked' : ''}" data-id="${esc(c.id)}">`
    + poster(c, { extra: r ? `<span class="badge is-on">${icon(REACTION_ICON[r])}</span>` : '' })
    + `<span class="pcard-text"><span class="pcard-title">${esc(name)}</span><span class="pcard-meta">${esc(cardMeta(c))}</span>`
    + (fromMine(c.id) ? `<span class="pcard-from">${icon('bookmark')}из «Моё»</span>` : '') + '</span>'
    + `<span class="reacts" role="group" aria-label="${esc(name)}: как тебе?">${screen.reactions.map((x) => `<button class="react" type="button" data-act="react" data-id="${esc(c.id)}" data-r="${x.value}" data-fk="react:${esc(c.id)}:${x.value}" aria-pressed="${r === x.value}">${esc(x.label)}</button>`).join('')}</span>`
    + '</div>';
}

function anchorsBody(s) {
  // Found and already marked titles from other pages stay first, so a tap can change or take back a mark.
  const onPage = new Set(s.items.map((x) => x.id));
  const pinned = new Map();
  for (const c of found.values()) if (!onPage.has(c.id)) pinned.set(c.id, c);
  for (const [id, m] of marks) if (!onPage.has(id) && !pinned.has(id)) pinned.set(id, m.card);
  const cards = [...pinned.values(), ...s.items].map(anchorCard).join('');
  const tools = (s.search ? searchBox('pick', `Найти своё: ${SEARCH_EXAMPLE[state.domain] ?? ''}`, 'Найти в каталоге') : '<span></span>')
    + (s.more ? `<button class="btn btn-secondary" type="button" data-act="more" data-fk="more">${icon('refresh', 'i-s')}Показать другие</button>` : '');
  const note=`<details class="section" id="evening-details"${ui.noteOpen || state?.situation?.note ? ' open' : ''}><summary>Есть пожелание на сегодня?</summary><label class="group-title" for="evening-note">Что хочется сегодня — своими словами</label><input class="input" id="evening-note" maxlength="300" value="${esc(ui.note??state?.situation?.note??'')}" placeholder="${state?.domain==='game'?'Например: история с героями на час перед сном':'Например: что-то доброе и смешное, без мрака'}" data-fk="evening-note"><div id="intent-controls" aria-live="polite">${intentControls()}</div></details>`;
  return `<div class="q-body"><div class="grid-tools">${tools}</div><div class="pgrid" id="pgrid" role="group" aria-label="Названия">${cards}</div>${actionSlot()}${note}</div>`;
}
const anchorCount=()=>marks.size?`Отмечено: ${marks.size}`:'Можно продолжить без отметок';

// «За что» / «что не так»: the title's poster sits next to the question, so the question reads at a glance.
function itemQuestion(s) {
  const c = s.item;
  const meta = [originalOf(c), c.year, kindLabel(c, state?.domain)].filter(Boolean).join(' · ');
  const body = s.step === 'why' ? whyBody(s) : whyNotBody(s);
  return `<div class="q-item">${poster(c, { lazy: false })}`
    + `<div class="q-item-head"><h1 class="q-title" id="q-title" tabindex="-1">${esc(s.title)}</h1>${meta ? `<p class="q-item-meta">${esc(meta)}</p>` : ''}</div>`
    + (s.hint ? `<p class="q-hint">${esc(s.hint)}</p>` : '')
    + `</div><div class="q-body" id="qbody">${body}</div>`;
}

const sameSet = (set, list) => set.size === list.length && list.every((x) => set.has(x));
// The part of the «за что» selection that the pair above shows; chips from «Ещё причины» stay outside it.
const pairPart = (s) => new Set([...ui.sel].filter((f) => s.pair.some((x) => x.value === f)));

// «За что»: first a choice between two features of the title, the rest of the chips behind «Ещё причины».
function whyBody(s) {
  const [a, b] = s.pair;
  const chosen = pairPart(s);
  const seg = (value, label, list) => `<button class="seg" type="button" data-act="pair" data-v="${esc(value)}" data-fk="pair:${esc(value)}" aria-pressed="${sameSet(chosen, list)}">${esc(label)}</button>`;
  const pair = a
    ? `<div class="segmented pair" role="group" aria-label="Главное">${seg(a.value, a.label, [a.value])}${b ? seg(b.value, b.label, [b.value]) + seg('both', 'за всё вместе', [a.value, b.value]) : ''}</div>`
    : '';
  const open = !a || ui.more || [...ui.sel].some((f) => !s.pair.some((x) => x.value === f));
  return pair + (a ? actionSlot() : '')
    + `<details class="freetext more-chips" id="more-chips"${open ? ' open' : ''}><summary data-fk="more-chips">${icon('chevR', 'i-s')}Ещё причины</summary>`
    + `<div class="freetext-body">${chipGroup([...s.options, ...ui.extra], 'sel', ui.sel, 'Причины')}</div></details>` + (a ? '' : actionSlot())
    + (ui.extraIssues.length ? `<h2 class="group-title">А это мешало</h2><p class="group-note">${esc(COMPLAINT_HINT)}</p>${complaints('issues', 'Что мешало')}` : '')
    + (s.freeText ? freeText('«за атмосферу и персонажей»') : '');
}

const toggleRow = (act, label, on) => `<button class="toggle-row" type="button" role="checkbox" aria-checked="${on}" data-act="${act}" data-fk="${act}"><span class="box">${icon('check')}</span><span class="row-main">${esc(label)}</span></button>`;

function whyNotBody(s) {
  return complaints('options', 'Что мешало')
    + (s.categories?.length ? `<h2 class="group-title">Или не люблю такое вообще</h2>${complaints('categories', 'Не люблю такое вообще')}` : '')
    + (s.tried ? toggleRow('tried', s.tried, ui.tried) : '')
    + (s.badQuality ? toggleRow('bad', 'Такое люблю, просто это плохо сделано', ui.bad) : '')
    + actionSlot()
    + (s.freeText ? freeText('«затянуто и всё понятно заранее»') : '');
}

// ---------- complaints: one tap «мешало», a second «никогда», a third takes it back ----------
// A complaint is off, «не нравится» (hard: false) or «никогда» (hard: true); ui.issues keeps 'soft' | 'hard'.

const COMPLAINT_HINT = 'Один тап: мешало. Второй: «никогда, ни в чём».';
const NEXT_STATE = { off: 'soft', soft: 'hard', hard: 'off' };

function complaintOptions(key) {
  if (key === 'issues') return ui.extraIssues;
  if (key === 'categories') return screen.categories ?? [];
  return [...screen.options, ...ui.extra];
}
function complaints(key, label) {
  return `<div class="cgroup" data-cgroup="${key}" data-label="${esc(label)}">${complaintChips(complaintOptions(key), label)}</div>`;
}
function refreshComplaints(t, fk) {
  const box = t.closest('[data-cgroup]');
  if (box) box.innerHTML = complaintChips(complaintOptions(box.dataset.cgroup), box.dataset.label);
  focusFk(fk);
  renderActionbar();
}

function complaintChips(options, label) {
  return `<div class="chips" role="group" aria-label="${esc(label)}">${options.map((o) => complaintChip(o, ui.issues.get(o.value) ?? 'off')).join('')}</div>`;
}

function complaintChip(o, st) {
  return `<button class="chip chip-c" type="button" data-act="c-toggle" data-v="${esc(o.value)}" data-fk="c-toggle:${esc(o.value)}" data-state="${st}" aria-pressed="${st !== 'off'}">`
    + `${st === 'off' ? '' : icon(st === 'hard' ? 'ban' : 'minus')}<span>${esc(o.label)}</span>${st === 'hard' ? '<span class="chip-tag">никогда</span>' : ''}</button>`;
}

function freeText(placeholder) {
  return `<details class="freetext" id="freetext"${ui.parsed || ui.parseText ? ' open' : ''}>`
    + `<summary data-fk="freetext">${icon('chevR', 'i-s')}Нет нужного варианта? Напиши своими словами</summary>`
    + `<div class="freetext-body"><p>Разберу текст в такие же варианты и покажу, что понял. Без твоего подтверждения ничего не запишу.</p>`
    + `<form class="field" data-form="parse"><input class="input" id="free" name="q" type="text" value="${esc(ui.parseText)}" placeholder="${esc(placeholder)}" autocomplete="off" aria-label="Своими словами" data-fk="free">`
    + `<button class="btn btn-secondary" type="submit" data-fk="parse">Разобрать</button></form>`
    + `<div class="parsed" id="parsed" aria-live="polite">${parsedHtml()}</div></div></details>`;
}

function offered() {
  const p = ui.parsed;
  if (!p?.understood) return [];
  const list = screen.step === 'why'
    ? [...p.positive.map((x) => ({ ...x, as: 'reason' })), ...p.negative.map((x) => ({ ...x, as: 'issue' }))]
    : [...p.positive, ...p.negative].map((x) => ({ ...x, as: 'issue' }));
  return list.filter((x) => (x.as === 'reason' ? !ui.sel.has(x.f) : !ui.issues.has(x.f)));
}

function parsedHtml() {
  const p = ui.parsed;
  if (!p) return '';
  if (p.loading) return '<p class="parsed-note"><span class="spinner" aria-hidden="true"></span> Разбираю…</p>';
  if (p.error) return `<p class="parsed-note">Не получилось разобрать: ${esc(p.error)}</p>`;
  if (!p.understood) return '<p class="parsed-note">Не понял. Выбери из вариантов выше или напиши иначе.</p>';
  const list = offered();
  if (!list.length) return '<p class="parsed-note">Всё, что понял, уже отмечено.</p>';
  return `<p class="parsed-note">Понял так. Нажми, чтобы добавить:</p><div class="chips">${list.map((x) => `<button class="chip chip-add" type="button" data-act="add" data-v="${esc(x.f)}" data-l="${esc(x.label)}" data-as="${x.as}" data-hard="${x.hard ? 1 : 0}" data-fk="add:${esc(x.f)}">`
    + `${icon(x.as === 'reason' ? 'check' : 'minus')}<span>${esc(x.label)}</span></button>`).join('')}</div>`;
}

// What was understood, on the result: any line can be taken back, and the pick is recomputed.
function profileBlock(t) {
  const row = (x, kind) => `<div class="row"><span class="row-main"><span class="row-label">${esc(x.label)}</span>${x.sources?.length ? `<span class="row-sub">${esc(x.sources.join(', '))}</span>` : ''}</span>`
    + `<button class="btn btn-plain row-remove" type="button" data-act="remove" data-kind="${kind}" data-v="${esc(x.f)}" data-fk="remove:${kind}:${esc(x.f)}" aria-label="Убрать: ${esc(x.label)}">${icon('x', 'i-s')}Убрать</button></div>`;
  const group = (title, items, kind) => (items.length
    ? `<section><h2 class="group-title">${esc(title)}</h2><div class="list list-plain">${items.map((x) => row(x, kind)).join('')}</div></section>`
    : '');
  const body = group('Тебе важно', t.confirmed, 'reason') + group('Не нравится', t.dislikes, 'issue') + group('Никогда', t.hardNo, 'issue');
  if (!body) return '';
  return `<details class="freetext profile" id="profile"${ui.profileOpen ? ' open' : ''}><summary data-fk="profile">${icon('chevR', 'i-s')}Поправить, что я понял о тебе</summary>`
    + `<div class="freetext-body pb-groups">${body}</div></details>`;
}

/* result */

const LEVEL = { strong: 3, likely: 2, try: 1 };
const statusPill = (p) => `<span class="status" data-level="${LEVEL[p.label] ?? 1}"><span class="bars" aria-hidden="true"><span></span><span></span><span></span></span>${esc(p.labelText)}</span>`;
function pickMeta(p, withKind = false) {
  return [
    p.year,
    withKind ? kindLabel(p, state?.domain) : '',
    p.runtime ? runtimeText(p.runtime) : '',
    seasonsText(p),
    p.domain === 'game' && p.price ? p.price : '',
  ].filter(Boolean).join(' · ');
}

// While the model chooses: the same frame as the result, with placeholders where the cards will be.
function aiLoading(s, run) {
  const hint = run.wish
    ? `Учитываю «${run.wish}» и всё, что ты рассказал.`
    : 'Сопоставляю варианты с твоими ответами и проверяю, что подходит на сегодня.';
  return '<section class="legacy-thinking" role="status" aria-live="polite" aria-labelledby="q-title" aria-describedby="legacy-pick-wait-description">'
    + '<span class="legacy-thinking-signal" aria-hidden="true"><span class="spinner"></span></span>'
    + `<h1 class="q-title" id="q-title" tabindex="-1">Подбираю вариант на вечер</h1><p id="legacy-pick-wait-description">${esc(hint)}</p>`
    + '<p class="legacy-thinking-note">Ответы сохранены. Когда подбор закончится, варианты появятся здесь.</p>'
    + '<button class="btn btn-secondary" type="button" data-act="ai-off" data-fk="ai-off">Показать без нейросети</button></section>';
}

// Under the heading: what the model understood, or why its picks are missing, and the switch between both picks.
function aiNote(r) {
  if (!ai.status?.enabled) return '';
  if (ai.off) return `<p class="ai-note is-quiet">${icon('sparkle', 'i-s')}<span>Обычный подбор, без нейросети.</span><button class="link-btn" type="button" data-act="ai-on" data-fk="ai-on">Подобрать с нейросетью</button></p>`;
  const run = aiRun();
  if (run?.error) return `<p class="ai-note is-quiet">${icon('alert', 'i-s')}<span>Нейросеть не ответила (${esc(run.error)}), это обычный подбор.</span><button class="link-btn" type="button" data-act="ai-retry" data-fk="ai-retry">Повторить</button></p>`;
  if (!r.ai) return '';
  return `<div class="ai-note">${icon('sparkle', 'i-s')}<span><b>Понял так:</b> ${esc(r.ai.understood)} <button class="link-btn is-quiet" type="button" data-act="ai-off" data-fk="ai-off-top">Показать обычный подбор</button></span></div>`;
}

function aiWishForm() {
  if (!aiOn()) return '';
  return '<form class="ai-wish" data-form="ai-wish"><label class="group-title" for="ai-wish">Не то? Скажи словами</label>'
    + `<div class="field"><input class="input" id="ai-wish" name="wish" type="text" maxlength="300" value="${esc(resultView.value(resultWishKey(),ai.wish))}" placeholder="например: посвежее" autocomplete="off" data-fk="ai-wish" data-result-key="${esc(resultWishKey())}">`
    + '<button class="btn btn-secondary" type="submit" data-fk="ai-wish-go">Подобрать</button></div>'
    + '</form>';
}

function resultLink(p){try{const url=new URL(p.link);return ['http:','https:'].includes(url.protocol)?url.href:'';}catch{return '';}}
function conversationProposal(p) {
  const saved=savedItem(p.id),onLater=saved?.lane==='want'||saved?.status==='want'&&!saved.lane;
  const reason=p.ai?.reason||(p.explanation?.reasons??[]).filter(x=>!x.weak).slice(0,2).map(x=>x.text).join(' ');
  const caveat=p.ai?.caveat||p.explanation?.risks?.[0]?.text||'';
  return `<article class="conversation-proposal" data-proposal-id="${esc(p.id)}">${poster(p,{lazy:false})}<div class="conversation-proposal-copy"><h2>${esc(nameOf(p))}</h2><p class="conversation-proposal-meta">${esc(pickMeta(p))}</p>`
    +(p.ai?.reason?'<p class="conversation-proposal-meta">Причина — мнение модели</p>':'')
    +(reason?`<p class="conversation-proposal-reason">${esc(reason)}</p>`:'<p class="conversation-proposal-reason">Вариант по каталогу. Совпадение с твоим желанием ещё предстоит проверить.</p>')
    +(caveat?`<p class="conversation-proposal-caveat"><strong>Учти</strong>${esc(caveat)}</p>`:'')
    +feasibilityHint(p)
    +`<div class="conversation-proposal-actions"><button class="btn btn-secondary" type="button" data-act="take" data-id="${esc(p.id)}" data-fk="take:${esc(p.id)}" aria-pressed="${Boolean(onLater)}">${icon(onLater?'check':'bookmark')}${onLater?'На потом':'Сохранить на потом'}</button>${seenButton(p)}<button class="btn btn-plain" type="button" data-act="not-now" data-id="${esc(p.id)}" data-fk="notnow:${esc(p.id)}">Не сейчас</button></div>`
    +eveningHtml(feedback.get(activeEveningId),p.id)
    +`<details class="conversation-proposal-details" data-result-disclosure="${esc(p.id)}"><summary>Почему предложено и факты</summary>${detail(p,{inline:true,controls:false})}</details>`
    +(resultLink(p)?`<a class="conversation-title-link" href="${esc(resultLink(p))}" target="_blank" rel="noopener noreferrer">${linkLabel(p)}${icon('external')}</a>`:'')+'</div></article>';
}
function resultBody(s) {
  const run=aiRun();
  if(run?.pending&&s.result?.top){activeEveningId=null;eveningRequestKey=null;return aiLoading(s,run);}
  const r=s.result;
  if(!r.top){activeEveningId=null;eveningRequestKey=null;return head(s)+'<p class="empty">После всех фильтров ничего не осталось. Вернись назад и ослабь условия.</p>';}
  observeEvening(r);
  let html=aiNote(r);
  if(!r.ai&&r.uncheckedContext?.length)html+=`<p class="q-hint" role="status">Обычный подбор пока не учитывает: ${esc(r.uncheckedContext.join(', '))}. Нейросеть сейчас недоступна или выключена.</p>`;
  const cards=[r.top,...r.alternatives];
  html+=`<div class="conversation-proposals">${cards.map((p,i)=>seenNote(i)+conversationProposal(p)).join('')}${seenNote(cards.length,true)}</div>`;
  html+=aiWishForm()+`<section class="whynot"><h2 class="group-title">Почему не показал…</h2>${searchBox('why','Название','Почему не показал')}<div class="whynot-out" id="whynot-out" aria-live="polite">${whyOutHtml()}</div></section>`;
  return head(s,'Несколько вариантов под твой запрос. Сохрани на потом или выбери на этот вечер.')+`<div class="q-body" data-result-owner="${esc(resultWishKey())}">${html}</div>`;
}

function focusedPick() {
  const r = screen?.result;
  if (!r?.top) return null;
  return [r.top, ...r.alternatives].find((p) => p.id === ui.focusId) ?? r.top;
}

function heroCard(p) {
  // With the AI on, its sentence replaces the engine's two reasons on the card; all of them stay in the details.
  const strong = p.ai ? [] : p.explanation.reasons.filter((x) => !x.weak).slice(0, 2);
  const more = p.explanation.reasons.length - strong.length;
  // The card opens the details; «Уже смотрел» sits in the same frame as a separate button (a button cannot hold one).
  return `<div class="pick pick-hero"><button class="hero" type="button" data-act="focus" data-id="${esc(p.id)}" data-fk="focus:${esc(p.id)}" aria-pressed="${ui.focusId === p.id}">`
    + poster(p, { lazy: false })
    + `<span class="hero-body">${statusPill(p)}<span class="hero-title">${esc(nameOf(p))}</span><span class="hero-meta">${esc(pickMeta(p))}</span>${savedMark(p)}`
    + (p.ai ? `<span class="hero-reasons"><span class="hero-reason is-ai">${icon('sparkle', 'i-s')}<span>${esc(p.ai.reason)}</span></span>`
      + (p.ai.caveat ? `<span class="hero-reason is-caveat">${icon('alert', 'i-s')}<span>${esc(p.ai.caveat)}</span></span>` : '') + '</span>' : '')
    + (strong.length ? `<span class="hero-reasons">${strong.map((x) => `<span class="hero-reason">${icon('check', 'i-s')}<span>${esc(x.text)}</span></span>`).join('')}</span>` : '')
    + (more > 0 ? `<span class="hero-more">Ещё ${more} ${plural(more, ['причина', 'причины', 'причин'])} в подробностях</span>` : '')
    + seenHint(p)
    + feasibilityHint(p)
    + `</span></button>${seenButton(p)}</div>`;
}

function altCard(p) {
  return `<div class="pick pick-alt"><button class="alt" type="button" data-act="focus" data-id="${esc(p.id)}" data-fk="focus:${esc(p.id)}" aria-pressed="${ui.focusId === p.id}">`
    + poster(p)
    + `<span class="alt-body"><span class="alt-title">${esc(nameOf(p))}</span><span class="alt-meta">${esc(pickMeta(p))}</span>${savedMark(p)}`
    + (p.ai ? `<span class="alt-reason">${icon('sparkle', 'i-s')}<span>${esc(p.ai.reason)}</span></span>` : '')
    + seenHint(p)
    + feasibilityHint(p)
    + `</span>${statusPill(p)}</button>${seenButton(p)}</div>`;
}

// One tap takes an already seen title off the result; the next pick takes its place.
const seenButton = (p) => `<button class="btn btn-secondary btn-s seen-btn" type="button" data-act="seen" data-id="${esc(p.id)}" data-fk="seen:${esc(p.id)}" aria-label="Уже ${doneVerb(p.domain)}: ${esc(nameOf(p))}">Уже ${doneVerb(p.domain)}</button>`;

// The model's guess that the person has already seen a title (a big hit of their kind): said plainly, the button
// to answer it is on the same card.
const seenHint = (p) => (p.ai?.likelySeen ? `<span class="seen-hint">Может, уже ${doneVerb(p.domain)}?</span>` : '');
const feasibilityHint = (p) => {
  const warnings = (p.feasibility ?? []).filter((f) => f.status !== 'yes');
  return warnings.length ? `<span class="seen-hint">${esc(warnings.map((f) => f.text).join(' '))}</span>` : '';
};

// Where the removed card stood: what was removed, an optional «как тебе?» that teaches the picker, and «Вернуть».
function seenNote(slot, orLater = false) {
  const x = ui.seen;
  if (!x || (orLater ? x.slot < slot : x.slot !== slot)) return '';
  const name = esc(nameOf(x.card));
  if (x.reaction) return `<p class="seen-note is-done" role="status">«${name}»: запомнил, что ${x.reaction === 'like' ? 'понравилось' : 'не зашло'}.</p>`;
  return `<div class="seen-note" role="group" aria-label="Убрал «${name}»"><p>Убрал «${name}». Как тебе?</p><span class="seen-note-row">`
    + [['like', 'Понравилось'], ['dislike', 'Не зашло']].map(([r, l]) => `<button class="btn btn-secondary btn-s" type="button" data-act="seen-rate" data-r="${r}" data-fk="seen-rate:${r}">${l}</button>`).join('')
    + '<button class="btn btn-plain btn-s" type="button" data-act="unseen" data-fk="unseen">Вернуть</button></span></div>';
}

const savedMark = (p) => (savedItem(p.id) ? `<span class="saved-mark">${icon('bookmark', 'i-s')}Уже в «Моё»</span>` : '');
const SAVED_AS = { want: 'В «Моё»', liked: 'В «Моё»: зашло', disliked: 'В «Моё»: не зашло' };

// Evidence reads in Russian: the reason already names the feature, so an English tag or quote is the original,
// shown on request (plan step 6). A translated quote (e.ru, 08-translate-quotes.js) is shown as a translation with
// the original under it. Russian quotes and facts stay in sight.
function evidenceLine(e) {
  const english = e.q && looksEnglish(e.q);
  const quote = e.q ? `«${esc(e.q)}»` : '';
  // A translation that already opens with a quoted title («NewsRadio» — …) is not wrapped in quotes again.
  const quoted = (t) => (/^[«"„]/.test(t) ? esc(t) : `«${esc(t)}»`);
  const shown = english ? (e.ru ? quoted(e.ru) : '') : quote;
  const textual = e.kind === 'review' || e.kind === 'wiki' || e.kind === 'summary' || e.kind === 'description';
  const label = e.ru ? 'оригинал' : textual ? 'цитата по-английски' : 'оригинал';
  const original = english ? `<details class="ev-orig"><summary>${label}</summary><span class="ev-q" lang="en">${quote}</span></details>` : '';
  const line = (ic, src, body, url = '') => `<div class="ev">${icon(ic)}<div class="ev-body"><span class="ev-src">${src}${body ? ':' : ''}</span> ${body}`
    + `${url ? ` <a href="${esc(url)}" target="_blank" rel="noopener">источник</a>` : ''}${original}</div></div>`;
  switch (e.kind) {
    case 'review': return line(e.thumb === 'down' ? 'thumbDown' : 'thumbUp', `Отзыв в Steam${e.hours != null ? `, ${nf.format(e.hours)} ч в игре` : ''}`, shown);
    case 'tag': return line('tag', `Тег игроков Steam${e.votes != null ? `, ${nf.format(e.votes)} ${plural(e.votes, ['голос', 'голоса', 'голосов'])}` : ''}`, shown);
    case 'genome': return line('tag', `Зрители MovieLens${e.rel != null ? `, соответствие ${Math.round(e.rel * 100)}%` : ''}`, shown);
    case 'usertag': return line('tag', `Теги зрителей MovieLens${e.n != null ? `, ${e.n} ${plural(e.n, ['раз', 'раза', 'раз'])}` : ''}`, shown);
    case 'wiki': return line('book', `Статья в Википедии${e.section && !looksEnglish(e.section) ? `, раздел «${esc(e.section)}»` : ''}`, shown, e.url);
    case 'description':
    case 'summary': return line('bubble', 'Описание', shown);
    case 'genre': return GENRE_RU[e.q] ? line('info', 'Жанр', esc(GENRE_RU[e.q])) : line('info', 'Жанр', shown);
    case 'fact': return line('info', 'Факт', esc(e.q));
    default: return line('info', 'Источник', shown);
  }
}

function reasonItem(x, evidence, kind) {
  const [first, ...rest] = evidence;
  return `<li class="reason${kind ? ` is-${kind}` : ''}"><p class="reason-text">${icon(kind === 'risk' ? 'alert' : kind === 'weak' ? 'off' : 'check')}<span>${esc(x.text)}</span></p>`
    + (first ? evidenceLine(first) : '')
    + (rest.length ? `<details class="ev-more"><summary>${icon('chevR')}Ещё ${rest.length} ${plural(rest.length, ['подтверждение', 'подтверждения', 'подтверждений'])}</summary>${rest.map(evidenceLine).join('')}</details>` : '')
    + '</li>';
}

// The model's sentence, marked as its opinion: unlike the engine's reasons it has no quote behind it.
function aiReason(text, ic, kind = '') {
  if (!text) return '';
  return `<li class="reason is-ai${kind ? ` is-${kind}` : ''}"><p class="reason-text">${icon(ic)}<span>${esc(text)}</span></p>`
    + `<div class="ev">${icon('sparkle')}<div class="ev-body"><span class="ev-src">Мнение нейросети</span></div></div></li>`;
}

function linkLabel(p) {
  if (p.domain === 'game' || /steampowered/.test(p.link)) return 'Открыть в Steam';
  if (/imdb\.com/.test(p.link)) return 'Открыть на IMDb';
  return 'Открыть страницу';
}

function detail(p, { inline = false, controls = true } = {}) {
  if (!p) return '';
  const compact = inline && p.id === screen?.result?.top?.id; // the hero card above already shows poster, title and the AI sentence
  const hs = compact ? 'h2' : 'h3';
  const facts = new Map(p.facts.map((f) => [f.id, f]));
  const evidenceFor = (x) => x.factIds.flatMap((id) => facts.get(id)?.evidence ?? []);
  const ex = p.explanation;
  const rating = ex.info.find((x) => x.factIds.includes('fact:reviews'));
  const info = ex.info.filter((x) => x !== rating && !x.factIds.some((id) => id === 'fact:runtime' || id === 'fact:seasons'));
  const genres = genresOf(p, state?.domain);
  const verb = doneVerb(p.domain);
  const saved = savedItem(p.id);
  return `<div class="detail${compact ? ' is-compact' : ''}" data-id="${esc(p.id)}">`
    + (compact ? '' : `<div class="detail-head">${poster(p, { lazy: false })}<div><h2 class="detail-title">${esc(nameOf(p))}</h2>`
      + (originalOf(p) ? `<p class="detail-orig">${esc(originalOf(p))}</p>` : '')
      + `<p class="detail-meta">${esc(pickMeta(p, true))}</p>`
      + (rating ? `<p class="detail-meta">${esc(rating.text)}</p>` : '')
      + `${statusPill(p)}</div></div>`)
    + (controls ? `<div class="detail-actions">`
    + (saved
      ? `<div class="saved-row"><button class="btn btn-secondary is-done" type="button" data-act="take" data-id="${esc(p.id)}" data-fk="take:${esc(p.id)}" aria-disabled="true">${icon('check', 'i-s')}${SAVED_AS[saved.status] ?? SAVED_AS.want}</button>`
        + '<a class="saved-link" href="/library/">Открыть библиотеку</a></div>'
      : `<button class="btn btn-secondary" type="button" data-act="take" data-id="${esc(p.id)}" data-fk="take:${esc(p.id)}">${icon('bookmark', 'i-s')}Сохранить на потом</button>`)
    + `<button class="btn btn-secondary" type="button" data-act="seen" data-id="${esc(p.id)}" data-fk="played:${esc(p.id)}">Уже ${verb}</button>`
    + `<button class="btn btn-secondary" type="button" data-act="not-now" data-id="${esc(p.id)}" data-fk="notnow:${esc(p.id)}">Не сейчас</button>`
    + (p.link ? `<a class="detail-link" href="${esc(p.link)}" target="_blank" rel="noopener">${linkLabel(p)}${icon('external', 'i-s')}</a>` : '')
    + '</div>'
    + eveningHtml(feedback.get(activeEveningId),p.id) : '')
    + (p.feasibility?.length ? `<section class="section"><${hs} class="section-title">Подходит ли сегодня</${hs}><ul class="facts">${p.feasibility.map((f) => `<li><span>${esc(f.text)}${f.source ? ` <a href="${esc(f.source)}" target="_blank" rel="noopener">Источник</a> · проверено ${esc(f.checkedAt)}` : ''}</span></li>`).join('')}</ul></section>` : '')
    + ((ex.reasons.length || (!compact && p.ai)) ? `<section class="section"><${hs} class="section-title">Почему</${hs}><ul class="reasons">${compact ? '' : aiReason(p.ai?.reason, 'sparkle')}${ex.reasons.map((x) => reasonItem(x, evidenceFor(x), x.weak ? 'weak' : '')).join('')}</ul></section>` : '')
    + ((ex.risks.length || (!compact && p.ai?.caveat)) ? `<section class="section"><${hs} class="section-title">Учти</${hs}><ul class="reasons">${compact ? '' : aiReason(p.ai?.caveat, 'alert', 'risk')}${ex.risks.map((x) => reasonItem(x, evidenceFor(x), 'risk')).join('')}</ul></section>` : '')
    + ((info.length || genres.length) ? `<section class="section"><${hs} class="section-title">Факты</${hs}><ul class="facts">`
      + (genres.length ? `<li>${icon('info')}<span>${esc(genres.join(', '))}</span></li>` : '')
      + info.map((x) => `<li>${icon('info')}<span>${esc(x.text)}</span></li>`).join('') + '</ul></section>' : '')
    + '</div>';
}

function whyOutHtml() {
  const o = ui.whyOut;
  if (!o) return '';
  const name = esc(nameOf(o.card));
  if (o.loading) return '<p class="muted"><span class="spinner" aria-hidden="true"></span> Проверяю…</p>';
  if (o.error) return `<div class="whynot-card"><p>Не получилось проверить «${name}»: ${esc(o.error)}</p></div>`;
  const w = o.w;
  if (w.error) return `<div class="whynot-card"><p>«${name}»: ${esc(w.error)}.</p></div>`;
  if (w.removedBy) return `<div class="whynot-card"><p><b>«${name}»</b> не показываю: ${esc(w.removedBy.reason)}.</p></div>`;
  // Missing/truncated tags are not evidence that a title lacks a property. This is the engine order, not the AI's.
  const matched = w.matches.filter((m) => m.confirmed).map((m) => m.label);
  const words = (xs) => xs.map((x) => `«${esc(x)}»`).join(', ');
  const parts = [
    `В обычном подборе по данным каталога: ${nf.format(w.rank)}-й из ${nf.format(w.of)}.`,
    matched.length ? `Совпадает с тем, что ты отметил: ${words(matched)}.` : '',
    w.penalties.length ? `Мешает: ${words(w.penalties.map((m) => m.label))}.` : '',
    screen.result?.ai ? 'Нейросеть может выбрать другой порядок с учётом твоего пожелания.' : '',
  ].filter(Boolean);
  return `<div class="whynot-card"><p><b>«${name}»</b>. ${parts.join(' ')}</p></div>`;
}

const resultPick = (id) => {
  const r = screen?.result;
  return r?.top ? [r.top, ...r.alternatives].find((p) => p.id === id) : null;
};

/* «Моё» */

const MY_TABS = [
  { id: 'evenings', label: 'Вечера' },
  { id: 'want', label: 'Буду смотреть / играть' },
  { id: 'liked', label: 'Зашло' },
  { id: 'disliked', label: 'Не зашло' },
  { id: 'history', label: 'История' },
];
const MY_EMPTY = {
  evenings: ['Вечера пока не отмечены', 'Выбери вариант на сегодня или оставь отзыв на подборе. Здесь сможешь рассказать, как прошло.'],
  want: ['Пока пусто', 'Нажми «В „Моё“» у варианта на подборе, и он появится здесь.'],
  liked: ['Пока пусто', 'Здесь будет то, что тебе зашло. В следующем подборе я сам отмечу это среди знакомых тайтлов.'],
  disliked: ['Пока пусто', 'Здесь будет то, что не зашло. В следующем подборе я сам отмечу это среди знакомых тайтлов.'],
  history: ['Подборов пока не было', 'Здесь будут прошлые подборы: что было первым и какие были ещё варианты.'],
};
const whenFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const dateText = (iso, fmt = whenFmt) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : fmt.format(d);
};
const myCount = (tab) => (tab === 'evenings' ? meaningfulEvenings().length : tab === 'history' ? library.history.length : library.items.filter((x) => x.status === tab).length);
const savedMeta = (x) => [x.year, DOMAIN_NOUN[x.domain] ?? ''].filter(Boolean).join(' · ');
const statusText = (x) => ({ want: x.domain === 'game' ? 'Буду играть' : 'Буду смотреть', liked: 'Зашло', disliked: 'Не зашло' })[x.status] ?? '';

function myBody() {
  const tab = (my.tab ??= MY_TABS.find((t) => myCount(t.id))?.id ?? 'want');
  const tabs = `<div class="segmented my-tabs" role="group" aria-label="Что показать">${MY_TABS.map((t) => `<button class="seg" type="button" data-act="my-tab" data-v="${t.id}" data-fk="my-tab:${t.id}" aria-pressed="${t.id === tab}">`
    + `${esc(t.label)}<span class="seg-count num">${myCount(t.id)}</span></button>`).join('')}</div>`;
  const undo = my.undo
    ? `<p class="my-undo" role="status">Убрал «${esc(my.undo.item.title)}».<button class="btn btn-link" type="button" data-act="my-undo" data-fk="my-undo">Вернуть</button></p>`
    : '';
  return `<h1 class="q-title" id="q-title" tabindex="-1">Моё</h1>`
    + '<p class="q-hint">Твоя библиотека хранится в этом браузере. В «Вечерах» можно рассказать, насколько подошёл выбор.</p>'
    + `<div class="q-body">${tabs}${undo}${tab === 'evenings' ? myEvenings() : tab === 'history' ? myHistory() : myItems(tab)}</div>`;
}

function myEvenings() {
  const runs=meaningfulEvenings();if(!runs.length)return myEmpty('evenings');
  return `<div class="evening-list">${runs.map((r,i)=>{
    const rated=r.cards.filter(c=>r.responses.some(a=>a.cardId===c.id)),chosen=r.cards.filter(c=>r.responses.some(a=>a.cardId===c.id&&a.chosen));
    return `<details class="evening-entry" data-evening-history="${esc(r.id)}"${(eveningOpen.get(r.id)??i===0)?' open':''}><summary>${esc(dateText(r.at))} · ${esc((chosen.length?chosen:rated).map(c=>c.title).join(', '))}</summary>`
      + (r.context.note?`<p class="evening-context">На этот вечер: ${esc(r.context.note)}</p>`:'')
      + rated.map(c=>`<article class="evening-card"><h2 class="section-title">${esc(c.title)}</h2>${eveningHtml(r,c.id,true)}</article>`).join('')+'</details>';
  }).join('')}</div>`;
}

function myItems(status) {
  const items = library.items.filter((x) => x.status === status).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return items.length ? `<div class="my-list">${items.map(myRow).join('')}</div>` : myEmpty(status);
}

function myRow(x) {
  const on = my.selected === x.id;
  const id = esc(x.id);
  const done = x.domain === 'game' ? 'Поиграл(а)' : 'Посмотрел(а)';
  const btn = (act, text, ic = '', label = '') => `<button class="btn btn-secondary btn-s" type="button" data-act="${act}" data-id="${id}" data-fk="${act}:${id}"${label ? ` aria-label="${esc(label)}"` : ''}>${ic ? icon(ic, 'i-s') : ''}${text}</button>`;
  const actions = x.status === 'want'
    ? `<span class="my-ask" aria-hidden="true">${done}?</span>${btn('my-liked', 'Зашло', 'thumbUp', `${done}: зашло`)}${btn('my-disliked', 'Не зашло', 'thumbDown', `${done}: не зашло`)}`
    : x.status === 'liked' ? btn('my-disliked', 'В «Не зашло»') : btn('my-liked', 'В «Зашло»');
  return `<div class="my-row${on ? ' is-selected' : ''}">`
    + `<button class="my-main" type="button" data-act="my-select" data-id="${id}" data-fk="my-select:${id}" aria-pressed="${on}">${poster(toCard(x), { domain: x.domain })}`
    + `<span class="my-text"><span class="my-title">${esc(x.title)}</span><span class="my-meta">${esc(savedMeta(x))}</span></span></button>`
    + `<div class="my-actions" role="group" aria-label="${esc(x.title)}">${actions}`
    + `<button class="btn btn-plain btn-s" type="button" data-act="my-remove" data-id="${id}" data-fk="my-remove:${id}" aria-label="Убрать: ${esc(x.title)}">${icon('x', 'i-s')}Убрать</button></div>`
    + (on ? `<div class="narrow-only my-inline">${myFacts(x)}</div>` : '')
    + '</div>';
}

function myDetail(x) {
  return `<div class="my-detail"><div class="detail-head">${poster(toCard(x), { lazy: false, domain: x.domain })}<div>`
    + `<h2 class="detail-title">${esc(x.title)}</h2>`
    + (savedMeta(x) ? `<p class="detail-meta">${esc(savedMeta(x))}</p>` : '')
    + `<p class="detail-status"><span class="pill">${esc(statusText(x))}</span></p>`
    + (x.addedAt ? `<p class="detail-meta">Добавлено ${esc(dateText(x.addedAt, dayFmt))}</p>` : '')
    + '</div></div>'
    + (x.link ? `<a class="detail-link" href="${esc(x.link)}" target="_blank" rel="noopener">${linkLabel(x)}${icon('external', 'i-s')}</a>` : '')
    + '</div>';
}

function myFacts(x) {
  return `<div class="my-facts"><span class="pill">${esc(statusText(x))}</span>`
    + (x.addedAt ? `<span>Добавлено ${esc(dateText(x.addedAt, dayFmt))}</span>` : '')
    + (x.link ? `<a class="detail-link" href="${esc(x.link)}" target="_blank" rel="noopener">${linkLabel(x)}${icon('external', 'i-s')}</a>` : '')
    + '</div>';
}

function myHistory() {
  if (!library.history.length) return myEmpty('history');
  return `<div class="list list-plain my-hist">${[...library.history].reverse().map((h) => {
    const alts = (h.alternatives ?? []).map((a) => a.title).filter(Boolean);
    const card = toCard({ id: h.topId, title: h.title, poster: h.poster, image: h.image, domain: h.domain });
    return `<div class="row">${poster(card, { size: 'poster-sm', domain: h.domain })}<span class="row-main">`
      + `<span class="row-label">${esc(h.title)}</span>`
      + `<span class="row-sub num">${esc([dateText(h.at), DOMAIN_NOUN[h.domain] ?? ''].filter(Boolean).join(' · '))}</span>`
      + (alts.length ? `<span class="row-sub">Ещё варианты: ${esc(alts.join(', '))}</span>` : '')
      + `</span>${savedItem(h.topId) ? `<span class="saved-mark">${icon('bookmark', 'i-s')}В «Моё»</span>` : ''}</div>`;
  }).join('')}</div>`;
}

function myEmpty(tab) {
  const [title, text] = MY_EMPTY[tab];
  return `<div class="my-empty">${icon(tab === 'history' ? 'restart' : 'bookmark', 'i-l')}`
    + `<p class="my-empty-title">${esc(title)}</p><p class="my-empty-text">${esc(text)}</p>`
    + '<button class="btn btn-primary" type="button" data-act="my-pick" data-fk="my-pick">Подобрать</button></div>';
}

function myInspector() {
  if(my.tab==='evenings')return '<h2 class="insp-title" id="insp-title" tabindex="-1">Твои вечера</h2><p class="insp-note">Здесь отдельно видны выбор, начало и впечатление. Если не успел начать, так и отметь.</p><p class="insp-note">Отметки и текст отзыва отправляются без имени для улучшения подбора. Исходное пожелание к отзыву не прикладываем.</p>';
  const x = my.selected ? savedItem(my.selected) : null;
  if (x) return myDetail(x);
  return '<h2 class="insp-title" id="insp-title" tabindex="-1">Моё</h2>'
    + `<p class="insp-note">${my.tab === 'history' ? 'Последние 30 подборов: что я поставил первым и что предложил ещё.' : 'Нажми на название, чтобы открыть подробности.'}</p>`
    + '<p class="insp-note">Всё это хранится только в этом браузере. В другом браузере или после очистки данных сайта списка не будет.</p>';
}

function redrawMy(fk) {
  renderSidebar();
  renderContent();
  renderInspector();
  if (fk && !focusFk(fk)) $('#q-title')?.focus({ preventScroll: true });
}

// The row after the one that is about to leave this tab, or the tab itself.
function nextInMy(t) {
  const row = t.closest('.my-row');
  const sibling = row?.nextElementSibling ?? row?.previousElementSibling;
  return sibling?.querySelector('[data-act="my-select"]')?.dataset.fk ?? `my-tab:${my.tab}`;
}

/* search box (titles of the current domain) */

function searchBox(kind, placeholder, label) {
  return `<div class="search" data-search="${kind}">${icon('search')}`
    + `<input class="input" type="search" id="search-${kind}" data-search-input="${kind}" placeholder="${esc(placeholder)}" autocomplete="off" spellcheck="false"`
    + ` role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="suggest-${kind}" aria-label="${esc(label)}" data-fk="search:${kind}">`
    + `<div class="suggest" id="suggest-${kind}" role="listbox" aria-label="Найдено" hidden></div></div>`;
}

/* action bar */

function renderActionbar() {
  attachActions();
  $$('[data-anchor-count]').forEach(el=>{el.textContent=anchorCount();});
  const s = screen;
  if (!s || view === 'my') { el.actionbar.innerHTML = ''; return; }
  const primary = (label, enabled) => `<button class="btn btn-primary btn-lg" type="button" data-act="primary" data-fk="primary"${enabled ? '' : ' disabled'}>${esc(label)}</button>`;
  const secondary = (label, act) => `<button class="btn btn-plain" type="button" data-act="${act}" data-fk="${act}">${esc(label)}</button>`;
  let left = '';
  let right = '';
  switch (s.step) {
    case 'time':
    case 'context':
    case 'company':
      left = secondary(s.step === 'context'?'Пропустить':s.step === 'time' ? 'Не знаю' : 'Не важно', 'skip');
      break;
    case 'anchors': {
      const n = marks.size;
      left = `<span class="status-text muted num" aria-live="polite">${n ? `Отмечено: ${n}` : 'Можно без отметок'}</span>`;
      right = primary('Дальше', true);
      break;
    }
    case 'why':
    case 'why_not':
      left = secondary('Не знаю', 'skip');
      right = primary('Дальше', true);
      break;
    case 'stops':
      left = secondary('Всё можно', 'skip');
      right = primary('Дальше', true);
      break;
    case 'ask':
      left = secondary('Всё равно', 'skip');
      break;
    default:
      el.actionbar.innerHTML = '';
      return;
  }
  el.actionbar.innerHTML = `${left}<span class="spacer"></span>${right}`;
}

/* inspector */

function howItWorks() {
  const situation=state?.situation??{};
  const context=[domainOf(state?.domain)?.plural,situation.time?labelOf(`time:${situation.time}`):'',situation.company?labelOf(`company:${situation.company}`):''].filter(Boolean).join(' · ');
  return '<h2 class="insp-title" id="insp-title" tabindex="-1">Собираем твой запрос</h2>'
    +(context?`<p class="context-response">${esc(context)}</p>`:'<p class="insp-note">Начни с того, что хочется выбрать. Ответы останутся рядом с вопросом.</p>')
    +`<div class="taste">${tasteHtml()}</div><p class="insp-note">Чтобы поправить предыдущий ответ, нажми «Назад». Знакомые истории помогают объяснить, что тебе нравится.</p>`;
}

function mini(c, trailing = '', cls = '') {
  return `<li class="mini ${cls}">${poster(c, { size: 'poster-sm' })}<div style="min-width:0"><div class="mini-title">${esc(nameOf(c))}</div>`
    + `<div class="mini-meta">${esc(c.year ?? '')}</div></div>${trailing}</li>`;
}

function renderInspector() {
  const s = screen;
  const situation=state?.situation??{};
  $('#legacy-context-caption').textContent=[domainOf(state?.domain)?.plural,situation.time?labelOf(`time:${situation.time}`):'',situation.company?labelOf(`company:${situation.company}`):''].filter(Boolean).join(' · ')||'Ответы и условия';
  if (view === 'my') { el.inspector.innerHTML = myInspector(); return; }
  if (!s) { el.inspector.innerHTML = ''; return; }
  let html = '';
  switch (s.step) {
    case 'anchors': {
      const list = [...marks].map(([id, m]) => ({ id, ...m }));
      const label = (r) => s.reactions.find((x) => x.value === r)?.label ?? r;
      html = `<h2 class="insp-title" id="insp-title" tabindex="-1">Отмечено <span class="quiet num">${list.length}</span></h2>`
        + (list.length
          ? `<ul class="mini-list">${list.map((m) => mini(m.card, `<span class="mini-tag">${esc(label(m.r))}</span><button class="icon-btn" type="button" data-act="unmark" data-id="${esc(m.id)}" data-fk="unmark:${esc(m.id)}" aria-label="Снять отметку: ${esc(nameOf(m.card))}">${icon('x')}</button>`)).join('')}</ul>`
          : '<p class="insp-note">Пока ничего. Отметь знакомое или найди своё через поиск.</p>')
        + '<p class="insp-note" style="margin-top:14px">Про два любимых спрошу, за что, про одно неудачное — что мешало. Остальное запишу как есть.</p>';
      break;
    }
    case 'why':
    case 'why_not': {
      const c = s.item;
      const rating = ratingOf(c);
      const genres = genresOf(c, state?.domain);
      // The poster is next to the question in the centre; here only the queue and the facts.
      const queue = (s.step === 'why' ? state.liked : state.disliked) ?? [];
      const facts = (genres.length ? `<dt>Жанр</dt><dd>${esc(genres.join(', '))}</dd>` : '')
        + (rating ? `<dt>${esc(rating[0])}</dt><dd>${esc(rating[1])}</dd>` : '');
      html = (queue.length > 1 ? `<section class="insp-block"><h2 class="insp-title" id="insp-title" tabindex="-1">Спрашиваю про</h2><ul class="mini-list">${queue.map((id, i) => {
        const t = titleOf(id) ?? { id, name: id };
        const st = i < state.whyIndex ? 'is-done' : i === state.whyIndex ? 'is-current' : '';
        return mini(t, i < state.whyIndex ? icon('check') : '', st);
      }).join('')}</ul></section>` : '')
        + (facts ? `<section class="insp-block"><h2 class="insp-title">${esc(nameOf(c))}</h2><dl class="dl">${facts}</dl></section>` : '');
      break;
    }
    case 'result':
      html='<h2 class="insp-title" id="insp-title" tabindex="-1">Собрали твой запрос</h2>'
        +(situation.note?`<p class="context-response">${esc(situation.note)}</p>`:'<p class="insp-note">Учитываю твои ответы и отмеченные причины.</p>')
        +`<details class="context-details"><summary>Вкус и условия</summary>${tasteHtml()}</details><p class="insp-note">Запрос можно уточнить под вариантами. Чтобы изменить предыдущий ответ, нажми «Назад».</p>`;
      break;
    default:
      html = howItWorks();
  }
  el.inspector.innerHTML = html;
}

function refreshPicks() {
  renderActionbar();
  renderInspector();
}

function refreshDetail() {
  const fk=document.activeElement?.dataset?.fk;
  if(view==='dialogue'&&screen?.step==='result')renderContent();
  renderInspector();
  if(fk)focusFk(fk);
}

// ---------- search ----------

const searches = {}; // kind → { results, active, seq, timer }

function suggestHtml(kind) {
  const st = searches[kind];
  if (st.loading) return '<div class="opt-empty">Ищу…</div>';
  if (st.error) return `<div class="opt-empty">Поиск не ответил: ${esc(st.error)}</div>`;
  if (!st.results.length) return '<div class="opt-empty">Нет в каталоге</div>';
  return st.results.map((c, i) => `<button class="opt" type="button" role="option" tabindex="-1" id="opt-${kind}-${i}" data-act="opt" data-kind="${kind}" data-i="${i}" aria-selected="${i === st.active}">`
    + poster(c, { size: 'poster-sm', lazy: false })
    + `<span><span class="opt-title">${esc(nameOf(c))}</span><span class="opt-meta">${esc(cardMeta(c))}</span></span></button>`).join('');
}

function showSuggest(kind) {
  const box = $(`#suggest-${kind}`);
  const input = $(`#search-${kind}`);
  if (!box || !input) return;
  const st = searches[kind];
  box.innerHTML = suggestHtml(kind);
  box.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  if (st.active >= 0) input.setAttribute('aria-activedescendant', `opt-${kind}-${st.active}`);
  else input.removeAttribute('aria-activedescendant');
  $(`#opt-${kind}-${st.active}`)?.scrollIntoView({ block: 'nearest' });
}

function hideSuggest(kind) {
  const box = $(`#suggest-${kind}`);
  if (box) box.hidden = true;
  const input = $(`#search-${kind}`);
  input?.setAttribute('aria-expanded', 'false');
  input?.removeAttribute('aria-activedescendant');
}

function onSearchInput(input) {
  const kind = input.dataset.searchInput;
  const st = (searches[kind] ??= { results: [], active: -1, seq: 0, timer: 0 });
  clearTimeout(st.timer);
  const q = input.value.trim();
  if (q.length < 2) { st.results = []; hideSuggest(kind); return; }
  st.timer = setTimeout(async () => {
    const seq = ++st.seq;
    st.loading = true;
    st.error = null;
    showSuggest(kind);
    try {
      const found = await client.search(q);
      if (seq !== st.seq) return;
      found.forEach(rememberCard);
      st.results = found.slice(0, 8);
      st.active = st.results.length ? 0 : -1;
    } catch (err) {
      if (seq !== st.seq) return;
      st.error = err.message;
      st.results = [];
    }
    st.loading = false;
    showSuggest(kind);
  }, 200);
}

function chooseFound(kind, i) {
  const st = searches[kind];
  const c = st?.results[i];
  if (!c) return;
  const input = $(`#search-${kind}`);
  input.value = '';
  st.results = [];
  hideSuggest(kind);
  if (kind === 'why') return explainWhyNot(c);
  if (screen.step !== 'anchors') return;
  found = new Map([[c.id, c], ...[...found].filter(([id]) => id !== c.id)]);
  if (!$(`.acard[data-id="${CSS.escape(c.id)}"]`)) $('#pgrid')?.insertAdjacentHTML('afterbegin', anchorCard(c));
  announce(`Нашёл: ${nameOf(c)}. Отметь, как тебе.`);
  focusFk(marks.has(c.id) ? `react:${c.id}:${marks.get(c.id).r}` : `react:${c.id}:love`);
}

async function explainWhyNot(card) {
  ui.whyOut = { card, loading: true };
  const box = () => $('#whynot-out');
  if (box()) box().innerHTML = whyOutHtml();
  try {
    ui.whyOut = { card, w: await client.whyNot(card.id) };
  } catch (err) {
    ui.whyOut = { card, error: err.message };
  }
  if (box()) box().innerHTML = whyOutHtml();
}

// ---------- free text ----------

let intentRequest = 0;
function currentIntentDraft() {
  const draft = ui.intentDraft ?? state?.situation?.intent;
  return draft?.sourceText === state?.situation?.note ? draft : null;
}
function intentControls() {
  const draft = currentIntentDraft();
  let html = `<button class="btn btn-secondary" type="button" data-act="parse-intent" data-fk="parse-intent"${!state?.situation?.note || ui.intentLoading ? ' disabled' : ''}>${ui.intentLoading ? 'Разбираю пожелание…' : 'Понять пожелание'}</button>`;
  if (ui.intentError) html += `<p class="q-hint">${esc(ui.intentError)}. Твои слова сохранены, можно продолжить.</p>`;
  if (ui.intentClarification) html += `<p class="q-hint">${esc(ui.intentClarification)} Допиши ответ в пожелание выше.</p>`;
  if (!draft) return html;
  const signals = [...draft.wants.map((x) => ({ ...x, kind: 'wants', title: `Хочется: ${labelOf(x.f)}` })), ...draft.avoids.map((x) => ({ ...x, kind: 'avoids', title: `Меньше: ${labelOf(x.f)}` }))];
  if (draft.time) signals.push({ ...draft.time, kind: 'time', f: 'minutes', title: `На сегодня есть ${draft.time.minutes} мин` });
  if (!signals.length) return html + `<p class="q-hint">${draft.source === 'confirmed' ? 'Ничего из разбора не применено. Твои слова сохранены.' : 'Пока не стал угадывать. Уточни желаемое впечатление или продолжи со своими словами.'}</p>`;
  const confirmed = draft.source === 'confirmed';
  html += `<div class="intent-review"><p class="group-title">${confirmed ? 'Учту в этом подборе' : 'Так понял тебя — убери лишнее'}</p>`;
  html += signals.map((x) => `<label class="intent-check"><input type="checkbox" data-intent-kind="${x.kind}" data-intent-f="${esc(x.f)}" checked><span>${esc(x.title)}<small>Из слов: «${esc(x.evidence)}»</small></span></label>`).join('');
  return html + `<p class="hint">Желания действуют только сегодня. Исходные слова тоже сохранятся.</p><button type="button" class="btn btn-secondary" data-act="confirm-intent">${confirmed ? 'Сохранить изменения' : 'Да, учти это'}</button></div>`;
}
function refreshIntent() {
  const box = $('#intent-controls');
  if (box) box.innerHTML = intentControls();
}
async function parseIntent() {
  if (!state?.situation?.note || ui.intentLoading) return;
  const ownerFocus = document.activeElement?.dataset?.fk || 'parse-intent';
  const token = ++intentRequest, text = state.situation.note, domain = state.domain, seed = state.seed;
  ui.intentLoading = true; ui.intentError = null; ui.intentDraft = null; ui.intentClarification = null;
  refreshIntent();
  setIntentThinking(token);
  try {
    const out = await client.aiIntent();
    if (token !== intentRequest || screen.step !== 'anchors' || state.domain !== domain || state.seed !== seed || state.situation.note !== text) return;
    if (out.error) ui.intentError = out.error;
    else { ui.intentDraft = out.proposal; ui.intentClarification = out.clarification; }
  } catch (err) {
    if (token === intentRequest && screen.step === 'anchors') ui.intentError = err.message;
  } finally {
    const sameQuestion = token === intentRequest && view === 'dialogue' && screen.step === 'anchors' && state.domain === domain && state.seed === seed && state.situation.note === text;
    const restoreIntentFocus = sameQuestion && intentThinkingOwner === token && el.thinking.contains(document.activeElement);
    if (intentThinkingOwner === token) setIntentThinking(null, {restoreScroll:restoreIntentFocus});
    if (token === intentRequest && screen.step === 'anchors') { ui.intentLoading = false; refreshIntent(); }
    if (restoreIntentFocus) focusFk(ownerFocus);
  }
}
async function confirmIntent(trigger) {
  const draft = currentIntentDraft();
  if (!draft) return;
  const checked = new Set($$('[data-intent-kind]:checked').map((x) => `${x.dataset.intentKind}:${x.dataset.intentF}`));
  const intent = { ...draft,
    wants: draft.wants.filter((x) => checked.has(`wants:${x.f}`)), avoids: draft.avoids.filter((x) => checked.has(`avoids:${x.f}`)),
    time: checked.has('time:minutes') ? draft.time : null,
  };
  ui.intentDraft = null;
  await run(() => client.confirmIntent(intent), trigger);
}

async function parseFree() {
  const text = ui.parseText.trim();
  if (!text) { $('#free')?.focus(); return; }
  ui.parsed = { loading: true };
  $('#parsed').innerHTML = parsedHtml();
  try {
    const out = await client.parse(text);
    rememberLabels([...out.positive, ...out.negative]);
    ui.parsed = out;
  } catch (err) {
    ui.parsed = { error: err.message };
  }
  const box = $('#parsed');
  if (box) box.innerHTML = parsedHtml();
}

function addParsed(t) {
  const f = t.dataset.v;
  const label = t.dataset.l;
  const hard = t.dataset.hard === '1';
  const s = screen;
  if (t.dataset.as === 'reason') {
    if (!s.options.some((o) => o.value === f) && !ui.extra.some((o) => o.value === f)) ui.extra.push({ value: f, label });
    ui.sel.add(f);
  } else if (s.step === 'why') {
    if (!ui.extraIssues.some((o) => o.value === f)) ui.extraIssues.push({ value: f, label });
    ui.issues.set(f, hard ? 'hard' : 'soft');
  } else {
    const known = [...s.options, ...(s.categories ?? []), ...ui.extra].some((o) => o.value === f);
    if (!known) ui.extra.push({ value: f, label });
    ui.issues.set(f, hard ? 'hard' : 'soft');
  }
  const next = t.nextElementSibling?.dataset.fk ?? t.previousElementSibling?.dataset.fk ?? 'free';
  $('#qbody').innerHTML = s.step === 'why' ? whyBody(s) : whyNotBody(s);
  focusFk(next);
  announce(`Добавлено: ${label}`);
  renderActionbar();
}

// ---------- drawer (sidebar on phones) ----------

function openDrawer() {
  el.sidebar.classList.add('is-open');
  el.scrim.hidden = false;
  el.menu.setAttribute('aria-expanded', 'true');
  el.sidebar.setAttribute('role', 'dialog');
  el.sidebar.setAttribute('aria-modal', 'true');
  document.body.classList.add('legacy-drawer-open');
  el.main.inert = true; el.inspector.inert = true; el.header.inert = true;
  $('#sidebar-close').focus();
}
function closeDrawer(returnFocus = true) {
  if (!el.sidebar.classList.contains('is-open')) return;
  el.sidebar.classList.remove('is-open');
  el.scrim.hidden = true;
  el.menu.setAttribute('aria-expanded', 'false');
  el.sidebar.removeAttribute('role');
  el.sidebar.removeAttribute('aria-modal');
  document.body.classList.remove('legacy-drawer-open');
  el.main.inert = false; el.inspector.inert = false; el.header.inert = false;
  if (returnFocus) el.menu.focus();
}

// ---------- events ----------

function primaryAction(trigger) {
  const s = screen;
  const issues = () => [...ui.issues].map(([f, st]) => ({ f, hard: st === 'hard' }));
  switch (s.step) {
    case 'anchors': return go(reactAction(s), trigger);
    case 'why': return go({ type: 'reasons', values: [...ui.sel], issues: issues(), text: ui.parseText.trim() }, trigger);
    case 'why_not': return go({ type: 'issues', issues: issues(), badQuality: ui.bad, tried: ui.tried, text: ui.parseText.trim() }, trigger);
    case 'stops': return go({ type: 'stops', values: [...ui.sel] }, trigger);
  }
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]');
  if (!t || t.disabled || busy) return;
  const act = t.dataset.act;
  const s = screen;
  switch (act) {
    case 'evening-fit': return updateEvening(t,{type:'fit',value:t.dataset.v});
    case 'evening-choose': return updateEvening(t,{type:'choose',value:t.dataset.v==='on'});
    case 'evening-start': return updateEvening(t,{type:'start',value:t.dataset.v==='on'});
    case 'evening-outcome': return updateEvening(t,{type:'outcome',value:t.dataset.v});
    case 'parse-intent': return parseIntent();
    case 'confirm-intent': return confirmIntent(t);
    case 'menu': return openDrawer();
    case 'menu-close': return closeDrawer();
    case 'back':
      if (view === 'my') return leaveMy();
      return run(() => client.back(), t);
    case 'restart': return restartAll();
    case 'hard-restart': error = null; return run(() => client.restart(), t);
    case 'retry': return lastRun?.();
    case 'side-domain':
      if (view === 'my') leaveMy();
      return switchDomain(t.dataset.v);
    case 'steps':
      stepsOpen = !stepsOpen;
      try { localStorage.setItem(STEPS_KEY, stepsOpen ? 'open' : 'closed'); } catch { /* remembered for this visit only */ }
      renderSidebar();
      focusFk('steps');
      return;
    case 'my': return openMy();
    case 'my-pick': return view === 'my' ? leaveMy() : closeDrawer(false);
    case 'my-tab':
      Object.assign(my, { tab: t.dataset.v, selected: null, undo: null });
      return redrawMy(`my-tab:${t.dataset.v}`);
    case 'my-select':
      my.selected = my.selected === t.dataset.id ? null : t.dataset.id;
      return redrawMy(t.dataset.fk);
    case 'my-liked':
    case 'my-disliked': {
      const x = savedItem(t.dataset.id);
      if (!x) return;
      const next = nextInMy(t);
      const status = act === 'my-liked' ? 'liked' : 'disliked';
      saveTitle(x, status);
      if (my.selected === x.id) my.selected = null;
      my.undo = null;
      redrawMy(next);
      announce(`«${x.title}»: ${status === 'liked' ? 'зашло' : 'не зашло'}.`);
      return;
    }
    case 'my-remove': {
      const index = library.items.findIndex((x) => x.id === t.dataset.id);
      if (index < 0) return;
      const next = nextInMy(t);
      const [item] = library.items.splice(index, 1);
      saveLibrary();
      if (my.selected === item.id) my.selected = null;
      my.undo = { item, index };
      return redrawMy(next);
    }
    case 'my-undo': {
      const { item, index } = my.undo ?? {};
      if (!item) return;
      if (!savedItem(item.id)) library.items.splice(Math.min(index, library.items.length), 0, item);
      saveLibrary();
      my.undo = null;
      return redrawMy(`my-select:${item.id}`);
    }
    case 'domain':
      if (t.dataset.v === 'game') { location.href = '/pick/game/'; return; }
      if(['film','series','cartoon'].includes(t.dataset.v)&&new URLSearchParams(location.search).get('legacy')!=='1'){location.href=`/pick/watch/?domain=${t.dataset.v}`;return;}
      return go({ type: 'choose', value: t.dataset.v }, null);
    case 'platform':
    case 'choice': return go({ type: 'choose', value: t.dataset.v }, null);
    case 'answer': return go({ type: 'answer', qid: s.qid, value: t.dataset.v }, null);
    case 'primary': return primaryAction(t);
    case 'skip': return go({ type: 'skip' }, t);
    case 'more': return go({ type: 'more', ids: s.items.map((x) => x.id),note:ui.note }, t);
    case 'sel': {
      const v = t.dataset.v;
      if (ui.sel.has(v)) ui.sel.delete(v); else ui.sel.add(v);
      if (s.step === 'why') { // the pair above shows the same choice
        $('#qbody').innerHTML = whyBody(s);
        focusFk(t.dataset.fk);
      } else t.setAttribute('aria-pressed', String(ui.sel.has(v)));
      return renderActionbar();
    }
    case 'pair': {
      const [a, b] = s.pair.map((x) => x.value);
      const list = t.dataset.v === 'both' ? [a, b] : [t.dataset.v];
      // The pair switches only its own features: reasons picked under «Ещё причины» are kept.
      const extras = [...ui.sel].filter((f) => f !== a && f !== b);
      ui.sel = new Set([...extras, ...(sameSet(pairPart(s), list) ? [] : list)]);
      $('#qbody').innerHTML = whyBody(s);
      focusFk(t.dataset.fk);
      return renderActionbar();
    }
    case 'c-toggle': { // off → «мешало» → «никогда» → off
      const v = t.dataset.v;
      const next = NEXT_STATE[ui.issues.get(v) ?? 'off'];
      if (next === 'off') ui.issues.delete(v); else ui.issues.set(v, next);
      return refreshComplaints(t, t.dataset.fk);
    }
    case 'tried':
    case 'bad':
      ui[act] = !ui[act];
      t.setAttribute('aria-checked', String(ui[act]));
      return renderActionbar();
    case 'add': return addParsed(t);
    case 'react': { // a second tap on the same reaction takes the mark back
      const id = t.dataset.id;
      const c = s.items.find((x) => x.id === id) ?? found.get(id) ?? marks.get(id)?.card ?? titleOf(id) ?? { id, name: id };
      if (marks.get(id)?.r === t.dataset.r) marks.delete(id);
      else marks.set(id, { card: c, r: t.dataset.r });
      saveAnchorDraft();
      t.closest('.acard').outerHTML = anchorCard(c);
      focusFk(t.dataset.fk);
      return refreshPicks();
    }
    case 'unmark': {
      const id = t.dataset.id;
      const sibling = t.closest('li')?.nextElementSibling ?? t.closest('li')?.previousElementSibling;
      const next = sibling?.querySelector('[data-act="unmark"]')?.dataset.fk;
      const c = marks.get(id)?.card;
      marks.delete(id);
      saveAnchorDraft();
      const cardEl = $(`.acard[data-id="${CSS.escape(id)}"]`);
      if (cardEl && c) cardEl.outerHTML = anchorCard(c);
      refreshPicks();
      if (!focusFk(next)) $('#insp-title')?.focus();
      return;
    }
    case 'opt': return chooseFound(t.dataset.kind, Number(t.dataset.i));
    case 'remove': {
      const row = t.closest('.row');
      const sibling = row?.nextElementSibling ?? row?.previousElementSibling;
      pendingFocus = sibling?.querySelector('[data-act="remove"]')?.dataset.fk ?? null;
      ui.seen = null; // the whole pick is recomputed, the note would sit over another card
      return go({ type: 'remove', kind: t.dataset.kind, f: t.dataset.v }, t);
    }
    case 'show-alternatives': {
      const heading = $('#result-alternatives');
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: 'start' });
      return;
    }
    case 'focus': {
      ui.focusId = t.dataset.id;
      $$('[data-act="focus"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === ui.focusId)));
      refreshDetail();
      if (narrow.matches) $('#detail-inline')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    case 'take': {
      const id = t.dataset.id;
      const p = resultPick(id);
      if (!p) return;
      planStore.save(p,{lane:'want',domain:state.domain});
      library=loadLibrary();
      client.log('take', { id, step: 'result' });
      renderSidebar();
      renderContent();
      renderInspector();
      focusFk(`take:${id}`);
      announce(`«${nameOf(p)}» сохранено на потом в библиотеке.`);
      return;
    }
    // «Уже смотрел»: one tap removes the card, its place gets the note with «как тебе?» and «Вернуть».
    case 'seen': {
      const p = resultPick(t.dataset.id);
      if (!p || busy) return;
      const r = screen.result;
      const seen = { card: p, slot: [r.top, ...r.alternatives].findIndex((x) => x.id === p.id), reaction: null, before: r };
      pendingFocus = 'seen-rate:like';
      return keepAndGo({ type: 'played', id: p.id }, t, { seen }).then((ok) => ok && announce(`Убрал «${nameOf(p)}».`));
    }
    case 'seen-rate': {
      const x = ui.seen;
      if (!x || busy) return;
      const reaction = t.dataset.r;
      const r = screen.result;
      pendingFocus = `focus:${([r.top, ...r.alternatives][x.slot] ?? r.top)?.id}`; // the card under the note
      return keepAndGo({ type: 'rate_played', id: x.card.id, reaction }, t, { seen: { ...x, reaction } }).then((ok) => {
        if (!ok) return;
        saveTitle(x.card, reaction === 'like' ? 'liked' : 'disliked');
        renderSidebar();
        announce(`Запомнил: «${nameOf(x.card)}» ${reaction === 'like' ? 'понравилось' : 'не зашло'}.`);
      });
    }
    case 'unseen': {
      const x = ui.seen;
      if (!x || busy) return;
      pendingFocus = `focus:${x.card.id}`;
      // The card comes back to its place: the screen before the removal is what stays.
      return keepAndGo({ type: 'unplayed', id: x.card.id }, t, { seen: null, shown: x.before })
        .then((ok) => ok && announce(`«${nameOf(x.card)}» снова в подборе.`));
    }
    case 'not-now':
      if (busy) return;
      return keepAndGo({ type: 'not_now', id: t.dataset.id }, t);
    case 'ai-off':
      ui.seen = null; // the note and its «Вернуть» belong to the picks that were on the screen
      ai.off = true;
      if (ai.engine) screen.result = ai.engine;
      syncFocus(screen.result);
      client.log('ai-off', { step: 'result' });
      pendingFocus = 'ai-on';
      return render(false);
    case 'ai-on':
      ui.seen = null;
      ai.off = false;
      applyAi(screen, state);
      syncFocus(screen.result);
      return render(false);
    case 'ai-retry':
      ui.seen = null;
      ai.runs.delete(ai.key);
      applyAi(screen, state);
      return render(false);
  }
});

// «Не то? Скажи словами»: the model picks again with the wish; what it showed goes along as «не устроило».
function askAgain(wish) {
  const text = wish.replace(/\s+/g, ' ').trim();
  if (!text || !aiOn() || screen?.step !== 'result') return;
  const shown = screen.result?.top ? [screen.result.top, ...screen.result.alternatives].map((p) => p.id) : [];
  ai.wish = text;
  resultView.remember(resultWishKey(),text);
  ai.key = aiKeyOf(state, ai.wish);
  ui.seen = null;
  if (!ai.runs.has(ai.key)) startAi(ai.key, shown);
  else if (ai.runs.get(ai.key).result) screen.result = fillPicks(ai.runs.get(ai.key).result, ai.engine, removedIds(state), playedIds(state));
  client.log('ai-wish', { length: text.length });
  render(false);
  $('#q-title')?.focus({ preventScroll: true });
}

el.scrim.addEventListener('click', () => closeDrawer());

// Disclosures redrawn with the screen remember whether the person opened them (toggle does not bubble).
document.addEventListener('toggle', (e) => {
  if(e.target.matches('[data-feedback-details]'))feedbackOpen.set(`${e.target.dataset.run}:${e.target.dataset.id}`,e.target.open);
  if(e.target.matches('[data-evening-history]'))eveningOpen.set(e.target.dataset.eveningHistory,e.target.open);
  if (e.target.id === 'evening-details') ui.noteOpen = e.target.open;
  if (e.target.id === 'more-chips') ui.more = e.target.open;
  if (e.target.id === 'profile') ui.profileOpen = e.target.open;
}, true);

// Keep the search input focused while clicking a suggestion.
document.addEventListener('mousedown', (e) => {
  if (e.target.closest('.opt')) e.preventDefault();
});

document.addEventListener('input', (e) => {
  const t = e.target;
  const feedbackForm=t.closest('[data-form="evening-reason"]');
  if(feedbackForm)feedbackDrafts.set(`${feedbackForm.dataset.run}:${feedbackForm.dataset.id}`,{reason:feedbackForm.elements.reason.value,note:feedbackForm.elements.note.value});
  if (t.matches('[data-search-input]')) onSearchInput(t);
  else if(t.id==='ai-wish')resultView.remember(t.dataset.resultKey,t.value);
  else if (t.id === 'free') ui.parseText = t.value;
  else if (t.id==='evening-note'){
    ui.note=t.value; client.updateNote(t.value);
    intentRequest++; ui.intentLoading=false; ui.intentDraft=null; ui.intentError=null; ui.intentClarification=null;
    refreshIntent();
  }
});

document.addEventListener('submit', (e) => {
  if(e.target.matches('[data-form="evening-reason"]')) {
    e.preventDefault();const form=e.target;
    updateEvening({dataset:{run:form.dataset.run,id:form.dataset.id,fk:`evening-reason:${form.dataset.run}:${form.dataset.id}`}},{type:'explain',reason:form.elements.reason.value||null,note:form.elements.note.value});
  } else if (e.target.matches('[data-form="parse"]')) {
    e.preventDefault();
    parseFree();
  } else if (e.target.matches('[data-form="ai-wish"]')) {
    e.preventDefault();
    askAgain(e.target.elements.wish.value);
  }
});

document.addEventListener('focusout', (e) => {
  const box = e.target.closest?.('.search');
  if (box && !box.contains(e.relatedTarget)) hideSuggest(box.dataset.search);
});

document.addEventListener('keydown', (e) => {
  const t = e.target;
  if (e.key === 'Tab' && el.sidebar.classList.contains('is-open')) {
    const items = $$('button:not(:disabled), a[href], [tabindex="0"]', el.sidebar).filter(x => x.offsetParent !== null);
    const first = items[0], last = items.at(-1);
    if (e.shiftKey && (t === first || !el.sidebar.contains(t))) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && (t === last || !el.sidebar.contains(t))) { e.preventDefault(); first?.focus(); }
    return;
  }
  if (e.key === 'Escape') {
    if (t.matches?.('[data-search-input]')) {
      const kind = t.dataset.searchInput;
      if (!$(`#suggest-${kind}`)?.hidden) { hideSuggest(kind); e.preventDefault(); return; }
    }
    if (el.sidebar.classList.contains('is-open')) { closeDrawer(); e.preventDefault(); }
    return;
  }
  if (t.matches?.('[data-search-input]')) {
    const kind = t.dataset.searchInput;
    const st = searches[kind];
    const open = st && !$(`#suggest-${kind}`)?.hidden && st.results.length;
    if (open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      st.active = (st.active + (e.key === 'ArrowDown' ? 1 : -1) + st.results.length) % st.results.length;
      showSuggest(kind);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (open) chooseFound(kind, Math.max(0, st.active));
      return;
    }
  }
  if (e.key !== 'Enter' || e.isComposing || e.defaultPrevented || busy || intentThinkingOwner !== null) return;
  if (el.confirm.open) return;
  const mod = e.metaKey || e.ctrlKey;
  if (!mod && t.closest?.('button, a, input, textarea, select, summary, [contenteditable="true"]')) return;
  const p = $('#actionbar [data-act="primary"]');
  if (p && !p.disabled) {
    e.preventDefault();
    p.click();
  }
});

// Leaving the phone layout with the drawer open should not leave the scrim behind.
window.matchMedia('(max-width: 760px)').addEventListener('change', (m) => { if (!m.matches) closeDrawer(false); });
narrow.addEventListener('change', () => {
  $('#legacy-context').open = !narrow.matches;
  if (view === 'dialogue' && screen?.step === 'result') refreshDetail();
});
window.addEventListener('hashchange', syncView);
window.addEventListener('online',()=>{void feedback.flush();});
window.addEventListener('focus',()=>{void feedback.flush();});
// «Моё» changed in another tab of this site.
window.addEventListener('storage', async (e) => {
  if(e.key===FEEDBACK_KEY){await feedback.refresh();if(view==='my')redrawMy();else if(screen?.step==='result')refreshDetail();return;}
  if (e.key !== LIB_KEY) return;
  library = loadLibrary();
  renderSidebar();
  if (view === 'my') { renderContent(); renderInspector(); }
});

// ---------- start ----------

const entryRoute=pickerEntryRoute(location);
if(entryRoute){location.replace(entryRoute);}else{
$('#legacy-context').open = !narrow.matches;
renderSidebar();
renderContent();
void feedback.flush();
try {
  const res = await fetch('/api/meta');
  if (res.ok) counts = (await res.json()).domains;
} catch { /* counts are optional */ }
try {
  ai.status = await client.aiStatus();
} catch { /* without the AI the engine's picks are shown */ }

// The landing links to /pick/?start=<domain>: a fresh dialogue that opens on that domain.
const startDomain = domainOf(new URLSearchParams(location.search).get('start'))?.id;
if (startDomain === 'game') {
  location.replace('/pick/game/');
} else if (startDomain) {
  const url = new URL(location.href);
  url.searchParams.delete('start');
  history.replaceState(null, '', url.pathname + url.search);
  view = 'dialogue';
  quiet = true;
  await run(async () => {
    await client.start();
    if (!failed) await client.restart();
    if (!failed) await client.send({ type: 'choose', value: startDomain });
  });
  quiet = false;
  render(true);
  if (error) $('#error-banner')?.focus();
} else {
  await run(() => client.start());
}

}

} // ordinary legacy bootstrap; QA is redirected before any owner store is opened
