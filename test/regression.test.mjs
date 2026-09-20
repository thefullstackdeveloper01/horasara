// ============================================================
// AUTOMATED REGRESSION TEST SUITE
// ------------------------------------------------------------
// Consolidates the verification checks performed during this codebase's
// astronomy/Vedic-math audit into a permanent, runnable suite, so future
// changes can be checked against the same known-good reference values
// instead of relying on one-off scripts written and discarded during a
// review. Zero external dependencies — plain Node assertions, run with:
//   node test/regression.test.mjs
// Exits non-zero if any check fails, so it can be wired into CI.
// ============================================================

import assert from 'node:assert/strict';
import { deltaT, deltaTWithUncertainty } from '../src/astronomy/deltat.js';
import { nutationIAU2000B } from '../src/astronomy/nutation2000b.js';
import {
  julianDay, jdToDate, lahiriAyanamsa, kpAyanamsa, trueLahiriAyanamsa,
} from '../src/astronomy/utils.js';
import { applyRealisticScoreCap } from '../src/prediction/lordshipQuality.js';
import {
  getAllPlanetPositions, moonPosition, trueNode, meanNode,
} from '../src/astronomy/vsop87.js';
import { placidusHouses, kochHouses, sripatiHouses } from '../src/charts/houses.js';
import { calcSarvashtakavarga } from '../src/strength/ashtakavarga.js';
import { ASHTAK_CONTRIBUTIONS, TRANSIT_GOOD_HOUSES } from '../src/astronomy/constants.js';
import { calcPanchanga } from '../src/panchanga/panchanga.js';
import { calcAccurateSadeSati } from '../src/dosha/sade_sati_accurate.js';
import { getKPPosition } from '../src/kp/kp_system.js';
import { findVarshapravesha } from '../src/charts/varshaphal.js';
import { assessKalsarpaSeverity } from '../src/dosha/cancellation.js';
import { resolveHistoricalOffsetHours, tryResolveHistoricalOffset } from '../cli/historicalTz.js';
import { loadCities } from '../cli/cities.js';
import { calcPlanetPosition } from '../src/astronomy/vsop87.js';
import { mod360 } from '../src/astronomy/utils.js';
import { calcShadbala } from '../src/strength/shadbala.js';
import { getCurrentDasha, calcPranadashas } from '../src/dasha/vimshottari.js';
import { calcCharaDasha } from '../src/dasha/chara.js';
import {
  calcPranaLagna, calcSreeLagna, calcGhatiLagna, calcBhavaLagna, calcVarnadaLagna,
} from '../src/special/special_lagnas.js';
import { getLalKitabDebts } from '../src/lalkitab/lalkitab.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`      ${e.message}`);
    failed++;
  }
}
function section(name) { console.log(`\n${name}`); }

// ── Calendar / Julian Day ──────────────────────────────────────────────
section('Calendar & Julian Day');
test('J2000.0 reference point exact', () => {
  assert.equal(julianDay(2000, 1, 1, 12), 2451545.0);
});
test('Round-trip across the 1582 Gregorian reform', () => {
  for (const [y, m, d] of [[1500, 3, 15], [1582, 10, 4], [1582, 10, 15], [1990, 8, 15]]) {
    const jd = julianDay(y, m, d);
    const back = jdToDate(jd);
    assert.equal(back.year, y, `year mismatch for ${y}-${m}-${d}`);
    assert.equal(back.month, m, `month mismatch for ${y}-${m}-${d}`);
    assert.equal(Math.round(back.day), d, `day mismatch for ${y}-${m}-${d}`);
  }
});

// ── Delta-T ─────────────────────────────────────────────────────────────
section('Delta-T');
test('deltaT is continuous across segment boundaries (no jumps > 1s)', () => {
  const boundaries = [-500, 500, 1600, 1700, 1800, 1860, 1900, 1920, 1941, 1961, 1986, 2005, 2050, 2150];
  for (const y of boundaries) {
    const before = deltaT(y - 0.001);
    const after = deltaT(y + 0.001);
    assert.ok(Math.abs(after - before) < 1, `jump of ${Math.abs(after - before).toFixed(3)}s at year ${y}`);
  }
});
test('deltaTWithUncertainty flags modern era as reliable', () => {
  assert.equal(deltaTWithUncertainty(2000).reliable, true);
});

