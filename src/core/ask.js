// Adaptive questions after the fixed screens (plan step 4, research-vault/akinator-picker-2026-10/SUMMARY.md, 3.2–3.6).
// A question is worth a screen when (1) some answer would change the leader under the engine's own update (the pair
// answer shifts tonight's session), and (2) it is informative about which of the leading
// candidates is the title: the expected information gain of a Bayes update of the belief, where each candidate says
// how likely each answer is if it is the one. The best such question is asked until the leader is clear, nothing
// left would change it, or the limit is reached. Right before a leader as popular as what the person marked is shown,
// the picker asks whether they have seen it. M, gMin, max and NOISE are starting values; step 5 tunes them.
import { BELIEF, belief, entropy } from './belief.js';
import { rankAll } from './recommend.js';
import { priorOf, scoreGame, sessionMoodWeights } from './score.js';
import { checkSieves, EPISODE } from './sieves.js';

export const ASK = {
  M: 5, // each feature of a pair must be present (r, c ≥ 0.5) in at least this many leading candidates
  gMin: 0.02, // nats: a question expected to tell less about the leaders is not worth a screen
  max: 3, // adaptive questions per dialogue, skipped ones included
  get pStop() { return BELIEF.pStop; },
};

// Share of answers that contradict the title they describe: 12–17 % in the conversational-recommender studies
// (research-vault/akinator-picker-2026-10/raw/questions.md, source 8).
const NOISE = 0.15;
// Weight of «всё равно», alongside the evidence for either answer (0..1 each).
const DONT_CARE = 1;
const present = (v) => v && v.r >= 0.5 && v.c >= 0.5;
const strength = (g, f) => { const v = g.features[f]; return v ? v.r * v.c : 0; };
const argmax = (xs) => xs.reduce((best, x, i) => (x > xs[best] ? i : best), 0);

// answers: [{ L: P(answer | candidate i) for every i, scores: the engine's scores after this answer or null }].
// Gain: H(p) − Σ_a P(a) H(p | a), with p | a the Bayes posterior. It is never negative.
function evaluate(p, answers) {
  const H = entropy(p);
  let after = 0;
  for (const a of answers) {
    const joint = p.map((x, i) => x * a.L[i]);
    const Pa = joint.reduce((s, x) => s + x, 0);
    if (Pa > 0) after += Pa * entropy(joint.map((x) => x / Pa));
  }
  return H - after;
}

// P(answer | candidate) from how strongly each answer describes the candidate, mixed with answering noise.
function likelihoods(raw) {
  const k = raw.length;
  return raw[0].map((_, i) => {
    const s = raw.reduce((a, r) => a + r[i], 0);
    return raw.map((r) => (1 - NOISE) * (s > 0 ? r[i] / s : 1 / k) + NOISE / k);
  }).reduce((cols, row) => { row.forEach((x, a) => cols[a].push(x)); return cols; }, raw.map(() => []));
}

function question(kind, id, text, options, p, raw, scores) {
  const L = likelihoods(raw);
  const answers = L.map((l, a) => ({ L: l, scores: scores[a] }));
  const leader = 0; // top is sorted by score
  return {
    kind,
    id,
    text,
    options,
    gain: evaluate(p, answers),
    changes: answers.some((a) => a.scores && argmax(a.scores) !== leader),
  };
}

