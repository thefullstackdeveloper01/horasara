// ============================================================
// NUTATION — IAU 2000B MODEL (McCarthy & Luzum 2003)
// ------------------------------------------------------------
// SOURCE & PROVENANCE (per SOFA's derived-work terms, reproduced below):
//   This file is a JavaScript port of the luni-solar term table and
//   summation algorithm from `nut00b.c`, part of the IAU SOFA
//   (Standards Of Fundamental Astronomy) library, fetched directly
//   from the official SOFA source mirror (github.com/Starlink/sofa,
//   file src/nut00b.c, SOFA release 2016-05-03, "This revision: 2013
//   June 18") and transcribed term-for-term, not from memory. That
//   source is Copyright (C) 2016 IAU SOFA Board, made available under
//   the SOFA Software License (see www.iausofa.org/tandc.html).
//
//   (a) This module uses computations derived from SOFA software; it
//       is NOT itself software provided by, or endorsed by, SOFA.
//   (b) How this differs from the original: ported from C to
//       JavaScript; the 77-term coefficient table, fundamental
//       (Delaunay) arguments, and summation loop are numerically
//       identical to the SOFA source; the function is renamed (no
//       "iau"/"sofa" prefix, per license term (c)) and returns degrees
//       instead of radians to match this codebase's existing
//       `nutation()` convention, with everything else unchanged.
//   (c) Function name deliberately avoids the "iau"/"sofa" prefix.
//   (d) This is a faithful port of IAU-adopted, published values, not
//       an original derivation — credit for the model belongs to
//       McCarthy & Luzum (2003) / IAU SOFA Board, as noted throughout.
//
// ACCURACY: per SOFA's own documentation, IAU 2000B delivers nutation
// accurate to ~1 milliarcsecond (mas) over 1995-2050, and is what
// replaces the ~20-term abridged IAU 1980 series previously used here
// (which is arcsecond-level, roughly 1000x less precise).
// ============================================================

const ARCSEC_TO_RAD = Math.PI / (180 * 3600);
const MAS_TO_RAD    = ARCSEC_TO_RAD / 1000;   // milliarcsec -> rad
const U2R           = ARCSEC_TO_RAD / 1e7;    // 0.1 microarcsec -> rad
import moduleData from '../../dataset/used/core/nutation2000b.json' with { type: 'json' };
const TURNAS = moduleData.TURNAS;
const D2PI          = 2 * Math.PI;
const DJC = moduleData.DJC;
const DJ00 = moduleData.DJ00;

// Fixed offsets standing in for the omitted planetary nutation terms
// (Luzum 2001 values, as used by SOFA's "rigorous" application method).
const DPPLAN = -0.135 * MAS_TO_RAD;
const DEPLAN =  0.388 * MAS_TO_RAD;

// Luni-solar nutation series: 77 terms, transcribed verbatim from
// SOFA nut00b.c. Columns: [nl, nlp, nf, nd, nom, ps, pst, pc, ec, ect, es]
const TERMS = moduleData.TERMS;

/**
 * IAU 2000B nutation in longitude (dpsi) and obliquity (deps), in degrees.
 *
 * Faithful port of SOFA's `nut00b.c` (77-term luni-solar series + fixed
 * planetary offsets). Returns degrees (not radians) to match the existing
 * `nutation()` convention used throughout the rest of this codebase.
 *
 * @param {number} jdTT — Julian Date in Terrestrial Time (TT).
 *                        For TT = UT + ΔT, pass jdUT + ΔT/86400.
 * @returns {{dpsi:number, deps:number}} nutation in longitude & obliquity,
 *          in DEGREES. Returns {0,0} for invalid input (NaN/Infinity).
 *
 * @example
 *   const { dpsi, deps } = nutationIAU2000B(2451545.0); // J2000.0 (TT)
 *   // dpsi ≈ -0.00471°, deps ≈ -0.00154° (typical magnitudes)
 */
