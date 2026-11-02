// Evaluation-only ledger. One owner, persist before dispatch, never retry an uncertain charge.
// Receipts contain request bodies/responses, never credentials or transport headers.
import { createHash } from 'node:crypto';
import { mkdirSync, existsSync, openSync, closeSync, unlinkSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { estimateCost, reserveCost } from '../ai/usage.js';
import { BudgetError } from '../ai/budget-error.js';

const money = (n) => Math.round(n * 1e10) / 1e10;
const hash = (body) => createHash('sha256').update(JSON.stringify(body)).digest('hex');

export class PaidBudget {
  constructor(dir, authorization) {
    mkdirSync(dir, { recursive: true });
    this.path = resolve(dir, 'budget.json'); this.lock = resolve(dir, 'budget.lock');
    try { this.fd = openSync(this.lock, 'wx'); }
    catch { throw new Error('Budget ledger locked; inspect its owner before resuming'); }
    try {
      if (existsSync(this.path)) {
        this.data = JSON.parse(readFileSync(this.path, 'utf8'));
        if (authorization && Object.entries(authorization).some(([k, v]) => this.data[k] !== v)) throw new Error('Existing authorization differs; never reset a ledger');
      } else {
        if (!authorization) throw new Error('Explicit initial authorization required');
        this.data = { version: 1, ...authorization, createdAt: new Date().toISOString(), calls: [] };
      }
      const d = this.data;
      if (d.version !== 1 || !Array.isArray(d.calls) || ![d.ceiling, d.baselineUpper, d.roundCap, d.baselineCalls].every((n) => Number.isFinite(n) && n >= 0)
        || d.baselineUpper > d.ceiling || !Number.isInteger(d.baselineCalls)) throw new Error('Invalid budget ledger');
      const ids = new Set();
      for (const row of d.calls) {
        if (!row.id || ids.has(row.id) || !['pending', 'settled', 'uncertain'].includes(row.status)
          || !Number.isFinite(row.reserveUsd) || row.reserveUsd < 0
          || (row.status === 'settled' && (!Number.isFinite(row.costUsd) || row.costUsd < 0 || estimateCost(row.response?.usage, row.response?.model ?? row.request?.model) !== row.costUsd))
          || row.hash !== hash(row.request)) throw new Error('Invalid receipt; stop and inspect');
        ids.add(row.id);
      }
      this.save();
    } catch (error) { this.close(); throw error; }
  }
  snapshot() {
    const settledNewUsd = money(this.data.calls.filter((x) => x.status === 'settled').reduce((s, x) => s + x.costUsd, 0));
    const uncertainReserve = money(this.data.calls.filter((x) => x.status !== 'settled').reduce((s, x) => s + x.reserveUsd, 0));
    const cumulativeUpper = money(this.data.baselineUpper + settledNewUsd);
    return { ...structuredClone(this.data), settledNewUsd, uncertainReserve, cumulativeUpper,
      remainingLower: money(this.data.ceiling - cumulativeUpper - uncertainReserve),
      successfulCalls: this.data.baselineCalls + this.data.calls.filter((x) => x.status === 'settled' && x.response?.status === 'completed').length };
  }
  save() {
    const temp = `${this.path}.tmp`;
    writeFileSync(temp, JSON.stringify(this.snapshot(), null, 2) + '\n');
    renameSync(temp, this.path);
  }
  api(id, transport) {
    return async (request) => {
      if (this.fd == null) throw new Error('Closed budget ledger');
      if (typeof id !== 'string' || !id) throw new Error('A unique call ID is required');
      const prior = this.data.calls.find((x) => x.id === id);
      if (prior && prior.hash !== hash(request)) throw new Error('Call ID has a different request; do not overwrite evidence');
      if (prior?.status === 'settled') return structuredClone(prior.response);
      if (this.data.haltReason) throw new BudgetError(`Paid budget halted: ${this.data.haltReason}`,'AI_BUDGET_HALTED');
      if (this.data.calls.some((x) => x.status !== 'settled')) throw new BudgetError('Previous spend uncertain; no further paid calls','AI_SPEND_UNCERTAIN');
      const before = this.snapshot(), reserve = reserveCost(request);
      const allowance = Math.min(before.remainingLower, this.data.roundCap - before.settledNewUsd);
      if (reserve == null || reserve > allowance) throw new BudgetError('Request exceeds remaining budget reserve','AI_BUDGET_LIMIT');
      const row = { id, hash: hash(request), request: structuredClone(request), reserveUsd: reserve, status: 'pending', startedAt: new Date().toISOString() };
      this.data.calls.push(row); this.save();
      let response;
      try { response = await transport(request); }
      catch {
        row.status = 'uncertain'; row.error = 'Transport did not return billable usage'; this.save();
        throw new BudgetError('No usage receipt; paid budget stopped','AI_SPEND_UNCERTAIN',{notRequested:false});
      }
      row.response = response;
      const cost = estimateCost(response?.usage, response?.model ?? request.model);
      if (cost == null) {
        row.status = 'uncertain'; this.save();
        throw new BudgetError('Unknown usage or model price; paid budget stopped','AI_SPEND_UNCERTAIN',{notRequested:false});
      }
      row.costUsd = cost; row.status = 'settled'; row.completedAt = new Date().toISOString();
      if (cost > reserve) this.data.haltReason = 'Actual usage exceeded its reservation';
      this.save();
      if (cost > reserve) throw new BudgetError('Usage exceeded conservative reservation; inspect pricing before continuing','AI_BUDGET_HALTED',{notRequested:false});
      return response;
    };
  }
  close() {
    if (this.fd == null) return;
    closeSync(this.fd); this.fd = null; unlinkSync(this.lock);
  }
}
