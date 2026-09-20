import assert from 'node:assert/strict';
import fs from 'node:fs';
import { calcTrueNode, trueNode, getAllPlanetPositions } from '../src/astronomy/vsop87.js';
import { lahiriAyanamsa, deltaT } from '../src/astronomy/utils.js';
import { buildCalculationAssurance, validateOutcomeGate, buildReproducibilityManifest } from '../src/quality/ScientificAssurance.js';
import { angularErrorDeg, benchmarkGoldenPositions, boundarySensitivity, buildCalculationProvenance } from '../src/quality/ScientificBenchmark.js';
import { buildPredictionTimeline } from '../src/prediction/predictionTimeline.js';
import { generateUnifiedPrediction } from '../src/prediction/unifiedEngine.js';

const golden=JSON.parse(fs.readFileSync(new URL('./fixtures/ephemeris-golden.json',import.meta.url),'utf8'));

assert.ok(Math.abs(lahiriAyanamsa(golden.fixtures[0].jd)-golden.fixtures[0].ayanamsa)<1e-6,'Lahiri golden epoch mismatch');

for (const jd of [2415020.5,2451545,2488069.5]) {
  const n=calcTrueNode(jd);
  const h=0.25;
  let d=trueNode(jd+h)-trueNode(jd-h);
  if(d>180)d-=360;if(d<-180)d+=360;
  assert.ok(Math.abs(n.speed-d/(2*h))<1e-12,'True node speed must be derived from longitude');
  assert.equal(n.retrograde,n.speed<0);
}

const actualRows=golden.fixtures.slice(0,50).map(f=>({id:f.id,positions:getAllPlanetPositions(f.jd,deltaT(new Date((f.jd-2440587.5)*86400000).getUTCFullYear()))}));
const refRows=golden.fixtures.slice(0,50);
const bench=benchmarkGoldenPositions(actualRows,refRows,{toleranceDeg:0.1,bodies:['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']});
assert.equal(bench.status,'PASS');
assert.ok(bench.maxErrorDeg<=0.1);

assert.ok(Math.abs(angularErrorDeg(359.9,0.1)-0.2)<1e-12);
assert.equal(boundarySensitivity(29.995).nearBoundary,true);

const timeline=buildPredictionTimeline({
  predictions:{career:{currentDasha:'Jupiter',eventTimings:[{start:'2027-01-01',end:'2027-02-01',startJD:2461406.5,endJD:2461437.5,evidenceScore:78,confidenceLabel:'High',trigger:'Jupiter entering Taurus',triggerPlanet:'Jupiter'}]}},
});
assert.equal(timeline.status,'AVAILABLE');
assert.equal(timeline.highlighted.length,1);
assert.deepEqual(timeline.rows[0].highlightedFactors,['Current Dasha: Jupiter','Jupiter transit']);

const gate=validateOutcomeGate({eligibleCases:99,metrics:{brier:0.1},independent:true,leakageDetected:false});
assert.equal(gate.status,'BLOCKED');
assert.equal(gate.reasons[0].includes('100'),true);

const assurance=buildCalculationAssurance({
  calculation:{deterministic:true},
  invariants:[{passed:true}],
  referenceChecks:[{passed:true,independent:true}],
  ruleProvenance:[{source:'BPHS',formulaId:'TEST-1'}],
});
assert.equal(assurance.level,'REFERENCE_VERIFIED');
assert.equal(assurance.claims.scientificProofOfAstrology,false);

const manifest=buildReproducibilityManifest({input:{a:1},result:{b:2},algorithmVersion:'16.0.0',datasetFingerprints:{golden:'x'}});
const provenance=buildCalculationProvenance({algorithmVersion:'16.0.0',providerId:'internal-vsop87-abridged',providerVersion:'reference-calibrated-lahiri',input:{a:1}});
assert.equal(manifest.reproducibilityFingerprint.length,64);
assert.equal(provenance.reproducibilityFingerprint.length,64);

console.log('v16-accuracy-upgrade: PASS');
console.log(`Lahiri golden sample: ${golden.fixtures.length} epochs; benchmark max error (50 sample): ${bench.maxErrorDeg.toFixed(4)}°`);