// ── Nutation (IAU 2000B, validated vs Meeus Example 22.a) ────────────────
section('Nutation — IAU 2000B');
test('Matches Meeus Example 22.a (1987-04-10) within 0.01"', () => {
  const jde = 2446895.5;
  const { dpsi, deps } = nutationIAU2000B(jde);
  assert.ok(Math.abs(dpsi * 3600 - (-3.788)) < 0.01, `dpsi=${(dpsi * 3600).toFixed(4)}"`);
  assert.ok(Math.abs(deps * 3600 - 9.443) < 0.01, `deps=${(deps * 3600).toFixed(4)}"`);
});

// ── Moon (ELP2000-82, validated vs Meeus Example 47.a) ───────────────────
section('Moon Position');
test('Matches Meeus Example 47.a (1992-04-12) within documented truncation error', () => {
  const jde = 2448724.5;
  const moon = moonPosition(jde);
  assert.ok(Math.abs(moon.longitude - 133.162655) < 0.01, `longitude=${moon.longitude}`);
  assert.ok(Math.abs(moon.latitude - (-3.229126)) < 0.01, `latitude=${moon.latitude}`);
});

// ── True/Mean Node ────────────────────────────────────────────────────
section('Lunar Nodes');
test('Mean node matches known J2000.0 constant', () => {
  assert.ok(Math.abs(meanNode(2451545.0) - 125.04452) < 0.001);
});
test('Node regresses (moves backward) over time', () => {
  const now = meanNode(2451545.0);
  const later = meanNode(2451545.0 + 365.25);
  const diff = ((later - now + 540) % 360) - 180;
  assert.ok(diff < -15 && diff > -25, `expected ~-19.3deg/yr regression, got ${diff.toFixed(2)}`);
});

// ── House Systems ─────────────────────────────────────────────────────
section('House Systems');
function assertMonotonicHouses(cusps, label) {
  const vals = cusps.map(c => typeof c.cusp === 'string' ? parseFloat(c.cusp) : c.cusp);
  for (let i = 0; i < 12; i++) {
    const gap = ((vals[(i + 1) % 12] - vals[i]) + 360) % 360;
    assert.ok(gap > 0 && gap < 90, `${label}: house ${i + 1} gap invalid (${gap.toFixed(2)}deg)`);
  }
}
test('Placidus cusps monotonic at mid-latitude', () => {
  assertMonotonicHouses(placidusHouses(45, 300, 28.6139, 295), 'Placidus');
});
test('Placidus falls back to Equal near polar circle without crashing', () => {
  const cusps = placidusHouses(100, 10, 75, 5);
  assert.equal(cusps[0].system.includes('fallback'), true);
});
test('Koch cusps monotonic at mid-latitude', () => {
  assertMonotonicHouses(kochHouses(45, 300, 28.6139, 295), 'Koch');
});
test('Sripati cusps monotonic', () => {
  assertMonotonicHouses(sripatiHouses(45, 300), 'Sripati');
});

// ── Ashtakavarga (chart-independent invariant) ───────────────────────────
section('Ashtakavarga');
test('Each planet total matches classical constant (BPHS Ch.66)', () => {
  const KNOWN = { Sun: 48, Moon: 49, Mars: 39, Mercury: 54, Jupiter: 56, Venus: 52, Saturn: 39 };
  for (const [planet, contributors] of Object.entries(ASHTAK_CONTRIBUTIONS)) {
    const total = Object.values(contributors).reduce((s, h) => s + h.length, 0);
    assert.equal(total, KNOWN[planet], `${planet} total=${total}, expected ${KNOWN[planet]}`);
  }
});
test('Sarvashtakavarga grand total is always 337, any chart', () => {
  const planets = [
    { name: 'Sun', siderealLon: 118.6 }, { name: 'Moon', siderealLon: 51.3 },
    { name: 'Mars', siderealLon: 200 }, { name: 'Mercury', siderealLon: 100 },
    { name: 'Jupiter', siderealLon: 10 }, { name: 'Venus', siderealLon: 140 },
    { name: 'Saturn', siderealLon: 300 },
  ];
  assert.equal(calcSarvashtakavarga(planets, 15.0).total, 337);
});

