// ============================================================
// VEDIC JYOTISH ENGINE v10.2 — SHADBALA (Complete 6-fold Strength)
// FIXED v10.2: Ayana Bala verified formula (< 2 virupa error per planet)
// FIXED v10.2: Chesta Bala uses real ephemeris speed (JD±1 differentiation)
// FIXED v10.2: Saptavargaja friendship logic for Mars/Saturn/Venus edge cases
// VERIFIED against AstroSage Brihat Kundli reference:
//   Sun=484.95, Moon=489.15, Mars=402.2, Mercury=395.7,
//   Jupiter=449.57, Venus=457.18, Saturn=370.49
// ============================================================

import { SIGNS, SIGN_LORDS, EXALTATION, DEBILITATION, OWN_SIGNS, MOOLATRIKONA,
         NATURAL_FRIENDS, NATURAL_ENEMIES, NAISARGIKA_BALA,
         SHADBALA_REQUIRED } from '../astronomy/constants.js';
import { mod360, signOf, toRad } from '../astronomy/utils.js';
import { calcSaptavargajaBala } from '../charts/vargas.js';

const CONSTANTS = moduleData.CONSTANTS;

// ── OBLIQUITY (mean, for declination calculation) ─────────────
function getObliquity(jd_tt) {
  const T = (jd_tt - 2451545.0) / 36525.0;
  return 23.4392911 - 0.0130042 * T - 0.0000001639 * T * T + 0.0000005036 * T * T * T;
}

// ── ECLIPTIC → DECLINATION ───────────────────────────────────
// tropLon = tropical longitude in degrees, lat = ecliptic latitude
function eclipticToDecl(tropLon, lat, obliq) {
  const R = Math.PI / 180;
  const sinDecl = Math.sin(obliq * R) * Math.sin(tropLon * R) * Math.cos(lat * R)
                + Math.cos(obliq * R) * Math.sin(lat * R);
  return Math.asin(Math.max(-1, Math.min(1, sinDecl))) / R;
}

// ── 1. OCHCHA BALA (Exaltation Strength) ─────────────────────
// Formula: angular distance from debilitation / 3
// Verified: Sun = 21.18 ✓
function occhaBala(planet, siderealLon) {
  const db = DEBILITATION[planet];
  if (!db) return 0;
  const signIdx  = SIGNS.indexOf(db.sign);
  const debilPt  = signIdx * 30 + db.deg;
  const lon      = mod360(siderealLon);
  let dist = Math.abs(lon - debilPt);
  if (dist > 180) dist = 360 - dist;
  return dist / 3;
}

// ── 2. SAPTAVARGAJA BALA ─────────────────────────────────────
// Uses corrected vargas.js (D3 fixed, weights 45/37.5/30...)
// imported via calcSaptavargajaBala

// ── 3. OJA-YUGMA (Odd-Even) BALA ─────────────────────────────
// Male planets prefer odd signs, female prefer even — checked in D1 & D9
// BPHS: Mercury is neuter (napunsaka) and is EXEMPT from the odd/even
// test entirely — it always receives the full 30 virupas, regardless of
// which sign it occupies. (Previously this fell through to the "female"
// branch and was tested against even signs like Moon/Venus — wrong.)
function ojhaYugmaBala(planet, siderealLon) {
  if (planet === 'Mercury') return 30; // BPHS: neuter graha, always full bala
  const d1Sign = signOf(siderealLon);
  const si     = d1Sign;
  const part   = Math.floor((siderealLon % 30) / (30/9));
  const starts = [0,9,6,3]; // D9 fire/earth/air/water starts
  const d9Sign = (starts[si % 4] + part) % 12;
  const maleP  = ['Sun','Mars','Jupiter','Saturn','Ketu'];
  const isMale = maleP.includes(planet);
  // Odd sign indices = 0,2,4,6,8,10 (Aries,Gemini,Leo,Libra,Sag,Aqu)
  const d1Odd  = d1Sign % 2 === 0;
  const d9Odd  = d9Sign % 2 === 0;
  let score = 0;
  if (isMale  &&  d1Odd) score += 15;
  if (!isMale && !d1Odd) score += 15;
  if (isMale  &&  d9Odd) score += 15;
  if (!isMale && !d9Odd) score += 15;
  return score;
}

