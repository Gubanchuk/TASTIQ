// AI picker: the engine ranks and sieves the catalog, the model picks four titles, mostly from its shortlist, and says
// why in Russian. Up to two picks may come from the model's own knowledge (title and year): they are looked up among
// the titles that passed the engine's sieves, so the hard limits stay in force. What the model adds is judgement the
// tags lack (era, tone, how close a title is to the loved ones) and the person's own words.
// Any failure (no key, timeout, refusal, ids outside the shortlist) falls back to the engine's own picks.
import { profileOf, sessionOf } from '../core/dialogue.js';
import { choose, rankAll } from '../core/recommend.js';
import { normalizeTitle } from '../lib/text.js';
import { describeCandidates, describePerson, SCHEMA, systemFor } from './prompt.js';
import { AI } from './config.js';
import { publicApiError, requestResponse } from './openai.js';
import { reserveCost } from './usage.js';
import { verifiedOriginalYear } from '../core/title-identity.js';

export { AI };

/** The engine's shortlist for this dialogue (its own picks first, then the ranked pool) and everything that passed its sieves. */
export function candidateLimit(domain, withWish = false) {
  return (withWish ? AI.shortlistWithWish : AI.shortlist) + Math.max(0, AI.discovery[domain] ?? 0);
}

export function candidatesOf(catalog, state, size = candidateLimit(state.domain)) {
  const { ranked } = rankAll(catalog, profileOf(state), sessionOf(state));
  const { pool, picked } = choose(ranked);
  const seen = new Set();
  const ranks = new Map(ranked.map((r, i) => [r.game.id, i + 1]));
  const rows = [...picked, ...pool, ...ranked].filter((r) => !seen.has(r.game.id) && seen.add(r.game.id)).slice(0, size).map((r) => ({ ...r, rank: ranks.get(r.game.id) }));
  return { rows, ranked };
}
export const shortlistOf = (catalog, state, size = candidateLimit(state.domain)) => candidatesOf(catalog, state, size).rows;

// A title the model named from its own knowledge, found among the titles that passed the sieves: same name (English,
// original or Russian) and a year within one of the given one; of several, the closest year (a title without a year
// after the dated ones), then the most popular. A verified original release year may identify a Steam port.
// Without a year (0) the most popular namesake wins.
export function lookUp(ranked, title, year) {
  const key = normalizeTitle(String(title ?? ''));
  if (!key) return null;
  const gap = (g) => (!year || verifiedOriginalYear(g) === year ? 0 : g.year == null ? 2 : Math.abs(g.year - year));
  const found = ranked.map((r) => r.game)
    .filter((g) => [g.name, g.original, g.ru].filter(Boolean).some((n) => normalizeTitle(n) === key))
    .filter((g) => gap(g) <= 1 || g.year == null)
    .sort((a, b) => gap(a) - gap(b) || b.popularity - a.popularity);
  return found[0]?.id ?? null;
}

// A reason or caveat as shown: trimmed, capitalised, cut to the card's length.
const sentence = (x, max) => { const t = String(x ?? '').trim().slice(0, max); return t && t[0].toUpperCase() + t.slice(1); };

/**
 * Model output checked against the shortlist: known ids, no repeats, cut to size; reasons trimmed. A pick without
 * an id is looked up by title and year among the titles that passed the sieves (`ranked`), at most AI.ownPicks.
 */
export function checkPicks(out, rows, n = AI.picks, ranked = []) {
  const allowed = new Set(rows.map((r) => r.game.id));
  const seen = new Set();
  const picks = [];
  let own = 0;
  const proposed = Array.isArray(out?.picks) ? out.picks : [];
  for (const p of proposed) {
    if (picks.length >= n) break;
    const given = typeof p?.id === 'string' ? p.id.trim() : '';
    let id = allowed.has(given) ? given : null;
    let outside = false;
    if (!id && own < AI.ownPicks) {
      id = lookUp(ranked, p?.title, Number(p?.year) || 0);
      outside = Boolean(id) && !allowed.has(id);
    }
    if (!id || seen.has(id)) continue;
    seen.add(id);
    if (outside) own++;
    picks.push({ id, reason: sentence(p.reason, 220), caveat: sentence(p.caveat, 140), likelySeen: Boolean(p.likelySeen), own: outside });
  }
  return { picks, understood: String(out?.understood ?? '').trim().slice(0, 220), dropped: proposed.length - picks.length };
}