// ── Shadbala ──────────────────────────────────────────────────────────
section('Shadbala');
test('Nathonnatha Bala matches BPHS boundary values at midnight/noon', () => {
  const planets = [{ name: 'Sun', siderealLon: 10, house: 1 }, { name: 'Moon', siderealLon: 50, house: 2 }];
  const midnight = calcShadbala(planets, {}, 2451545.5, 0, 0, 2451545.25, 2451545.75, 23.6);
  const noon = calcShadbala(planets, {}, 2451545.0, 0, 0, 2451544.75, 2451545.25, 23.6);
  assert.equal(midnight.Sun.nathonnathaBala, 30);
  assert.equal(midnight.Moon.nathonnathaBala, 60);
  assert.equal(noon.Sun.nathonnathaBala, 60);
  assert.equal(noon.Moon.nathonnathaBala, 0);
});
test('Ayana Bala at equinox is 30 for planets, 60 for Sun', () => {
  const planets = [
    { name: 'Sun', siderealLon: 0, house: 1, eclipticLat: 0 },
    { name: 'Moon', siderealLon: 0, house: 1, eclipticLat: 0 },
  ];
  const r = calcShadbala(planets, {}, 2451545.0, 28.6, 77.2, 2451544.75, 2451545.25, 0.0);
  assert.ok(Math.abs(r.Sun.ayanaBala - 60) < 0.5);
  assert.ok(Math.abs(r.Moon.ayanaBala - 30) < 0.5);
});

// ── Dasha Systems ─────────────────────────────────────────────────────
section('Dasha Systems');
test('Default getCurrentDasha depth matches pre-Prana behavior (no sookshma/prana)', () => {
  const result = getCurrentDasha(julianDay(1990, 8, 15, 9), 51.36, julianDay(2026, 8, 17, 12));
  assert.equal(result.sookshma, null);
  assert.equal(result.prana, null);
});
test('Deep getCurrentDasha(depth=5) returns full chain to Prana level', () => {
  const result = getCurrentDasha(julianDay(1990, 8, 15, 9), 51.36, julianDay(2026, 8, 17, 12), 5);
  assert.ok(result.prana !== null && result.prana.prana);
});
test('Chara Dasha: both Scorpio co-lords present -> 12 years exactly', () => {
  const planets = ['Sun', 'Moon', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].map(n => ({ name: n, siderealLon: 10 }));
  planets.push({ name: 'Mars', siderealLon: 215 }, { name: 'Ketu', siderealLon: 225 }, { name: 'Rahu', siderealLon: 45 });
  const dashas = calcCharaDasha(2451545, 0, planets, 2200);
  const scorpio = dashas.find(d => d.sign === 'Scorpio');
  assert.equal(scorpio.years, 12);
});

// ── Special Lagnas ────────────────────────────────────────────────────
section('Special Lagnas');
test('Pranapada Lagna matches all 3 BPHS worked examples exactly', () => {
  const elapsedMin = 985 / 2.5;
  const sunriseJD = -elapsedMin / (24 * 60);
  assert.ok(Math.abs(calcPranaLagna(0, sunriseJD, 15) - 185) < 0.01, 'movable case');
  assert.ok(Math.abs(calcPranaLagna(0, sunriseJD, 45) - 95) < 0.01, 'fixed case');
  assert.ok(Math.abs(calcPranaLagna(0, sunriseJD, 75) - 5) < 0.01, 'dual case');
});
test('Sree Lagna matches sourced worked example (Moon@3d20m Aries, Asc 15deg Cancer -> 15deg Libra)', () => {
  const result = calcSreeLagna(3 + 20 / 60, 105);
  assert.ok(Math.abs(result - 195) < 0.01, `got ${result}`);
});
test('Varnada Lagna: different-oddity difference-of-zero treated as 12 (sourced example)', () => {
  // Leo Lagna + Scorpio Hora Lagna -> different oddity, |5-5|=0 -> treated
  // as 12 -> sum=12 (even) -> count 12 in reverse from Pisces -> Aries
  const result = calcVarnadaLagna(4 * 30 + 10, 7 * 30 + 5);
  assert.ok(Math.floor(result / 30) === 0, `expected Aries (sign 0), got sign ${Math.floor(result / 30)}`);
});