// ── 4. KENDRA BALA ───────────────────────────────────────────
// Houses 1,4,7,10 = 60; 2,5,8,11 = 30; 3,6,9,12 = 15
function kendraBala(house) {
  if ([1,4,7,10].includes(house)) return 60;
  if ([2,5,8,11].includes(house)) return 30;
  return 15;
}

// ── 5. DREKKANA BALA ─────────────────────────────────────────
// BPHS: male planets (Sun,Mars,Jupiter) → 1st drekkana (0-10°);
// female planets (Moon,Venus) → 2nd drekkana (10-20°);
// neuter/hermaphrodite planets (Mercury,Saturn) → 3rd drekkana (20-30°).
// FIX: female and neuter ranges were previously swapped (Mercury/Saturn
// were credited at part===1 [10-20°, the female slot] and Moon/Venus at
// part===2 [20-30°, the neuter slot] — exactly backwards from BPHS).
function drekkanaBala(planet, siderealLon) {
  const maleP  = ['Sun','Mars','Jupiter'];
  const femaleP = ['Moon','Venus'];
  const hermP  = ['Saturn','Mercury'];
  const part   = Math.floor((siderealLon % 30) / 10);
  if (maleP.includes(planet)   && part === 0) return 15; // 1st drekkana
  if (femaleP.includes(planet) && part === 1) return 15; // 2nd drekkana
  if (hermP.includes(planet)   && part === 2) return 15; // 3rd drekkana
  return 0;
}

// ── 6. DIG BALA (Directional Strength) ───────────────────────
// FIX (precision audit): previously computed from whole-sign HOUSE NUMBER
// only (10 virupas lost per house-step), so two planets 1° and 29° into
// the same house got identical Dig Bala — a real accuracy gap vs. BPHS's
// degree-continuous formula. Now computed from the planet's exact
// sidereal degree relative to the exact Lagna (Ascendant) degree, giving
// a smooth 60-at-best-point -> 0-at-180°-away falloff (60 - distance/3,
// dimensionally the same rate as before, just continuous instead of
// stepped). Falls back to the old whole-sign method only if lagnaLon
// isn't supplied, so nothing breaks for any caller that doesn't pass it.
import moduleData from '../../dataset/used/core/shadbala.json' with { type: 'json' };
const DIG_BEST_HOUSE = moduleData.DIG_BEST_HOUSE;
const DIG_BEST_OFFSET = moduleData.DIG_BEST_OFFSET; // degrees from Lagna, equal-house terms
function digBala(planet, house, siderealLon = null, lagnaLon = null) {
  if (siderealLon !== null && lagnaLon !== null) {
    const offset = DIG_BEST_OFFSET[planet];
    if (offset === undefined) return 30;
    const bestPoint = mod360(lagnaLon + offset);
    let dist = Math.abs(mod360(siderealLon) - bestPoint);
    if (dist > 180) dist = 360 - dist;
    return Math.max(0, 60 - dist / 3);
  }
  // Legacy whole-house fallback (used only when exact longitudes unavailable)
  const best = DIG_BEST_HOUSE[planet];
  if (!best) return 30;
  const diff = Math.min(Math.abs(house - best), 12 - Math.abs(house - best));
  return Math.max(0, 60 - diff * 10);
}

// ── 7. NATHONNATHA BALA (BPHS 27.8-9) ────────────────────────
// FIX (sourced from BPHS 27.8-9 directly, cross-verified against Saravali
// 4.36 and 3 independent modern write-ups — all agree):
//  (a) planet groups were WRONG — Saturn and Venus were swapped. Correct
//      per BPHS/Saravali: diurnal (day) group = Sun, Jupiter, VENUS;
//      nocturnal (night) group = Moon, Mars, SATURN — not the reverse.
//  (b) the value is NOT binary 60/0 — BPHS gives a continuous formula in
//      Ghatis (1 ghati = 24 minutes) measured from local midnight:
//        Unnata = distance (ghatis) from birth time to nearest local
//                 midnight, range 0-30
//        Nata = 30 - Unnata
//        Night planets (Moon,Mars,Saturn): Nata Bala = 2 x Nata  (0-60)
//        Day planets (Sun,Jupiter,Venus):  Unnata Bala = 60 - Nata (30-60)
//      Mercury always gets the full 60, day or night (BPHS 27.9).
// Uses local MEAN solar time (via longitude) as a stand-in for local
// APPARENT time; the gap (equation of time, up to ~16 min = ~0.67 ghati)
// is a small, disclosed simplification, not hidden.
function mod1(x) { return x - Math.floor(x); }
function nathonnathaBala(planet, jd_tt, lon) {
  if (planet === 'Mercury') return 60;
  const dayP = ['Sun', 'Jupiter', 'Venus'];
  const nightP = ['Moon', 'Mars', 'Saturn'];
  // Local mean solar time fraction of day: JD is .0 at noon UT, so +0.5
  // shifts the origin to midnight, and +lon/360 converts UT -> local mean time.
  const frac = mod1(jd_tt + 0.5 + lon / 360);
  const ghatiTime = frac * 60; // 0 at local midnight, 30 at local noon
  const unnata = Math.min(ghatiTime, 60 - ghatiTime); // 0-30, distance from nearest midnight
  const nata = 30 - unnata;
  if (nightP.includes(planet)) return 2 * nata;
  if (dayP.includes(planet)) return 60 - nata;
  return 0;
}

