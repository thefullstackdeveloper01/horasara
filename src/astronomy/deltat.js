// ============================================================
// DELTA-T (ΔT = TT − UT) — CANONICAL SINGLE-SOURCE MODULE
// ------------------------------------------------------------
// Implements the Espenak & Meeus (2006) segmented polynomial
// model for ΔT, the same model used by NASA's eclipse-prediction
// canon and virtually every open ΔT implementation. It is a
// best-fit empirical model derived from actual historical
// observations (eclipse records, lunar occultations, telescopic
// timings, atomic-clock era measurements), NOT a closed-form
// physical law — so its own authors publish it with explicit
// uncertainty bands, which we surface here via `reliable` /
// `uncertaintySec` rather than pretending false precision.
//
// Coverage:
//   -1999 .. +3000   → the actual Espenak–Meeus fitted segments
//                       (this is the historically-validated range)
//   outside that      → long-term parabola ΔT ≈ -20 + 32u²,
//                       u=(year-1820)/100 (Morrison & Stephenson
//                       2004 long-term trend), flagged unreliable.
//                       No published model claims arcsecond-level
//                       accuracy millennia outside the historical
//                       record, and neither does this one.
//
// This file is the ONLY place ΔT is computed; astronomy/utils.js
// and astronomy/vsop87.js both import and re-export it, so the
// engine can never silently diverge on two different ΔT values
// (a latent bug in earlier versions of this codebase, where two
// independent ΔT polynomials existed side by side).
// ============================================================

function poly(t, coeffs) {
  let r = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) r = r * t + coeffs[i];
  return r;
}

/**
 * ΔT = TT − UT in seconds, for a given (decimal) year.
 * @param {number} year — calendar year, may be fractional (e.g. 2024.5)
 * @returns {number} ΔT in seconds
 */
export function deltaT(year) {
  const y = year;

  if (y < -500) {
    const u = (y - 1820) / 100;
    return -20 + 32 * u * u;
  }
  if (y < 500) {
    const u = y / 100;
    return poly(u, [10583.6, -1014.41, 33.78311, -5.952053, -0.1798452, 0.022174192, 0.0090316521]);
  }
  if (y < 1600) {
    const u = (y - 1000) / 100;
    return poly(u, [1574.2, -556.01, 71.23472, 0.319781, -0.8503463, -0.005050998, 0.0083572073]);
  }
  if (y < 1700) {
    const t = y - 1600;
    return poly(t, [120, -0.9808, -0.01532, 1 / 7129]);
  }
  if (y < 1800) {
    const t = y - 1700;
    return poly(t, [8.83, 0.1603, -0.0059285, 0.00013336, -1 / 1174000]);
  }
  if (y < 1860) {
    const t = y - 1800;
    return poly(t, [13.72, -0.332447, 0.0068612, 0.0041116, -0.00037436,
      0.0000121272, -0.0000001699, 0.000000000875]);
  }
  if (y < 1900) {
    const t = y - 1860;
    return poly(t, [7.62, 0.5737, -0.251754, 0.01680668, -0.0004473624, 1 / 233174]);
  }
  if (y < 1920) {
    const t = y - 1900;
    return poly(t, [-2.79, 1.494119, -0.0598939, 0.0061966, -0.000197]);
  }
  if (y < 1941) {
    const t = y - 1920;
    return poly(t, [21.20, 0.84493, -0.076100, 0.0020936]);
  }
  if (y < 1961) {
    const t = y - 1950;
    return poly(t, [29.07, 0.407, -1 / 233, 1 / 2547]);
  }
  if (y < 1986) {
    const t = y - 1975;
    return poly(t, [45.45, 1.067, -1 / 260, -1 / 718]);
  }
  if (y < 2005) {
    const t = y - 2000;
    return poly(t, [63.86, 0.3345, -0.060374, 0.0017275, 0.000651814, 0.00002373599]);
  }
  if (y < 2050) {
    const t = y - 2000;
    return poly(t, [62.92, 0.32217, 0.005589]);
  }
  if (y < 2150) {
    const u = (y - 1820) / 100;
    return -20 + 32 * u * u - 0.5628 * (2150 - y);
  }
  const u = (y - 1820) / 100;
  return -20 + 32 * u * u;
}

/**
 * ΔT with an explicit reliability/uncertainty annotation, so callers
 * (and reports) can be honest about accuracy far from the present.
 * Uncertainty figures are the published order-of-magnitude bands from
 * Espenak & Meeus / Morrison & Stephenson, not a precise error model.
 */
export function deltaTWithUncertainty(year) {
  const value = deltaT(year);
  let uncertaintySec, reliable;
  if (year >= 1955 && year <= 2015) { uncertaintySec = 0.5; reliable = true; }
  else if (year >= 1800 && year < 2050) { uncertaintySec = 2; reliable = true; }
  else if (year >= 1600 && year < 1800) { uncertaintySec = 5; reliable = true; }
  else if (year >= -500 && year < 1600) { uncertaintySec = 1000 * (1 - (year + 500) / 2100) + 20; reliable = true; }
  else if (year >= 2050 && year < 2150) { uncertaintySec = 30; reliable = false; }
  else { uncertaintySec = Math.abs(32 * ((year - 1820) / 100) ** 2) * 0.2 + 100; reliable = false; }
  return { value, uncertaintySec, reliable };
}