// ── Lal Kitab ─────────────────────────────────────────────────────────
section('Lal Kitab');
test('Pitru Rin triggers correctly (Venus/Rahu in 2/5/9/12)', () => {
  const planets = [
    { name: 'Venus', house: 5 }, { name: 'Sun', house: 1 }, { name: 'Moon', house: 3 },
    { name: 'Mars', house: 8 }, { name: 'Mercury', house: 6 }, { name: 'Jupiter', house: 10 },
    { name: 'Saturn', house: 11 }, { name: 'Rahu', house: 9 }, { name: 'Ketu', house: 3 },
  ];
  const debts = getLalKitabDebts(planets);
  assert.ok(debts.some(d => d.name === 'Pitru Rin'));
});
test('No debts when no trigger conditions met', () => {
  const planets = [
    { name: 'Venus', house: 1 }, { name: 'Sun', house: 3 }, { name: 'Moon', house: 5 },
    { name: 'Mars', house: 8 }, { name: 'Mercury', house: 6 }, { name: 'Jupiter', house: 10 },
    { name: 'Saturn', house: 11 }, { name: 'Rahu', house: 3 }, { name: 'Ketu', house: 6 },
  ];
  assert.equal(getLalKitabDebts(planets).length, 0);
});

// ── Ayanamsa ──────────────────────────────────────────────────────────
section('Ayanamsa');
test('KP ayanamsa differs from Lahiri by exactly 5\'48" (sourced value)', () => {
  const jd = julianDay(2026, 1, 1, 0);
  const diffArcmin = (kpAyanamsa(jd) - lahiriAyanamsa(jd)) * 60;
  assert.ok(Math.abs(diffArcmin - 5.8) < 0.01, `diff=${diffArcmin.toFixed(3)}'`);
});

// ── Realistic Scoring Guard ─────────────────────────────────────────────
section('Realistic Scoring Guard');
test('Low Ashtakavarga (<25) caps score at 6 even if raw score is higher', () => {
  const r = applyRealisticScoreCap(9, { avPts: 20, dignity: 'Own', transitSupportive: true });
  assert.equal(r.score, 6);
  assert.ok(r.capped);
});
test('Uncancelled Debilitated dignity caps score at 6', () => {
  const r = applyRealisticScoreCap(8, { avPts: 30, dignity: 'Debilitated', isCancelled: false, transitSupportive: true });
  assert.equal(r.score, 6);
  assert.ok(r.capped);
});
test('Cancelled Debilitated (Neecha Bhanga) is NOT capped by the dignity rule', () => {
  const r = applyRealisticScoreCap(8, { avPts: 30, dignity: 'Debilitated', isCancelled: true, transitSupportive: true });
  assert.equal(r.score, 8);
});
test('Enemy-sign dignity is capped at 6 even with high Ashtakavarga (no cancellation concept for Enemy)', () => {
  const r = applyRealisticScoreCap(9, { avPts: 32, dignity: 'Enemy', transitSupportive: true });
  assert.equal(r.score, 6);
});
test('9-10 score requires dignity + Ashtakavarga(>30) + transit ALL aligned — falls to 8 if any one is missing', () => {
  const weakTransit = applyRealisticScoreCap(10, { avPts: 35, dignity: 'Exalted', transitSupportive: false });
  assert.equal(weakTransit.score, 8);
  const weakAV = applyRealisticScoreCap(10, { avPts: 26, dignity: 'Exalted', transitSupportive: true });
  assert.equal(weakAV.score, 8);
  const weakDignity = applyRealisticScoreCap(10, { avPts: 35, dignity: 'Friend', transitSupportive: true });
  assert.equal(weakDignity.score, 8);
});
test('9-10 score IS allowed when Dasha dignity, Ashtakavarga(>30), and transit all align', () => {
  const r = applyRealisticScoreCap(9, { avPts: 35, dignity: 'Exalted', transitSupportive: true });
  assert.equal(r.score, 9);
  assert.ok(!r.capped);
});
test('Scores of 8 or below pass through unchanged when nothing is unfavorable', () => {
  const r = applyRealisticScoreCap(7, { avPts: 28, dignity: 'Friend', transitSupportive: true });
  assert.equal(r.score, 7);
  assert.ok(!r.capped);
});

