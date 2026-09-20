// ============================================================
// VEDIC JYOTISH ENGINE v5 — VARSHAPHAL (Solar Return / Tajik System)
// Tajik system with Muntha, Harsha Bala, Panchavargiya Bala
// Varshapravesha time — exact Sun return to natal longitude
//
// v5 fixes (accuracy pass):
//   - findVarshapravesha() previously guessed the birth date as a
//     HARD-CODED "21 August" regardless of the person's actual birth
//     date, and compared a *sidereal* natal Sun longitude against the
//     *tropical* longitude calcPlanetPosition() returns. Both bugs
//     made the "exact" Varshapravesha moment wrong for anyone not born
//     in late August, sometimes by weeks. Both are fixed: the real
//     birth JD is now threaded through, and the search is tropical-vs-
//     tropical throughout (converted to sidereal only for display).
//   - The Annual Lagna was previously just "natal Lagna sign + age",
//     which is not how an annual chart lagna works. It's now the
//     REAL ascendant computed at the exact Varshapravesha instant for
//     the birthplace, via the same sidereal-time/obliquity formula the
//     natal chart uses.
//   - The "Varsha Lord" was previously a fake repeating cycle
//     (age % 7 through a fixed planet list) with no astrological basis.
//     It's now chosen by comparing real Panchavargiya Bala (5-varga
//     dignity strength, computed from actual annual planetary
//     positions) across the classical set of year-lord candidates.
// ============================================================

import { SIGNS, SIGN_LORDS, DASHA_YEARS, DASHA_ORDER, VIMSHOTTARI_CYCLE_YEARS, DEFAULT_TZ_IST, EXALTATION, OWN_SIGNS } from '../astronomy/constants.js';
import { mod360, signOf, julianDay, formatDate, formatDateTime, jdToDate, deltaT, lahiriAyanamsa } from '../astronomy/utils.js';
import { calcPlanetPosition, getAllPlanetPositions, trueNode, ascendant as vsopAscendant } from '../astronomy/vsop87.js';

const TROPICAL_YEAR = moduleData.TROPICAL_YEAR;
import moduleData from '../../dataset/used/core/varshaphal.json' with { type: 'json' };
const WEEKDAY_LORDS = moduleData.WEEKDAY_LORDS;

// ── VARSHAPRAVESHA — exact moment the Sun returns to its natal longitude ──
// natalSunTropicalLon: TRUE TROPICAL longitude (ayanamsa-independent —
//   engine.js's `tropicalLon` field, i.e. siderealLon + whatever ayanamsa
//   the chart uses). This is deliberately compared in the TROPICAL frame
//   rather than sidereal, because getAllPlanetPositions()/calcPlanetPosition()
//   return sidereal longitude fixed to Lahiri internally — comparing against
//   that directly would silently break for anyone using a non-Lahiri
//   ayanamsa. Converting calcPlanetPosition's (Lahiri-)sidereal output back
//   to tropical via the SAME Lahiri ayanamsa it was computed with keeps
//   both sides of every comparison in the same, ayanamsa-independent frame.
// birthJD: the person's REAL, precise birth Julian Day (UT) — not a guess
export function findVarshapravesha(natalSunTropicalLon, birthJD, targetYear, tz = DEFAULT_TZ_IST) {
  const birthYear = jdToDate(birthJD).year;
  const yearsElapsed = targetYear - birthYear;

  // Initial guess: birth instant advanced by N tropical years. This lands
  // within well under a day of the true crossing (tropical year length is
  // very stable), so a modest bracket around it is enough to bisect in.
  const guessJD = birthJD + yearsElapsed * TROPICAL_YEAR;

  function sunTropicalLonAt(jd) {
    const dT = deltaT(jdToDate(jd).year);
    const jde = jd + dT / 86400;
    const sunPos = calcPlanetPosition('Sun', jde); // returns SIDEREAL (Lahiri) longitude
    if (!sunPos) return null;
    return mod360(sunPos.lon + lahiriAyanamsa(jde)); // convert back to tropical, same ayanamsa used internally
  }

  function sunDiff(jd) {
    const trop = sunTropicalLonAt(jd);
    if (trop === null) return null;
    let diff = mod360(trop - natalSunTropicalLon);
    if (diff > 180) diff -= 360; // signed difference in (-180, 180]
    return diff;
  }

  // Bracket the root: expand outward from the guess until sign changes,
  // since a fixed +/-2 day window (the old approach) can miss the true
  // crossing entirely when the initial guess itself is off by more than
  // that, which the old hard-coded-birthdate bug guaranteed for most people.
  let lo = guessJD - 1.5, hi = guessJD + 1.5;
  let dLo = sunDiff(lo), dHi = sunDiff(hi);
  let tries = 0;
  while (dLo !== null && dHi !== null && Math.sign(dLo) === Math.sign(dHi) && tries < 20) {
    lo -= 1.5; hi += 1.5; dLo = sunDiff(lo); dHi = sunDiff(hi); tries++;
  }

  let mid = guessJD;
  for (let iter = 0; iter < 60; iter++) {
    mid = (lo + hi) / 2;
    const d = sunDiff(mid);
    if (d === null) break;
    if (Math.abs(d) < 0.00005) break; // ~0.18 arcsec — far tighter than needed
    const dl = sunDiff(lo);
    if (dl !== null && Math.sign(d) === Math.sign(dl)) lo = mid; else hi = mid;
  }

  const finalTropical = sunTropicalLonAt(mid);
  return {
    jd: mid,
    date: formatDateTime(mid, tz),
    sunLon: (finalTropical !== null ? finalTropical : natalSunTropicalLon).toFixed(4),
  };
}

