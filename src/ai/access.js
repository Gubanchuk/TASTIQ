// Who may use the AI picker. Today everyone (AI_ACCESS=all, the default). Later only people who paid or were let in
// by hand: AI_ACCESS=list admits the browser ids listed in data/ai-access.json ({ "users": ["<uid>", ...] }); the
// picker page sends its anonymous id with every AI request, so a grant only needs that id. AI_ACCESS=off turns the
// feature off. Limits per browser and per day keep an open prototype from running up the API bill.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DATA } from '../lib/fsx.js';
import './config.js';

export const AI_LIMITS = {
  access: process.env.AI_ACCESS ?? 'all', // all | list | off
  perHour: Number(process.env.AI_PER_HOUR ?? 30), // AI picks per browser id (or IP) per hour
  perDay: Number(process.env.AI_PER_DAY ?? 500), // AI picks for the whole site per day
};
const GRANTS = resolve(DATA, 'ai-access.json');

const calls = new Map(); // who → timestamps of the last hour
let day = { date: '', count: 0 };

function granted(uid) {
  if (!uid || !existsSync(GRANTS)) return false;
  try {
    return (JSON.parse(readFileSync(GRANTS, 'utf8')).users ?? []).includes(uid);
  } catch {
    return false;
  }
}

/** Whether this browser may use the AI picker now; reason is shown to the person when not. */
export function aiAccess({ uid = null, ip = null } = {}, now = Date.now()) {
  if (!process.env.OPENAI_API_KEY?.trim()) return { allowed: false, reason: 'нейросеть не подключена' };
  if (AI_LIMITS.access === 'off') return { allowed: false, reason: 'нейросеть выключена' };
  if (AI_LIMITS.access === 'list' && !granted(uid)) return { allowed: false, reason: 'нейросеть доступна по подписке', locked: true };
  const today = new Date(now).toISOString().slice(0, 10);
  if (day.date === today && day.count >= AI_LIMITS.perDay) return { allowed: false, reason: 'на сегодня лимит нейросети исчерпан' };
  const key = uid ?? ip ?? 'anon';
  const recent = (calls.get(key) ?? []).filter((t) => now - t < 3_600_000);
  if (recent.length >= AI_LIMITS.perHour) return { allowed: false, reason: 'слишком много подборов за час, попробуй позже' };
  return { allowed: true };
}

/** Counts one AI request against the limits. */
export function aiSpend({ uid = null, ip = null } = {}, now = Date.now()) {
  const key = uid ?? ip ?? 'anon';
  calls.set(key, [...(calls.get(key) ?? []).filter((t) => now - t < 3_600_000), now]);
  const today = new Date(now).toISOString().slice(0, 10);
  day = day.date === today ? { date: today, count: day.count + 1 } : { date: today, count: 1 };
}
