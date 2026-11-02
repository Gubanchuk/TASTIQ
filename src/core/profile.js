// Taste profile, sieve 4 ("is it mine"). Built fresh from the person's answers on every request,
// so a correction changes the result immediately and nothing is hidden in state.
// Every weight keeps its provenance: which answer produced it and whether the person confirmed it.
import { editionsOf } from './catalog.js';

export const TASTE = {
  love: 1.0, // confirmed reason on "обожаю"
  like: 0.7, // confirmed reason on "нравится"
  preference: 0.7, // answer to a fork question "что важнее"
  inferred: 0.2, // unconfirmed feature of a liked title, times its r·c (pilot error 1)
  inferredCap: 0.5, // unconfirmed features never outweigh one confirmed reason
  okayInfer: 0.25, // «нормально» means seen and not against it: a quarter of what «обожаю» says about taste
  seenInfer: 0.25, // «Уже смотрел» on a result card without a rating: the person chose to watch it (night plan 29.10)
  perAnswerCap: 1.0, // one answer adds at most this much to one feature (pilot error 2)
  saturation: 2.5, // total weight approaches this asymptotically
  softDislike: 1.0,
  triedDislike: 0.5, // "мало попробовал" with a stated reason counts half
};

const PRESENT = (v) => v && v.r >= 0.5 && v.c >= 0.5;

const addTo = (map, f, amount, source) => {
  const slot = map.get(f) ?? { sum: 0, sources: [] };
  slot.sum += amount;
  slot.sources.push({ ...source, amount });
  map.set(f, slot);
};

/**
 * @param catalog  catalog from makeCatalog (its dictionary decides which features exist)
 * @param profile  { answers: {[id]: {reaction, reasons?, issues?, badQuality?, notes?}},
 *                   corrections?: [{id, kind: 'played'|'not_mine', reaction?, issues?}],
 *                   preferences?: [{f}] }
 */