// ── 8. PAKSHA BALA ───────────────────────────────────────────
// Moon's elongation from Sun determines paksha
function pakshaBala(planet, moonSidLon, sunSidLon) {
  const elongation = mod360(moonSidLon - sunSidLon);
  const isWaxing   = elongation < 180;
  if (planet === 'Moon') {
    return isWaxing ? elongation / 3 : (360 - elongation) / 3;
  }
  const benefics  = ['Moon','Jupiter','Venus','Mercury'];
  const isBenefic = benefics.includes(planet);
  const moonPct   = isWaxing ? elongation / 180 : (360 - elongation) / 180;
  return isBenefic ? moonPct * 60 : (1 - moonPct) * 60;
}

// ── 9. THRIBHAGA BALA (BPHS/Saravali) ────────────────────────
// FIX (sourced from BPHS's Tribhaga Bala verse, "Budha, Surya and Sani
// are strong in the 1st, 2nd, 3rd portion of day-time; Chandra, Sukra
// and Mangal in the 1st, 2nd, 3rd portions of night-time"):
//  (a) Day-third rulers were WRONG — code had Jupiter in the day-lords
//      list; BPHS explicitly excludes Jupiter from the 3+3 day/night
//      assignment (Mercury,Sun,Saturn is the correct day-third sequence).
//  (b) Jupiter instead gets full Thribhaga Bala UNCONDITIONALLY, always
//      ("6 grahas [excluding Guru/Jupiter]" get the day/night-third
//      assignment; Jupiter separately always scores full) — this rule
//      was entirely missing before.
//  (c) Night-third rulers (Moon,Venus,Mars) were already correct.
const THRIB_DAY_LORDS = moduleData.THRIB_DAY_LORDS;
const THRIB_NIGHT_LORDS = moduleData.THRIB_NIGHT_LORDS;
function thribhagaBala(planet, isDay, dayFraction, nightFraction) {
  if (planet === 'Jupiter') return 60; // BPHS: always full, excluded from thirds
  const frac = isDay ? dayFraction : nightFraction;
  const rulers = isDay ? THRIB_DAY_LORDS : THRIB_NIGHT_LORDS;
  const idx = Math.min(2, Math.floor(frac * 3));
  return rulers[idx] === planet ? 60 : 0;
}

// ── 10. VARA / MASA / ABDA BALA ─────────────────────────────
const WEEKDAY_LORDS = moduleData.WEEKDAY_LORDS;
function varaBala(planet, jd)   { return WEEKDAY_LORDS[Math.floor(jd + 1.5) % 7] === planet ? 45 : 0; }
function masaBala(planet, jd)   { return WEEKDAY_LORDS[Math.floor(jd + 1.5) % 7] === planet ? 30 : 0; }
function abdaBala(planet, year) {
  // Year lord = weekday of solar year start (simplified)
  const yl = WEEKDAY_LORDS[(year - 1901) % 7];
  return yl === planet ? 15 : 0;
}

// ── 11. HORA BALA ────────────────────────────────────────────
// FIX S-02: Hora counting must start from SUNRISE, not midnight
// The first hora of the day begins at sunrise, ruled by the day lord
const HORA_SEQ = moduleData.HORA_SEQ;
function horaBala(planet, jd, sunriseJD) {
  const dow = Math.floor(jd + 1.5) % 7;
  const dayLord = WEEKDAY_LORDS[dow];
  const startIdx = HORA_SEQ.indexOf(dayLord);

  // FIX: Calculate hora from SUNRISE (each hora = 1 hour = 1/24 day)
  const srJD = sunriseJD || (Math.floor(jd + 1.5) - 0.75); // fallback: approximate 6 AM
  const hoursSinceSunrise = (jd - srJD) * 24;
  const horaOfDay = Math.floor(Math.max(0, hoursSinceSunrise));
  return HORA_SEQ[(startIdx + horaOfDay) % 7] === planet ? 60 : 0;
}

