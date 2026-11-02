// Read-only: tag coverage of the cartoon domain in a screen catalog, the same three shares as the series check of
// step 8 (LLM features at all, 5+ confident features, 5+ confident "likeable" features: like && infer && !risk).
// Usage: node research-vault/akinator-picker-2026-10/scripts/cartoon-coverage.mjs [catalog-screen.json] [domain=cartoon]
import { readFileSync } from 'node:fs';
import { SCREEN_FEATURES } from 'file:///E:/project/TASTIQ/src/aspects/screen.js';

const path = process.argv[2] ?? 'E:/project/TASTIQ/data/catalog-screen.json';
const domain = process.argv[3] ?? 'cartoon';
const items = JSON.parse(readFileSync(path, 'utf8')).items.filter((g) => g.domain === domain);
const byId = new Map(SCREEN_FEATURES.map((f) => [f.id, f]));
const present = (v) => v && v.r >= 0.5 && v.c >= 0.5;
const likeable = (f) => { const x = byId.get(f); return x && x.like && x.infer && !x.risk; };
const share = (test) => `${((100 * items.filter(test).length) / items.length).toFixed(1)} %`;
const confident = (g) => Object.values(g.features).filter(present).length;
const liked = (g) => Object.entries(g.features).filter(([f, v]) => present(v) && likeable(f)).length;
const llm = (g) => Object.values(g.features).some((v) => (v.src ?? []).includes('llm'));
console.log(`${domain}: ${items.length} titles`);
console.log(`LLM features: ${share(llm)}`);
console.log(`5+ confident features: ${share((g) => confident(g) >= 5)}`);
console.log(`5+ likeable features: ${share((g) => liked(g) >= 5)}`);
