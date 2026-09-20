/**
 * GOCHAR ENGINE — Real-time transit analysis (Vedic Gochar system)
 * Sources: BPHS Ch.36 (Gochar), Jataka Parijata, Phaladeepika
 *
 * Features:
 *   - Transit results per planet from natal Moon (classical Vedic method)
 *   - Vedha (obstruction) detection that cancels good transits
 *   - Ashtakavarga transit scoring (bindus method)
 *   - Dasha-transit combined predictions
 *   - Next sign ingress dates for all planets
 */

import { SIGNS, SIGN_LORDS, NAKSHATRAS, TRANSIT_GOOD_HOUSES } from '../astronomy/constants.js';
import { signOf, mod360, lahiriAyanamsa, deltaT, formatDate, jdToDate } from '../astronomy/utils.js';
import { getAllPlanetPositions, trueNode } from '../astronomy/vsop87.js';

// ── TRANSIT RESULTS from Moon sign (classical) ────────────────────────────
// TRANSIT_GOOD_HOUSES imported from astronomy/constants.js — this file's
// local copy previously had Ketu:[3,6,10,11], which had DRIFTED from
// daily_horoscope.js's Ketu:[3,6,11] (see the fix note on the shared
// constant). The classical-value [3,6,11] is now used consistently here too.
const TRANSIT_GOOD = TRANSIT_GOOD_HOUSES;

// Vedha obstructions: house → which house cancels good result
import moduleData from '../../dataset/used/core/gochar.json' with { type: 'json' };
const VEDHA = moduleData.VEDHA;

// Transit interpretations
const TRANSIT_EFFECT = moduleData.TRANSIT_EFFECT;

// ── GET CURRENT TRANSIT POSITIONS ────────────────────────────────────────
function getTransitPositions(jd) {
  const year = jdToDate(jd).year;
  const dT   = deltaT(year);
  const jdt  = jd + dT/86400;
  const ay   = lahiriAyanamsa(jdt);
  const pos  = getAllPlanetPositions(jdt, 0);
  const rahuT = trueNode(jdt);
  const rahuS = mod360(rahuT - ay);

  const result = {};
  // FIX (Phase 4 audit): same double-ayanamsa-subtraction bug as
  // transit/transits.js's getTransitPositions() — pos[n].longitude is
  // already sidereal for the main 7 planets; only Rahu (from trueNode(),
  // which is tropical) needs the subtraction above. This is what fed the
  // Gochar section's transit table, so it was showing every transiting
  // planet roughly a full ayanamsa (~24°) away from its real sidereal
  // position — usually landing it in the wrong sign entirely.
  ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'].forEach(n => {
    const sidLon = mod360(pos[n].longitude);
    result[n] = { lon: sidLon, sign: signOf(sidLon),
                  retro: pos[n].retrograde||pos[n].speed<0, speed: pos[n].speed };
  });
  result.Rahu = { lon: rahuS, sign: signOf(rahuS), retro: true, speed:-0.053 };
  result.Ketu = { lon: mod360(rahuS+180), sign: signOf(mod360(rahuS+180)), retro: true, speed:-0.053 };
  return result;
}

