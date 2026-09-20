/**
 * src/engine/planetPositions.js
 * ------------------------------------------------------------
 * Phase 2 of the chart-calculation pipeline (see src/engine.js and
 * src/engine/timeAndAscendant.js for the pattern this follows).
 *
 * Computes every planet's sidereal/tropical longitude, sign, nakshatra,
 * dignity, retrograde state, and speed — including Rahu/Ketu (true or
 * mean node) and the three outer planets (Uranus/Neptune/Pluto, approximate
 * mean-longitude model, clearly labeled elsewhere as such). Also applies
 * the single, non-duplicated Moon topocentric parallax correction (see the
 * FIX comment below — this is the exact code that was audited for the
 * "Moon parallax double-application" bug; unchanged by this move).
 */
import { mod360, signOf, padaOf, formatDMS, toRad, toDeg, nakshatraNameOf as nakOf } from '../astronomy/utils.js';
import { trueNode, meanNode } from '../astronomy/vsop87.js';
import { InternalVsop87Provider } from '../infrastructure/astronomy/InternalVsop87Provider.js';
import { resolveAstronomyProvider } from '../astronomy/ProviderFactory.js'
import { SIGNS, NAKSHATRAS, getPlanetDignity } from '../astronomy/constants.js';

import moduleData from '../../dataset/used/core/planetPositions.json' with { type: 'json' };
const PLANET_NAMES = moduleData.PLANET_NAMES;

/**
 * @param {object} birth - original birth input (needs lat/lon/elevation/topocentric/nodeMode)
 * @param {object} t - the result of computeTimeAndAscendant(birth) (needs JD_TT, AYANAMSA, LST)
 * @returns {{ planets: object[], nodeModeInfo: object|null, eps_deg: number }}
 */
const DEFAULT_PROVIDER = new InternalVsop87Provider();