// ── Phase 2/3 audit: Panchanga (verified against DrikPanchang, New Delhi, 1 Jan 2024) ──
section('Panchanga (verified against independent published reference)');
test('New Delhi, 1 Jan 2024, 08:00 IST: Tithi/Nakshatra/Yoga/Karana/signs match DrikPanchang', () => {
  const tz = 5.5;
  const jd = julianDay(2024, 1, 1, 8 - tz);
  const positions = getAllPlanetPositions(jd, 69);
  const p = calcPanchanga(jd, positions.Sun.longitude, positions.Moon.longitude, 28.6139, 77.2090, tz, positions.Moon.speed, positions.Sun.speed);
  assert.equal(p.tithi.name, 'Panchami');
  assert.equal(p.nakshatra.name, 'Magha');
  assert.equal(p.yoga.name, 'Ayushman');
  assert.equal(p.karana.name, 'Taitila');
  assert.equal(p.moonSign, 'Leo');
  assert.equal(p.sunSign, 'Sagittarius');
  assert.equal(p.vara.name, 'Monday');
});

// ── Phase 2/3 audit: Sade Sati (verified against public Saturn ingress dates) ──
section('Sade Sati (verified against public Saturn ingress timeline)');
test('Moon in Capricorn, "now"=1 Jan 2021: correctly identifies Peak phase with dates matching public record', () => {
  function saturnLonAtJD(jd) { return getAllPlanetPositions(jd, 69).Saturn.longitude; }
  const nowJD = julianDay(2021, 1, 1, 0);
  const r = calcAccurateSadeSati(9, nowJD, saturnLonAtJD); // 9 = Capricorn
  assert.equal(r.inSadeSati, true);
  assert.equal(r.currentPhase, 'Peak');
  assert.equal(r.saturnSignNow, 'Capricorn');
  // Peak phase should start ~24 Jan 2020 (Saturn's real, publicly documented Capricorn ingress)
  assert.ok(r.cycles[0].phases[1].start.includes('2020'));
  // Peak phase should end ~ Jan 2023 (Saturn's stable Aquarius entry after its 2022 retrograde dip back into Capricorn)
  assert.ok(r.cycles[0].phases[1].end.includes('2023'));
});

// ── Phase 2/3 audit: KP sub-lords (verified against a published KP chart) ──
section('KP Sub-Lords (verified against independently published KP chart)');
test('28°26\'11.47" Capricorn matches published Dhanishtha/Mars/Saturn/Mercury sub-lord chain', () => {
  const lon = 270 + 28 + 26/60 + 11.47/3600;
  const kp = getKPPosition(lon);
  assert.equal(kp.nakshatra, 'Dhanishtha');
  assert.equal(kp.nakLord, 'Mars');
  assert.equal(kp.subLord, 'Saturn');
  assert.equal(kp.subSubLord, 'Mercury');
});

// ── Phase 2/3 audit: Gochar good-transit-house table (verified against upachaya-house classical framework) ──
section('Gochar (verified against classical upachaya-house transit framework)');
test('TRANSIT_GOOD_HOUSES matches the standard classical table for all 9 grahas', () => {
  assert.deepEqual(TRANSIT_GOOD_HOUSES.Sun, [3,6,10,11]);
  assert.deepEqual(TRANSIT_GOOD_HOUSES.Moon, [1,3,6,7,10,11]);
  assert.deepEqual(TRANSIT_GOOD_HOUSES.Mars, [3,6,11]);
  assert.deepEqual(TRANSIT_GOOD_HOUSES.Mercury, [2,4,6,8,10,11]);
  assert.deepEqual(TRANSIT_GOOD_HOUSES.Jupiter, [2,5,7,9,11]);
  assert.deepEqual(TRANSIT_GOOD_HOUSES.Venus, [1,2,3,4,5,8,9,11,12]);
  assert.deepEqual(TRANSIT_GOOD_HOUSES.Saturn, [3,6,11]);
});

// ── Phase 2/3 audit: Varshaphal (verified: no more hardcoded date / tropical-sidereal bug) ──
section('Varshaphal (verified: solar return lands on the real birthday every year)');
test('Solar returns for a 15-May birth land on 14-15 May across a 35-year span, never on a fixed hardcoded date', () => {
  const tz = 5.5;
  const birthJD = julianDay(1990, 5, 15, 14.5 - tz);
  const natalSun = calcPlanetPosition('Sun', birthJD);
  const natalSunTropical = mod360(natalSun.lon + lahiriAyanamsa(birthJD));
  for (const targetYear of [1995, 2005, 2015, 2025]) {
    const r = findVarshapravesha(natalSunTropical, birthJD, targetYear, tz);
    const day = parseInt(r.date.split(' ')[0], 10);
    assert.ok(day === 14 || day === 15, `Expected 14/15 May, got: ${r.date}`);
    assert.ok(r.date.includes('May'));
    assert.ok(r.date.includes(String(targetYear)));
  }
});

