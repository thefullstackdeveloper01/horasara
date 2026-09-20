/**
 * Dataset resolver.
 *
 * Every wired dataset lives under dataset/used/<bucket>/. This store resolves a
 * dataset by name across all buckets without ever building a filesystem path
 * from user input. Static imports remain preferred for hot-path core tables;
 * this store serves optional, reference and corpus material.
 */
import { readFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { BUCKETS, bucketDir, listJsonDatasets } from '../dataset/DatasetCatalog.js';

let resolved = null;
function table() {
  if (resolved) return resolved;
  resolved = new Map();
  for (const d of listJsonDatasets()) if (!resolved.has(d.name)) resolved.set(d.name, d);
  return resolved;
}

function safeEntry(name) {
  const normalized = basename(String(name));
  if (normalized !== String(name)) throw new Error(`Unknown master dataset: ${name}`);
  const entry = table().get(normalized) || table().get(`${normalized}.json`);
  if (!entry) throw new Error(`Unknown master dataset: ${name}`);
  return entry;
}

export function listDatasets(bucket) {
  return listJsonDatasets(bucket).map(d => ({ name: d.name, bucket: d.bucket, path: d.path, bytes: d.bytes }));
}

export async function loadDataset(name) {
  const entry = safeEntry(name);
  const path = join(bucketDir(entry.bucket), entry.name);
  if (!existsSync(path)) throw new Error(`Master dataset missing at runtime: ${entry.path}`);
  return JSON.parse(await readFile(path, 'utf8'));
}

export function loadDatasetSync(name) {
  const entry = safeEntry(name);
  return JSON.parse(readFileSync(join(bucketDir(entry.bucket), entry.name), 'utf8'));
}

export function hasDataset(name) {
  try { return !!safeEntry(name); } catch { return false; }
}

export function resolveDataset(name) {
  try { const e = safeEntry(name); return { ...e }; } catch { return null; }
}

export { BUCKETS };
