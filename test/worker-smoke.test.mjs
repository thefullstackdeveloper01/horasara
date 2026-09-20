import assert from 'node:assert/strict';
import { WorkerChartCalculator } from '../src/infrastructure/calculation/WorkerChartCalculator.js';
const calculator = new WorkerChartCalculator({ timeoutMs: 30000 });
const chart = await calculator.calculate({ year: 1990, month: 1, day: 1, hour: 12, min: 0, sec: 0, lat: 23.0225, lon: 72.5714, tz: 5.5 });
assert.ok(chart.planets.length >= 9);
assert.equal(chart.houses.length, 12);
console.log('\nWorker calculation isolation');
console.log('  ✓ worker-thread chart calculation returns complete chart');
console.log('  2 passed, 0 failed');