// ── Phase 3 audit fix: Kalsarpa cancellation nakshatra index ──
section('Dosha Cancellation (Phase 3 audit fix)');
test('Swati nakshatra (index 14, not 13/Chitra) is recognized as a Kala Sarpa cancellation', () => {
  const moon = { name: 'Moon', siderealLon: 14 * (40/3) + 2 }; // well inside Swati
  const r = assessKalsarpaSeverity({ hasDosha: true, type: 'Anuloma' }, [moon]);
  assert.ok(r.cancellations.some(c => c.includes('Swati')));
});
test('Chitra nakshatra (index 13) is NOT mistaken for Swati anymore', () => {
  const moon = { name: 'Moon', siderealLon: 13 * (40/3) + 2 }; // well inside Chitra
  const r = assessKalsarpaSeverity({ hasDosha: true, type: 'Anuloma' }, [moon]);
  assert.ok(!r.cancellations.some(c => c.includes('Swati')));
});

// ── DST audit fix: real historical-offset resolution via IANA tzdata ──
section('Historical Timezone Resolution (DST audit — real fix, not a warning)');
test('New York resolves to EDT (-4) in July and EST (-5) in January (same city, correct seasonal offset)', () => {
  assert.equal(resolveHistoricalOffsetHours('America/New_York', 2024, 7, 4, 12, 0), -4);
  assert.equal(resolveHistoricalOffsetHours('America/New_York', 2024, 1, 4, 12, 0), -5);
});
test('Sydney resolves to AEDT (+11) in southern-hemisphere summer and AEST (+10) in winter', () => {
  assert.equal(resolveHistoricalOffsetHours('Australia/Sydney', 2024, 1, 4, 12, 0), 11);
  assert.equal(resolveHistoricalOffsetHours('Australia/Sydney', 2024, 7, 4, 12, 0), 10);
});
test('India (no DST) resolves to a constant +5.5 regardless of season', () => {
  assert.equal(resolveHistoricalOffsetHours('Asia/Kolkata', 1990, 5, 15, 14, 30), 5.5);
  assert.equal(resolveHistoricalOffsetHours('Asia/Kolkata', 1990, 11, 15, 14, 30), 5.5);
});
test('tryResolveHistoricalOffset never throws and reports resolved:false for a bad zone id', () => {
  const r = tryResolveHistoricalOffset('Not/A_Real_Zone', 2024, 1, 1, 0, 0);
  assert.equal(r.resolved, false);
  assert.equal(r.offsetHours, null);
});
test('Every unique city timezone identifier is valid in Intl', () => {
  const cities = loadCities();
  const entries = Object.entries(cities);
  assert.ok(entries.length > 0, 'city dataset must not be empty');
  const missing = entries.filter(([, c]) => !c?.tzName).slice(0, 5);
  assert.equal(missing.length, 0, `City records missing tzName: ${missing.map(([k]) => k).join(', ')}`);

  const uniqueZones = new Set(entries.map(([, c]) => c.tzName));
  for (const tzName of uniqueZones) {
    assert.doesNotThrow(() => new Intl.DateTimeFormat('en', { timeZone: tzName }),
      `Invalid timezone identifier ${tzName}`);
  }
});
test('New York DST-era city record actually changes chart-relevant tz between summer/winter births', () => {
  // Regression guard for the exact bug this fix addresses: before this fix,
  // both of these resolved to the SAME fixed -5, which is wrong for July.
  const cities = loadCities();
  const nyc = cities['new york'];
  assert.ok(nyc, 'new york must exist in the city table');
  const summer = tryResolveHistoricalOffset(nyc.tzName, 2024, 7, 4, 12, 0);
  const winter = tryResolveHistoricalOffset(nyc.tzName, 2024, 1, 4, 12, 0);
  assert.ok(summer.resolved && winter.resolved);
  assert.notEqual(summer.offsetHours, winter.offsetHours);
});

// ── Summary ───────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(60)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));
process.exit(failed > 0 ? 1 : 0);
