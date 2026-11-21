const nouns = {
 game: ['игра', 'игры', 'игр'], film: ['фильм', 'фильма', 'фильмов'],
 series: ['сериал', 'сериала', 'сериалов'], cartoon: ['мультфильм', 'мультфильма', 'мультфильмов'],
 anime: ['произведение', 'произведения', 'произведений'],
};
const entries = document.querySelectorAll('[data-anime-entry]');
const counters = document.querySelectorAll('[data-catalog-count]');
if (entries.length || counters.length) {
 fetch('/api/meta').then(response => response.ok ? response.json() : null).then(meta => {
  const plural = new Intl.PluralRules('ru-RU'), number = new Intl.NumberFormat('ru-RU');
  for (const counter of counters) {
   const domain = counter.dataset.catalogCount, items = meta?.domains?.[domain]?.items;
   if (!nouns[domain] || !Number.isSafeInteger(items) || items < 0) continue;
   const form = plural.select(items);
   counter.textContent = number.format(items) + ' ' + nouns[domain][form === 'one' ? 0 : form === 'few' ? 1 : 2];
  }
  const enabled = meta?.domains?.anime?.newSelections;
  if (typeof enabled !== 'boolean') return;
  if (document.documentElement.hasAttribute('data-anime-enabled')) {
   document.documentElement.dataset.animeEnabled = String(enabled);
  } else {
   for (const entry of entries) entry.hidden = !enabled;
  }
 }).catch(()=>{/* The four permanent entrances also work without metadata. */});
}
