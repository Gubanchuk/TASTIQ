import { FEATURES as GAME_FEATURES } from '../aspects/games.js';

/**
 * Rarity weight per feature, normalized to mean 1: a feature many titles share says less about
 * taste ("Party-Based RPG" vs "Action", research SUMMARY, rule 9).
 */
export function computeIdf(games, FEATURES = GAME_FEATURES) {
  const df = Object.fromEntries(FEATURES.map((f) => [f.id, 0]));
  for (const game of games) {
    for (const [f, v] of Object.entries(game.features)) if (f in df && v.r >= 0.5 && v.c >= 0.5) df[f]++;
  }
  const raw = Object.fromEntries(FEATURES.map((f) => [f.id, Math.log((games.length + 1) / (df[f.id] + 1)) + 1]));
  const mean = Object.values(raw).reduce((a, b) => a + b, 0) / FEATURES.length;
  const idf = Object.fromEntries(Object.entries(raw).map(([f, v]) => [f, Math.round((v / mean) * 1000) / 1000]));
  return { df, idf };
}
