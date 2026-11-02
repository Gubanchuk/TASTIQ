// The result after the person removed a card («Уже смотрел», «Не сейчас»): the other cards stay where they were and
// the next pick takes the removed card's place: the model's own spare picks first (when it gave any), then the
// engine's. Without this a removal recomputes the whole result and the untouched cards reshuffle; with the AI on, it
// would also pay for a new request. Plain module without imports: the page loads it as /shared/fill-picks.js, the
// persona stand and the tests from node.

const cardsOf = (r) => [r?.top, ...(r?.alternatives ?? [])].filter(Boolean);

export function changesTaste(action, state) {
  if (action.type === 'not_mine') return Boolean(action.issues?.length);
  const previous = (state?.corrections ?? []).find((c) => c.kind === 'played' && c.id === action.id)?.reaction;
  if (action.type === 'unplayed') return Boolean(previous);
  return ['played', 'rate_played'].includes(action.type) && (action.reaction ?? null) !== (previous ?? null);
}

/** Titles removed on the result screen of this dialogue state. */
export const removedIds = (state) => new Set([...playedIds(state), ...(state?.session?.notNow ?? [])]);

/** Titles marked «Уже смотрел» on the result: their series leave the screen too. */
export const playedIds = (state) => new Set((state?.corrections ?? []).filter((c) => c.kind === 'played').map((c) => c.id));

/**
 * @param shown    the result on the screen before the removal; `spares` are the model's next picks in order
 * @param engine   the engine's result for the current answers (the removed titles are already sieved out of it)
 * @param removed  Set of removed ids
 * @param played   Set of ids marked «Уже смотрел»: another title of the same series is removed as well, the way
 *                 the engine's sieve 2 keeps it out of new picks
 */
export function fillPicks(shown, engine, removed, played = new Set()) {
  const before = cardsOf(shown);
  const series = new Set(before.filter((p) => played.has(p.id)).flatMap((p) => p.series ?? []));
  const gone = (p) => removed.has(p.id) || (p.series ?? []).some((s) => series.has(s));
  const taken = new Set(before.map((p) => p.id));
  const spare = [];
  for (const p of [...(shown?.spares ?? []), ...cardsOf(engine)]) {
    if (!gone(p) && !taken.has(p.id) && !spare.some((x) => x.id === p.id)) spare.push(p);
  }
  const picks = before.map((p) => (gone(p) ? spare.shift() : p)).filter(Boolean);
  if (!picks.length) return engine;
  const used = new Set(picks.map((p) => p.id));
  const spares = (shown?.spares ?? []).filter((p) => !used.has(p.id) && !gone(p));
  // What was understood about the person follows the latest answers («понравилось» after «Уже смотрел» changes it).
  return { ...shown, top: picks[0], alternatives: picks.slice(1), spares, taste: engine.taste, considered: engine.considered, sieves: engine.sieves };
}
