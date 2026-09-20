/**
 * DatasetCatalog — runtime inventory of the complete offline knowledge base.
 *
 * The database is organised into four wired buckets under dataset/used:
 *   core       engine tables, rule sets, configuration and registries
 *   library    classical text corpus (indexed by dataset/used/library/_index.json)
 *   validation benchmark, outcome and gate corpora
 *
 * dataset/unused holds material nothing in the application reads.
 */
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATASET_ROOT = join(fileURLToPath(new URL('../../', import.meta.url)), 'dataset');
export const USED_ROOT = join(DATASET_ROOT, 'used');
export const BUCKETS = Object.freeze(['core', 'library', 'validation']);

export function bucketDir(bucket) {
  if (!BUCKETS.includes(bucket)) throw new Error(`Unknown dataset bucket: ${bucket}`);
  return join(USED_ROOT, bucket);
}

function inspect(bucket, name) {
  const filePath = join(bucketDir(bucket), name);
  const bytes = statSync(filePath).size;
  let validJson = true;
  let topLevel = 'unknown';
  // The library bucket is read through its index; parsing 330 MB here would be wasteful.
  if (bucket === 'library') {
    topLevel = 'object';
  } else {
    try {
      const value = JSON.parse(readFileSync(filePath, 'utf8'));
      topLevel = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
    } catch { validJson = false; }
  }
  return Object.freeze({ name, bucket, path: `dataset/used/${bucket}/${name}`, bytes, validJson, topLevel });
}

export function listJsonDatasets(bucket) {
  const buckets = bucket ? [bucket] : BUCKETS;
  const out = [];
  for (const b of buckets) {
    const dir = bucketDir(b);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).filter(n => n.toLowerCase().endsWith('.json') && n !== '_index.json').sort((a, z) => a.localeCompare(z))) {
      out.push(inspect(b, name));
    }
  }
  return out;
}

export function buildDatasetSummary() {
  const datasets = listJsonDatasets();
  const byBucket = {};
  for (const b of BUCKETS) {
    const items = datasets.filter(d => d.bucket === b);
    byBucket[b] = { count: items.length, bytes: items.reduce((s, d) => s + d.bytes, 0) };
  }
  return Object.freeze({
    generatedAt: new Date().toISOString(),
    offline: true,
    count: datasets.length,
    bytes: datasets.reduce((s, d) => s + d.bytes, 0),
    byBucket,
    invalidJson: datasets.filter(x => !x.validJson).map(x => x.path),
    datasets,
  });
}
