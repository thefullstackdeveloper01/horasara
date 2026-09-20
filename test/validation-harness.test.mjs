// ============================================================
// VALIDATION HARNESS — cross-checks against independent ephemeris sources
// ------------------------------------------------------------
// Distinct from test/regression.test.mjs (which checks this engine's
// output against itself over time, using textbook worked examples as the
// seed values). This file instead checks against DATA FETCHED LIVE from
// JPL Horizons (ssd.jpl.nasa.gov), NASA/JPL's own numerically-integrated
// planetary ephemeris system (DE441) — the actual modern gold-standard,
// not a truncated analytic series like VSOP87. This is the real
// independent-authority check the "validation harness" item on this
// project's audit list asked for.
//
// HONEST SCOPE NOTE: building a fully *live*-querying harness (one that
// calls the Horizons API fresh every run) isn't practical here — the
// fetch tool available while building this only allows URLs that already
// appeared in a prior search/fetch result, so arbitrary fresh queries
// aren't repeatable on demand, and the delivered app needs to run
// standalone for the end user without requiring internet access anyway.
// So this harness instead embeds real, dated, cited JPL Horizons results
// captured once, with the exact query and conversion method documented,
// so the numbers can be indendently re-verified by anyone by re-running
// that same query by hand at ssd.jpl.nasa.gov/horizons/app.html.
//
// Run: node test/validation-harness.test.mjs
// ============================================================

import assert from 'node:assert/strict';
import { getAllPlanetPositions } from '../src/astronomy/vsop87.js';
import { julianDay, deltaT } from '../src/astronomy/utils.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n      ${e.message}`); failed++; }
}

/**
 * Converts astrometric ICRF/J2000 equatorial RA/Dec (as returned by JPL
 * Horizons quantity code "1", light-time corrected but NOT precessed to
 * date) into ecliptic longitude/latitude "of date", via:
 *   1. Standard J2000-equatorial -> J2000-ecliptic rotation (obliquity
 *      23.4392911°, the IAU 1976/2000 J2000.0 value)
 *   2. A first-order precession correction to longitude only (uniform
 *      +50.29"/year from J2000; ecliptic latitude is essentially
 *      unaffected by precession to first order). This is an
 *      APPROXIMATION, not a rigorous 3D precession rotation — expect
 *      residual agreement at the tens-of-arcseconds level, not
 *      sub-arcsecond, when comparing against it.
 */
function jplRaDecToEclipticOfDate(raDeg, decDeg, targetYear) {
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const eps2000 = 23.4392911 * D2R;
  const ra = raDeg * D2R, dec = decDeg * D2R;

  const tanLambda = (Math.sin(ra) * Math.cos(eps2000) + Math.tan(dec) * Math.sin(eps2000)) / Math.cos(ra);
  let lambda = Math.atan(tanLambda) * R2D;
  if (Math.cos(ra) < 0) lambda += 180;
  lambda = ((lambda % 360) + 360) % 360;

  const sinBeta = Math.sin(dec) * Math.cos(eps2000) - Math.cos(dec) * Math.sin(eps2000) * Math.sin(ra);
  const beta = Math.asin(sinBeta) * R2D;

  const precessionDeg = (50.29 * (targetYear - 2000)) / 3600;
  return { longitude: ((lambda + precessionDeg) % 360 + 360) % 360, latitude: beta };
}

console.log('Validation Harness — cross-checks against JPL Horizons DE441\n');

test('Mars geocentric longitude matches JPL Horizons DE441 (2006-Jan-01)', () => {
  // SOURCE: live query to https://ssd.jpl.nasa.gov/api/horizons.api
  //   COMMAND='499' CENTER='500@399' EPHEM_TYPE='OBSERVER'
  //   START_TIME='2006-01-01' STOP_TIME='2006-01-02' QUANTITIES='1,9,20,23,24,29'
  // Result: "2006-Jan-01 00:00   02 32 15.02 +16 35 29.9   ..."
  // (RA in HMS, DEC in DMS, astrometric ICRF/J2000, light-time corrected)
  const raDeg = (2 + 32 / 60 + 15.02 / 3600) * 15;
  const decDeg = 16 + 35 / 60 + 29.9 / 3600;
  const jpl = jplRaDecToEclipticOfDate(raDeg, decDeg, 2006);

  const jd = julianDay(2006, 1, 1, 0);
  const dT = deltaT(2006);
  const jde = jd + dT / 86400;
  const pos = getAllPlanetPositions(jde, dT);
  const marsTropical = ((pos.Mars.longitude + pos.ayanamsa) % 360 + 360) % 360;

  const diffArcsec = Math.abs((((marsTropical - jpl.longitude + 540) % 360) - 180) * 3600);
  const latDiffArcsec = Math.abs(pos.Mars.latitude - jpl.latitude) * 3600;

  console.log(`      JPL (converted, of-date approx): lon=${jpl.longitude.toFixed(4)}° lat=${jpl.latitude.toFixed(4)}°`);
  console.log(`      This engine:                      lon=${marsTropical.toFixed(4)}° lat=${pos.Mars.latitude.toFixed(4)}°`);
  console.log(`      Difference: ${diffArcsec.toFixed(1)}" longitude, ${latDiffArcsec.toFixed(1)}" latitude`);

  // Generous tolerance (5 arcmin) because of the first-order precession
  // approximation in jplRaDecToEclipticOfDate -- this is checking for
  // gross correctness against an independent authority, not replacing
  // the tight Meeus-reference checks in regression.test.mjs.
  assert.ok(diffArcsec < 300, `${diffArcsec.toFixed(1)}" exceeds 300" (5') tolerance`);
});

console.log(`\n${'='.repeat(60)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));
console.log('\nTo extend this harness: query https://ssd.jpl.nasa.gov/horizons/app.html');
console.log('for any body/date, note the astrometric RA/Dec, and add a new test()');
console.log('block following the pattern above.');
process.exit(failed > 0 ? 1 : 0);