function pairQuestions(top, p, taste, catalog, session, M, asked) {
  // A feature already in an asked pair (answered or «всё равно») is not asked again in another pair.
  const used = new Set(asked.filter((id) => id.startsWith('pair:') || id.startsWith('lean:')).flatMap((id) => id.slice(id.indexOf(':') + 1).split('|')));
  if (session.intent?.source === 'confirmed') {
    for (const x of [...(session.intent.wants ?? []), ...(session.intent.avoids ?? [])]) used.add(x.f);
  }
  // Session time is already known. It says nothing about the total length of a game.
  if (session.minutes > 0) { used.add('session.short'); used.add('session.long'); }
  const leaning = new Set([...(session.leans ?? []).flatMap((l) => [l.f, l.against]), ...used]);
  const count = (f) => top.filter((r) => present(r.game.features[f])).length;
  // Use the same score as recommendations, including the cap on positive mood and earlier answers.
  const leanScores = (f, against) => {
    const next = { ...session, leans: [...(session.leans ?? []), { f, against }] };
    const mood = sessionMoodWeights(next, catalog.dict);
    return top.map((r) => scoreGame(r.game, taste, mood, catalog, next).score);
  };
  const options = (a, b, labels) => [{ value: a, label: labels[0] }, { value: b, label: labels[1] }];
  // Only authored, coherent choices. Missing tags are unknown, not evidence for the opposite side.
  const lean = (x) => {
    if (count(x.a) < M || count(x.b) < M) return null;
    const ma = top.map((r) => strength(r.game, x.a));
    const mb = top.map((r) => strength(r.game, x.b));
    const raw = [ma, mb, ma.map((v, i) => (1 - v) * (1 - mb[i]) + DONT_CARE)];
    const scores = [leanScores(x.a, x.b), leanScores(x.b, x.a)];
    // Risk to the leader: it carries one side, and the other answer would put a different title first.
    const leader = top[0].game;
    const pole = present(leader.features[x.a]) ? 0 : present(leader.features[x.b]) ? 1 : -1;
    const risk = pole >= 0 && argmax(scores[1 - pole]) !== 0 ? strength(leader, pole ? x.b : x.a) : 0;
    // A side named as a reason is still worth asking about tonight (a cinephile who chose «неторопливое» confirms
    // it for tonight and the leader changes), but the question says it was heard.
    const said = taste.weights.get(x.a)?.confirmed ? 0 : taste.weights.get(x.b)?.confirmed ? 1 : -1;
    const text = said >= 0 ? `Ты отмечал «${x.labels[said]}». Сегодня тоже?` : x.text;
    return { ...question('lean', `lean:${x.a}|${x.b}`, text, options(x.a, x.b, x.labels), p, raw, [...scores, null]), risk };
  };
  // A side the person complained about settles the pair: «тёплое или мрачное?» right after «мрачное мешало» reads as
  // not listening (walk of 2026-10-28), and the complaint already counts against it.
  const complained = (f) => taste.dislike.has(f) || taste.hardNo.has(f);
  return (catalog.dict.pairs ?? [])
    .filter((x) => !leaning.has(x.a) && !leaning.has(x.b) && !complained(x.a) && !complained(x.b))
    .map(lean).filter(Boolean);
}

function factQuestions(top, p, catalog, session, M, taste = null) {
  const game = catalog.domain.id === 'game';
  // Scores if the answer changed the session; with the taste the era penalty («можно и старое» lifts it) is in too.
  const scoresWith = (extra) => top.map((r) => r.score - priorOf(r.game, catalog, session, taste) + priorOf(r.game, catalog, { ...session, ...extra }, taste));
  const filteredScores = (extra) => top.map((r) => checkSieves(r.game, taste, { ...session, ...extra }, catalog) ? -Infinity : r.score);
  const sides = (test) => { const n = top.filter((r) => test(r.game)).length; return n >= M && top.length - n >= M; };
  const side = (test) => top.map((r) => (test(r.game) ? 1 : 0));
  const flip = (xs) => xs.map((x) => 1 - x);
  const dontCare = top.map(() => DONT_CARE); // many people have no answer to a fact either
  const out = [];

  if (!session.popularity) {
    const pops = top.map((r) => r.game.popularity).sort((a, b) => a - b);
    const median = pops[Math.floor(pops.length / 2)];
    const known = (g) => g.popularity >= median;
    if (sides(known)) {
      out.push(question('fact', 'fact:popularity',
        game ? 'Известная игра или что-то менее известное?' : 'Что-то известное или менее известное?',
        [{ value: 'mainstream', label: 'более известное' }, { value: 'niche', label: 'менее известное' }],
        p, [side(known), flip(side(known)), dontCare], [scoresWith({ popularity: 'mainstream' }), scoresWith({ popularity: 'niche' }), null]));
    }
  }
  // Years are known for films and series and, since the store cards of the tail, for 99 % of games; a title
  // without a year is on neither side.
  if (!session.era) {
    const recent = (g) => g.year != null && g.year >= 2015;
    const old = (g) => g.year != null && g.year < 2015;
    if (top.filter((r) => recent(r.game)).length >= M && top.filter((r) => old(r.game)).length >= M) {
      const known = (test) => top.map((r) => (r.game.year == null ? 0.5 : test(r.game) ? 1 : 0));
      out.push(question('fact', 'fact:era', 'Свежее или можно и старое?',
        [{ value: 'new', label: 'свежее, с 2015' }, { value: 'any', label: 'можно и старое' }],
        p, [known(recent), known(old), dontCare], [scoresWith({ era: 'new' }), scoresWith({ era: 'any' }), null]));
    }
  }
  if (catalog.domain.id === 'series' && !session.episodeLength) {
    const short = (g) => g.runtime != null && g.runtime <= EPISODE.short;
    const long = (g) => g.runtime != null && g.runtime >= EPISODE.long;
    const unknown = (g) => g.runtime == null;
    if (top.filter((r) => short(r.game)).length >= M && top.filter((r) => long(r.game)).length >= M) {
      out.push(question('fact', 'fact:episode', 'Серии покороче, минут по 20–30, или по часу?',
        [{ value: 'short', label: 'по 20–30 минут' }, { value: 'long', label: 'по часу' }],
        p, [top.map((r) => (short(r.game) ? 1 : unknown(r.game) ? 0.5 : 0)), top.map((r) => (long(r.game) ? 1 : unknown(r.game) ? 0.5 : 0)), dontCare],
        [filteredScores({ episodeLength: 'short' }), filteredScores({ episodeLength: 'long' }), null]));
    }
  }
  if (catalog.domain.id === 'series' && !session.onlyEnded) {
    const running = (g) => g.status && g.status !== 'Ended';
    if (sides(running)) {
      out.push(question('fact', 'fact:ended', 'Только законченные сериалы?',
        [{ value: 'yes', label: 'только законченные' }, { value: 'any', label: 'не важно' }],
        p, [flip(side(running)), side(running), dontCare], [filteredScores({ onlyEnded: true }), null, null]));
    }
  }
  return out;
}

