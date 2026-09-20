import assert from 'node:assert/strict';
import { calculateChart } from '../src/engine.js';
import { buildHoraSaarReport } from '../src/reporting/HoraSaarReportEngine.js';

const R = await calculateChart({
  name:'Requested Report Regression', sex:'Male', year:1990, month:1, day:1,
  hour:12, min:0, sec:0, lat:23.0225, lon:72.5714, tz:5.5,
  calculationDateTime:'2026-09-19T07:00:00+05:30'
});

assert.ok(Array.isArray(R.avkahadaPhala) && R.avkahadaPhala.length >= 13, 'Avkahada must expose all components');
assert.equal(R.nakshatraDeepReport?.status, undefined, 'Nakshatra Deep must be populated');
assert.ok(R.nakshatraDeepReport?.name, 'Nakshatra Deep name missing');
assert.ok(R.lkFull && R.lalKitabTiming, 'Lal Kitab data/timing missing');
assert.ok(R.numerology?.numbers?.driver && R.numerology?.numbers?.lifePath && R.numerology?.numbers?.destiny, 'Numerology core numbers missing');

const report = buildHoraSaarReport(R);
assert.ok(report.sections.some(s => s.id === 'nakshatra-deep'));
assert.ok(report.sections.some(s => s.id === 'lalkitab'));
assert.ok(report.sections.some(s => s.id === 'numerology'));
assert.ok(report.sections.some(s => s.id === 'avkahada'));
assert.ok(report.sections.some(s => s.id === 'report-completeness'));
assert.equal(report.completeness.status, 'COMPLETE');
assert.equal(report.completeness.overallPercent, 100);
console.log('Requested report completeness regression: PASS');
