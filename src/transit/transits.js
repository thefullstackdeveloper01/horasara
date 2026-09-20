/**
 * VEDIC JYOTISH — TRANSITS (GOCHAR)
 * Fixed: uses real VSOP87 positions instead of polynomial approximation
 * Fixed: uses Vedic Graha Drishti instead of Western aspects
 */

import { SIGNS, SIGN_LORDS, NAKSHATRAS, NAKSHATRA_LORDS,
         NATURAL_FRIENDS, NATURAL_ENEMIES } from '../astronomy/constants.js';
import { signOf, nakshatraOf, mod360, lahiriAyanamsa, deltaT } from '../astronomy/utils.js';
import { getAllPlanetPositions, trueNode } from '../astronomy/vsop87.js';

// ── VEDIC DRISHTI (planetary aspects) ───────────────────────────────────
// In Vedic astrology, aspects are sign-based (house counted from planet)
// All planets aspect the 7th house (opposition)
// Special aspects: Mars→4th,8th | Jupiter→5th,9th | Saturn→3rd,10th
// Rahu/Ketu aspect 5th,9th (some traditions: 7th only)
import moduleData from '../../dataset/used/core/transits.json' with { type: 'json' };
const SPECIAL_ASPECTS = moduleData.SPECIAL_ASPECTS;

function getVedicAspects(fromSign, toSign) {
  // House count from source to target (1-indexed)
  const houseDiff = ((toSign - fromSign) + 12) % 12 + 1;
  return houseDiff;
}

function planetAspects(planet, fromSign, toSign) {
  const house = getVedicAspects(fromSign, toSign);
  if (house === 7) return true; // All planets aspect 7th
  const special = SPECIAL_ASPECTS[planet] || [];
  return special.includes(house);
}

// ── VEDHA PAIRS ──────────────────────────────────────────────────────────
// When a planet transits a favorable house, Vedha cancels the benefit
// Vedha pairs: (1,7), (2,12), (3,11), (4,10), (5,9), (6,8)
const VEDHA_PAIRS = moduleData.VEDHA_PAIRS;

// ── TRANSIT RESULTS (good/bad) per house from Moon ──────────────────────
const TRANSIT_RESULTS = moduleData.TRANSIT_RESULTS;

// ── GET REAL TRANSIT POSITIONS ───────────────────────────────────────────
export function getTransitPositions(jd, ayanamsaOverride = null) {
  const dT  = deltaT(new Date((jd - 2440587.5) * 86400000).getFullYear());
  const jdt = jd + dT / 86400;
  const ay  = Number.isFinite(ayanamsaOverride) ? ayanamsaOverride : lahiriAyanamsa(jdt);
  const pos = getAllPlanetPositions(jdt, 0);

  const rahuTrop = trueNode(jdt);
  const rahuSid  = mod360(rahuTrop - ay);
  const ketuSid  = mod360(rahuSid + 180);

  const planets = {};
  // FIX (Phase 4 audit): getAllPlanetPositions().longitude is ALREADY
  // sidereal (Lahiri) for the main 7 planets — see vsop87.js, where each
  // is built from a variable literally named e.g. `sunSidereal`. This used
  // to subtract the ayanamsa a SECOND time here, shifting every planet by
  // a full ayanamsa (~24°) and landing most of them in the wrong sign —
  // e.g. real sidereal Sun on 1 Jan 2024 is Sagittarius, this bug produced
  // Scorpio. Rahu/Ketu are unaffected: trueNode() returns a TROPICAL
  // longitude, so subtracting ayanamsa once for rahuSid above is correct
  // and unchanged. This function feeds daily_horoscope.js's "Aaj ka
  // Rashifal" (all-12-rashi today's horoscope) table, so this bug was
  // silently producing wrong transit signs — and therefore wrong daily
  // horoscope messages — for every rashi, every day, in every report.
  ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'].forEach(n => {
    const sidLon = mod360(pos[n].longitude);
    planets[n] = {
      siderealLon: sidLon,
      sign:        signOf(sidLon),
      nakshatra:   NAKSHATRAS[Math.floor(sidLon / (40/3))],
      retrograde:  pos[n].retrograde || pos[n].speed < 0,
      speed:      pos[n].speed,
    };
  });
  planets.Rahu = { siderealLon: rahuSid, sign: signOf(rahuSid), nakshatra: NAKSHATRAS[Math.floor(rahuSid/(40/3))], retrograde: true, speed: 0 };
  planets.Ketu = { siderealLon: ketuSid, sign: signOf(ketuSid), nakshatra: NAKSHATRAS[Math.floor(ketuSid/(40/3))], retrograde: true, speed: 0 };
  return planets;
}

// ── TRANSIT OVERLAY (natal vs transit) ───────────────────────────────────
export function calcTransitOverlay(natalPlanets, transitJD, moonSign) {
  const transitPos = getTransitPositions(transitJD);
  const moonSignIdx = moonSign !== undefined ? moonSign : signOf(natalPlanets.find(p=>p.name==='Moon')?.siderealLon || 0);

  const results = [];
  for (const natal of natalPlanets) {
    if (natal.outer) continue;
    const tp = transitPos[natal.name];
    if (!tp) continue;

    const houseFromNatal = ((tp.sign - signOf(natal.siderealLon)) + 12) % 12 + 1;
    const houseFromMoon  = ((tp.sign - moonSignIdx) + 12) % 12 + 1;

    // Transit result from Moon
    const res = TRANSIT_RESULTS[natal.name] || {};
    const isGood  = (res.good  || []).includes(houseFromMoon);
    const isBad   = (res.bad   || []).includes(houseFromMoon);

    // Check Vedha from Moon sign
    const vedhaHouse = VEDHA_PAIRS[houseFromMoon];
    const vedhaSign  = (moonSignIdx + vedhaHouse - 1) % 12;
    const planetsInVedha = natalPlanets.filter(p => signOf(p.siderealLon) === vedhaSign && p.name !== natal.name);
    const hasVedha = planetsInVedha.length > 0 && isGood; // Vedha only cancels good results

    results.push({
      planet:        natal.name,
      natalLon:      natal.siderealLon.toFixed(2),
      transitLon:    tp.siderealLon.toFixed(2),
      transitSign:   SIGNS[tp.sign],
      transitNak:    tp.nakshatra,
      retrograde:    tp.retrograde,
      houseFromNatal,
      houseFromMoon,
      result:        hasVedha ? 'Vedha (cancelled)' : isGood ? 'Favorable' : isBad ? 'Unfavorable' : 'Neutral',
      vedha:         hasVedha,
      vedhaBy:       planetsInVedha.map(p => p.name).join(','),
    });
  }
  return results;
}

// REMOVED (dead code): this file used to contain calcSadeSatiHistory(), a
// full-life Sade Sati cycle history built on a pure mean-motion Saturn
// approximation, disconnected from the app's real VSOP87 ephemeris. It was
// never imported anywhere in the live app — see the header comment in
// dosha/sade_sati_accurate.js, which replaced it (and doshas.js's old
// calcSadeSati()) with one real-ephemeris source of truth for all Sade
// Sati reporting. Left in place, it was a landmine: importing it again
// would silently reintroduce mismatched Saturn dates across report
// sections, which is the exact bug that prompted the rewrite.
// ── EXPORT legacy function for backward compat ────────────────────────────
export function calcGocharPredictions(natalPlanets, jd) {
  return calcTransitOverlay(natalPlanets, jd);
}
