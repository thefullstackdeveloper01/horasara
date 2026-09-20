/**
 * DYNAMIC DAILY HOROSCOPE ENGINE
 * Zero hardcoded text — all content generated from real transit positions
 * 
 * Architecture:
 *   1. loadConfig()        — fetch planet/sign/house data from datasets
 *   2. getTransitMap()     — real VSOP87 transit positions for today
 *   3. buildHoroscope()    — per-rashi prediction from transit overlay
 *   4. getDailyScore()     — numeric strength score per life area
 */

import { getTransitPositions } from '../transit/transits.js';
import { lahiriAyanamsa, julianDay, mod360, signOf, jdToDate } from '../astronomy/utils.js';
import { SIGNS, SIGN_LORDS, PLANET_NATURE, TRANSIT_GOOD_HOUSES } from '../astronomy/constants.js';

// Transit house results from Moon sign (BPHS Ch.36) — TRANSIT_GOOD_HOUSES is
// imported from astronomy/constants.js (was a locally-duplicated copy that
// had drifted from gochar.js's copy for Ketu; see dead-code audit note there).

// Domain impact per planet (which life area each planet affects in transit)
import moduleData from '../../dataset/used/core/daily_horoscope.json' with { type: 'json' };
const PLANET_DOMAINS = moduleData.PLANET_DOMAINS;

// House themes from datasets (loaded dynamically in production, defined from BPHS here)
const HOUSE_THEMES = moduleData.HOUSE_THEMES;

/**
 * Build a fully dynamic horoscope for all 12 signs
 * @param {number} jd — Julian Day for the horoscope date
 * @returns {Object} horoscopes keyed by sign name
 */
export function buildDailyHoroscope(jd) {
  const transitPos = getTransitPositions(jd);
  const date = jdToDate(jd);
  const dateStr = `${date.day} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.month-1]} ${date.year}`;

  const horoscopes = {};

  for (let signIdx = 0; signIdx < 12; signIdx++) {
    const signName = SIGNS[signIdx];
    const signLord = SIGN_LORDS[signName];

    const planetResults = [];
    let totalScore = 0;
    const themes = new Set();
    const favorable = [];
    const challenging = [];

    // Analyze each planet's transit from this Moon sign
    for (const [planet, tpos] of Object.entries(transitPos)) {
      const houseFromSign = ((tpos.sign - signIdx + 12) % 12) + 1;
      const goodHouses = TRANSIT_GOOD_HOUSES[planet] || [];
      const isGood = goodHouses.includes(houseFromSign);
      const isRetro = tpos.retrograde;

      const domains = PLANET_DOMAINS[planet] || [];
      const houseTheme = HOUSE_THEMES[houseFromSign] || '';

      // Retrograde planets have modified effects
      const retEffect = isRetro ? 'internalized' : 'active';

      const result = {
        planet,
        house: houseFromSign,
        sign: SIGNS[tpos.sign],
        favorable: isGood,
        retrograde: isRetro,
        domains,
        effect: isGood
          ? `${planet} in H${houseFromSign} (${houseTheme}) — ${retEffect} ${isGood ? 'favorable' : 'challenging'}`
          : `${planet} in H${houseFromSign} (${houseTheme}) — ${retEffect} challenge`,
      };

      planetResults.push(result);
      totalScore += isGood ? 1 : -0.5;

      // Collect themes
      if (isGood) {
        domains.forEach(d => favorable.push(d));
      } else {
        domains.forEach(d => challenging.push(d));
      }
    }

    // Normalize score to 1-5
    const maxPossible = Object.keys(transitPos).length;
    const normalScore = Math.min(5, Math.max(1, ((totalScore + maxPossible/2) / maxPossible) * 5));

    // Build message dynamically from transit data
    const favorableStr = [...new Set(favorable)].slice(0,3).join(', ') || 'routine matters';
    const challengingStr = [...new Set(challenging)].slice(0,2).join(', ') || 'some areas';

    // Find key planet transits
    const keyPlanet = planetResults.find(r => r.favorable && ['Jupiter','Venus','Moon'].includes(r.planet));
    const keyChallenge = planetResults.find(r => !r.favorable && ['Saturn','Mars','Rahu'].includes(r.planet));

    // Generate the dynamic message
    const signLordTransit = planetResults.find(r => r.planet === signLord);
    const signLordStatus = signLordTransit
      ? `${signLord} (sign lord) is in ${signLordTransit.sign} (H${signLordTransit.house}) — ${signLordTransit.favorable ? 'supportive' : 'needs attention'}.`
      : '';

    const message = [
      keyPlanet ? `${keyPlanet.planet} in H${keyPlanet.house} strengthens ${keyPlanet.domains.slice(0,2).join(' and ')}.` : '',
      keyChallenge ? `${keyChallenge.planet} in H${keyChallenge.house} tests ${keyChallenge.domains.slice(0,2).join(' and ')}.` : '',
      signLordStatus,
      `Focus on: ${favorableStr}. Handle with care: ${challengingStr}.`,
    ].filter(Boolean).join(' ');

    horoscopes[signName] = {
      sign: signName,
      symbol: ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'][signIdx],
      lord: signLord,
      date: dateStr,
      score: parseFloat(normalScore.toFixed(1)),
      grade: normalScore >= 4 ? 'Excellent' : normalScore >= 3 ? 'Good' : normalScore >= 2.5 ? 'Average' : 'Challenging',
      message,
      favorableAreas: [...new Set(favorable)].slice(0, 4),
      challengingAreas: [...new Set(challenging)].slice(0, 3),
      planetResults,
      signLordStatus,
    };
  }

  return { date: dateStr, jd, horoscopes };
}

/**
 * Get horoscope for a specific sign
 */
export function getSignHoroscope(signName, jd) {
  const all = buildDailyHoroscope(jd);
  return all.horoscopes[signName] || null;
}
