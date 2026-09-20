// ============================================================
// TOPOCENTRIC & ATMOSPHERIC CORRECTIONS
// ------------------------------------------------------------
// Standard, well-established formulas (Meeus Ch.11 "geocentric →
// topocentric", Ch.40 refraction; Bennett 1982 refraction model).
// These are provided as OPT-IN utilities: none of the existing
// report pipeline calls them by default, so all existing chart
// output is unchanged (per "do not affect existing functionality").
// Call them explicitly wherever topocentric precision is wanted —
// e.g. very-close bodies (the Moon, at up to ~1° parallax) for
// high-precision rise/set or occultation-level work.
// ============================================================

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// WGS84 ellipsoid constants
import moduleData from '../../dataset/used/core/corrections.json' with { type: 'json' };
const WGS84_A = moduleData.WGS84_A;
const WGS84_F = 1 / 298.257223563; // flattening

/**
 * Geocentric latitude & radius-vector factors (rho*sinφ', rho*cosφ')
 * for an observer at geodetic latitude/elevation, per Meeus eq. 11.1-11.4.
 * Needed to convert geocentric → topocentric coordinates precisely on an
 * oblate (not spherical) Earth.
 */
export function observerGeocentricFactors(latDeg, elevationMeters) {
  const phi = latDeg * DEG2RAD;
  const b_over_a = 1 - WGS84_F;
  const u = Math.atan(b_over_a * Math.tan(phi));
  const rhoSinPhi = b_over_a * Math.sin(u) + (elevationMeters / WGS84_A) * Math.sin(phi);
  const rhoCosPhi = Math.cos(u) + (elevationMeters / WGS84_A) * Math.cos(phi);
  return { rhoSinPhi, rhoCosPhi };
}

/**
 * Equatorial horizontal parallax (degrees) of a body at distance `distAU`.
 * Meeus eq. 40.6: sin(pi) = 6378.14 km / distance. For the Moon (distAU in
 * AU) this is ~0.95°-1.0°; for the Sun/planets it is a few arcseconds.
 */
export function horizontalParallax(distanceAU) {
  const distKm = distanceAU * 149597870.7;
  return Math.asin(6378.14 / distKm) * RAD2DEG;
}

/**
 * Converts a geocentric ecliptic longitude/latitude/distance to topocentric
 * (as seen from a specific place on Earth's surface) using the rigorous
 * parallax-in-longitude / parallax-in-latitude method (Meeus Ch.40, adapted
 * to ecliptic coordinates via the standard equatorial-parallax projection).
 * This matters most for the Moon; for the Sun and outer planets the shift
 * is negligible (sub-arcsecond to a few arcseconds) but is applied
 * consistently for completeness.
 *
 * @param {number} lonDeg geocentric ecliptic longitude (degrees)
 * @param {number} latDeg geocentric ecliptic latitude (degrees)
 * @param {number} distanceAU geocentric distance (AU)
 * @param {number} obliquityDeg true obliquity of the ecliptic (degrees)
 * @param {number} lstDeg local (apparent) sidereal time (degrees)
 * @param {number} observerLatDeg geodetic latitude of observer (degrees)
 * @param {number} elevationMeters observer elevation above sea level (m)
 */
export function topocentricEcliptic(lonDeg, latDeg, distanceAU, obliquityDeg, lstDeg, observerLatDeg, elevationMeters = 0) {
  const eps = obliquityDeg * DEG2RAD;
  const lambda = lonDeg * DEG2RAD;
  const beta = latDeg * DEG2RAD;

  // Ecliptic -> equatorial (geocentric)
  const sinDelta = Math.sin(beta) * Math.cos(eps) + Math.cos(beta) * Math.sin(eps) * Math.sin(lambda);
  const dec = Math.asin(sinDelta);
  const ra = Math.atan2(
    Math.sin(lambda) * Math.cos(eps) - Math.tan(beta) * Math.sin(eps),
    Math.cos(lambda)
  );

  const { rhoSinPhi, rhoCosPhi } = observerGeocentricFactors(observerLatDeg, elevationMeters);
  const pi = horizontalParallax(distanceAU) * DEG2RAD; // equatorial horizontal parallax
  const H = (lstDeg * DEG2RAD) - ra; // hour angle

  const num_dAlpha = -rhoCosPhi * Math.sin(pi) * Math.sin(H);
  const den_dAlpha = Math.cos(dec) - rhoCosPhi * Math.sin(pi) * Math.cos(H);
  const dAlpha = Math.atan2(num_dAlpha, den_dAlpha);

  const raTopo = ra + dAlpha;
  const decTopo = Math.atan2(
    (Math.sin(dec) - rhoSinPhi * Math.sin(pi)) * Math.cos(dAlpha),
    den_dAlpha
  );

  // Back to ecliptic
  const raT = raTopo, decT = decTopo;
  const lambdaTopo = Math.atan2(
    Math.sin(raT) * Math.cos(eps) + Math.tan(decT) * Math.sin(eps),
    Math.cos(raT)
  );
  const betaTopo = Math.asin(
    Math.sin(decT) * Math.cos(eps) - Math.cos(decT) * Math.sin(eps) * Math.sin(raT)
  );

  let lonOut = lambdaTopo * RAD2DEG;
  lonOut = ((lonOut % 360) + 360) % 360;
  return { longitude: lonOut, latitude: betaTopo * RAD2DEG };
}

/**
 * Atmospheric refraction correction at a given apparent altitude, in
 * degrees, using Bennett's (1982) formula — the standard practical model
 * (accurate to ~0.07' from horizon to zenith), for standard atmospheric
 * conditions (1010 hPa, 10°C). Returns 0 above ~90° (undefined/negligible).
 */
export function atmosphericRefraction(altitudeDeg, pressureHPa = 1010, temperatureC = 10) {
  if (altitudeDeg > 90) return 0;
  const h = altitudeDeg;
  const R_arcmin = 1 / Math.tan((h + 7.31 / (h + 4.4)) * DEG2RAD);
  const correction = (R_arcmin * (pressureHPa / 1010) * (283 / (273 + temperatureC))) / 60; // degrees
  return correction;
}
