// Opt-in transport for an authorized live evaluation, using the existing cumulative ledger.
// Batch spend is derived from persisted receipts, so restarting the server cannot reset it.
import { createHash } from 'node:crypto';
import { reserveCost } from './usage.js';
import { requestResponse } from './openai.js';
import { BudgetError } from './budget-error.js';

export function budgetTransport({ ledger, batchId, cap, transport = requestResponse }) {
  if (!/^[a-z0-9-]{1,64}$/.test(batchId) || !Number.isFinite(cap) || cap <= 0) throw new Error('Explicit batch ID and positive cap required');
  const prefix = `${batchId}:`;
  return async request => {
    const id = prefix + createHash('sha256').update(JSON.stringify(request)).digest('hex');
    const rows = ledger.snapshot().calls;
    if (!rows.some(r => r.id === id && r.status === 'settled')) {
      const used = rows.filter(r => r.id.startsWith(prefix)).reduce((sum, r) => sum + (r.status === 'settled' ? r.costUsd : r.reserveUsd), 0);
      const reserve = reserveCost(request);
      if (reserve == null || used + reserve > cap) throw new BudgetError('Request exceeds batch budget reserve','AI_BUDGET_LIMIT');
    }
    return ledger.api(id, transport)(request);
  };
}
