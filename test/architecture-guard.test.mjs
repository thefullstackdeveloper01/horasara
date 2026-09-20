import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function filesOf(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) { const path = join(directory, entry.name); if (entry.isDirectory()) result.push(...await filesOf(path)); else if (path.endsWith('.js')) result.push(path); }
  return result;
}

const coreFiles = await filesOf(new URL('../src/core/', import.meta.url).pathname);
for (const file of coreFiles) {
  const text = await readFile(file, 'utf8');
  const declarations = [...text.matchAll(/\b(?:export\s+)?(?:async\s+)?function\s+\w+\s*\(/g)];
  assert.ok(declarations.length <= 1, `${file} violates one-function-per-file rule`);
}
assert.equal(coreFiles.length, 5);
console.log('\nArchitecture guard');
console.log('  ✓ core files obey one-function-per-file rule');
console.log('  ✓ core directory contains only focused primitives');
console.log('  2 passed, 0 failed');
