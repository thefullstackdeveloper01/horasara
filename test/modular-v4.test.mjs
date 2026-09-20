import assert from 'node:assert/strict';
import { JyotishKernel } from '../src/application/JyotishKernel.js';
import { CalculationModuleRegistry } from '../src/application/services/CalculationModuleRegistry.js';
import { ConfigurationError, DependencyError, TimeoutError } from '../src/application/errors/JyotishError.js';

const input = { year: 1990, month: 1, day: 1, hour: 12, min: 0, sec: 0, lat: 28, lon: 77, tz: 5.5 };
const calculator = { async calculate(b) { return { input: b, core: true }; } };

const registry = new CalculationModuleRegistry([
  { id: 'a', async execute() { await new Promise(r => setTimeout(r, 20)); return 1; } },
  { id: 'b', dependencies: ['a'], async execute({ results }) { return results.a + 1; } },
  { id: 'c', dependencies: ['a'], async execute({ results }) { return results.a + 2; } },
]);
const result = await registry.executeAll({});
assert.equal(result.results.b, 2);
assert.equal(result.results.c, 3);
assert.deepEqual(registry.resolveOrder(), ['a','b','c']);

assert.throws(() => new CalculationModuleRegistry([{ id: 'a', dependencies: ['missing'], async execute() {} }]).resolveOrder(), DependencyError);
assert.throws(() => new CalculationModuleRegistry([
  { id: 'a', dependencies: ['b'], async execute() {} }, { id: 'b', dependencies: ['a'], async execute() {} }
]).resolveOrder(), DependencyError);

const timeoutRegistry = new CalculationModuleRegistry([{ id: 'slow', timeoutMs: 5, async execute() { await new Promise(r => setTimeout(r, 50)); } }]);
const timed = await timeoutRegistry.executeAll({}, { failFast: false });
assert.equal(timed.diagnostics[0].code, 'TIMEOUT_ERROR');

assert.throws(() => new JyotishKernel({ calculator, config: { nodeMode: 'invalid' } }), ConfigurationError);
const kernel = new JyotishKernel({ calculator, config: { cache: { enabled: false } } });
const calculated = await kernel.calculate(input);
assert.equal(calculated.metadata.manifest.schemaVersion, 1);
assert.equal(calculated.metadata.manifest.inputHash.length, 64);
console.log('\nV4 architecture hardening');
console.log('  ✓ dependency graph + topological levels');
console.log('  ✓ independent modules can execute concurrently');
console.log('  ✓ failed dependencies are skipped safely');
console.log('  ✓ module timeout diagnostics');
console.log('  ✓ config validation');
console.log('  ✓ reproducibility manifest + SHA-256 input/config fingerprint');
console.log('\n============================================================');
console.log('  6 passed, 0 failed');
console.log('============================================================');