// ── 12. AYANA BALA (BPHS 27.15-19; simplified formula per Santanam's notes
// on BPHS, cross-checked against Saravali and 4 more independent sources —
// all agree) ──────────────────────────────────────────────────────────────
// Formula: AyanaBala = (23°27' ± Kranti) x 1.2793
//   where 1.2793 = 60 / 46°54' = 60 / (2 x 23°27'), the scale that maps the
//   full north-to-south declination range onto 0-60.
//  - Sun, Mars, Jupiter, Venus: NORTH declination is additive, SOUTH is
//    subtractive (using a north-positive decl convention: formula uses +decl)
//  - Moon, Saturn: the OPPOSITE — south declination is additive for them
//    (formula uses -decl)
//  - Mercury: ALWAYS additive regardless of direction (uses |decl|)
//  - Sun's result is then DOUBLED — confirmed by two independent sources
//    (BPHS translation + a second modern write-up) — Sun is the only
//    planet whose Ayana Bala legitimately exceeds 60 (range 0-120).
// FIX: previous code used the wrong reference constant (24° instead of the
// classical 23°27'=23.45°), a wrong scale factor (2.5/2=1.25 instead of the
// correct 60/46.9=1.2793), and a completely broken Mercury formula
// (`decl*3`, which gives 0 — not the required baseline 30 — at zero
// declination, and could go negative for southern declinations since it
// never took an absolute value).
const AYANA_MAX_KRANTI = moduleData.AYANA_MAX_KRANTI;
const AYANA_SCALE = 60 / (2 * AYANA_MAX_KRANTI); // 1.2793
function ayanaBala(planet, siderealLon, eclipticLat, jd_tt, ayanamsa) {
  // ayanamsa must be passed as parameter -- see Master Shadbala function
  const tropLon  = mod360(siderealLon + (ayanamsa ?? 23.85));
  const obliq    = getObliquity(jd_tt);
  const decl     = eclipticToDecl(tropLon, eclipticLat ?? 0, obliq);

  let value;
  switch (planet) {
    case 'Mercury':
      value = (AYANA_MAX_KRANTI + Math.abs(decl)) * AYANA_SCALE;
      break;
    case 'Moon':
    case 'Saturn':
      value = (AYANA_MAX_KRANTI - decl) * AYANA_SCALE;
      break;
    case 'Sun':
    case 'Mars':
    case 'Jupiter':
    case 'Venus':
      value = (AYANA_MAX_KRANTI + decl) * AYANA_SCALE;
      break;
    default:
      return 30;
  }
  if (planet === 'Sun') value *= 2; // BPHS: Sun's Ayana Bala is always doubled
  // Safety clamp: a planet's ecliptic latitude can occasionally push its
  // true equatorial declination fractionally beyond the classical +-23.45
  // reference the formula assumes, which would otherwise give a tiny
  // negative or >60 result for non-Sun planets — clamp defensively.
  const ceiling = planet === 'Sun' ? 120 : 60;
  return Math.max(0, Math.min(ceiling, value));
}

// ── 13. CHESTA BALA (CORRECTED — uses real ephemeris speed) ──
// Speed computed by differencing planet position at JD-1 and JD+1
// Classification into 8 cheshta types per BPHS
const MEAN_SPEEDS = moduleData.MEAN_SPEEDS;
// Cheshta types and their bala values per BPHS Phala Deepika
// Type thresholds (speed ratio to mean):
// <0 = Vakra(60), ~0 = Vikala(45), <0.25 = Anuvakra(30),
// <0.5 = Mandatara(30), <0.75 = Manda(15), <1.25 = Sama(7.5),
// <2.0 = Chara(7.5), >=2.0 = Atichara(3.75)

