import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DATA = resolve(ROOT, 'data');
export const RAW = resolve(DATA, 'raw');

export function readJson(path, fallback) {
  if (!existsSync(path)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`File not found: ${path}`);
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeJson(path, value, pretty = true) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, pretty ? 2 : 0) + '\n', 'utf8');
}
