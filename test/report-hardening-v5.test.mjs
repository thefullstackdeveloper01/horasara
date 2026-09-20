import assert from 'node:assert/strict';
import { normalizeElapsedMs } from '../cli/report/reportTiming.js';
import { resetSectionNumbering, section } from '../cli/console-ui.js';
import { calcCustomVarga, calcVargaVariant } from '../src/charts/vargas.js';
import { calculateChart } from '../src/engine.js';
import ishta from '../dataset/used/core/ishta_devata_mapping.json' with { type: 'json' };
import jadi from '../dataset/used/core/jadi_herbs.json' with { type: 'json' };

assert.equal(normalizeElapsedMs(12.5), 12.5);
assert.ok(Math.abs(normalizeElapsedMs([1, 500000000]) - 1500) < 1e-9);
assert.ok(Math.abs(normalizeElapsedMs(1500000000n) - 1500) < 1e-9);
assert.equal(normalizeElapsedMs({ elapsedMs: 7 }), 7);

for (const d of [1, 2, 3, 4, 7, 9, 16, 24, 60, 108, 300]) {
  const s = calcCustomVarga(123.456, d);
  assert.equal(Number.isInteger(s), true);
  assert.ok(s >= 0 && s < 12);
}
assert.equal(Number.isInteger(calcVargaVariant(10, 2, 'parashari')), true);
assert.throws(() => calcCustomVarga(1, 301), /D1 through D300/);
assert.equal(ishta.mappings.length, 7);
assert.equal(new Set(ishta.mappings.map(x => x.atmakarakaPlanet)).size, 7);
assert.equal(jadi.jadis.length, 9);
const chart = await calculateChart({ name:'Boundary Test', sex:'M', year:1990, month:6, day:15, hour:10, min:30, sec:0, lat:23.0225, lon:72.5714, tz:5.5, place:'Ahmedabad', timeConfidence:'exact', timeSource:'birth certificate' });
assert.equal(chart.meta.place, 'Ahmedabad');
assert.equal(chart.meta.calendarSystem.samvatYear.status, 'AVAILABLE');
assert.equal(chart.meta.ephemeris.model, 'Abridged VSOP87 (Meeus tables)');
assert.equal(chart.westernChart.planets.filter(p => ['Uranus','Neptune','Pluto'].includes(p.planet)).length, 3);

assert.equal(new Set(jadi.jadis.map(x => x.planet)).size, 9);

const oldLog = console.log;
const lines = [];
console.log = (...args) => lines.push(args.join(' '));
try {
  resetSectionNumbering();
  section('4. FIRST');
  section('26. SECOND');
  section('64–65. MERGED');
} finally { console.log = oldLog; }
const headings = lines.filter(x => x.includes('▓▓▓ '));
assert.ok(headings[0].includes('1. FIRST'));
assert.ok(headings[1].includes('2. SECOND'));
assert.ok(headings[2].includes('3. MERGED'));

console.log('\nV5 hardening');
console.log('  ✓ elapsed timing normalization, D1-D300 validation, complete 7/9 reference keys, and contiguous report numbering');
console.log('  6 passed, 0 failed');