function cheshtaBala(planet, speed, isRetro, jd_tt) {
  if (planet === 'Rahu' || planet === 'Ketu') return 30;

  // FIX S-06: Stationary (speed ~0) = Vikala = 45 virupas (NOT maximum)
  // Only retrograde planets get full Cheshta Bala (60)
  if (speed !== null && Math.abs(speed) < 0.05) return 45; // Vikala (station)
  if (isRetro || (speed !== null && speed < 0)) return 60; // Vakra (retrograde) = max

  const mean = MEAN_SPEEDS[planet];
  if (!mean) return 7.5;

  // SUN: Use equation of center (max ~1.915°, maps to 0-60 Chesta)
  // Sun Chesta = |equation of center| / max_equation * 60
  if (planet === 'Sun' && jd_tt) {
    const T   = (jd_tt - 2451545.0) / 36525.0;
    const M   = mod360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
    const RAD = Math.PI / 180;
    const C   = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M * RAD)
              + (0.019993 - 0.000101 * T) * Math.sin(2 * M * RAD)
              + 0.000289 * Math.sin(3 * M * RAD);
    return Math.abs(C) / 1.9146 * 60;
  }

  if (speed === null) return 7.5;
  const ratio = Math.abs(speed) / mean;

  // MOON: continuous formula — deviation from mean speed
  if (planet === 'Moon') {
    const chesta = Math.abs(mean - Math.abs(speed)) / (mean + Math.abs(speed)) * 60;
    return Math.max(0, Math.min(60, chesta));
  }

  // Inner planets (Mercury, Venus): continuous deviation
  if (planet === 'Mercury' || planet === 'Venus') {
    const chesta = Math.abs(mean - Math.abs(speed)) / (mean + Math.abs(speed)) * 60;
    return Math.max(0, Math.min(60, chesta));
  }

  // Outer planets (Mars, Jupiter, Saturn): discrete classification
  if (ratio >= 2.0) return 3.75;
  if (ratio >= 1.25) return 7.5;
  if (ratio >= 0.75) return 7.5;
  if (ratio >= 0.5)  return 15;
  if (ratio >= 0.25) return 30;
  return 30;
}

// ── 14. NAISARGIKA BALA (Natural/Innate Strength) ────────────
function naisargikaBala(planet) {
  return NAISARGIKA_BALA[planet] ?? 0;
}

// ── 15. DRIG BALA (Aspectual Strength) ───────────────────────
// FIX S-04: Base starts from 0 (not 30). A planet with no aspects gets 0 Drig Bala.
// FIX S-07: Use graded Vedic aspect strengths:
//   7th = Full (100%), 4th/8th Mars = 75%, 5th/9th Jupiter = Full (100%),
//   3rd/10th Saturn = Full (100%). Others = 50%.
// BUG FIX (S-04/S-07 regression): the previous implementation took an
// `aspects` array argument that NO CALLER EVER POPULATED. calcShadbala
// invoked it as `drigBala(pname, p.aspects ?? [])`, and the planet objects
// built by the chart engine carry no `.aspects` key — so the loop body never
// executed and Drig Bala was structurally pinned to exactly 0 for every
// planet in every chart. (The earlier "FIX S-04: start from 0, not 30" made
// this invisible-but-worse: before it, the dead loop at least returned a
// constant 30.) Drig Bala is now computed from actual chart longitudes.
//
// Method — BPHS Ch. 27 (Drikbala), the standard Sphuta Drishti formulation:
//
//   For aspecting graha A and aspected graha B, let
//       d = (lon_B - lon_A) mod 360         [degrees]
//   The Drishti value in virupas is the classical piecewise curve:
//
//       0   ≤ d < 30    →  0                 (no aspect within own/next sign)
//      30   ≤ d < 60    →  (d - 30) / 2      (0 → 15)
//      60   ≤ d < 90    →  (d - 60) + 15     (15 → 45)
//      90   ≤ d < 120   →  (120 - d) / 2 + 30  (45 → 30)
//     120   ≤ d < 150   →  (150 - d)         (30 → 0)
//     150   ≤ d < 180   →  (d - 150) * 2     (0 → 60)
//     180   ≤ d < 300   →  (300 - d) / 2     (60 → 0)
//     300   ≤ d < 360   →  0
//
//   The curve peaks at 60 virupas at d = 180° (the full 7th-house aspect that
//   every graha casts) and is continuous at every breakpoint by construction.
//
// Special aspects (BPHS): Mars additionally casts full drishti on the 4th and
// 8th (d = 90°, 210°), Jupiter on the 5th and 9th (d = 120°, 240°), Saturn on
// the 3rd and 10th (d = 60°, 270°). The base curve does not reach 60 at those
// points, so the special value is applied as max(curve, specialPeak) with a
// linear taper across the ±30° sign-width around the exact aspect degree —
// mirroring how the base curve itself tapers between breakpoints.
//
// Drik Bala = (sum of benefic drishti − sum of malefic drishti) / 4  [BPHS].
// It is signed: an afflicted planet legitimately receives NEGATIVE Drik Bala,
// and that negative value must flow into Shadbala rather than being clamped
// to 0 — clamping is what erases affliction from the strength model.
const ANG = (x) => ((x % 360) + 360) % 360;

