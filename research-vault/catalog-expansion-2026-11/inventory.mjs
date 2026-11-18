// Run from any directory. Reads the versioned runtime data.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {readScreenCatalog,screenCatalogPartFiles} from '../../src/lib/screen-catalog.js';

const data = new URL('../../data/', import.meta.url);
const manifest = {};
function read(name, parse = true) {
  const bytes = readFileSync(new URL(name, data));
  manifest[name] = {
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex')
  };
  if (parse) return JSON.parse(bytes.toString('utf8'));
}

const games = read('catalog.json');
const screenPath = new URL('catalog-screen.json', data);
read('catalog-screen.json', false);
for (const name of screenCatalogPartFiles(screenPath)) read(name, false);
const screen = readScreenCatalog(screenPath);
const posters = read('posters.json');
for (const name of ['quotes-ru.json', 'verified-game-context.json', 'verified-game-releases.json']) {
  read(name, false);
}
const rows = [...games.items, ...screen.items];
const domains = {};
for (const domain of new Set(rows.map(row => row.domain))) {
  const items = rows.filter(row => row.domain === domain);
  const count = predicate => items.filter(predicate).length;
  const tasteCount = item => Object.entries(item.features).filter(([key, value]) =>
    !/^(length|completeness|format|audience)\./u.test(key) && value.r >= 0.5 && value.c >= 0.5
  ).length;
  domains[domain] = {
    items: items.length, ids: new Set(items.map(row => row.id)).size,
    works: new Set(items.map(row => row.work)).size,
    ru: count(row => row.ru), tagged: count(row => row.tagged),
    fiveTasteFeatures: count(row => tasteCount(row) >= 5),
    zeroTasteFeatures: count(row => tasteCount(row) === 0),
    newestYear: items.reduce((latest, row) => Math.max(latest, row.year ?? 0), 0)
  };
  if (domain !== 'game') {
    Object.assign(domains[domain], {
      films: count(row => row.kind === 'film'), series: count(row => row.kind === 'series'),
      llm: count(row => row.llm), runtime: count(row => row.runtime > 0),
      seriesWithStatus: count(row => row.kind === 'series' && row.status),
      posterOrImage: count(row => posters[row.id] || row.image),
      wikiEvidenceWithoutAnyUrl: count(row => {
        const wiki = Object.values(row.features).flatMap(feature => feature.ev ?? []).filter(ev => ev.kind === 'wiki');
        return wiki.length > 0 && wiki.every(ev => !ev.url);
      })
    });
  }
}
const recent = screen.items.filter(row => row.domain === 'film' && row.year >= 2019 && row.reviews.total >= 20000);
const probes = ['tt0382932','tt0120587','tt0245429','tt0417299','tt9018736','tt13429870'];
console.log(JSON.stringify({
  builtAt: {game: games.builtAt, screen: screen.builtAt}, manifest, domains,
  recentFilms: {items: recent.length, withoutLlm: recent.filter(row => !row.llm).length,
    withoutGenomeOrLlm: recent.filter(row => !row.tagged).length},
  classificationExamples: probes.map(id => {
    const row = screen.items.find(item => item.id === id);
    return row ? {id, name: row.name, year: row.year, kind: row.kind, domain: row.domain} : {id, missing:true};
  })
}, null, 2));
