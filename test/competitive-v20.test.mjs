import assert from 'node:assert/strict';
import { listJsonDatasets, buildDatasetSummary } from '../src/dataset/DatasetCatalog.js';
import { reconcileEvidence } from '../src/prediction/CompetitiveEvidenceEngine.js';
import { evaluateDatasetRules } from '../src/prediction/DatasetRuleEngine.js';

const datasets = listJsonDatasets();
assert.ok(datasets.length > 100, `expected a substantial offline dataset library, got ${datasets.length}`);
assert.equal(datasets.filter(x => !x.validJson).length, 0, 'all bundled JSON datasets must parse');
assert.ok(datasets.some(x => x.name === 'career_prediction_rules.json'));

const summary = buildDatasetSummary();
assert.equal(summary.offline, true);
assert.equal(summary.count, datasets.length);

const rules = evaluateDatasetRules([
  { id: 'R1', conditions: [{ path: 'chart.lagna', equals: 'Aries' }], source: 'test', explanation: 'Matched' },
  { id: 'R2', conditions: [{ path: 'chart.lagna', equals: 'Taurus' }], source: 'test' },
], { chart: { lagna: 'Aries' } });
assert.equal(rules.filter(r => r.matched).length, 1);

const evidence = reconcileEvidence([
  { system: 'PARASHARI', items: [{ direction: 'SUPPORT', strength: 80, provenance: 'R1' }] },
  { system: 'KP', items: [{ direction: 'OPPOSE', strength: 60, provenance: 'R2' }] },
]);
assert.equal(evidence.conflict, true);
assert.equal(evidence.systems.length, 2);
assert.ok(evidence.netEvidenceScore >= 0 && evidence.netEvidenceScore <= 100);
console.log(`v20 competitive deep-closure: PASS (${datasets.length} JSON datasets)`);
