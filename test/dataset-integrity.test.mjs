import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import crypto from 'node:crypto';
import catalog from '../dataset/used/core/datasetCatalog.json' with { type: 'json' };

const root = new URL('..', import.meta.url).pathname;
const datasetDir = join(root, 'dataset');

const topDirs = readdirSync(datasetDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort();
assert.deepEqual(topDirs, ['unused', 'used'], 'dataset/ must contain only used/ and unused/');

const BUCKETS = ['core', 'library', 'validation'];
const usedDir = join(datasetDir, 'used');
const bucketDirs = readdirSync(usedDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort();
assert.deepEqual(bucketDirs, [...BUCKETS].sort(), 'dataset/used/ must contain exactly the core, library and validation buckets');

const onDisk = new Map();
for (const bucket of BUCKETS) {
  for (const name of readdirSync(join(usedDir, bucket)).filter(f => f.endsWith('.json') && f !== '_index.json' && f !== 'datasetCatalog.json')) {
    assert.ok(!onDisk.has(name), `dataset name collides across buckets: ${name}`);
    onDisk.set(name, bucket);
  }
}

const catalogNames = Object.keys(catalog.datasets).sort();
assert.deepEqual(catalogNames, [...onDisk.keys()].sort(), 'dataset catalog must cover every master JSON exactly once');
assert.equal(catalog.datasetCount, catalogNames.length, 'dataset count must match catalog');

for (const name of catalogNames) {
  const entry = catalog.datasets[name];
  const bucket = onDisk.get(name);
  assert.equal(entry.bucket, bucket, `catalog bucket mismatch: ${name}`);
  const path = join(usedDir, bucket, name);
  const raw = readFileSync(path, 'utf8');
  assert.doesNotThrow(() => JSON.parse(raw), `invalid JSON: ${name}`);
  const sha = crypto.createHash('sha256').update(raw).digest('hex');
  assert.equal(sha, entry.sha256, `checksum mismatch: ${name}`);
  assert.equal(statSync(path).size, entry.bytes, `size mismatch: ${name}`);
}

console.log('\nMaster dataset integrity');
console.log(`  ✓ ${catalogNames.length} JSON datasets are valid, catalogued across used/core, used/library and used/validation, and checksum-verified`);
console.log('  ✓ dataset/ holds only the used/ and unused/ directories');
console.log('  ✓ no untracked dataset JSON files');
console.log('\n============================================================');
console.log('  5 passed, 0 failed');
console.log('============================================================');
