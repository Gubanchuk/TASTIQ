import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from './fsx.js';

const PART_BYTES = 24 * 1024 * 1024;
const PART_FILE = /^[\w-]+\.part-\d{4,}-[a-f0-9]{16}\.json$/;
const localPath = path => path instanceof URL ? fileURLToPath(path) : path;

function partNames(manifest, path) {
  if (!Object.hasOwn(manifest, 'parts')) return null;
  const { parts } = manifest;
  if (!Array.isArray(parts) || parts.some(file => typeof file !== 'string' || !PART_FILE.test(file))
      || new Set(parts).size !== parts.length) {
    throw new Error(`Invalid screen catalog parts: ${path}`);
  }
  return parts;
}

export function screenCatalogPartFiles(path) {
  return partNames(readJson(path), path) ?? [];
}

export function readScreenCatalog(path, fallback) {
  const manifest = readJson(path, fallback);
  if (manifest == null) return manifest;
  const parts = partNames(manifest, path);
  if (!parts) return manifest;

  const { parts: _, ...metadata } = manifest;
  const root = dirname(localPath(path));
  const items = parts.flatMap(name => {
    const chunk = readJson(join(root, name));
    if (!Array.isArray(chunk)) throw new Error(`Invalid screen catalog part: ${name}`);
    return chunk;
  });
  if (metadata.stats?.titles != null && items.length !== metadata.stats.titles) {
    throw new Error(`Screen catalog title count does not match its manifest: ${path}`);
  }
  return { ...metadata, items };
}

function replaceFile(path, body) {
  const pending = join(dirname(path), `.${basename(path)}-${randomUUID()}.tmp`);
  try {
    writeFileSync(pending, body, { encoding: 'utf8', flag: 'wx' });
    renameSync(pending, path);
  } finally {
    if (existsSync(pending)) unlinkSync(pending);
  }
}

/** Publish the manifest last. Parts are immutable so a reader can finish loading the previous version. */
export function writeScreenCatalog(path, { items, parts: _, ...metadata }, { partBytes = PART_BYTES } = {}) {
  path = localPath(path);
  if (!Array.isArray(items) || !Number.isSafeInteger(partBytes) || partBytes < 3) {
    throw new Error('Invalid screen catalog items or part size');
  }
  const root = dirname(path);
  const stem = basename(path, '.json');
  if (!/^[\w-]+$/.test(stem)) throw new Error(`Invalid screen catalog filename: ${path}`);
  mkdirSync(root, { recursive: true });

  const parts = [];
  let rows = [];
  let bytes = 3; // [] and final newline
  function flush() {
    if (!rows.length) return;
    const body = `[${rows.join(',')}]\n`;
    const digest = createHash('sha256').update(body).digest('hex').slice(0, 16);
    const number = String(parts.length + 1).padStart(4, '0');
    const name = `${stem}.part-${number}-${digest}.json`;
    const target = join(root, name);
    if (!existsSync(target)) replaceFile(target, body);
    parts.push(name);
    rows = [];
    bytes = 3;
  }

  for (const item of items) {
    const row = JSON.stringify(item);
    const size = Buffer.byteLength(row);
    if (size + 3 > partBytes) throw new Error(`A screen catalog item exceeds the part size: ${item.id}`);
    if (rows.length && bytes + size + 1 > partBytes) flush();
    bytes += size + (rows.length ? 1 : 0);
    rows.push(row);
  }
  flush();
  replaceFile(path, JSON.stringify({ ...metadata, parts }) + '\n');
  return parts;
}
