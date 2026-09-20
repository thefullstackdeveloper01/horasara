import {readFile} from 'node:fs/promises';
const d=JSON.parse(await readFile('dataset/used/validation/v10_cross-engine-benchmark.json','utf8'));console.log(`V10 cross-engine benchmark: ${d.cases.length} cases; engines=${d.engines.join(', ')}; status=${d.status}`);
