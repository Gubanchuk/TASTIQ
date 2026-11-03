// The landing illustrates the catalog and routes every choice to its real picker.
const DATA_URL = '/data/example-evenings.json';
const number = new Intl.NumberFormat('ru-RU');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

const DOMAINS = {
  game: ['игра', 'игры', 'игр'],
  film: ['фильм', 'фильма', 'фильмов'],
  series: ['сериал', 'сериала', 'сериалов'],
  cartoon: ['мультфильм', 'мультфильма', 'мультфильмов'],
};

// These are existing example records, chosen for a varied three-cover composition.
const COVER_IDS = {
  game: ['steam:374320', 'steam:413150', 'steam:1091500'],
  film: ['tt0120737', 'tt0266697', 'tt0088763'],
  series: ['tt0903747', 'tt10986410', 'tt4574334'],
  cartoon: ['tt0910970', 'tt4633694', 'tt0126029'],
};

const hrefFor = domain => domain === 'game'
  ? '/pick/game/'
  : `/pick/watch/?domain=${encodeURIComponent(domain)}`;

function plural(value, forms) {
  const lastTwo = Math.abs(value) % 100;
  const last = lastTwo % 10;
  if (last === 1 && lastTwo !== 11) return forms[0];
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return forms[1];
  return forms[2];
}

function safeImageUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function sourcesOf(card) {
  // TVmaze supplies a portrait where Wikipedia often supplies a landscape logo.
  const values = /medium_portrait/.test(card.image ?? '')
    ? [card.image, card.poster]
    : [card.poster, card.image];
  return [...new Set(values.map(safeImageUrl).filter(Boolean))];
}

function toneOf(key) {
  let hash = 0;
  for (const character of String(key)) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return (Math.abs(hash) % 4) + 1;
}

function poster(card, className = '', eager = false) {
  const title = card.ru || card.name || card.title || 'Название';
  const [source, ...remaining] = sourcesOf(card);
  const initial = [...title.replace(/^[^\p{L}\p{N}]+/u, '')][0] ?? '';
  return `<span class="ph ${className}" data-tone="${toneOf(card.id ?? title)}">`
    + `<span class="typo" aria-hidden="true"><span class="typo-title">${escapeHtml(title)}</span>`
    + `<span class="typo-foot">${escapeHtml(card.year ?? '')}</span>`
    + `<span class="typo-initial">${escapeHtml(initial)}</span></span>`
    + (source ? `<img src="${escapeHtml(source)}" data-next="${escapeHtml(JSON.stringify(remaining))}" alt="" loading="${eager ? 'eager' : 'lazy'}" decoding="async" referrerpolicy="no-referrer">` : '')
    + '</span>';
}

function nextSource(image) {
  let remaining = [];
  try {
    const value = JSON.parse(image.dataset.next || '[]');
    if (Array.isArray(value)) remaining = value.map(safeImageUrl).filter(Boolean);
  } catch { /* The title tile remains visible if the source list is malformed. */ }
  if (!remaining.length) {
    image.remove();
    return;
  }
  image.dataset.next = JSON.stringify(remaining.slice(1));
  image.src = remaining[0];
}

// Capture listeners also cover cached and dynamically inserted poster images.
document.addEventListener('load', event => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || !image.closest('.ph')) return;
  if (image.naturalWidth > image.naturalHeight * 1.05) {
    nextSource(image);
    return;
  }
  image.classList.add('is-loaded');
  image.closest('.ph').classList.add('is-img');
}, true);

document.addEventListener('error', event => {
  const image = event.target;
  if (image instanceof HTMLImageElement && image.closest('.ph')) nextSource(image);
}, true);

function coversFor(cards, domain) {
  const unique = new Map();
  for (const card of Array.isArray(cards) ? cards : []) {
    if (!card || typeof card !== 'object') continue;
    const key = card.id || card.ru || card.name;
    if (key && !unique.has(key)) unique.set(key, card);
  }
  const selected = [];
  for (const id of COVER_IDS[domain]) {
    if (unique.has(id)) {
      selected.push(unique.get(id));
      unique.delete(id);
    }
  }
  return [...selected, ...unique.values()].slice(0, 3);
}

function wall(cards) {
  return cards.map(card => poster(card, 'door-cover', true)).join('');
}

function setUpDoors(data) {
  for (const door of document.querySelectorAll('.door[data-domain]')) {
    const domain = door.dataset.domain;
    if (!Object.hasOwn(DOMAINS, domain)) continue;
    door.href = hrefFor(domain);
    const count = data?.catalog?.domains?.[domain]?.items;
    const countElement = door.querySelector('.door-count');
    if (countElement && Number.isInteger(count) && count >= 0) {
      countElement.textContent = `${number.format(count)} ${plural(count, DOMAINS[domain])}`;
    }
    const covers = coversFor(data?.posters?.[domain], domain);
    const artwork = door.querySelector('.wall');
    if (artwork && covers.length) artwork.innerHTML = wall(covers);
  }
}

let data = null;
try {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  data = await response.json();
} catch (error) {
  console.warn('Catalog examples are unavailable; picker links remain usable.', error.message);
}
setUpDoors(data);