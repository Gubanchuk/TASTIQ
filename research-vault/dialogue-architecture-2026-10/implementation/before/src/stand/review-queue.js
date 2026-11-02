import { createHash } from 'node:crypto';
import { sessionOf } from '../core/dialogue.js';
import { PLATFORMS } from '../core/sieves.js';
import { CONTEXTS } from '../core/context.js';
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 20);
const LABELS = ['accept', 'conditional', 'reject', 'unknown'];
export function makeReviewContext(state, catalog) {
  const situation = state.situation ?? {}, session = sessionOf(state);
  const label = (f) => catalog.dict.featureById.get(f)?.label ?? f;
  return {
    note: situation.note ?? '', company: catalog.dict.company.find((x) => x.id === situation.company)?.label ?? null,
    constraints: {
      hardStops: (state.stops ?? []).map((f) => catalog.dict.stops.find((x) => x.f === f)?.label ?? label(f)),
      platform: state.domain === 'game' ? (PLATFORMS[session.platform] ?? PLATFORMS.windows).label : null,
      timeAnswer: catalog.domain.time?.find((x) => x.id === situation.time)?.label ?? null,
      availableMinutes: session.minutes ?? null, maxRuntime: session.maxRuntime ?? null,
      maxEpisodes: session.maxEpisodes ?? null, maxSeasons: session.maxSeasons ?? null,
      partySize: CONTEXTS.partySize.options.find((x) => x.value === session.partySize)?.label ?? null,
      childAge: CONTEXTS.childAge.options.find((x) => x.value === session.childAge)?.label ?? null,
      episodeLength: session.episodeLength === 'short' ? 'по 20–30 минут' : session.episodeLength === 'long' ? 'по часу' : null,
      onlyEnded: session.onlyEnded, era: session.era === 'new' ? 'с 2015 года' : session.era === 'any' ? 'любая эпоха' : null,
      popularity: session.popularity === 'niche' ? 'менее известное' : session.popularity === 'mainstream' ? 'популярное' : null,
      leans: (session.leans ?? []).map((x) => ({ want: label(x.f), less: x.against ? label(x.against) : null })),
    },
    preferences: (state.preferences ?? []).map((x) => label(typeof x === 'string' ? x : x.f)),
    feedback: (state.corrections ?? []).map((x) => ({ title: catalog.byId.get(x.id)?.ru ?? catalog.byId.get(x.id)?.name, kind: x.kind, reaction: x.reaction ?? null,
      issues: x.issues?.map((y) => ({ label: label(y.f), hard: Boolean(y.hard) })) })),
    taste: Object.entries(state.answers ?? {}).map(([id, a]) => ({ title: catalog.byId.get(id)?.ru ?? catalog.byId.get(id)?.name, reaction: a.reaction, words: a.text ?? '',
      reasons: a.reasons?.map(label), issues: a.issues?.map((x) => ({ label: label(x.f), hard: Boolean(x.hard) })) })),
  };
}

// Share queue with reviewers; keep key separate. No algorithm names, ranks, scores or persona names in queue.
export function buildReviewQueue(runs, seed = 'tastiq-review-v1') {
  const rows = new Map(), lists = [];
  for (const run of runs) for (const system of run.systems) {
    const entries = [], seen = new Set();
    for (const [index, card] of system.cards.entries()) {
      if (seen.has(card.id)) throw new Error('duplicate candidate in one list');
      seen.add(card.id);
      const reviewId = hash(`${seed}|${run.caseId}|${card.id}`);
      if (!rows.has(reviewId)) rows.set(reviewId, {
        reviewId, caseId: run.caseId, domain: run.domain, context: structuredClone(run.context),
        title: card.title, year: card.year ?? null, judgment: null, reason: '', conditions: '', started: null, afterUse: null,
      });
      entries.push({ reviewId, rank: index + 1, origin: card.origin ?? 'engine' });
    }
    lists.push({ caseId: run.caseId, system: system.name, error: system.error ?? null, entries });
  }
  return { queue: [...rows.values()].sort((a, b) => a.reviewId.localeCompare(b.reviewId)), key: { version: 1, lists } };
}

export function summarizeReviews(queue, key) {
  const votes = new Map(), known = new Set(key.lists.flatMap((list) => list.entries.map((x) => x.reviewId)));
  for (const row of queue) {
    if (votes.has(row.reviewId)) throw new Error('duplicate reviewId');
    if (!known.has(row.reviewId)) throw new Error('unknown reviewId');
    if (row.judgment != null && !LABELS.includes(row.judgment)) throw new Error('invalid judgment');
    votes.set(row.reviewId, row.judgment ?? null);
  }
  const result = {};
  for (const list of key.lists) {
    const stats = result[list.system] ??= { lists: 0, failedLists: 0, shown: 0, engine: 0, model: 0, fill: 0, accept: 0, conditional: 0, reject: 0, unknown: 0, unreviewed: 0, fullyResolvedLists: 0, listsWithAccept: 0 };
    stats.lists++; if (list.error) stats.failedLists++;
    const judgments = list.entries.map((entry) => votes.get(entry.reviewId) ?? null);
    for (const [i, entry] of list.entries.entries()) {
      stats.shown++;
      if (!['engine', 'model', 'fill'].includes(entry.origin)) throw new Error('invalid origin');
      stats[entry.origin]++; stats[judgments[i] ?? 'unreviewed']++;
    }
    if (!list.error && judgments.length && judgments.every((x) => x && x !== 'unknown')) {
      stats.fullyResolvedLists++;
      if (judgments.includes('accept')) stats.listsWithAccept++;
    }
  }
  for (const stats of Object.values(result)) {
    stats.decidable = stats.accept + stats.conditional + stats.reject;
    stats.strictAcceptance = stats.decidable ? stats.accept / stats.decidable : null;
    stats.anyAcceptRate = stats.fullyResolvedLists ? stats.listsWithAccept / stats.fullyResolvedLists : null;
  }
  return result;
}
