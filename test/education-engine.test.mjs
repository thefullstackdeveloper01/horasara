import assert from 'node:assert/strict';
import { calculateChart } from '../src/engine.js';
import { buildEducationProfile } from '../src/prediction/educationEngine.js';
import { EVENT_RULES } from '../src/prediction/rules/eventRules.js';

const birth = {
  name: 'Education Engine Test', sex: 'Neutral', year: 1990, month: 5, day: 15,
  hour: 14, min: 30, sec: 0, lat: 28.6139, lon: 77.2090, tz: 5.5,
  ayanamsaMode: 'lahiri', houseSystem: 'whole', nodeMode: 'true',
};

const R = await calculateChart(birth);

// ── Education engine is wired into the main result ─────────────────────────
assert.ok(R.education, 'result.education must be present');
assert.equal(R.education.status, 'AVAILABLE');
assert.equal(R.education.houses.length, 3);
assert.deepEqual(R.education.houses.map(h => h.house), [4, 5, 9]);
assert.equal(R.education.karakas.length, 2);
assert.deepEqual(R.education.karakas.map(k => k.planet), ['Mercury', 'Jupiter']);
assert.ok(['Well-supported', 'Some supporting factors', 'Limited chart evidence'].includes(R.education.evidenceStrength));
assert.ok(typeof R.education.disclaimer === 'string' && R.education.disclaimer.length > 0);

// Standalone call with missing data must fail closed, not fabricate.
const empty = buildEducationProfile({});
assert.equal(empty.status, 'NOT_AVAILABLE');

// ── BPHS life-area facade now includes 'education' ──────────────────────────
assert.ok(R.bphsPredictions?.education, 'bphsPredictions.education must be present');
assert.equal(R.bphsPredictions.education.area, 'education');

// ── Declarative event rules include the two new Education rows ─────────────
assert.equal(EVENT_RULES.length, 12);
const eduRules = EVENT_RULES.filter(r => r.area === 'education');
assert.equal(eduRules.length, 2);
assert.ok(eduRules.some(r => r.event === 'Higher Education / Admission'));
assert.ok(eduRules.some(r => r.event === 'Academic Delay / Interruption'));

// ── Bhava Phala Dasha-evidence bug fix: current-dasha lords must resolve to
// the house they actually occupy, not silently stay empty on every house. ──
const dashaLords = [R.dasha.current.mahadasha, R.dasha.current.antardasha, R.dasha.current.pratyantar];
const activatedHouses = new Set(
  R.planets.filter(p => dashaLords.includes(p.name)).map(p => p.house)
);
const rowsWithDashaEvidence = R.bhavaPhala.rows.filter(row => row.dasha.periods.length > 0);
assert.ok(rowsWithDashaEvidence.length > 0, 'at least one house should show Dasha evidence for the current Mahadasha/Antardasha/Pratyantardasha lords');
for (const row of rowsWithDashaEvidence) {
  assert.ok(activatedHouses.has(row.house), `house ${row.house} reported Dasha evidence but no current Dasha lord occupies it`);
}

console.log('education-engine: PASS (education profile, event rules, bhavaPhala Dasha-evidence fix)');
