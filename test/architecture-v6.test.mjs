import assert from 'node:assert/strict';
import { CalculationContext } from '../src/application/context/CalculationContext.js';
import { FeatureCapabilityRegistry } from '../src/application/services/FeatureCapabilityRegistry.js';
import { EvidenceLedger } from '../src/domain/evidence/EvidenceLedger.js';
import { ConfidenceEngine } from '../src/domain/confidence/ConfidenceEngine.js';
import { SchemaRegistry, objectSchema } from '../src/infrastructure/schema/SchemaRegistry.js';
import { FunctionEphemerisProvider } from '../src/infrastructure/astronomy/EphemerisProvider.js';
import { ReportSectionRegistry } from '../src/infrastructure/report/ReportSectionRegistry.js';
import { ReportQualityGate } from '../src/application/services/ReportQualityGate.js';
import { mergeCalculationConfig } from '../src/infrastructure/config/CalculationConfig.js';
import { CalculationManifest } from '../src/domain/value-objects/CalculationManifest.js';

const birth = Object.freeze({ year: 1990, month: 1, day: 1 });
const context = new CalculationContext({ birth });
assert.equal(context.birth, birth);
assert.throws(() => { context.results.x = 1; }, TypeError);

const features = new FeatureCapabilityRegistry();
assert.equal(features.get('LAL_KITAB').status, 'PARTIAL');
assert.equal(features.get('DOES_NOT_EXIST').status, 'NOT_IMPLEMENTED');

const ledger = new EvidenceLedger().add({ predictionId: 'career', ruleId: 'r1', confidence: 'HIGH' });
assert.equal(ledger.forPrediction('career').length, 1);

const confidence = new ConfidenceEngine().evaluate({ calculationValidation: 1, birthTime: 1, datasetCompleteness: 1, ruleAvailability: 1, crossSystemAgreement: 1, inputPrecision: 1, boundarySensitivity: 1 });
assert.equal(confidence.level, 'HIGH'); assert.equal(confidence.probabilistic, false);

const schemas = new SchemaRegistry().register('birth', objectSchema(['year'], ['month']));
assert.equal(schemas.validate('birth', { year: 2000 }), true);
assert.throws(() => schemas.validate('birth', {}));

const eph = new FunctionEphemerisProvider({ id: 'test', version: '1.0.0', precision: 'fixture', calculate: () => ({ Sun: 1 }) });
assert.deepEqual(eph.positions({}), { Sun: 1 });

const sections = new ReportSectionRegistry([{ id: 'A', title: 'A', render() {} }]);
assert.equal(sections.list().length, 1);
assert.equal(new ReportQualityGate().validate({ result: { metadata: { manifest: {} } }, requestedFeatures: ['LAGNA'], capabilityRegistry: features }).ok, true);

const cfg = mergeCalculationConfig({ diagnostics: { explainability: 'AUDIT' }, quality: { strict: true } });
assert.equal(cfg.schemaVersion, 3); assert.equal(cfg.quality.strict, true);
const manifestA = new CalculationManifest({ config: cfg, input: birth, featureSet: ['A', 'B'] });
const manifestB = new CalculationManifest({ config: cfg, input: birth, featureSet: ['B', 'A'] });
assert.equal(manifestA.fingerprint, manifestB.fingerprint);
assert.equal(manifestA.schemaVersion, 3);
console.log('\nArchitecture v6 foundation tests');
console.log('  ✓ context, capability, evidence, confidence, schemas');
console.log('  ✓ ephemeris/report boundaries and quality gate');
console.log('  ✓ strict config and deterministic manifest fingerprint');
console.log('\n============================================================');
console.log('  10 passed, 0 failed');
console.log('============================================================');
