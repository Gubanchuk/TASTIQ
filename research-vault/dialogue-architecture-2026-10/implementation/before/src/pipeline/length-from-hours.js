// Game length from playtime where tagging left it out (used by 07-catalog.js).
// Playtime at review is not completion time, so it only counts for story-led or linear games without PvP.
const PRESENT = (v) => v && v.r >= 0.5 && v.c >= 0.5;
// Checked against story games that have both hours and a tagged length (night plan 29.10, exp4): 12/40 agree in 27
// cases and disagree in 1; reviewers often write mid-way, so «long» needs a high bar (tagged long: median 23 h).
const SHORT_MAX_HOURS = 12; // median hours at review up to this: a few evenings
const LONG_MIN_HOURS = 40; // median hours at review from this: dozens of hours
const DERIVED = { r: 0.8, c: 0.7 }; // relevance and confidence of a length derived from hours
const LENGTHS = ['length.short', 'length.long', 'length.endless'];

/** Returns the features with length.short or length.long added when the rule fits; the input is not changed. */
export function withLengthFromHours(features, medianHours) {
  if (medianHours == null || LENGTHS.some((f) => PRESENT(features[f]))) return features;
  if (!(PRESENT(features['story.central']) || PRESENT(features['freedom.linear'])) || PRESENT(features['social.pvp'])) return features;
  const f = medianHours <= SHORT_MAX_HOURS ? 'length.short' : medianHours >= LONG_MIN_HOURS ? 'length.long' : null;
  return f ? { ...features, [f]: { ...DERIVED, src: ['hours'], ev: [] } } : features;
}
