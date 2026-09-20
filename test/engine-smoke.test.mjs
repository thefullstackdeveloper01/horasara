import assert from 'node:assert/strict';
import { calculateChart } from '../src/engine.js';

const birth = {
  name: 'Test Person', sex: 'Neutral', year: 1990, month: 5, day: 15,
  hour: 14, min: 30, sec: 0, lat: 28.6139, lon: 77.2090, tz: 5.5,
  ayanamsaMode: 'lahiri', houseSystem: 'whole', nodeMode: 'true',
  calculationDateTime: '2026-09-08T12:00:00Z'
};

const result = await calculateChart(birth);
assert.equal(result.meta.calculationDateTime, '2026-09-08T12:00:00.000Z');
assert.equal(result.meta.year, 1990);
assert.ok(result.planets.length >= 9); assert.ok(result.planets.some(p => p.name === 'Sun')); 
assert.equal(result.houses.length, 12);
assert.ok(Array.isArray(result.meta.calculationDiagnostics));
assert.ok(result.planets.every(p => Number.isFinite(Number(p.siderealLon))));

console.log('\nEngine smoke test');
console.log('  ✓ deterministic calculation clock is honored');
console.log('  ✓ chart contains 9 grahas and 12 houses');
console.log('  ✓ calculation diagnostics are exposed');
console.log('\n============================================================');
console.log('  3 passed, 0 failed');
console.log('============================================================');
process.exit(0);
