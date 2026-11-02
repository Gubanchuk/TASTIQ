// Public AI has no application quota or subscription gate.
// AI_ACCESS=off remains an explicit switch for offline tests and local previews.
import './config.js';

export const AI_LIMITS = {access:process.env.AI_ACCESS??'all'};

/** Whether this browser may use the AI picker now; reason is shown to the person when not. */
export function aiAccess() {
  if (!process.env.OPENAI_API_KEY?.trim()) return { allowed: false, reason: 'нейросеть не подключена' };
  if (AI_LIMITS.access === 'off') return { allowed: false, reason: 'нейросеть выключена' };
  return { allowed: true };
}

// Existing controllers may report a dispatch; it no longer consumes an app allowance.
export function aiSpend() {}
