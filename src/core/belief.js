// Belief over the leading candidates (plan step 4, research-vault/akinator-picker-2026-10/SUMMARY.md, 3.1):
// how sure the picker is that the leader is the title. A softmax over each candidate's gap to the leader,
// measured relative to the leader's score so that a profile with many reasons and one with few compare alike.
// K, tau and pStop are starting values; step 5 tunes them on the stand.
export const BELIEF = { K: 60, tau: 0.1, pStop: 0.5 };

/** Probabilities for the first K scores (any order; -Infinity means removed). */
export function belief(scores, { K = BELIEF.K, tau = BELIEF.tau } = {}) {
  const top = scores.slice(0, K);
  const best = Math.max(...top);
  if (!top.length || best === -Infinity) return top.map(() => 0);
  const scale = tau * Math.max(Math.abs(best), 1);
  const w = top.map((s) => Math.exp((s - best) / scale));
  const sum = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / sum);
}

/** Shannon entropy in nats. */
export const entropy = (p) => -p.reduce((h, x) => (x > 0 ? h + x * Math.log(x) : h), 0);