function computeNutationIAU2000B(jdTT) {
  // ── FIX: input validation (was missing — NaN/Infinity silently
  //    propagated into garbage nutation values). Return zero nutation
  //    for invalid input rather than poisoning downstream consumers.
  if (typeof jdTT !== 'number' || !isFinite(jdTT)) {
    return { dpsi: 0, deps: 0 };
  }

  // Julian centuries from J2000.0 (TT).
  const t = (jdTT - DJ00) / DJC;

  // ── Fundamental (Delaunay) arguments, Simon et al. (1994), in
  //    arcseconds, reduced mod 1 turn and converted to radians —
  //    matches SOFA exactly.  (FIX: fmodTurns now guarantees a
  //    non-negative result in [0, TURNAS) instead of preserving
  //    dividend sign like the JS `%` operator; mathematically
  //    equivalent for sin/cos, but matches SOFA's intended range
  //    convention and prevents any subtle precision loss during
  //    subsequent argument reduction.)
  const el  = fmodTurns(485868.249036 + 1717915923.2178 * t) * ARCSEC_TO_RAD;
  const elp = fmodTurns(1287104.79305 +  129596581.0481 * t) * ARCSEC_TO_RAD;
  const f   = fmodTurns(335779.526232 + 1739527262.8478 * t) * ARCSEC_TO_RAD;
  const d   = fmodTurns(1072260.70369 + 1602961601.2090 * t) * ARCSEC_TO_RAD;
  const om  = fmodTurns(450160.398036 -   6962890.5431 * t) * ARCSEC_TO_RAD;

  let dp = 0, de = 0;

  // Sum smallest terms first (as SOFA does) to minimize rounding error.
  for (let i = TERMS.length - 1; i >= 0; i--) {
    const [nl, nlp, nf, nd, nom, ps, pst, pc, ec, ect, es] = TERMS[i];
    let arg = nl * el + nlp * elp + nf * f + nd * d + nom * om;

    // ── FIX: argument reduction now guarantees non-negative value
    //    in [0, 2π). Previously `arg % D2PI` could return negative
    //    (JS `%` follows dividend sign); sin/cos were still correct
    //    but the explicit positive range matches SOFA's `fmod` use
    //    and is more numerically stable for large |arg|.
    arg = arg % D2PI;
    if (arg < 0) arg += D2PI;

    const sarg = Math.sin(arg), carg = Math.cos(arg);
    dp += (ps + pst * t) * sarg + pc * carg;
    de += (ec + ect * t) * carg + es * sarg;
  }

  // Convert 0.1 µas → radians.
  const dpsiLuniSolar = dp * U2R;
  const depsLuniSolar = de * U2R;

  // Add the fixed planetary-term offsets (Luzum 2001, as SOFA does).
  const dpsiRad = dpsiLuniSolar + DPPLAN;
  const depsRad = depsLuniSolar + DEPLAN;

  // Return degrees per the codebase's `nutation()` convention.
  const RAD2DEG = 180 / Math.PI;
  return {
    dpsi: dpsiRad * RAD2DEG,
    deps: depsRad * RAD2DEG
  };
}

/**
 * Reduce an angle expressed in arcseconds to the half-open range
 * [0, TURNAS) = [0, 1296000") = [0, 360°).
 *
 * NOTE: This is mathematically equivalent to the previous
 *       `return arcsec % TURNAS;` for downstream sin/cos consumers,
 *       BUT now guarantees a non-negative result — matching SOFA's
 *       `fmod`-based reduction convention and preventing any subtle
 *       argument-reduction precision issues for very large negative
 *       inputs (e.g. Ω for t > 0.065 century previously went negative
 *       since `450160.398036 - 6962890.5431*t` becomes negative).
 *
 * @param {number} arcsec — angle in arcseconds
 * @returns {number} equivalent angle in [0, TURNAS)
 */
function fmodTurns(arcsec) {
  let r = arcsec % TURNAS;
  if (r < 0) r += TURNAS;
  return r;
}

// ── PERFORMANCE: memoized public wrapper ───────────────────────────
//
// `computeNutationIAU2000B` is a pure function of `jdTT` (77-term series,
// no I/O, no globals), so identical inputs always produce identical
// output. A single chart calculation calls it hundreds of times with a
// small number of distinct Julian Dates (one per planet sample epoch),
// which made it one of the two dominant CPU costs in the engine.
//
// The cache below is a bounded FIFO map keyed on the exact jdTT double.
// It is a pure-speed optimization: results are byte-identical to the
// uncached path, and the frozen return value prevents a caller from
// mutating a shared entry.
const _NUT_CACHE = new Map();
const _NUT_CACHE_MAX = 4096;

export function nutationIAU2000B(jdTT) {
  if (typeof jdTT !== 'number' || !isFinite(jdTT)) return { dpsi: 0, deps: 0 };
  const hit = _NUT_CACHE.get(jdTT);
  if (hit !== undefined) return hit;
  const value = Object.freeze(computeNutationIAU2000B(jdTT));
  if (_NUT_CACHE.size >= _NUT_CACHE_MAX) {
    // Drop the oldest quarter in one pass so we amortize eviction cost.
    let drop = _NUT_CACHE_MAX >> 2;
    for (const k of _NUT_CACHE.keys()) { _NUT_CACHE.delete(k); if (--drop <= 0) break; }
  }
  _NUT_CACHE.set(jdTT, value);
  return value;
}

/** Clear the nutation memo cache (tests / long-running processes). */
export function _clearNutationCache() { _NUT_CACHE.clear(); }

// ── Optional diagnostic exports (no behavior change for existing
//    callers; useful for testing/provenance verification). ──────────
export const _IAU2000B_TERM_COUNT = TERMS.length;        // = 77
export const _IAU2000B_CONSTANTS  = Object.freeze({
  ARCSEC_TO_RAD, MAS_TO_RAD, U2R, TURNAS, D2PI, DJC, DJ00,
  DPPLAN, DEPLAN
});