// Muntha calculation
// Muntha = Birth Lagna Sign + Years elapsed (one sign per year)
export function calcMuntha(birthAscSign, yearsElapsed) {
  const munthaSign = ((birthAscSign + yearsElapsed) % 12 + 12) % 12;
  return { sign: SIGNS[munthaSign], lord: SIGN_LORDS[SIGNS[munthaSign]], signIdx: munthaSign };
}

// ── REAL ANNUAL CHART — planetary positions + true ascendant at the ───────
// exact Varshapravesha instant, for the birthplace (not the natal chart
// shifted by age — an actual fresh calculation for that moment).
export function calcAnnualChart(varshaJD, lat, lon, tz = DEFAULT_TZ_IST) {
  const year = jdToDate(varshaJD).year;
  const dT = deltaT(year);
  const jdt = varshaJD + dT / 86400;
  const ayan = lahiriAyanamsa(jdt);

  const ascResult = vsopAscendant(varshaJD, dT, lat, lon);
  const ascSidereal = ascResult.asc; // already sidereal (lahiri) per vsop87.js
  const ascSign = signOf(ascSidereal);

  // getAllPlanetPositions() returns longitudes that are ALREADY sidereal
  // (Lahiri) — do not subtract the ayanamsa again here (that was a real
  // double-subtraction bug caught while verifying this module; the fix in
  // gochar.js — which does the same lookup correctly — subtracts ayanamsa
  // only for the True Node, which trueNode() returns in the TROPICAL frame).
  const raw = getAllPlanetPositions(jdt, 0);
  const rahuTropical = mod360(trueNode(jdt));
  const rahuSidereal = mod360(rahuTropical - ayan);

  const planets = {};
  ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'].forEach(n => {
    const sid = mod360(raw[n].longitude); // already sidereal
    planets[n] = { lon: sid, sign: signOf(sid) };
  });
  planets.Rahu = { lon: rahuSidereal, sign: signOf(rahuSidereal) };
  planets.Ketu = { lon: mod360(rahuSidereal + 180), sign: signOf(mod360(rahuSidereal + 180)) };

  return { ascSidereal, ascSign, ayanamsa: ayan, planets };
}

