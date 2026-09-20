// ============================================================
// VEDIC JYOTISH ENGINE v6 — HOUSES & ASPECTS
// Whole Sign (for strength), Bhava Chalit (for results)
// ============================================================

import { SIGNS, SIGN_LORDS, NATURAL_FRIENDS, NATURAL_ENEMIES } from '../astronomy/constants.js';
import { mod360, signOf } from '../astronomy/utils.js';

// ── Shared helpers (dead-code/duplication audit) ───────────────────────────
// Both Placidus and Koch converted "right ascension along the celestial
// equator" back to "ecliptic longitude" with an identical closure-scoped
// function; extracted here so there's one implementation instead of two
// that could silently drift apart.
function raToLongitude(raDeg, eps) {
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const RAr = raDeg * D2R, epsR = eps * D2R;
  return mod360(Math.atan2(Math.sin(RAr), Math.cos(RAr) * Math.cos(epsR)) * R2D);
}

// Formats a raw 12-cusp longitude array into the house-object shape every
// house system (Placidus/Koch/Sripati) returns. Previously each system
// re-implemented this exact .map() independently.
function formatCusps(cusps, systemName) {
  return cusps.map((cusp, i) => ({
    house: i + 1,
    cusp: parseFloat(cusp.toFixed(4)),
    sign: SIGNS[signOf(cusp)],
    signIndex: signOf(cusp),
    lord: SIGN_LORDS[SIGNS[signOf(cusp)]],
    system: systemName,
  }));
}

// Assembles the standard 12-cusp array from the four independently-derived
// cusps (H2, H3, H11, H12) using the universal opposite-house identity
// (H(n+6) = H(n) + 180°). Both Placidus and Koch built this array by hand
// with identical structure; only h2/h3/h11/h12 differ between the systems.
function buildQuadrantCusps(ascLon, mcLon, h2, h3, h11, h12) {
  return [
    ascLon,                // H1  = ASC
    h2,                    // H2
    h3,                    // H3
    mod360(mcLon + 180),   // H4  = IC (opposite MC)
    mod360(h11 + 180),     // H5  = opposite H11
    mod360(h12 + 180),     // H6  = opposite H12
    mod360(ascLon + 180),  // H7  = DSC
    mod360(h2 + 180),      // H8
    mod360(h3 + 180),      // H9
    mcLon,                 // H10 = MC
    h11,                   // H11
    h12,                   // H12
  ];
}

// Whole Sign Houses
export function wholeSignHouses(ascLon) {
  const ascSign = signOf(ascLon);
  return Array.from({length:12}, (_,i) => {
    const hSign = (ascSign + i) % 12;
    return { house: i+1, sign: SIGNS[hSign], signIndex: hSign,
             lord: SIGN_LORDS[SIGNS[hSign]], startDeg: hSign*30, endDeg: (hSign+1)*30 };
  });
}

// Equal Houses
export function equalHouses(ascLon) {
  return Array.from({length:12}, (_,i) => {
    const cusp = mod360(ascLon + i*30);
    return { house: i+1, cusp: cusp.toFixed(2), sign: SIGNS[signOf(cusp)],
             signIndex: signOf(cusp), lord: SIGN_LORDS[SIGNS[signOf(cusp)]] };
  });
}

// Bhava Chalit — each house is 30° centered on its cusp
// Used for PHYSICAL RESULTS (planets may shift from Rashi house)
export function calcBhavaCalit(planets, ascLon) {
  const bhavas = Array.from({length:12}, (_,i) => {
    const cusp = mod360(ascLon + i*30);
    return { house: i+1, cusp,
             start: mod360(cusp - 15),
             end: mod360(cusp + 15) };
  });

  const result = planets.map(p => {
    const lon = p.siderealLon;
    let bhavaHouse = p.house || 1;
    for (const b of bhavas) {
      // FIX H-02: b.start > b.end means house straddles 0° Aries (wrap-around)
      const inBhava = b.start > b.end
        ? lon >= b.start || lon < b.end   // wrap case: e.g. start=350°, end=10°
        : lon >= b.start && lon < b.end;  // normal case
      if (inBhava) { bhavaHouse = b.house; break; }
    }
    const rashiHouse = p.house || 1;
    const shifted = bhavaHouse !== rashiHouse;
    return { planet: p.name, rashiHouse, bhavaHouse, shifted,
             note: shifted ? `⚡ ${p.name}: Rashi H${rashiHouse} → Bhava H${bhavaHouse}` : `${p.name}: H${rashiHouse} (no shift)` };
  });

  const shiftedPlanets = result.filter(p => p.shifted);
  return { planets: result, shiftedPlanets,
           summary: shiftedPlanets.length > 0
             ? `${shiftedPlanets.length} planet(s) shift house: ` + shiftedPlanets.map(p=>p.note).join(' | ')
             : 'No planets shift house — Rashi and Bhava Chalit identical' };
}