/**
 * Asks the model for four picks. Returns { picks: [{ id, reason, caveat, likelySeen, own }], understood, ms, usage } or
 * { error } when the engine's picks should stay.
 */
export async function aiPick(catalogs, state, { wish = '', previous = [], alreadyShown = [], api = requestResponse, maxCostUsd = Infinity } = {}) {
  const catalog = catalogs[state?.domain];
  if (!catalog) return { error: 'нет домена' };
  const cleanWish = String(wish ?? '').replace(/\s+/g, ' ').trim().slice(0, 300);
  // What was shown and did not suit («Не то? Скажи словами») cannot come back, from the list or as the model's own.
  const shown = new Set([...previous,...alreadyShown]);
  const limit = candidateLimit(state.domain, Boolean(cleanWish));
  const detailed = cleanWish ? AI.shortlistWithWish : AI.shortlist;
  const all = candidatesOf(catalog, state, limit + shown.size);
  const rows = all.rows.filter((r) => !shown.has(r.game.id)).slice(0, limit);
  const ranked = all.ranked.filter((r) => !shown.has(r.game.id));
  if (rows.length < 2) return { error: 'выбирать не из чего' };
  const liked = Object.entries(state.answers ?? {}).filter(([, a]) => a?.reaction === 'love' || a?.reaction === 'like').map(([id]) => catalog.byId.get(id)).filter(Boolean);

  const total = AI.picks + AI.spares;
  const howMany = AI.spares
    ? `Выбери ровно ${total} разных тайтлов по порядку. Первые ${AI.picks} покажу сразу, первый — лучший; остальные ${AI.spares} — запасные, по очереди встанут на место того, что человек уже видел.`
    : `Выбери ровно ${AI.picks} разных тайтла, первый — лучший.`;
  const content = `${describePerson(state, catalog, { wish: cleanWish, previous, alreadyShown })}\n\nКандидаты (${rows.length}):\n${describeCandidates(rows, catalog, liked, { detailed })}\n\n${howMany} Бери из списка (id копируй из строки кандидата) или не больше ${AI.ownPicks} своих (id пустой, название и год).`;
  const started = Date.now();
  const request = {
      model: AI.model,
      max_output_tokens: AI.maxOutputTokens,
      reasoning: { effort: AI.effort },
      text: { format: { type: 'json_schema', name: 'tastiq_picks', strict: true, schema: SCHEMA } },
      instructions: systemFor(state),
      input: content,
      store: false,
      service_tier: 'default',
  };
  if (maxCostUsd !== Infinity) {
    const reserve = reserveCost(request);
    if (!Number.isFinite(maxCostUsd) || maxCostUsd < 0 || reserve == null || reserve > maxCostUsd) {
      return { error: 'запрос не запущен: оставшийся бюджет недостаточен или цена модели неизвестна', notRequested: true };
    }
  }
  let res;
  try {
    res = await api(request);
  } catch (err) {
    return { ...publicApiError(err), ms: Date.now() - started };
  }
  const ms = Date.now() - started;
  const meta = { ms, model: res?.model ?? AI.model, usage: res?.usage, shortlist: rows.length };
  if (res?.status !== 'completed') return { ...meta, error: res?.status === 'incomplete' ? 'нейросеть не закончила ответ' : 'нейросеть не ответила' };
  const blocks = (Array.isArray(res.output) ? res.output : []).filter((b) => b?.type === 'message').flatMap((b) => Array.isArray(b.content) ? b.content : []);
  if (blocks.some((b) => b?.type === 'refusal')) return { ...meta, error: 'нейросеть отказалась отвечать' };
  const text = blocks.filter((b) => b?.type === 'output_text' && typeof b.text === 'string').map((b) => b.text).join('');
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ...meta, error: 'нейросеть ответила не по форме' };
  }
  const checked = checkPicks(parsed, rows, total, ranked);
  if (!checked.picks.length) return { ...meta, error: 'нейросеть выбрала не из списка' };
  // Fewer than four (seen at effort low: two picks, one with an id outside the list): the engine's next best titles
  // fill the rest, without a model sentence.
  const chosen = new Set(checked.picks.map((p) => p.id));
  const filled = rows.map((r) => r.game.id).filter((id) => !chosen.has(id)).slice(0, Math.max(0, AI.picks - checked.picks.length));
  return { ...checked, filled, ...meta };
}