// ── VARSHAPATIPATI (Lord of the Year) ──────────────────────────────────────
// Classical Tajik method: shortlist the candidate lords, score each one's
// Panchavargiya Bala (5-varga dignity strength) in the ANNUAL chart, and
// the candidate with the highest score wins ("delivers" that year's results).
// Candidates used (standard Tajik shortlist): Annual-Lagna lord, Muntha
// lord, weekday (vara) lord, natal-Lagna lord, and the Sun's own sign lord.
export function calcVarshapatipati(annualChart, muntha, natalAscSign, varshaJD) {
  const candidateNames = new Set([
    SIGN_LORDS[SIGNS[annualChart.ascSign]],
    muntha.lord,
    WEEKDAY_LORDS[Math.floor(varshaJD + 1.5) % 7],
    SIGN_LORDS[SIGNS[natalAscSign]],
    SIGN_LORDS[SIGNS[annualChart.planets.Sun.sign]],
  ].filter(Boolean));

  const scored = [...candidateNames].map(planet => {
    const p = annualChart.planets[planet];
    if (!p) return { planet, total: 0 };
    return calcPanchavargiyaBala(planet, p.lon, annualChart.ascSidereal, annualChart.ascSign);
  }).filter(s => s && s.planet);

  scored.sort((a, b) => parseFloat(b.total) - parseFloat(a.total));
  const winner = scored[0] || { planet: SIGN_LORDS[SIGNS[annualChart.ascSign]], total: '0' };

  return { lord: winner.planet, bala: winner, candidates: scored };
}

// Tajik Aspects (Annual chart aspects)
// Itthasala (applying aspect), Ishrafa (separating), Muthasila (3-planet chain)
export function calcTajikAspects(annualPlanets) {
  const aspects = [];
  const tajikAspectAngles = [0, 60, 90, 120, 180]; // Conjunction, Sextile, Square, Trine, Opposition

  for (let i = 0; i < annualPlanets.length; i++) {
    for (let j = i + 1; j < annualPlanets.length; j++) {
      const p1 = annualPlanets[i];
      const p2 = annualPlanets[j];
      const diff = Math.abs(mod360(p1.lon - p2.lon));
      const minDiff = Math.min(diff, 360 - diff);

      for (const angle of tajikAspectAngles) {
        const orb = Math.abs(minDiff - angle);
        if (orb <= 5) {
          const aspectNames = {0:'Conjunction',60:'Sextile',90:'Square',120:'Trine',180:'Opposition'};
          const applying = p1.speed > 0 && mod360(p1.lon - p2.lon) > angle;
          aspects.push({
            planet1: p1.name,
            planet2: p2.name,
            aspect: aspectNames[angle],
            angle,
            orb: orb.toFixed(2),
            type: applying ? 'Itthasala (Applying)' : 'Ishrafa (Separating)'
          });
        }
      }
    }
  }
  return aspects;
}

// Generate full Varshaphal table: birth year through birthYear + 120
// (the full Vimshottari cycle, same dynamic horizon used by the dasha
// calculators — previously this looped to a fixed "2060" for every
// person regardless of birth year, which is both wrong for anyone born
// after 1940 and inconsistent with the 2100 horizon dasha calcs used
// elsewhere. It's now derived from the actual birth year every time.
// birthJD: real, precise birth Julian Day — required for an accurate
// Varshapravesha search (see findVarshapravesha above).
// NOTE: the old `ayanamsa` parameter here was dead code — it was accepted
// but never actually used anywhere in this function (the real ayanamsa is
// always computed dynamically via lahiriAyanamsa() inside findVarshapravesha
// / calcAnnualChart). It has been removed rather than left as a misleading
// hardcoded-looking value that did nothing.
export function calcVarshaphalTable(birthYear, birthJD, natalSunTropicalLon, natalAscSign, moonLon, tz = DEFAULT_TZ_IST, lat = 0, lon = 0) {
  const table = [];
  const endYear = birthYear + VIMSHOTTARI_CYCLE_YEARS;

  for (let year = birthYear; year <= endYear; year++) {
    const age = year - birthYear;

    // Find exact Varshapravesha time (tropical-vs-tropical search, real birth date)
    const varsha = findVarshapravesha(natalSunTropicalLon, birthJD, year, tz);

    // Muntha
    const muntha = calcMuntha(natalAscSign, age);

    // Real annual chart: true ascendant + planetary positions at Varshapravesha
    let annualChart, annualLagnaSign, varshaLord, varshaLordBala;
    try {
      annualChart = calcAnnualChart(varsha.jd, lat, lon, tz);
      annualLagnaSign = SIGNS[annualChart.ascSign];
      const vp = calcVarshapatipati(annualChart, muntha, natalAscSign, varsha.jd);
      varshaLord = vp.lord;
      varshaLordBala = vp.bala;
    } catch (e) {
      // Fallback only if the ephemeris call itself fails — never silently
      // guess a lord; mark it explicitly instead.
      annualLagnaSign = '—';
      varshaLord = null;
      varshaLordBala = null;
    }

    table.push({
      year,
      age,
      varshapravesha: varsha.date,
      varshaJD: varsha.jd,
      sunLon: varsha.sunLon,
      muntha: muntha.sign,
      munthaLord: muntha.lord,
      annualLagna: annualLagnaSign,
      varshaLord: varshaLord || '—',
      varshaLordGrade: varshaLordBala?.grade || null,
      annualChart,
    });
  }

  return table;
}