// Assign planets to houses
//
// FIX (house-system flag ignored — confirmed real bug): this function's
// second parameter used to be named `wsH` and was never read anywhere in
// the body — house membership was computed purely from
// (planet sign − ascendant sign), i.e. Whole Sign, no matter what
// `houseSystem` the caller requested. Every non-default house system
// (Placidus/Koch/Sripati/Equal/Porphyry) silently had zero effect on
// which house a planet was assigned to for Bhava Phala, dosha detection,
// yoga houses, dasha-house activation, etc. — only the printed cusp table
// used the real system; almost everything else stayed Whole Sign
// underneath it.
//
// Fix: accept the actual 12-cusp array for the requested system (as
// returned by getHouseCusps()) and place each planet by real ecliptic
// degree between consecutive cusps. Backward compatible: if `houseCusps`
// isn't a proper 12-entry array (e.g. an old caller still passing the
// house-system name as a string, or a test harness calling this directly),
// it falls back to the exact same Whole-Sign math as before — so nothing
// that already worked changes unless it's wired to a real cusp array.
export function assignPlanetsToHouses(planets, houseCusps, ascLon) {
  const ascSign = signOf(ascLon);
  const wholeSignFallback = () => planets.map(p => {
    const pSign = signOf(p.siderealLon);
    const houseNum = ((pSign - ascSign + 12) % 12) + 1;
    return { ...p, house: houseNum, houseSign: SIGNS[pSign] };
  });

  if (!Array.isArray(houseCusps) || houseCusps.length !== 12) {
    return wholeSignFallback();
  }

  // Uniform "house-start degree" across all cusp shapes: quadrant systems
  // (Placidus/Koch/Sripati/Equal/Porphyry) expose `cusp`; wholeSignHouses
  // exposes `startDeg`. Whole Sign routed through this same degree-based
  // logic gives an identical result to wholeSignFallback() (sign
  // boundaries ARE the house boundaries), so there's exactly one code
  // path doing real work, not two that could drift apart.
  const starts = houseCusps
    .slice().sort((a, b) => a.house - b.house)
    .map(h => mod360(h.cusp ?? h.startDeg ?? 0));

  if (starts.some(s => !Number.isFinite(s))) return wholeSignFallback();

  return planets.map(p => {
    const lon = mod360(p.siderealLon);
    const pSign = signOf(lon);
    let houseNum = 12; // safety fallback, overwritten below in all normal cases
    for (let i = 0; i < 12; i++) {
      const start = starts[i];
      const end = starts[(i + 1) % 12];
      const inHouse = start <= end
        ? (lon >= start && lon < end)
        : (lon >= start || lon < end); // house straddles 0° Aries
      if (inHouse) { houseNum = i + 1; break; }
    }
    return { ...p, house: houseNum, houseSign: SIGNS[pSign] };
  });
}

// Vedic aspects (Graha Drishti)
export function calcAspects(planets) {
  const aspects = [];
  for (const p1 of planets) {
    if (!p1.house) continue;
    const aspectedHouses = getAspectedHouses(p1.name, p1.house);
    for (const p2 of planets) {
      if (p1.name === p2.name || !p2.house) continue;
      const asp = aspectedHouses.find(a => a.house === p2.house);
      if (asp) {
        aspects.push({ from: p1.name, to: p2.name,
          fromHouse: p1.house, toHouse: p2.house,
          aspectType: asp.type, strength: asp.strength });
      }
    }
  }
  return aspects;
}

