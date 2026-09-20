import assert from 'node:assert/strict';
import { ProductionReadinessGate } from '../src/application/services/ProductionReadinessGate.js';

const gate = new ProductionReadinessGate();
const r = gate.evaluate({ accuracyClaim: true, empiricalDatasetAvailable: false });
assert.equal(r.releaseStatus, 'NOT_PRODUCTION_FINAL');
assert.ok(r.partial > 0);
assert.ok(r.fail > 0);
assert.equal(r.accuracyClaimAllowed, false);

const synthetic = new ProductionReadinessGate({
  requirements:[{id:1,name:'x',currentStatus:'PASS'}]
});
assert.equal(synthetic.evaluate().releaseStatus, 'PRODUCTION_FINAL');
console.log('Production Final gate: PASS');