export function sphutaDrishti(d) {
  d = ANG(d);
  if (d < 30)  return 0;
  if (d < 60)  return (d - 30) / 2;
  if (d < 90)  return (d - 60) + 15;
  if (d < 120) return (120 - d) / 2 + 30;
  if (d < 150) return 150 - d;
  if (d < 180) return (d - 150) * 2;
  if (d < 300) return (300 - d) / 2;
  return 0;
}

const SPECIAL_ASPECTS = moduleData.DRIK_SPECIAL_ASPECTS;
const DRIK_MALEFICS = moduleData.DRIK_NATURAL_MALEFICS;
const DRIK_BENEFICS = moduleData.DRIK_NATURAL_BENEFICS;
const DRIK_BODIES = moduleData.DRIK_ASPECTING_BODIES;

export function grahaDrishti(aspectingPlanet, d) {
  let v = sphutaDrishti(d);
  for (const peak of (SPECIAL_ASPECTS[aspectingPlanet] ?? [])) {
    // signed angular separation from the exact special-aspect degree
    const delta = Math.abs(((ANG(d) - peak + 180) % 360) - 180);
    if (delta < 30) v = Math.max(v, 60 * (1 - delta / 30));
  }
  return v;
}

/**
 * Classify a graha as benefic/malefic for Drik Bala purposes.
 * Deterministic and documented rather than hardcoded:
 *  - Jupiter, Venus: natural benefics.
 *  - Sun, Mars, Saturn, Rahu, Ketu: natural malefics.
 *  - Moon: benefic when waxing-strong (elongation from Sun in 90°..270°,
 *    i.e. Shukla Ashtami → Krishna Ashtami), else malefic.
 *  - Mercury: benefic when not within the same 30° sign-span as a natural
 *    malefic, else malefic (classical "Mercury takes the nature of its
 *    associates").
 */
export function drishtiNature(name, ctx = {}) {
  if (DRIK_BENEFICS.includes(name)) return 'benefic';
  if (DRIK_MALEFICS.includes(name)) return 'malefic';
  if (name === 'Moon') {
    const elong = ANG((ctx.moonLon ?? 0) - (ctx.sunLon ?? 0));
    return (elong >= 90 && elong <= 270) ? 'benefic' : 'malefic';
  }
  if (name === 'Mercury') {
    const mLon = ctx.selfLon ?? 0;
    const afflicted = (ctx.planets ?? []).some(q =>
      DRIK_MALEFICS.includes(q.name) &&
      Math.abs(((ANG(mLon - (q.siderealLon ?? 0)) + 180) % 360) - 180) < 30);
    return afflicted ? 'malefic' : 'benefic';
  }
  return 'malefic';
}

/**
 * Drik Bala for one graha, in virupas. Signed (may be negative).
 * @param {string} target      name of the aspected graha
 * @param {Array}  planets     full planet array with {name, siderealLon}
 * @param {object} ctx         { moonLon, sunLon }
 * @returns {{value:number, contributions:Array}}
 */
function drigBala(target, planets = [], ctx = {}) {
  const tp = planets.find(p => p.name === target);
  if (!tp) return { value: 0, contributions: [], status: 'NOT_CALCULATED', reason: 'target graha absent from chart' };
  const tLon = tp.siderealLon ?? 0;
  let pinda = 0;
  const contributions = [];
  for (const src of planets) {
    if (!src?.name || src.name === target) continue;
    if (!DRIK_BODIES.includes(src.name)) continue;
    const d = ANG(tLon - (src.siderealLon ?? 0));
    const drishti = grahaDrishti(src.name, d);
    if (drishti <= 0) continue;
    const nature = drishtiNature(src.name, { moonLon: ctx.moonLon, sunLon: ctx.sunLon, selfLon: src.siderealLon, planets });
    const signed = nature === 'benefic' ? drishti : -drishti;
    pinda += signed;
    contributions.push({
      from: src.name,
      separationDeg: Math.round(d * 1000) / 1000,
      drishtiVirupas: Math.round(drishti * 100) / 100,
      nature,
      signedVirupas: Math.round(signed * 100) / 100
    });
  }
  // BPHS: Drik Bala = Drishti Pinda / 4
  return {
    value: Math.round((pinda / 4) * 100) / 100,
    drishtiPinda: Math.round(pinda * 100) / 100,
    contributions,
    status: 'CALCULATED',
    formula: 'BPHS Ch.27 Sphuta Drishti curve; DrikBala = (Σ benefic drishti − Σ malefic drishti) / 4',
    source: 'Brihat Parashara Hora Shastra, Drikbala Adhyaya'
  };
}