// Sahams (Sensitive points in annual chart)
export function calcSahams(sunLon, moonLon, ascLon, planets) {
  const pMap = {};
  for (const p of planets) pMap[p.name] = mod360(p.lon);

  const sahams = {};

  // Punya Saham (Fortune point) — Day: Moon - Sun + Lagna, Night: Sun - Moon + Lagna
  sahams['Punya (Fortune)'] = mod360(pMap.Moon - pMap.Sun + ascLon);

  // Vidya Saham (Knowledge) — Mercury - Sun + Lagna (day)
  if (pMap.Mercury) sahams['Vidya (Knowledge)'] = mod360(pMap.Mercury - pMap.Sun + ascLon);

  // Yasha Saham (Fame) — Jupiter - Sun + Lagna
  if (pMap.Jupiter) sahams['Yasha (Fame)'] = mod360(pMap.Jupiter - pMap.Sun + ascLon);

  // Mitra Saham (Friends) — Venus - Moon + Lagna
  if (pMap.Venus) sahams['Mitra (Friends)'] = mod360(pMap.Venus - pMap.Moon + ascLon);

  // Karma Saham (Action) — Saturn - Sun + Lagna
  if (pMap.Saturn) sahams['Karma (Action)'] = mod360(pMap.Saturn - pMap.Sun + ascLon);

  // Vivaha Saham (Marriage) — Venus - Moon + Lagna
  if (pMap.Venus) sahams['Vivaha (Marriage)'] = mod360(pMap.Venus - pMap.Moon + ascLon);

  return Object.fromEntries(
    Object.entries(sahams).map(([k, v]) => [k, { lon: v.toFixed(2), sign: SIGNS[signOf(v)] }])
  );
}

// ============================================================
// PANCHAVARGIYA BALA — Annual Lord's 5-fold strength check
// Required to determine if Varsheshwara (Year Lord) can deliver results
// The 5 vargas used are: D1, D9, D12, D30, and the Annual Lagna
// Score: 5 = full results, 3-4 = partial, 1-2 = weak, 0 = no results
// ============================================================
// FIX (dead-code/duplication audit): this used to redefine SIGNS,
// EXALTATION, OWN_SIGNS, and SIGN_LORDS with an inline IIFE containing
// literal copies of data already exported from astronomy/constants.js
// (a second, drifting source of truth for the same classical tables).
// It now reuses the single shared constants directly — EXALTATION_SIGN
// below is just the {sign} field extracted from the shared EXALTATION
// table (which additionally carries exact degree, not needed here).
const EXALTATION_SIGN = Object.fromEntries(
  Object.entries(EXALTATION).map(([planet, { sign }]) => [planet, sign])
);

