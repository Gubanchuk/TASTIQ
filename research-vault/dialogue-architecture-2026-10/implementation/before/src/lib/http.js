import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { RAW, readJson, writeJson } from './fsx.js';

const USER_AGENT = 'TASTIQ-prototype/0.1 (game recommender research)';

/** Keeps at least `intervalMs` between calls that share the limiter. */
export class RateLimiter {
  constructor(intervalMs) {
    this.intervalMs = intervalMs;
    this.next = 0;
  }

  async wait() {
    const now = Date.now();
    const at = Math.max(now, this.next);
    this.next = at + this.intervalMs;
    if (at > now) await sleep(at - now);
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * GET JSON with a disk cache under data/raw/cache, retries and a shared rate limiter.
 * The cache makes every pipeline step restartable without hitting the APIs again.
 */
export async function getJson(url, { limiter, headers = {}, retries = 4, cache = true } = {}) {
  const key = createHash('sha1').update(url).digest('hex');
  const cachePath = resolve(RAW, 'cache', key.slice(0, 2), `${key}.json`);
  if (cache) {
    const hit = readJson(cachePath, null);
    if (hit !== null) return hit.body;
  }

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (limiter) await limiter.wait();
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...headers },
        signal: AbortSignal.timeout(60_000),
      });
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`HTTP ${res.status} for ${url}`);
        // Wikipedia and others say how long to wait; waiting less keeps their limit used up.
        const retryAfter = Number(res.headers.get('retry-after'));
        await sleep(retryAfter > 0 ? retryAfter * 1_000 + 500 : 5_000 * 2 ** attempt);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const body = await res.json();
      if (cache) writeJson(cachePath, { url, fetchedAt: new Date().toISOString(), body }, false);
      return body;
    } catch (err) {
      lastError = err;
      await sleep(2_000 * 2 ** attempt);
    }
  }
  throw lastError;
}

/** Runs `fn` over items with a fixed number of concurrent workers. */
export async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