export function computePlanetPositions(birth, t, provider = null) {
  provider = provider || resolveAstronomyProvider(birth?.ephemeris || process.env.JYOTISH_EPHEMERIS || 'internal');
  const { lat, lon, elevation = 0, topocentric = false, nodeMode = 'true' } = birth;
  const { JD_TT, AYANAMSA, LST } = t;

  // FIX (topocentric -> house cusps wiring): opt-in via birth.topocentric
  // (default false, byte-identical output for all existing callers); when
  // true, every downstream house/aspect/report section that reads
  // siderealLon automatically uses the observer-corrected position through
  // the same data flow that was already there.
  const observer = topocentric ? { lat, lon, elevation } : null;
  const allPos = provider.positions(birth, { JD_TT, AYANAMSA, LST, observer });

  // Declination for all planets (needed for Ayana Bala)
  const eps_deg = 23.4392911 - 0.0130042 * ((JD_TT - 2451545.0) / 36525.0);
  for (const [pname, pos] of Object.entries(allPos)) {
    if (pos && pos.longitude !== undefined) {
      const lat_ecl = pos.latitude ?? 0;
      const sinDecl = Math.sin(toRad(eps_deg)) * Math.sin(toRad(pos.longitude))
        + Math.cos(toRad(eps_deg)) * Math.sin(toRad(lat_ecl));
      pos.declination = toDeg(Math.asin(Math.max(-1, Math.min(1, sinDecl))));
    }
  }

  // FIX (Moon parallax double-application): when birth.topocentric=true,
  // getAllPlanetPositions() above already ran the full rigorous 3D
  // correction on every body including the Moon, tagged
  // allPos.Moon.topocentric = true. Only apply this simplified
  // longitude-only correction when that hasn't already happened, so
  // exactly one correction is ever applied.
  if (!allPos.Moon.topocentric) {
    const moonDist = allPos.Moon.distance || 0.00257;
    const moonDistEarthRadii = moonDist * 149597870.7 / 6371.0;
    const sinP = Math.sin(0.9507 * Math.PI / 180) / (moonDistEarthRadii / 60.27);
    const latR = lat * Math.PI / 180;
    const lstR = LST * Math.PI / 180;
    const moonDecl = allPos.Moon.declination || 0;
    const moonDeclR = moonDecl * Math.PI / 180;
    const cosDecl = Math.cos(moonDeclR) || 0.001;
    const moonParallax = -(sinP * Math.cos(latR) * Math.sin(lstR - allPos.Moon.longitude * Math.PI / 180) / cosDecl) * (180 / Math.PI);
    allPos.Moon.longitude = mod360(allPos.Moon.longitude + moonParallax);
  }

  // Build planet array
  const planets = PLANET_NAMES.map(n => {
    const p = allPos[n];
    const sidLon = mod360(p.longitude);
    const sign = SIGNS[signOf(sidLon)];
    const isRetro = p.retrograde || p.speed < 0;
    return {
      name: n,
      siderealLon: sidLon,
      tropicalLon: mod360(sidLon + AYANAMSA),
      sign,
      nakshatra: nakOf(sidLon),
      pada: padaOf(sidLon),
      degInSign: (sidLon % 30).toFixed(2),
      dms: formatDMS(sidLon % 30),
      dignity: getPlanetDignity(n, sign),
      retrograde: isRetro,
      retrogradeLabel: isRetro ? 'Vakri (R)' : 'Direct',
      speed: p.speed,
      lat: p.latitude || 0,
    };
  });

  // Rahu / Ketu — nodeMode toggle: 'true' or 'mean'
  let rahuTrop;
  if (nodeMode === 'mean') {
    rahuTrop = meanNode(JD_TT);
  } else {
    rahuTrop = trueNode(JD_TT);
  }
  const rahuSid = mod360(rahuTrop - AYANAMSA);
  const ketuSid = mod360(rahuSid + 180);

  planets.push({
    name: 'Rahu', siderealLon: rahuSid, tropicalLon: rahuTrop,
    sign: SIGNS[signOf(rahuSid)], nakshatra: nakOf(rahuSid),
    pada: padaOf(rahuSid), degInSign: (rahuSid % 30).toFixed(2),
    dms: formatDMS(rahuSid % 30), dignity: 'Neutral',
    retrograde: true, retrogradeLabel: 'Always Retrograde',
    speed: -0.053, lat: 0, nodeMode,
  });
  planets.push({
    name: 'Ketu', siderealLon: ketuSid, tropicalLon: mod360(rahuTrop + 180),
    sign: SIGNS[signOf(ketuSid)], nakshatra: nakOf(ketuSid),
    pada: padaOf(ketuSid), degInSign: (ketuSid % 30).toFixed(2),
    dms: formatDMS(ketuSid % 30), dignity: 'Neutral',
    retrograde: true, retrogradeLabel: 'Always Retrograde',
    speed: -0.053, lat: 0, nodeMode,
  });

  // For True Node comparison when Mean is selected.
  // §40: when the comparison does not apply, say so explicitly rather than
  // emitting a bare null that a consumer cannot distinguish from a failure.
  let nodeModeInfo = {
    status: 'NOT_APPLICABLE',
    mode: nodeMode,
    reason: `Mean-vs-True node comparison is only produced when nodeMode === 'mean'; this chart uses '${nodeMode}'.`
  };
  if (nodeMode === 'mean') {
    const trueRahuTrop = trueNode(JD_TT);
    const trueRahuSid = mod360(trueRahuTrop - AYANAMSA);
    nodeModeInfo = {
      status: 'CALCULATED',
      mode: 'mean',
      trueRahu: trueRahuSid.toFixed(4),
      meanRahu: rahuSid.toFixed(4),
      difference: (trueRahuSid - rahuSid).toFixed(4),
      note: 'Mean Node shown. True Node differs by up to ±1.7°',
    };
  }

  // Outer planets (approximate)
  const providerHasOuter = ['Uranus','Neptune','Pluto'].every(name => allPos[name]?.longitude !== undefined);
  if (providerHasOuter) {
    for (const name of ['Uranus','Neptune','Pluto']) {
      const p = allPos[name]; const sl = mod360(p.longitude - AYANAMSA);
      planets.push({ name, siderealLon: sl, tropicalLon: mod360(p.longitude), sign: SIGNS[signOf(sl)], nakshatra: nakOf(sl), pada: padaOf(sl), degInSign: (sl % 30).toFixed(2), dms: formatDMS(sl % 30), dignity: 'Neutral', retrograde: !!p.retrograde, retrogradeLabel: p.retrograde ? 'Vakri (R)' : 'Direct', speed: p.speed || 0, lat: p.latitude || 0, outer: true });
    }
  } else {
    planets.push(...calcOuterPlanets(JD_TT, AYANAMSA));
  }

  return { planets, nodeModeInfo, eps_deg, provider: provider.metadata?.() || { id: provider.id || 'unknown' } };
}

// ── OUTER PLANETS ──────────────────────────────────────────────
// Meeus Table 31.a corrected mean longitudes (tropical degrees) — see
// git history for the calibration notes (prior values had errors of
// 232°/50°/30° for Uranus/Neptune/Pluto respectively; current values
// verified vs Swiss Ephemeris at J2000.0 and Apr 2026).
function calcOuterPlanets(JD_TT, AYANAMSA) {
  const T = (JD_TT - 2451545.0) / 36525.0;
  const n = a => ((a % 360) + 360) % 360;

  const U = n(294.6498 + 428.466 * T);   // Uranus  — 84.01 yr period
  const N = n(300.1952 + 218.486 * T);   // Neptune — 164.8 yr period
  const P = n(253.6000 + 180.615 * T);   // Pluto   — 248.1 yr period

  return [
    mkOuter('Uranus', n(U - AYANAMSA), 0.012, AYANAMSA),
    mkOuter('Neptune', n(N - AYANAMSA), 0.006, AYANAMSA),
    mkOuter('Pluto', n(P - AYANAMSA), 0.004, AYANAMSA),
  ];
}

function mkOuter(name, sLon, spd, ayanamsa = 0) {
  const sl = mod360(sLon);
  return {
    name, siderealLon: sl, sign: SIGNS[signOf(sl)],
    tropicalLon: mod360(sl + ayanamsa),
    nakshatra: NAKSHATRAS[Math.floor(sl / (40 / 3))] || '?',
    pada: Math.floor((sl % (40 / 3)) / (40 / 12)) + 1,
    degInSign: (sl % 30).toFixed(2), dms: formatDMS(sl % 30),
    dignity: 'Neutral', retrograde: false,
    retrogradeLabel: 'Direct', speed: spd, lat: 0, outer: true,
  };
}
