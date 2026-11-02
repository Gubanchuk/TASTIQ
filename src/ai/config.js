import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from '../lib/fsx.js';

// Node preserves variables already set by the shell. Load before reading either the model or access settings.
const env = resolve(ROOT, '.env');
if (existsSync(env)) process.loadEnvFile(env);

export const AI = {
  model: process.env.OPENAI_MODEL ?? 'gpt-6.1-sol',
  effort: process.env.AI_EFFORT ?? 'low',
  shortlist: Number(process.env.AI_SHORTLIST ?? 40),
  shortlistWithWish: 60,
  // The first shortlist rows are detailed; these extra sieved candidates are compact discovery lines.
  // Experimental: increased recall alone did not prove better picks. Enable only for a measured comparison.
  discovery: { game: Number(process.env.AI_DISCOVERY_GAMES ?? 0), cartoon: Number(process.env.AI_DISCOVERY_CARTOONS ?? 0) },
  ownPicks: 2,
  picks: 4,
  spares: Number(process.env.AI_SPARES ?? 0),
  maxOutputTokens: 8000,
  timeoutMs: 45_000,
};
