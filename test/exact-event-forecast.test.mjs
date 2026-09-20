import assert from 'node:assert/strict';
import { findExactEventWindows } from '../src/prediction/exactEventForecast.js';
import { julianDay, jdToDate } from '../src/astronomy/utils.js';

// Regression: dated event timing must come from actual ephemeris boundaries,
// not the old +/-15-day heuristic. Sun is fast enough to provide a stable
// ingress test over a short interval.
const start = julianDay(2026, 1, 1, 0);
const windows = findExactEventWindows({
  config: {
    houses:[9],
    transitPlanets:['Sun'],
    supportingDasha:['Sun']
  },
  planets:[],
  ascendantLon:0,
  moonLon:0,
  currentJD:start,
  horizonDays:45,
  timezoneHours:5.5
});
assert.ok(windows.length > 0);
assert.ok(windows.every(w => Number.isFinite(w.startJD) && Number.isFinite(w.endJD)));
assert.ok(windows.every(w => w.start && /^\d{4}-\d{2}-\d{2}$/.test(w.start)));
assert.ok(windows.every(w => w.activationType === 'HOUSE_INGRESS_ACTIVATION' || w.activationType.includes('EXACT')));

// The output is calculation-JD driven: changing timezone changes the
// displayed calendar date when a boundary falls near midnight.
const utcDate = jdToDate(windows[0].startJD);
assert.equal(typeof utcDate.year, 'number');

console.log('exact event forecast tests: PASS');
