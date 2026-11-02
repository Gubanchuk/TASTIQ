// Scoring formula (research raw/04, section 5.1), weights set by hand:
//   score = Σ w(f)·idf(f)·r·c  −  λ·Σ d(f)·r·c  +  μ·mood  +  β·prior
// fit: features the person confirmed (or weakly inferred); penalty: soft dislikes (pilot error 3);
// mood: session-only boosts and penalties (sieve 5), boosts capped at moodBase + moodShare·fit;
// prior: quality and popularity.
export const WEIGHTS = { lambda: 1.0, mu: 0.8, beta: 0.35, avoid: 0.8, hardMinor: 2.0, moodBase: 0.4, moodShare: 0.5 };

// An answer to «это или то» about tonight (ask.js, kind 'lean'): the chosen side is boosted and the other mildly
// penalised for this session only, like a mood.
export const LEAN = { boost: 1, against: 0.5 };

export function sessionMoodWeights(session = {}, dict) {
  const boost = new Map();
  const penalty = new Map();
  const add = (map, f, v, why) => {
    const slot = map.get(f) ?? { v: 0, why: [] };
    slot.v += v;
    slot.why.push(why);
    map.set(f, slot);
  };
  for (const id of session.moods ?? []) {
    const mood = dict.moodById.get(id);
    if (!mood) continue;
    for (const [f, v] of Object.entries(mood.boost)) add(boost, f, v, mood.label);
    for (const [f, v] of Object.entries(mood.penalty)) add(penalty, f, v, mood.label);
  }
  for (const lean of session.leans ?? []) {
    add(boost, lean.f, LEAN.boost, lean.label);
    if (lean.against) add(penalty, lean.against, LEAN.against, lean.label);
  }
  if (session.intent?.source === 'confirmed') {
    for (const x of session.intent.wants ?? []) if (dict.featureById.has(x.f)) add(boost, x.f, LEAN.boost, `сегодня хочется: «${x.evidence}»`);
    for (const x of session.intent.avoids ?? []) if (dict.featureById.has(x.f)) add(penalty, x.f, 1, `сегодня меньше: «${x.evidence}»`);
  }
  for (const id of session.avoid ?? []) {
    const avoid = dict.avoidById.get(id);
    if (!avoid) continue;
    for (const f of avoid.features) add(penalty, f, WEIGHTS.avoid, avoid.label);
  }
  return { boost, penalty };
}

// Answers to «то, о чём все говорят, или то, чего не видел?» and «свежее или можно старое?» shift the prior.
export const SESSION_PRIOR = { popularity: 0.3, mainstream: 0.9, niche: -0.6, recent: 0.6, recentYear: 2015 };

// Era without a question: a title more than `grace` years older than the oldest liked one loses prior, up to
// the full β at `grace + span` years. Tags do not see an era; in 4 of 12 persona runs a title 12+ years older
// than anything liked was shown (Lena: a 1960 sitcom for loves of 1994–2013). «Можно и старое» turns it off.
export const ERA = { grace: 10, span: 20 };

export function priorOf(game, catalog, session = {}, taste = null) {
  const floor = catalog.domain.qualityFloor;
  const q = Math.min(1, Math.max(0, (game.quality - floor) / (1 - floor)));
  const [lo, hi] = catalog.popRange;
  const p = hi > lo ? (game.popularity - lo) / (hi - lo) : 0;
  const pop = SESSION_PRIOR[session.popularity] ?? SESSION_PRIOR.popularity;
  const recent = session.era === 'new' && game.year >= SESSION_PRIOR.recentYear ? SESSION_PRIOR.recent : 0;
  const oldest = taste?.oldestLiked;
  const era = oldest && game.year && session.era !== 'any' ? Math.min(1, Math.max(0, (oldest - ERA.grace - game.year) / ERA.span)) : 0;
  return WEIGHTS.beta * (q + pop * p + recent - era);
}

export function scoreGame(game, taste, mood, catalog, session = {}) {
  const matches = [];
  const penalties = [];
  const moodHits = [];
  let fit = 0;
  let penalty = 0;
  let moodScore = 0;

  for (const [f, v] of Object.entries(game.features)) {
    const rc = v.r * v.c;
    const t = taste.weights.get(f);
    if (t) {
      const contribution = t.w * (catalog.idf[f] ?? 1) * rc;
      fit += contribution;
      matches.push({ f, contribution, r: v.r, c: v.c, confirmed: t.confirmed, preferred: t.preferred, sources: t.sources });
    }
    const d = taste.dislike.get(f);
    if (d) {
      const contribution = WEIGHTS.lambda * d.d * rc;
      penalty += contribution;
      penalties.push({ f, contribution, r: v.r, c: v.c, sources: d.sources });
    }
    const h = taste.hardNo.get(f);
    if (h) {
      // Reached only when the feature is minor (sieve 4 removed games where it is defining).
      const contribution = WEIGHTS.lambda * WEIGHTS.hardMinor * rc;
      penalty += contribution;
      penalties.push({ f, contribution, r: v.r, c: v.c, sources: h.sources, hard: true });
    }
    const b = mood.boost.get(f);
    if (b) {
      moodScore += WEIGHTS.mu * b.v * rc;
      moodHits.push({ f, contribution: WEIGHTS.mu * b.v * rc, why: b.why, sign: 1 });
    }
    const p = mood.penalty.get(f);
    if (p) {
      moodScore -= WEIGHTS.mu * p.v * rc;
      moodHits.push({ f, contribution: -WEIGHTS.mu * p.v * rc, why: p.why, sign: -1 });
    }
  }

  // Mood shifts the choice inside the person's taste; it must not replace it (a BG3 fan who wants to
  // relax should get a relaxing story game, not PowerWash Simulator). Positive mood is capped
  // relative to taste fit; with no taste data yet it is capped at a fixed amount.
  const positiveMood = moodHits.filter((h) => h.sign > 0).reduce((a, h) => a + h.contribution, 0);
  const cap = WEIGHTS.moodBase + WEIGHTS.moodShare * fit;
  if (positiveMood > cap) moodScore -= positiveMood - cap;

  const prior = priorOf(game, catalog, session, taste);
  matches.sort((a, b) => b.contribution - a.contribution);
  penalties.sort((a, b) => b.contribution - a.contribution);
  moodHits.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  return {
    score: fit - penalty + moodScore + prior,
    parts: { fit, penalty, mood: moodScore, prior },
    matches,
    penalties,
    moodHits,
    mainAspect: matches[0] ? catalog.dict.featureById.get(matches[0].f).aspect : null,
  };
}
