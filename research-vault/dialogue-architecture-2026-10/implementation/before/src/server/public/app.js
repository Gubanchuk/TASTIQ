// TASTIQ landing «Четыре двери». Every title, quote and count on the page comes from
// /data/example-evenings.json (real engine output on the real catalog); nothing is written by hand.
const APP_URL = '/pick/';
const DATA_URL = '/data/example-evenings.json';
const LIBRARY_KEY = 'tastiq.site.library';

const $ = (sel, root = document) => root.querySelector(sel);
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

const ICONS = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  minus: '<circle cx="12" cy="12" r="8.5"/><path d="M8 12h8"/>',
  ban: '<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/>',
  alert: '<path d="M10.3 3.9 2.4 17.5a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4Z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  bubble: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  thumbUp: '<path d="M7 10v11"/><path d="M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.6l-2.3 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.8a2 2 0 0 0 1.8-1.1L12 2a3.1 3.1 0 0 1 3 3.9Z"/>',
  thumbDown: '<path d="M17 14V3"/><path d="M9 18.1 10 14H4.2a2 2 0 0 1-1.9-2.6l2.3-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.8a2 2 0 0 0-1.8 1.1L12 22a3.1 3.1 0 0 1-3-3.9Z"/>',
};
const icon = (name) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] ?? ''}</svg>`;

const DOMAINS = {
  game: ['игра', 'игры', 'игр'],
  film: ['фильм', 'фильма', 'фильмов'],
  series: ['сериал', 'сериала', 'сериалов'],
  cartoon: ['мультфильм', 'мультфильма', 'мультфильмов'],
};
const GENRE_RU = {
  Action: 'экшен', Adventure: 'приключения', Casual: 'казуальная', Indie: 'инди', RPG: 'RPG', Simulation: 'симулятор',
  Strategy: 'стратегия', Racing: 'гонки', Sports: 'спорт', 'Massively Multiplayer': 'MMO', 'Free to Play': 'бесплатная',
};
const LEVEL = { strong: 3, likely: 2, try: 1 };
const STEP_LABEL = { platform: 'Платформа', company: 'С кем', liked: 'Что зашло', disliked: 'Что не зашло', ask: 'Уточнил' };

const hrefFor = (domain) => `${APP_URL}?start=${encodeURIComponent(domain)}`;
const nameOf = (c) => c?.ru ?? c?.name ?? '';
const looksEnglish = (q) => /^[\x20-\x7E‘-‟–—…]+$/.test(q ?? '');

// ---------- header: «Моё» count and «Подобрать» ----------

function showLibraryCount() {
  const link = $('#my-link');
  const badge = $('#my-count');
  let n = 0;
  try {
    const items = JSON.parse(localStorage.getItem(LIBRARY_KEY))?.items;
    n = Array.isArray(items) ? items.length : 0;
  } catch { /* storage blocked or malformed: show no count */ }
  badge.hidden = n === 0;
  badge.textContent = n ? nf.format(n) : '';
  if (n) link.setAttribute('aria-label', `Моё: ${nf.format(n)}`);
  else link.removeAttribute('aria-label');
}

// «Подобрать» is a plain link to the picker (/pick/): scrolling to the doors already in view looked like nothing happened.

// ---------- posters: poster → image → typographic tile ----------

const toneOf = (key) => {
  let h = 0;
  for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return (Math.abs(h) % 4) + 1;
};
// TVmaze «medium_portrait» is a real poster; the Wikipedia image of a series is often a logo or title card.
const sourcesOf = (c) => [...new Set((/medium_portrait/.test(c.image ?? '') ? [c.image, c.poster] : [c.poster, c.image]).filter(Boolean))];

function poster(c, cls = '') {
  const title = nameOf(c);
  const [src, ...rest] = sourcesOf(c);
  const initial = [...title.replace(/^[^\p{L}\p{N}]+/u, '')][0] ?? '';
  return `<span class="ph ${cls}" data-tone="${toneOf(c.id ?? title)}">`
    + `<span class="typo" aria-hidden="true"><span class="typo-title">${esc(title)}</span>`
    + `<span class="typo-foot">${esc(c.year ?? '')}</span><span class="typo-initial">${esc(initial)}</span></span>`
    + (src ? `<img src="${esc(src)}" data-next="${esc(JSON.stringify(rest))}" alt="" loading="lazy" decoding="async">` : '')
    + '</span>';
}

function nextSource(img) {
  let rest = [];
  try { rest = JSON.parse(img.dataset.next || '[]'); } catch { /* treat as none */ }
  if (!rest.length) { img.remove(); return; }
  img.dataset.next = JSON.stringify(rest.slice(1));
  img.src = rest[0];
}

// load / error do not bubble: listen in the capture phase for every poster on the page.
document.addEventListener('load', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.closest('.ph')) return;
  // A landscape picture cropped into a 2:3 frame shows a random slice: try the next source instead.
  if (img.naturalWidth > img.naturalHeight * 1.05) { nextSource(img); return; }
  img.classList.add('is-loaded');
  img.closest('.ph').classList.add('is-img');
}, true);
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img instanceof HTMLImageElement && img.closest('.ph')) nextSource(img);
}, true);

// ---------- doors ----------

const WALL_COLS = 5;
const WALL_ROWS = 5;

function wall(cards) {
  const cols = Array.from({ length: WALL_COLS }, () => []);
  cards.slice(0, WALL_COLS * WALL_ROWS).forEach((c, i) => cols[i % WALL_COLS].push(c));
  return cols.map((col) => `<span class="wall-col">${col.map((c) => poster(c, 'wp')).join('')}</span>`).join('');
}

function setUpDoors(data) {
  const top = $$('#doors .door');
  const again = $('#doors-again');
  again.innerHTML = '';
  for (const door of top) again.append(door.cloneNode(true));
  for (const door of $$('.door[data-domain]')) {
    const domain = door.dataset.domain;
    door.href = hrefFor(domain);
    const items = data?.catalog?.domains?.[domain]?.items;
    if (items) door.querySelector('.door-count').textContent = `${nf.format(items)} ${plural(items, DOMAINS[domain])}`;
    const cards = data?.posters?.[domain];
    if (cards?.length) door.querySelector('.wall').innerHTML = wall(cards);
  }
}

// ---------- the example evening ----------

const factsOf = (pick, item) => (item.factIds ?? []).map((id) => pick.facts.find((f) => f.id === id)).filter(Boolean);
const evidenceOf = (pick, item) => factsOf(pick, item).flatMap((f) => f.evidence ?? []);

// As on the result screen (pick/app.js): the evidence reads in Russian, an English tag or quote opens on request.
function evidenceLine(e) {
  if (!e) return '';
  const english = e.q && looksEnglish(e.q);
  const quote = e.q ? `«${esc(e.q)}»` : '';
  const shown = english ? '' : `<span class="ev-q">${quote}</span>`;
  const quoteKind = ['review', 'wiki', 'summary', 'description'].includes(e.kind);
  const original = english ? `<details class="ev-orig"><summary>${quoteKind ? 'цитата по-английски' : 'оригинал'}</summary><span class="ev-q" lang="en">${quote}</span></details>` : '';
  const line = (ic, src) => `<div class="ev">${icon(ic)}<div class="ev-body">${src}${shown ? `: ${shown}` : ''}${original}</div></div>`;
  switch (e.kind) {
    case 'review': return line(e.thumb === 'down' ? 'thumbDown' : 'thumbUp', `Отзыв в Steam${e.hours != null ? `, ${nf.format(e.hours)} ч в игре` : ''}`);
    case 'tag': return line('tag', `Тег игроков Steam${e.votes != null ? `, ${nf.format(e.votes)} ${plural(e.votes, ['голос', 'голоса', 'голосов'])}` : ''}`);
    case 'genome': return line('tag', `Зрители MovieLens${e.rel != null ? `, соответствие ${Math.round(e.rel * 100)}%` : ''}`);
    case 'usertag': return line('tag', `Теги зрителей MovieLens${e.n != null ? `, ${e.n} ${plural(e.n, ['раз', 'раза', 'раз'])}` : ''}`);
    case 'wiki': return line('book', 'Статья в Википедии');
    case 'description':
    case 'summary': return line('bubble', 'Описание');
    default: return line('info', 'Источник');
  }
}

const reasonItem = (text, ev, risk = false) => `<li class="reason${risk ? ' is-risk' : ''}">`
  + `<p class="reason-text">${icon(risk ? 'alert' : 'check')}<span>${esc(text)}</span></p>${evidenceLine(ev)}</li>`;

const statusPill = (p) => `<span class="status" data-level="${LEVEL[p.label] ?? 1}"><span class="bars" aria-hidden="true"><span></span><span></span><span></span></span>${esc(p.labelText)}</span>`;

const metaOf = (p) => [p.year, (p.genres ?? []).map((g) => GENRE_RU[g] ?? g.toLowerCase()).join(', ')].filter(Boolean).join(' · ');

// Which strong reasons to show: one backed by a review quote and one by a player tag go on the card,
// another review-backed one illustrates step 3.
function chooseReasons(top) {
  const strong = top.explanation.reasons.filter((r) => !r.weak).map((r) => ({ r, ev: evidenceOf(top, r) }));
  const has = (x, kind) => x.ev.some((e) => e.kind === kind);
  const pickEv = (x, kind) => x.ev.find((e) => e.kind === kind) ?? x.ev[0];
  const a = strong.find((x) => has(x, 'review')) ?? strong[0];
  const b = strong.find((x) => x !== a && has(x, 'tag')) ?? strong.find((x) => x !== a);
  const s = strong.find((x) => x !== a && x !== b && has(x, 'review')) ?? strong.find((x) => x !== a && x !== b) ?? a;
  return {
    card: [a, b].filter(Boolean).map((x) => ({ text: x.r.text, ev: pickEv(x, x === a ? 'review' : 'tag') })),
    step: s && { text: s.r.text, ev: pickEv(s, 'review') },
  };
}

function findCard(data, domain, name) {
  return data.posters?.[domain]?.find((c) => c.ru === name || c.name === name) ?? { id: name, ru: name };
}

function renderExample(data) {
  const ev = data.game;
  const { top, alternatives = [], taste, considered } = ev.result;
  const why = ev.steps.filter((s) => s.step === 'why');
  const whyNot = ev.steps.filter((s) => s.step === 'why_not');
  const reasons = chooseReasons(top);
  const hardNo = new Set((taste?.hardNo ?? []).map((t) => t.label));

  // step 1: an answer to «за что зашло»
  const w = why[0];
  if (w) {
    $('#frag-why').innerHTML = `<div class="frag-head">${poster(findCard(data, 'game', w.answer.item))}<p class="frag-q">${esc(w.title)}</p></div>`
      + `<div class="chips">${w.answer.reasons.map((r) => `<span class="chip is-on">${icon('check')}${esc(r)}</span>`).join('')}</div>`;
  }

  // step 2: a complaint, in the state the engine recorded it
  const n = whyNot[0];
  if (n) {
    $('#frag-complaint').innerHTML = `<div class="frag-head">${poster(findCard(data, 'game', n.answer.item))}<p class="frag-q">${esc(n.title)}</p></div>`
      + `<div class="chips">${n.answer.complaints.map((c) => (hardNo.has(c)
        ? `<span class="chip is-hard">${icon('ban')}${esc(c)}<span class="chip-tag">никогда</span></span>`
        : `<span class="chip is-soft">${icon('minus')}${esc(c)}<span class="chip-tag">не нравится</span></span>`)).join('')}</div>`;
  }

  // step 3: a reason with its evidence
  if (reasons.step) {
    $('#frag-reason').innerHTML = `<p class="frag-for">Почему <b>${esc(nameOf(top))}</b>:</p>`
      + `<ul class="reasons">${reasonItem(reasons.step.text, reasons.step.ev)}</ul>`;
  }

  // what was answered
  const platform = ev.steps.find((s) => s.step === 'platform')?.answer;
  const company = ev.steps.find((s) => s.step === 'company')?.answer;
  const asked = ev.steps.filter((s) => s.step === 'ask' && s.answer?.answer && s.answer.answer !== 'всё равно');
  const row = (label, dds) => `<div class="ans"><dt>${esc(label)}</dt>${dds.join('')}</div>`;
  $('#answers').innerHTML = [
    platform ? row(STEP_LABEL.platform, [`<dd>${esc(platform)}</dd>`]) : '',
    company ? row(STEP_LABEL.company, [`<dd>${esc(company)}</dd>`]) : '',
    why.length ? row(STEP_LABEL.liked, why.map((s) => `<dd><b>${esc(s.answer.item)}</b> <span>— ${esc(s.answer.reasons.join(', '))}</span></dd>`)) : '',
    whyNot.length ? row(STEP_LABEL.disliked, whyNot.map((s) => `<dd><b>${esc(s.answer.item)}</b> <span>— ${esc(s.answer.complaints.join(', '))}</span></dd>`)) : '',
    asked.length ? row(STEP_LABEL.ask, asked.map((s) => `<dd>${esc(s.answer.question)} <span>— ${esc(s.answer.answer)}</span></dd>`)) : '',
  ].join('');

  const total = data.catalog?.domains?.game?.items;
  if (considered && total) {
    $('#example-note').textContent = `Ответы взяты для примера, подбор настоящий: после отсева сравнил ${nf.format(considered)} из ${nf.format(total)} ${DOMAINS.game[2]}.`;
  }

  // the result card
  const risk = top.explanation.risks?.[0];
  const info = top.explanation.info?.[0];
  $('#result').innerHTML = `<div class="r-head">${poster(top)}<div class="r-main">`
    + `<h3 class="r-title">${esc(nameOf(top))}</h3><p class="r-meta">${esc(metaOf(top))}</p>${statusPill(top)}`
    + (info ? `<p class="r-info">${icon('info')}<span>${esc(info.text)}</span></p>` : '')
    + '</div></div>'
    + `<ul class="reasons">${reasons.card.map((x) => reasonItem(x.text, x.ev)).join('')}`
    + (risk ? reasonItem(risk.text, evidenceOf(top, risk)[0], true) : '')
    + '</ul>'
    + (alternatives.length
      ? `<p class="r-sub">Ещё ${alternatives.length} ${plural(alternatives.length, ['вариант', 'варианта', 'вариантов'])}</p><ul class="alts">${alternatives.map((p) => `<li class="alt">${poster(p)}`
        + `<span class="alt-body"><span class="alt-title">${esc(nameOf(p))}</span>${statusPill(p)}</span></li>`).join('')}</ul>`
      : '')
    + `<a class="btn btn-secondary r-cta" href="${esc(hrefFor('game'))}">Подобрать игру себе</a>`;
}

// ---------- start ----------

showLibraryCount();
addEventListener('storage', (e) => { if (e.key === LIBRARY_KEY || e.key === null) showLibraryCount(); });

let data = null;
try {
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  data = await res.json();
} catch (err) {
  console.warn('Example data is unavailable, the doors still work:', err.message);
}
setUpDoors(data);
if (data?.game?.result?.top) renderExample(data);
else $('.example').hidden = true;