function getAspectedHouses(planet, fromHouse) {
  const h = fromHouse;
  const asp = [{ house: ((h+5)%12)+1, type:'7th aspect', strength:'Full' }];
  if (planet === 'Mars') {
    asp.push({ house: ((h+3)%12)+1, type:'4th aspect', strength:'3/4' });
    asp.push({ house: ((h+7)%12)+1, type:'8th aspect', strength:'3/4' });
  } else if (planet === 'Jupiter') {
    asp.push({ house: ((h+4)%12)+1, type:'5th aspect', strength:'Full' });
    asp.push({ house: ((h+8)%12)+1, type:'9th aspect', strength:'Full' });
  } else if (planet === 'Saturn') {
    asp.push({ house: ((h+2)%12)+1, type:'3rd aspect', strength:'Full' });
    asp.push({ house: ((h+9)%12)+1, type:'10th aspect', strength:'Full' });
  } else if (planet === 'Rahu' || planet === 'Ketu') {
    asp.push({ house: ((h+4)%12)+1, type:'5th aspect', strength:'Full' });
    asp.push({ house: ((h+8)%12)+1, type:'9th aspect', strength:'Full' });
  }
  return asp;
}

// ──────────────────────────────────────────────────────────────────────────────
// FIX H-03: Placidus and Koch house systems
// These are used for Bhava Chalit calculation in Western-influenced Vedic methods
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Placidus House System
 * Trisects the diurnal/nocturnal semi-arc of intermediate cusps 11,12,2,3
 * in TIME (right ascension), not in ecliptic-longitude space — this is
 * what distinguishes Placidus from simpler house systems.
 *
 * FIX (house-system audit): the previous implementation iterated using the
 * ecliptic-longitude declination formula sin(δ)=sin(ε)sin(λ) on a variable
 * it was simultaneously treating as a right-ascension value, and converted
 * back to ecliptic longitude with atan2(tan(θ), cos(ε)) — dimensionally
 * inconsistent (tan(θ) is not a valid atan2 "y" argument paired with
 * cos(ε) as "x"). This produced non-monotonic, out-of-order house cusps
 * (verified numerically: cusps jumping backward by 100°+ between adjacent
 * houses). Replaced with the standard iterative algorithm (attributed to
 * M. Vijayaraghavulu, as published in Michelsen & Hand's "American Book of
 * Tables" and widely reproduced in astrological-software references):
 *   RA(11,12) = RAMC + acos(-sin(RA)·tanε·tanφ) / F,   F=3 (11), F=1.5 (12)
 *   RA(2,3)   = RAMC + 180 − acos(sin(RA)·tanε·tanφ) / F,  F=1.5 (2), F=3 (3)
 * iterated to convergence from initial guesses RAMC+30/60/120/150, then
 * converted to ecliptic longitude via λ = atan2(sin(RA), cos(RA)·cosε) —
 * the SAME formula this codebase already (correctly) uses for MC itself
 * in astronomy/vsop87.js's ascendant() function, so this is now internally
 * consistent with the rest of the engine, not just independently verified.
 *
 * @param {number} ascLon  - Ascendant longitude (degrees, sidereal)
 * @param {number} mcLon   - Midheaven (MC) longitude (degrees, sidereal)
 * @param {number} lat     - Geographic latitude (degrees)
 * @param {number} ramc    - Right Ascension of Midheaven (degrees)
 * @param {number} eps     - Obliquity of ecliptic (degrees, default 23.44)
 */
export function placidusHouses(ascLon, mcLon, lat, ramc, eps = 23.4392911, ayanamsa = 0) {
  // FIX (New-spec audit — real Placidus KP cusps): ascLon/mcLon (the
  // Ascendant/MC) are SIDEREAL (Vedic) longitudes — confirmed by this
  // function's own docstring and its only live caller (getKPCusps). But
  // h11/h12/h2/h3 come from raToLon(), a direct RA→ecliptic-longitude
  // conversion using ramc/eps — both purely equatorial/tropical
  // quantities with no ayanamsa concept — so h11/h12/h2/h3 were always
  // TROPICAL. buildQuadrantCusps() combined these tropical intermediate
  // cusps directly with the sidereal ascLon/mcLon with no conversion,
  // silently offsetting 8 of the 12 house cusps (2,3,5,6,8,9,11,12) by
  // roughly one ayanamsa (~24°) from every OTHER Placidus/KP chart this
  // app has ever produced. Most of the time this offset didn't push any
  // single adjacent-cusp gap outside the [0.001°, 90°) sanity window, so
  // it went undetected — but for specific RAMC/latitude combinations it
  // pushed a gap to ~360° (effectively 0°) or beyond 90°, incorrectly
  // triggering the "unstable near polar circle" fallback for perfectly
  // ordinary mid-latitude cities (caught via a Delhi/Kolkata chart during
  // this audit). Fix: convert h11/h12/h2/h3 to sidereal (subtract the
  // same ayanamsa used for ascLon/mcLon) before combining them.
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const tanEps = Math.tan(eps * D2R);
  const tanLat = Math.tan(lat * D2R);
  const clamp = x => Math.max(-1, Math.min(1, x));

  // Circumpolar guard: Placidus is undefined beyond the latitude where the
  // ecliptic's declination extremes exceed (90°-lat) — i.e. near/inside the
  // polar circles. We detect divergence via the acos domain check inside
  // the loop and fall back to Equal houses from ASC if it occurs, rather
  // than silently returning NaN/garbage cusps.
  let circumpolarFallback = false;

  function raCusp(initialOffset, F, upper) {
    let RA = ramc + initialOffset;
    for (let iter = 0; iter < 50; iter++) {
      const RAr = RA * D2R;
      const inner = upper ? -Math.sin(RAr) * tanEps * tanLat
                           : Math.sin(RAr) * tanEps * tanLat;
      if (Math.abs(inner) > 1) { circumpolarFallback = true; return null; }
      const acosDeg = Math.acos(clamp(inner)) * R2D;
      const newRA = upper ? ramc + acosDeg / F : ramc + 180 - acosDeg / F;
      if (Math.abs(((newRA - RA + 540) % 360) - 180) < 1e-7) { RA = newRA; break; }
      RA = newRA;
    }
    return RA;
  }

  function raToLon(raDeg) { return raToLongitude(raDeg, eps); }

  const ra11 = raCusp(30, 3, true);
  const ra12 = raCusp(60, 1.5, true);
  const ra2 = raCusp(120, 1.5, false);
  const ra3 = raCusp(150, 3, false);

  if (circumpolarFallback || ra11 === null || ra12 === null || ra2 === null || ra3 === null) {
    // Beyond Placidus's valid latitude range (near/inside polar circles) —
    // fall back to Equal houses from the Ascendant rather than emit
    // mathematically undefined cusps.
    return equalHouses(ascLon).map(h => ({ ...h, system: 'Placidus (fallback: Equal, circumpolar latitude)' }));
  }

  const h11 = mod360(raToLon(ra11) - ayanamsa);
  const h12 = mod360(raToLon(ra12) - ayanamsa);
  const h2 = mod360(raToLon(ra2) - ayanamsa);
  const h3 = mod360(raToLon(ra3) - ayanamsa);

  const cusps = buildQuadrantCusps(ascLon, mcLon, h2, h3, h11, h12);

  // Post-hoc sanity guard: near the polar circles the fixed-point iteration
  // can converge to a numerically valid but astrologically wrong root (the
  // acos domain check alone doesn't catch every failure mode this close to
  // the boundary). If any two adjacent cusps aren't in forward order with a
  // sane gap, treat this as a Placidus breakdown and fall back to Equal
  // houses rather than hand back a chart with scrambled house cusps.
  for (let i = 0; i < 12; i++) {
    const a = cusps[i], b = cusps[(i + 1) % 12];
    const gap = ((b - a) + 360) % 360;
    if (gap <= 0.001 || gap >= 90) {
      return equalHouses(ascLon).map(h => ({ ...h, system: 'Placidus (fallback: Equal, unstable near polar circle)' }));
    }
  }

  return formatCusps(cusps, 'Placidus');
}

/**
 * Koch House System (Birthplace system)
 * Trisects the MC's own semi-diurnal arc (unlike Placidus, which trisects
 * each individual cusp's own semi-arc — Koch uses a single reference arc,
 * so no iteration is needed, only a direct closed-form calculation).
 *
 * FIX (house-system audit): shared two bugs with the pre-fix Placidus code —
 * (1) the RA→longitude conversion used the same dimensionally-wrong
 * atan2(tan(θ), cos(ε)) form, and (2) the offsets from RAMC for cusps
 * 11/12 had the wrong sign, and cusps 2/3 used the wrong fraction of the
 * semi-arc (1/3 and 2/3 were transposed). Both fixed against the standard
 * closed-form Koch formula:
 *   RA11 = RAMC + SA/3,      RA12 = RAMC + 2·SA/3
 *   RA2  = RAMC + 180 − 2·SA/3,  RA3 = RAMC + 180 − SA/3
 * where SA is the MC's own semi-diurnal arc, acos(−tanφ·tan δ_MC).
 * @param {number} ascLon  - Ascendant longitude (degrees, sidereal)
 * @param {number} mcLon   - Midheaven (MC) longitude (degrees, sidereal)
 * @param {number} lat     - Geographic latitude
 * @param {number} ramc    - Right Ascension of Midheaven (degrees)
 * @param {number} eps     - Obliquity of ecliptic (degrees)
 */
export function kochHouses(ascLon, mcLon, lat, ramc, eps = 23.4392911, ayanamsa = 0) {
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const latR = lat * D2R;
  const epsR = eps * D2R;
  const sinEps = Math.sin(epsR);
  const tanLat = Math.tan(latR);
  const clamp = x => Math.max(-1, Math.min(1, x));

  const mcRad = mcLon * D2R;
  const declMC = Math.asin(clamp(sinEps * Math.sin(mcRad)));
  const cosArg = clamp(-tanLat * Math.tan(declMC));
  if (Math.abs(cosArg) > 1) {
    // MC never rises/sets at this latitude on this date — Koch (like
    // Placidus) is undefined here; fall back to Equal houses.
    return equalHouses(ascLon).map(h => ({ ...h, system: 'Koch (fallback: Equal, circumpolar latitude)' }));
  }
  const saDeg = Math.acos(cosArg) * R2D; // MC's semi-diurnal arc, degrees

  function raToLon(raDeg) { return raToLongitude(raDeg, eps); }

  // FIX (New-spec audit — same tropical/sidereal frame bug as Placidus
  // above): h11/h12/h2/h3 from raToLon() are tropical; convert to
  // sidereal before combining with the sidereal ascLon/mcLon.
  const h11 = mod360(raToLon(ramc + saDeg / 3) - ayanamsa);
  const h12 = mod360(raToLon(ramc + 2 * saDeg / 3) - ayanamsa);
  const h2 = mod360(raToLon(ramc + 180 - 2 * saDeg / 3) - ayanamsa);
  const h3 = mod360(raToLon(ramc + 180 - saDeg / 3) - ayanamsa);

  const cusps = buildQuadrantCusps(ascLon, mcLon, h2, h3, h11, h12);

  return formatCusps(cusps, 'Koch');
}

// ── Shared Porphyry raw-cusp helper (linear trisection of each quadrant in
// ecliptic longitude — no RA/iteration needed, unlike Placidus/Koch) ──────
function porphyryRawCusps(ascLon, mcLon) {
  const ic = mod360(mcLon + 180);
  const dsc = mod360(ascLon + 180);
  function trisect(from, to) {
    const span = mod360(to - from);
    return [mod360(from + span / 3), mod360(from + 2 * span / 3)];
  }
  const [h11, h12] = trisect(mcLon, ascLon);
  const [h2, h3] = trisect(ascLon, ic);
  const [h5, h6] = trisect(ic, dsc);
  const [h8, h9] = trisect(dsc, mcLon);
  return [ascLon, h2, h3, ic, h5, h6, dsc, h8, h9, mcLon, h11, h12];
}

/**
 * Sripati (Sripathi Paddhati) House System — the classical Indian unequal
 * house system, described in BPHS and the Surya Siddhanta.
 *
 * SOURCED FROM: astro.com/Astrodienst's house-systems reference (the Swiss
 * Ephemeris authors), cross-checked against Wikipedia's Bhāva article and
 * multiple independent Vedic-astrology sources, since this system didn't
 * exist anywhere in the codebase and I won't invent an algorithm from
 * partial memory for something with real classical citations available.
 *
 * Method (per astro.com): first compute Porphyry cusps (each 90° quadrant
 * between the four angles — ASC/IC/DSC/MC — trisected equally in ecliptic
 * LONGITUDE, unlike Placidus/Koch which trisect in right ascension/time).
 * Then each reported cusp is moved to the MIDPOINT of the previous
 * Porphyry house — i.e. the Ascendant itself becomes the midpoint (Bhava
 * Madhya) of house 1 rather than its starting edge, consistent with the
 * classical "take Lagna as Bhava-Madhya, ±15° roughly for start/end"
 * teaching method. This is why, per that same source, "the Ascendant and
 * MC are not identical with the [reported] cusps" in Sripati.
 *
 * @param {number} ascLon - Ascendant longitude (sidereal, degrees)
 * @param {number} mcLon  - Midheaven longitude (sidereal, degrees)
 */
export function sripatiHouses(ascLon, mcLon) {
  const P = porphyryRawCusps(ascLon, mcLon); // P[0..11] = houses 1..12 (Porphyry)

  function circularMidpoint(a, b) {
    // a, b are always < 90° apart here (within one trisected quadrant),
    // so no need for shortest-arc ambiguity handling beyond simple wrap.
    const diff = mod360(b - a);
    return mod360(a + diff / 2);
  }

  const cusps = P.map((_, i) => {
    const prev = P[(i - 1 + 12) % 12];
    const curr = P[i];
    return circularMidpoint(prev, curr);
  });

  return formatCusps(cusps, 'Sripati');
}

/**
 * Universal house system dispatcher — FIX H-03
 * Now returns correct system instead of silently falling through to whole sign
 * @param {string} system - 'whole'|'equal'|'placidus'|'koch'|'porphyry'|'sripati'
 */
export function getHouseCusps(system, ascLon, mcLon, lat, ramc, eps, ayanamsa = 0) {
  switch ((system || 'whole').toLowerCase()) {
    case 'whole':
    case 'wholesign':
      return wholeSignHouses(ascLon);
    case 'equal':
      return equalHouses(ascLon);
    case 'placidus':
      if (mcLon == null || lat == null || ramc == null) {
        console.warn('Placidus requires mcLon, lat, ramc — falling back to equal houses');
        return equalHouses(ascLon);
      }
      return placidusHouses(ascLon, mcLon, lat, ramc, eps, ayanamsa);
    case 'koch':
      if (mcLon == null || lat == null || ramc == null) {
        console.warn('Koch requires mcLon, lat, ramc — falling back to equal houses');
        return equalHouses(ascLon);
      }
      return kochHouses(ascLon, mcLon, lat, ramc, eps, ayanamsa);
    case 'sripati':
      if (mcLon == null) {
        console.warn('Sripati requires mcLon — falling back to equal houses');
        return equalHouses(ascLon);
      }
      return sripatiHouses(ascLon, mcLon);
    case 'porphyry': {
      if (mcLon == null) return equalHouses(ascLon);
      const pCusps = porphyryRawCusps(ascLon, mcLon);
      return pCusps.map((cusp,i) => ({
        house: i+1, cusp: parseFloat(cusp.toFixed(4)),
        sign: SIGNS[signOf(cusp)], signIndex: signOf(cusp),
        lord: SIGN_LORDS[SIGNS[signOf(cusp)]], system: 'Porphyry'
      }));
    }
    default:
      console.warn(`Unknown house system "${system}" — using Whole Sign`);
      return wholeSignHouses(ascLon);
  }
}