function guessFor(top, profile, asked, catalog) {
  const leader = top[0]?.game;
  if (!leader) return null;
  const id = `guess:${leader.id}`;
  if (asked.includes(id) || profile.answers?.[leader.id]?.reaction === 'unknown') return null;
  const marked = Object.entries(profile.answers ?? {})
    .filter(([, a]) => a?.reaction && a.reaction !== 'unknown')
    .map(([x]) => catalog.byId.get(x)?.popularity)
    .filter((x) => x != null)
    .sort((a, b) => a - b);
  if (marked.length < 2) return null;
  const median = marked.length % 2 ? marked[(marked.length - 1) / 2] : (marked[marked.length / 2 - 1] + marked[marked.length / 2]) / 2;
  if (leader.popularity < median) return null;
  const name = leader.ru ?? leader.name;
  const game = catalog.domain.id === 'game';
  return {
    kind: 'guess',
    id,
    text: game ? `В «${name}» уже играл?` : `«${name}» уже видел?`,
    options: [
      { value: 'no', label: game ? 'не играл' : 'не видел' },
      { value: 'like', label: game ? 'играл, понравилось' : 'видел, понравилось' },
      { value: 'dislike', label: game ? 'играл, не моё' : 'видел, не моё' },
    ],
    gain: null,
  };
}

/** Every admissible question with its gain, best first: what nextQuestion chooses from (for tuning and tests). */
export function rankQuestions(catalog, profile = {}, session = {}, context = {}, params = {}) {
  const P = { K: BELIEF.K, M: ASK.M, ...params };
  const asked = context.asked ?? [];
  const { taste, ranked } = context.rank ?? rankAll(catalog, profile, session); // a ranking of the same profile and session
  const top = ranked.slice(0, P.K);
  const p = belief(top.map((r) => r.score), { K: P.K, tau: P.tau ?? BELIEF.tau });
  const questions = top.length < 2 ? [] : [...pairQuestions(top, p, taste, catalog, session, P.M, asked), ...factQuestions(top, p, catalog, session, P.M, taste)]
    .filter((q) => !asked.includes(q.id))
    .sort((a, b) => b.gain - a.gain);
  return { top, p, questions };
}

/**
 * The next question, or null when the result should be shown. Tonight comes first: a lean is asked when the leader
 * carries one side and the other answer would replace it, even if the taste is clear (the information gain about
 * which title it is undervalues a mood, which rules titles out rather than pointing at one). Then, while the leader
 * is unclear, the question with the most information gain that can change the leader; then «уже видел?».
 */
export function nextQuestion(catalog, profile = {}, session = {}, context = {}, params = {}) {
  const P = { pStop: BELIEF.pStop, gMin: ASK.gMin, max: ASK.max, ...params };
  const asked = context.asked ?? [];
  if (asked.length >= P.max) return null;
  const { top, p, questions } = rankQuestions(catalog, profile, session, context, params);
  const check = questions.filter((q) => q.kind === 'lean' && q.risk > 0).sort((a, b) => b.risk - a.risk || b.gain - a.gain)[0];
  if (check) return check;
  const best = p[0] < P.pStop ? questions.find((q) => q.changes && q.gain >= P.gMin) : null;
  return best ?? guessFor(top, profile, asked, catalog);
}