export function buildTaste(catalog, profile = {}) {
  const { featureById } = catalog.dict;
  const confirmed = new Map();
  const preferred = new Map();
  const inferredRaw = new Map();
  const dislike = new Map();
  const local = new Map();
  const hardNo = new Map();
  const consumed = new Set();
  const playedSeries = new Set();
  const rejected = new Set();
  const lowExposure = new Set();
  const qualityComplaints = new Set();

  const answers = Object.entries(profile.answers ?? {}).map(([id, a]) => ({ id, ...a }));
  for (const c of profile.corrections ?? []) {
    if (c.kind === 'played') answers.push({ id: c.id, reaction: c.reaction ?? 'played', issues: c.issues });
    if (c.kind === 'not_mine') {
      rejected.add(c.id);
      answers.push({ id: c.id, reaction: 'not_mine', issues: c.issues });
    }
  }

  const disliked = answers.filter((a) => a.reaction === 'dislike').map((a) => catalog.byId.get(a.id)).filter(Boolean);
  const liked = answers.filter((a) => a.reaction === 'love' || a.reaction === 'like').map((a) => catalog.byId.get(a.id)).filter(Boolean);
  // A liked title shows the person tolerates a complained-about feature when it clearly has it, or clearly has
  // its kin, the same thing seen from the good side (Stalker: "draggy" only 0.34, but slow 1.0). A weaker trace
  // is noise: r 0.33 in LLM tags is one review mentioning it.
  const tolerates = (l, f) => PRESENT(l.features[f]) || PRESENT(l.features[featureById.get(f).kin]);

  for (const a of answers) {
    const item = catalog.byId.get(a.id);
    if (!item || a.reaction === 'unknown') continue;
    if (a.reaction !== 'not_mine') {
      for (const id of editionsOf(catalog, a.id)) consumed.add(id);
      for (const s of item.series ?? []) playedSeries.add(s);
    }
    const source = { id: a.id, name: item.ru ?? item.name };

    // A title seen but not rated («Уже смотрел» alone) only hints at taste: its features are inferred weakly, it is not
    // a liked title (no reverse contrast for complaints, no say in how old is still theirs).
    if (a.reaction === 'love' || a.reaction === 'like' || a.reaction === 'played') {
      const reasons = [...new Set(a.reasons ?? [])].filter((f) => featureById.has(f));
      const amount = Math.min(TASTE[a.reaction] ?? 0, TASTE.perAnswerCap);
      for (const f of reasons) addTo(confirmed, f, amount, { ...source, kind: 'confirmed', reaction: a.reaction });

      for (const [f, v] of Object.entries(item.features)) {
        const feature = featureById.get(f);
        if (reasons.includes(f) || !feature || feature.risk || !feature.infer || !PRESENT(v)) continue;
        // Length taken from playtime (length-from-hours.js) is for the pair and the stop, not taste: a loved 67-hour
        // RDR2 made Andrey «like long games», Persona 4 Golden led and the length question was never asked (29.10).
        if (v.src?.includes('hours')) continue;
        // Contrast: a feature shared with a title the person disliked does not explain the like.
        if (disliked.some((d) => PRESENT(d.features[f]))) continue;
        const strength = a.reaction === 'love' ? 1 : a.reaction === 'like' ? TASTE.okayInfer : TASTE.seenInfer;
        addTo(inferredRaw, f, TASTE.inferred * strength * v.r * v.c, { ...source, kind: 'inferred' });
      }
    }

    const issueWeight = a.reaction === 'tried' ? TASTE.triedDislike : TASTE.softDislike;
    if (a.reaction === 'tried') lowExposure.add(a.id);
    for (const issue of a.issues ?? []) {
      if (!featureById.has(issue.f)) continue;
      const amount = Math.min(issueWeight, TASTE.perAnswerCap);
      if (issue.hard) addTo(hardNo, issue.f, 1, { ...source, kind: 'hard' });
      // Reverse contrast: a soft complaint about a feature a liked title also has is about this title, not the
      // taste, so it penalizes nothing. Only an explicit "никогда" overrides what the person likes.
      else if (liked.some((l) => l.id !== a.id && tolerates(l, issue.f))) addTo(local, issue.f, amount, { ...source, kind: 'local' });
      else addTo(dislike, issue.f, amount, { ...source, kind: 'soft' });
    }
    if (a.badQuality) qualityComplaints.add(a.id);
  }

  // Fork answers weigh like a liked reason but are kept apart: only reasons named for a title count as
  // confirmed, so two fork answers cannot turn one chip into "сильное попадание".
  // "Что точно не надо?": a stop is a "никогда" that names no title.
  for (const f of profile.stops ?? []) {
    if (featureById.has(f)) addTo(hardNo, f, 1, { kind: 'stop', name: null });
  }

  for (const p of profile.preferences ?? []) {
    if (featureById.has(p.f)) addTo(preferred, p.f, TASTE.preference, { kind: 'preference', name: null });
  }

  // Final weights: saturating sum of what the person said, plus capped inferred; nothing the person dislikes.
  const weights = new Map();
  const saturate = (x) => TASTE.saturation * (1 - Math.exp(-x / TASTE.saturation));
  for (const f of new Set([...confirmed.keys(), ...preferred.keys(), ...inferredRaw.keys()])) {
    if (dislike.has(f) || hardNo.has(f)) continue;
    const c = confirmed.get(f);
    const p = preferred.get(f);
    const i = inferredRaw.get(f);
    const said = (c?.sum ?? 0) + (p?.sum ?? 0);
    const w = (said ? saturate(said) : 0) + (i ? Math.min(TASTE.inferredCap, i.sum) : 0);
    weights.set(f, {
      w,
      confirmed: Boolean(c),
      preferred: Boolean(p),
      sources: [...(c?.sources ?? []), ...(p?.sources ?? []), ...(i?.sources ?? [])],
    });
  }

  // The oldest title the person likes sets how old is still theirs (score.js, priorOf): a fan of 1994–2013
  // sitcoms is not offered one from 1960 first, a fan of Stalker (1979) keeps the old classics.
  const years = liked.map((x) => x.year).filter((y) => Number.isFinite(y));

  return {
    weights,
    oldestLiked: years.length ? Math.min(...years) : null,
    dislike: new Map([...dislike].map(([f, v]) => [f, { d: v.sum, sources: v.sources }])),
    local,
    hardNo,
    consumed,
    playedSeries,
    rejected,
    lowExposure,
    qualityComplaints,
  };
}