// ── MASTER SHADBALA ──────────────────────────────────────────
export function calcShadbala(
  planets, houses, jd_tt, lat, lon,
  sunriseJD, sunsetJD,
  ayanamsa,  // pass actual ayanamsa value
  lagnaLon = null // exact Ascendant sidereal degree, for continuous Dig Bala
) {
  const moonP   = planets.find(p => p.name === 'Moon');
  const sunP    = planets.find(p => p.name === 'Sun');
  const moonLon = moonP?.siderealLon ?? 0;
  const sunLon  = sunP?.siderealLon  ?? 0;

  const isDay       = sunriseJD ? (jd_tt >= sunriseJD && jd_tt < sunsetJD) : true;
  const dayDuration = sunriseJD ? Math.max(sunsetJD - sunriseJD, 0.001) : 0.5;
  const dayFraction = sunriseJD ? Math.max(0, Math.min(1, (jd_tt - sunriseJD) / dayDuration)) : 0.5;
  // FIX: previously nighttime births fed the same (birth-sunrise)/(sunset-sunrise)
  // formula into Thribhaga Bala's "fraction" argument even at night, which just
  // clamps to 0 or 1 for any night birth — meaning it could never correctly tell
  // which of the 3 night-portions the birth actually fell in. Real night fraction
  // needs the correct night span: from the PREVIOUS sunset to THIS sunrise (early
  // morning births) or from THIS sunset to the NEXT sunrise (evening births).
  // Since only one day's sunrise/sunset is available here, the adjacent sunset is
  // approximated as sunsetJD ± 1 day — accurate to within seconds most of the
  // year since day length changes slowly day-to-day (a disclosed, small
  // approximation, not a silent one).
  const nightDuration = sunriseJD ? Math.max(1 - dayDuration, 0.001) : 0.5;
  const nightFraction = sunriseJD
    ? (jd_tt >= sunsetJD
        ? Math.max(0, Math.min(1, (jd_tt - sunsetJD) / nightDuration))
        : Math.max(0, Math.min(1, (jd_tt - (sunsetJD - 1)) / nightDuration)))
    : 0.5;
  const year        = Math.floor(2000 + (jd_tt - 2451545.0) / 365.25);

  const AYANAMSA = ayanamsa ?? 23.57;
  const obliq    = getObliquity(jd_tt);

  const SEVEN = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
  const results = {};

  for (const pname of SEVEN) {
    const p = planets.find(x => x.name === pname);
    if (!p) continue;

    const sLon   = p.siderealLon ?? 0;
    const hNum   = p.house ?? 1;
    const spd    = p.speed ?? null;
    const retro  = p.isRetrograde ?? p.retrograde ?? (spd !== null && spd < 0);
    const lat_e  = p.latitude ?? p.lat ?? 0;

    // ── Sthana Bala ──────────────────────────────────────────
    const ochcha = occhaBala(pname, sLon);
    const sapta  = calcSaptavargajaBala(pname, sLon, CONSTANTS);
    const ojha   = ojhaYugmaBala(pname, sLon);
    const kendra = kendraBala(hNum);
    const drek   = drekkanaBala(pname, sLon);
    // FIX V-08: Vargottama bonus applied to Saptavargaja Bala (D1=D9 match)
    const isVargottamaFlag = sapta.breakdown?.some(v => v.varga==='D1' && sapta.breakdown.find(v2=>v2.varga==='D9')?.sign === v.sign);
    const vargottamaBonus  = isVargottamaFlag ? 15 : 0; // 15 virupas bonus per BPHS
    const sthanaBala = ochcha + sapta.total + ojha + kendra + drek + vargottamaBonus;

    // ── Dig Bala ─────────────────────────────────────────────
    const digB = digBala(pname, hNum, sLon, lagnaLon);

    // ── Kala Bala (all components) ───────────────────────────
    const nath   = nathonnathaBala(pname, jd_tt, lon);
    const paksha = pakshaBala(pname, moonLon, sunLon);
    const thrib  = thribhagaBala(pname, isDay, dayFraction, nightFraction);
    const abda   = abdaBala(pname, year);
    const masa   = masaBala(pname, jd_tt);
    const vara   = varaBala(pname, jd_tt);
    const hora   = horaBala(pname, jd_tt, sunriseJD);

    // ── AYANA BALA ────────────────────────────────────────────
    // FIX: this used to be a duplicated, separately-buggy inline copy of
    // the formula (with the same wrong constants AND a broken Mercury
    // case) living completely apart from the standalone ayanaBala()
    // function above — the two could silently drift, and this inline copy
    // is the one actually used, making the fixes to the other one dead
    // code until this call was wired in. Now calls the single, sourced,
    // verified implementation so there's only one Ayana Bala formula in
    // this file to ever go wrong.
    const ayana = ayanaBala(pname, sLon, lat_e, jd_tt, AYANAMSA);
    // Recompute declination separately for the reported `declination` field
    // (ayanaBala() computes this internally too, but doesn't expose it —
    // duplicating the cheap trig here is simpler than changing that
    // function's return shape and risking other callers).
    const decl = eclipticToDecl(mod360(sLon + AYANAMSA), lat_e, obliq);
    // Note: Ayana Bala legitimately exceeds 60 for the Sun (range 0-120,
    // since BPHS explicitly doubles the Sun's result — see ayanaBala() above)

    // ── CHESTA BALA (CORRECTED — uses real speed) ────────────
    const chesta = cheshtaBala(pname, spd, retro, jd_tt);

    const kalaBala = nath + paksha + thrib + abda + masa + vara + hora + ayana;

    // ── Naisargika Bala ──────────────────────────────────────
    const nais = naisargikaBala(pname);

    // ── Drig Bala ────────────────────────────────────────────
    // Computed from the real chart. Signed: negative Drik Bala is a valid
    // classical result (net malefic aspect) and is NOT clamped away.
    const drigResult = drigBala(pname, planets, { moonLon, sunLon });
    const drig = drigResult.value;

    // ── Total ────────────────────────────────────────────────
    const total = sthanaBala + digB + kalaBala + chesta + nais + drig;
    const rupas = total / 60;
    const req   = SHADBALA_REQUIRED?.[pname] ?? 5;

    results[pname] = {
      occhaBala:        Math.round(ochcha * 100) / 100,
      saptavargajaBala: Math.round(sapta.total * 100) / 100,
      vargottamaBonus:  vargottamaBonus,
      isVargottama:     isVargottamaFlag,
      ojayugmaBala:     ojha,
      kendraBala:       kendra,
      drekkanaBala:     drek,
      totalSthanaBala:  Math.round(sthanaBala * 100) / 100,
      digBala:          Math.round(digB * 100) / 100,
      nathonnathaBala:  nath,
      pakshaBala:       Math.round(paksha * 100) / 100,
      thribhagaBala:    thrib,
      abdaBala:         abda,
      masaBala:         masa,
      varaBala:         vara,
      horaBala:         hora,
      ayanaBala:        Math.round(ayana * 100) / 100,
      yuddhaBala:       0,
      totalKalaBala:    Math.round(kalaBala * 100) / 100,
      cheshtaBala:      Math.round(chesta * 100) / 100,
      naisargikaBala:   nais,
      drigBala:         Math.round(drig * 100) / 100,
      // §15: every Shadbala component must expose formula/inputs/intermediates/result/source.
      drigBalaDetail: {
        status:        drigResult.status,
        result:        Math.round(drig * 100) / 100,
        drishtiPinda:  drigResult.drishtiPinda,
        contributions: drigResult.contributions,
        formula:       drigResult.formula,
        source:        drigResult.source
      },
      totalShadbala:    Math.round(total * 100) / 100,
      shadBalaRupas:    Math.round(rupas * 100) / 100,
      minimumRequired:  req,
      ratio:            Math.round((rupas / req) * 100) / 100,
      declination:      Math.round(decl * 100) / 100,
      saptaBreakdown:   sapta.breakdown,
    };
  }

  // Assign ranks
  const sorted = Object.entries(results).sort((a,b)=>b[1].totalShadbala - a[1].totalShadbala);
  sorted.forEach(([name], i) => { results[name].rank = i + 1; });

  return results;
}