// ── FULL GOCHAR ANALYSIS ──────────────────────────────────────────────────
export function calcGochar(natalPlanets, natalAsc, moonSignIdx, transitJD, canonicalTransitSnapshot = null) {
  // Use the immutable engine snapshot when available. This prevents the
  // report's Gochar section from recalculating 'now' independently.
  const rawTp = canonicalTransitSnapshot?.planets || getTransitPositions(transitJD);
  const tp = Object.fromEntries(Object.entries(rawTp).map(([name, t]) => [name, { ...t, lon: t.lon ?? t.siderealLon, retro: t.retro ?? t.retrograde }]));
  const results = [];
  const moonSign = moonSignIdx !== undefined ? moonSignIdx : signOf(natalPlanets.find(p=>p.name==='Moon')?.siderealLon||0);

  for (const [pname, tpos] of Object.entries(tp)) {
    const houseFromMoon = ((tpos.sign - moonSign + 12) % 12) + 1;
    const isGood = (TRANSIT_GOOD[pname]||[]).includes(houseFromMoon);

    // Vedha check: if transiting to a "good" house, check if another planet is in the vedha house from Moon
    const vedhaHouse = VEDHA[houseFromMoon];
    const vedhaSign  = (moonSign + vedhaHouse - 1) % 12;
    const vedhaBy    = Object.entries(tp).filter(([n2,t2]) => n2!==pname && t2.sign===vedhaSign).map(([n2])=>n2);
    const hasVedha   = isGood && vedhaBy.length > 0;

    // House from Ascendant
    const ascSign = signOf(natalAsc);
    const houseFromAsc = ((tpos.sign - ascSign + 12) % 12) + 1;

    const effect = TRANSIT_EFFECT[pname]?.[houseFromMoon] || '';
    const result = hasVedha ? 'Vedha (Obstructed)' : isGood ? 'Favorable' : 'Unfavorable';

    // Ashtakavarga: how many bindus does this planet have in its current transit sign?
    const natalP = natalPlanets.find(p => p.name === pname);

    results.push({
      planet:        pname,
      transitSign:   SIGNS[tpos.sign],
      transitLon:    tpos.lon.toFixed(2),
      transitNak:    NAKSHATRAS[Math.floor(tpos.lon/(40/3))]||'',
      retrograde:    tpos.retro,
      houseFromMoon,
      houseFromAsc,
      result,
      vedha:         hasVedha,
      vedhaBy,
      effect,
      natalSign:     natalP ? SIGNS[signOf(natalP.siderealLon)] : '—',
    });
  }
  return results;
}

// ── NEXT INGRESS DATES ────────────────────────────────────────────────────
// When does each planet next enter a new sign?
const MEAN_SPEEDS = moduleData.MEAN_SPEEDS;

export function calcNextIngress(transitJD) {
  const tp = getTransitPositions(transitJD);
  const ingresses = [];

  for (const [pname, tpos] of Object.entries(tp)) {
    const spd = MEAN_SPEEDS[pname];
    if (!spd || spd === 0) continue;
    const degInSign = tpos.lon % 30;
    const degLeft   = spd > 0 ? (30 - degInSign) : degInSign;
    if (degLeft <= 0) continue;
    const daysLeft  = Math.abs(degLeft / spd);
    const ingressJD = transitJD + daysLeft;
    const nextSign  = spd > 0 ? (tpos.sign + 1) % 12 : (tpos.sign + 11) % 12;
    const d = jdToDate(ingressJD);

    ingresses.push({
      planet:    pname,
      currentSign: SIGNS[tpos.sign],
      nextSign:    SIGNS[nextSign],
      daysLeft:    Math.round(daysLeft),
      date:        `${d.day} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.month-1]} ${d.year}`,
    });
  }
  return ingresses.sort((a,b) => a.daysLeft - b.daysLeft);
}

// ── DASHA-TRANSIT COMBINED SCORE ─────────────────────────────────────────
// Both dasha lord and transit lord favorable = doubly powerful
export function calcDashaTransitCombined(gocharResults, dashaCurrent) {
  const maha  = dashaCurrent?.mahadasha;
  const antar = dashaCurrent?.antardasha;
  const combined = [];

  for (const g of gocharResults) {
    const isDashaLord  = g.planet === maha;
    const isAntarLord  = g.planet === antar;
    const boost = isDashaLord ? 'Dasha lord in transit' : isAntarLord ? 'Antardasha lord in transit' : null;
    if (boost && g.result === 'Favorable') {
      combined.push({ ...g, boost, power: 'Double Favorable — act during this period' });
    } else if (boost && g.result === 'Unfavorable') {
      combined.push({ ...g, boost, power: 'Double Caution — avoid major decisions' });
    }
  }
  return combined;
}