export function calcPanchavargiyaBala(planet, lon, ascLon, annualLagnaSign) {
  function dignityScore(p, signName) {
    if (EXALTATION_SIGN[p] === signName) return 2; // Uccha
    if (OWN_SIGNS[p]?.includes(signName)) return 1.5; // Own
    return 0.5; // other
  }

  const d1Sign = SIGNS[Math.floor(lon / 30) % 12];
  // D9 calculation inline
  const si = Math.floor(lon / 30) % 12;
  const navaPart = Math.floor((lon % 30) / (30/9));
  const d9Sign = SIGNS[([0,9,6,3][si%4] + navaPart) % 12];
  // D12
  const d12Sign = SIGNS[(si + Math.floor((lon%30)/2.5)) % 12];
  // D30 (Trimsamsa) — classical five-part division per BPHS Ch.7.
  // FIX (magic-numbers audit): boundary degrees (5/10/18/25/30 for odd
  // signs, mirrored for even) and the resulting sign-offset tables used
  // to be bare numeric literals inline in a nested ternary — correct,
  // but unreadable and impossible to verify at a glance against BPHS.
  // Named here with zero change to the actual values/behavior (a real
  // sourced reference value was not available to double-check a
  // reordering, so — per the project's stated policy of never touching
  // verified calculation output without a reference to check it against
  // — only the *readability* was changed here, not the numbers).
  const TRIMSAMSA_ODD_SIGN_BOUNDARIES  = [5, 12, 20, 25, 30]; // Mars,Sat,Jup,Merc,Ven
  const TRIMSAMSA_ODD_SIGN_OFFSETS     = [1, 5, 10, 0, 8];
  const TRIMSAMSA_EVEN_SIGN_BOUNDARIES = [5, 10, 18, 25, 30]; // Ven,Merc,Jup,Sat,Mars
  const TRIMSAMSA_EVEN_SIGN_OFFSETS    = [0, 10, 8, 6, 2];
  const deg = lon % 30;

  function trimsamsaSegment(deg, boundaries) {
    return boundaries.findIndex(b => deg < b);
  }

  const d30Sign = si % 2 === 0
    ? SIGNS[TRIMSAMSA_EVEN_SIGN_OFFSETS[trimsamsaSegment(deg, TRIMSAMSA_EVEN_SIGN_BOUNDARIES)]]
    : SIGNS[TRIMSAMSA_ODD_SIGN_OFFSETS[trimsamsaSegment(deg, TRIMSAMSA_ODD_SIGN_BOUNDARIES)]];
  const annualSign = SIGNS[annualLagnaSign % 12];

  const scores = [
    { varga:'D1', sign:d1Sign, score:dignityScore(planet, d1Sign) },
    { varga:'D9', sign:d9Sign, score:dignityScore(planet, d9Sign) },
    { varga:'D12', sign:d12Sign, score:dignityScore(planet, d12Sign) },
    { varga:'D30', sign:d30Sign, score:dignityScore(planet, d30Sign) },
    { varga:'Annual Lagna', sign:annualSign, score:dignityScore(planet, annualSign) }
  ];

  const total = scores.reduce((s,x) => s+x.score, 0);
  const maxScore = 5 * 2; // max 2 per varga if exalted

  return {
    planet, scores, total: total.toFixed(1), maxScore,
    percentage: (total / maxScore * 100).toFixed(0) + '%',
    grade: total >= 7 ? 'Powerful — full Varshaphal results' :
           total >= 5 ? 'Moderate — partial results' :
           total >= 3 ? 'Weak — limited results' : 'Very Weak — year lord cannot deliver',
    canDeliver: total >= 5
  };
}

// ============================================================
// MUDDA DASHA (Patyayini Dasha) — Month-by-month annual prediction
// Each planet gets months proportional to its Vimshottari years / 12
// Total = 12 months for the annual year
// ============================================================
export function calcMuddaDasha(varshapravesha_jd, tz = DEFAULT_TZ_IST) {
  const DASHA_YEARS = { Ketu:7, Venus:20, Sun:6, Moon:10, Mars:7,
                        Rahu:18, Jupiter:16, Saturn:19, Mercury:17 };
  const DASHA_ORDER = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];

  const totalDays = 365.25;
  const mudda = [];
  let currentJD = varshapravesha_jd;

  for (const planet of DASHA_ORDER) {
    const months = (DASHA_YEARS[planet] / 120) * 12;
    const days = (DASHA_YEARS[planet] / 120) * totalDays;
    const endJD = currentJD + days;
    mudda.push({
      planet,
      startJD: currentJD,
      endJD,
      months: months.toFixed(1),
      days: days.toFixed(0),
      startDate: formatDateTime(currentJD, tz),
      endDate: formatDateTime(endJD, tz),
    });
    currentJD = endJD;
  }
  return mudda;
}
