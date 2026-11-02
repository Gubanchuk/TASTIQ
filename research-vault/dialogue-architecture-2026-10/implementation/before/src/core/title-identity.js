import releases from '../../data/verified-game-releases.json' with { type: 'json' };
import { normalizeTitle } from '../lib/text.js';

// Do not overwrite the catalog year: era/ranking keep their existing contract.
// Only a verified Steam app + canonical title can accept a different original release year.
export function verifiedOriginalYear(item) {
  if (item.kind !== 'game' || item.domain !== 'game') return null;
  const appid = String(item.appid ?? item.id).replace(/^steam:/, '');
  const fact = releases.games[appid];
  if (!fact || normalizeTitle(item.name) !== normalizeTitle(fact.title) || item.year !== fact.steamYear) return null;
  return fact.originalYear;
}
