import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDatasetSummary } from '../src/dataset/DatasetCatalog.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'dataset', 'used', 'core', 'all-json-catalog.json');
const summary = buildDatasetSummary();
await writeFile(output, JSON.stringify(summary, null, 2) + '\n', 'utf8');
console.log(`Dataset catalog: ${summary.count} JSON files; invalid=${summary.invalidJson.length}`);
