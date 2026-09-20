/**
 * src/engine/timeAndAscendant.js
 * ------------------------------------------------------------
 * Phase 1 of the chart-calculation pipeline (see src/engine.js).
 *
 * ARCHITECTURE NOTE: this is the first of several planned extractions of
 * engine.js's single 1,177-line calculateChart() function into named,
 * independently-testable phases — mirroring the same Single Responsibility
 * pattern already proven in app/JyotishApplication.js (collect → calculate
 * → render), just one level deeper (inside "calculate"). Each phase:
 *   - takes exactly the inputs it needs (not the whole birth object when
 *     less will do, though here it genuinely needs all of it),
 *   - returns exactly the outputs later phases/callers need,
 *   - is a pure function — no shared mutable state, no I/O,
 *   - is byte-for-byte the same math as the code it replaced (verified by
 *     the existing 76-assertion regression/consistency/validation suite
 *     passing unchanged after each extraction).
 * This phase specifically: Julian Day / ΔT / TT conversion, the selected
 * Ayanamsa, sidereal time (GMST/LST), and the tropical + sidereal
 * Ascendant. Everything downstream (planet positions, houses, dashas...)
 * depends on these being correct, so it's the natural first slice.
 */
import { julianDay, deltaT, mod360, getAyanamsa, getAllAyanamsaValues } from '../astronomy/utils.js';
import { ascendant as vsopAscendant } from '../astronomy/vsop87.js';

/**
 * @param {object} birth - the same birth object calculateChart() receives
 *   (already validated by validateBirthInput() before this runs)
 * @returns {{
 *   JD:number, dT:number, JD_TT:number,
 *   AYANAMSA:number, allAyanamsas:object,
 *   GMST:number, LST:number,
 *   ascResult:object, ASC_TROP:number, ASC:number
 * }}
 */
export function computeTimeAndAscendant(birth) {
  const { year, month, day, hour, min, sec = 0, lat, lon, tz,
    ayanamsaMode = 'lahiri' } = birth;

  // 1. Time foundations
  const localH = hour + min / 60 + sec / 3600;
  const utcH = localH - tz;
  const JD = julianDay(year, month, day, utcH);
  const dT = deltaT(year);
  const JD_TT = JD + dT / 86400;

  // 2. Ayanamsa — supports all 16 systems
  const AYANAMSA = getAyanamsa(ayanamsaMode, JD_TT);
  const allAyanamsas = getAllAyanamsaValues(JD_TT); // full comparison table

  // 3. Sidereal time
  const GMST = mod360(280.46061837 + 360.98564736629 * (JD - 2451545));
  const LST = mod360(GMST + lon);

  // 4. Ascendant
  const ascResult = vsopAscendant(JD, dT, lat, lon);
  const ASC_TROP = ascResult?.tropical || ascResult?.asc || 0;
  const ASC = mod360(ASC_TROP - AYANAMSA);

  return { JD, dT, JD_TT, AYANAMSA, allAyanamsas, GMST, LST, ascResult, ASC_TROP, ASC };
}
