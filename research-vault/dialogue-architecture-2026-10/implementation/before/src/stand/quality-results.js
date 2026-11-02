import { candidatesOf } from '../ai/pick.js';

// A failed model call stays a failed list even when the UI can show engine fallback cards.
export function comparisonDetail(caseId, system, state, result, catalog) {
  const rows = candidatesOf(catalog, state).rows;
  const picked = result.error ? [] : result.picks ?? [];
  const fill = result.error ? rows.slice(0, 4).map((r) => r.game.id) : result.filled ?? [];
  const cards = [...picked.map((p) => ({ ...p, origin: 'model' })), ...fill.map((id) => ({ id, origin: result.error ? 'engine' : 'fill' }))]
    .slice(0, 4).map((p) => { const item = catalog.byId.get(p.id); return { ...p, title: item.ru ?? item.name, original: item.name, year: item.year }; });
  return { caseId, system, state, result, cards, shortlist: rows.map((r) => r.game.id),
    modelOutsideShortlist: picked.filter((p) => !rows.some((r) => r.game.id === p.id)).map((p) => p.id) };
}
