import assert from 'node:assert/strict';
import { JyotishKernel } from '../src/application/JyotishKernel.js';
import { CalculationModuleRegistry } from '../src/application/services/CalculationModuleRegistry.js';
import { MemoryCalculationCache } from '../src/infrastructure/cache/MemoryCalculationCache.js';

const input = Object.freeze({ name: 'Architecture Test', sex: 'M', year: 1990, month: 1, day: 1, hour: 12, min: 0, sec: 0, lat: 28.6139, lon: 77.2090, tz: 5.5 });
const fakeCalculator = { calls: 0, async calculate(value) { this.calls++; return { input: value, ok: true }; } };
const cache = new MemoryCalculationCache({ maxEntries: 2 });
const kernel = new JyotishKernel({ calculator: fakeCalculator, cache, config: { cache: { enabled: true } } });
let moduleCalls = 0;
kernel.registerModule({ id: 'example-module', async execute(context) { moduleCalls++; return { chartSeen: !!context.chart }; } });

const first = await kernel.calculate(input);
const second = await kernel.calculate(input);
assert.equal(fakeCalculator.calls, 1);
assert.equal(moduleCalls, 2);
assert.equal(first.data.modules['example-module'].chartSeen, true);
assert.equal(second.data.modules['example-module'].chartSeen, true);
assert.equal(first.metadata.elapsedMs >= 0, true);

const registry = new CalculationModuleRegistry();
registry.register({ id: 'failing', async execute() { throw new Error('expected'); } });
const degraded = await registry.executeAll({});
assert.equal(degraded.diagnostics.length, 1);
assert.equal(degraded.diagnostics[0].status, 'ERROR');
console.log('\nModular architecture tests');
console.log('  ✓ dependency inversion through calculator port');
console.log('  ✓ runtime module registration and isolation');
console.log('  ✓ cache decorator prevents duplicate calculations');
console.log('  ✓ non-fatal module failures become diagnostics');
console.log('\n============================================================');
console.log('  4 passed, 0 failed');
console.log('============================================================');
