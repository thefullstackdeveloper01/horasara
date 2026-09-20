import assert from 'node:assert/strict';
import { buildCalculationAssurance, validateOutcomeGate, buildReproducibilityManifest, ASSURANCE_LEVELS } from '../src/quality/ScientificAssurance.js';
import { buildSystemInventory, STANDARD_VARGAS } from '../src/quality/SystemInventory.js';
import { listHouseSystems } from '../src/charts/HouseSystemRegistry.js';
import { listAlgorithms } from '../src/quality/AlgorithmRegistry.js';

const inv = buildSystemInventory();
assert.equal(inv.standardVargas.length, 16);
assert.deepEqual(inv.standardVargas.map(x=>x.chart), STANDARD_VARGAS);
assert.ok(inv.houseSystems.length >= 6);
assert.ok(inv.dasha.catalogueCount >= 30);
assert.equal(inv.claimsPolicy.jhoraParity, 'NOT_CLAIMED_WITHOUT_SYSTEM_BY_SYSTEM_REFERENCE_CHECK');

const blocked = validateOutcomeGate({eligibleCases:29, independent:false, leakageDetected:false, metrics:{brier:0.2}});
assert.equal(blocked.status, 'BLOCKED');
const passed = validateOutcomeGate({eligibleCases:100, independent:true, leakageDetected:false, metrics:{brier:0.2, accuracy:0.7}});
assert.equal(passed.status, 'PASSED');

const assurance = buildCalculationAssurance({
  calculation:{deterministic:true},
  invariants:[{passed:true}],
  referenceChecks:[{passed:true,independent:true}],
  ruleProvenance:[{source:'BPHS',formulaId:'D4-Q4'}],
  outcomeValidation:passed,
});
assert.equal(assurance.level, ASSURANCE_LEVELS.EMPIRICALLY_VALIDATED);
assert.equal(assurance.claims.scientificProofOfAstrology, false);

const m = buildReproducibilityManifest({input:{jd:2451545},result:{x:1},algorithmVersion:'14.0.0',datasetFingerprints:{a:'abc'}});
assert.match(m.reproducibilityFingerprint,/^[a-f0-9]{64}$/);
assert.equal(listHouseSystems().length, inv.houseSystems.length);
assert.ok(listAlgorithms().length >= 35);
assert.ok(listAlgorithms().some(x => x.id === 'ASTRO-VSOP87' && x.limitation));

console.log('v14 scientific assurance tests: PASS');
