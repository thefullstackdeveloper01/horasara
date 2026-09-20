/**
 * CHALIT TABLE & CHART — detailed per-house breakdown
 * ======================================================
 * Section 8 spec: for all 12 houses — Bhava number, sign, Bhava beginning,
 * Bhava middle/cusp, Bhava ending, house lord, occupying planets, exact
 * degrees, Rashi house, Chalit house, and an explanation of any
 * difference between Rashi and Chalit placement for each planet.
 *
 * This uses the classical Sripati (Sripathi Paddhati) unequal house
 * system — already implemented in src/charts/houses.js#sripatiHouses,
 * sourced from astro.com's house-systems reference — as the real Bhava
 * boundary calculation (Lagna = Bhava Madhya of House 1, per the
 * classical teaching method), rather than the simplified "cusp ± 15°"
 * approximation the engine's older calcBhavaCalit() used. Both are kept
 * available: this module is the accurate Chalit table; calcBhavaCalit's
 * shift-summary is kept for backward compatibility with existing report
 * sections that already reference it.
 */
import { sripatiHouses } from '../charts/houses.js';
import { SIGNS, SIGN_LORDS } from '../astronomy/constants.js';
import { mod360, signOf, formatDMS } from '../astronomy/utils.js';

/**
 * @param {Array<object>} planets - R.planets from the engine
 * @param {number} ascLon - sidereal Ascendant longitude
 * @param {number} mcLon - sidereal MC longitude
 * @returns {{houses: Array<object>, differenceExplanations: Array<object>}}
 */
export function buildChalitTable(planets, ascLon, mcLon) {
  const sripati = sripatiHouses(ascLon, mcLon); // 12 Bhava-Madhya (cusp/middle) points, real classical unequal system

  const madhyas = sripati.map(h => h.cusp);
  const houses = madhyas.map((madhya, i) => {
    const prevMadhya = madhyas[(i - 1 + 12) % 12];
    const nextMadhya = madhyas[(i + 1) % 12];
    const start = mod360(prevMadhya + mod360(madhya - prevMadhya) / 2);
    const end = mod360(madhya + mod360(nextMadhya - madhya) / 2);
    const sign = SIGNS[signOf(madhya)];

    const occupying = planets.filter(p => {
      const lon = mod360(p.siderealLon);
      return start > end ? (lon >= start || lon < end) : (lon >= start && lon < end);
    }).map(p => p.name);

    return {
      bhavaNumber: i + 1,
      sign,
      bhavaBeginning: { degrees: Number(start.toFixed(4)), dms: formatDMS(start % 30), sign: SIGNS[signOf(start)] },
      bhavaMiddleCusp: { degrees: Number(madhya.toFixed(4)), dms: formatDMS(madhya % 30), sign },
      bhavaEnding: { degrees: Number(end.toFixed(4)), dms: formatDMS(end % 30), sign: SIGNS[signOf(end)] },
      houseLord: SIGN_LORDS[sign],
      occupyingPlanets: occupying,
    };
  });

  const ascSignIdx = signOf(ascLon);
  const differenceExplanations = planets.map(p => {
    const pSignIdx = signOf(p.siderealLon);
    const rashiHouse = ((pSignIdx - ascSignIdx + 12) % 12) + 1;
    const chalitEntry = houses.find(h => h.occupyingPlanets.includes(p.name));
    const chalitHouse = chalitEntry ? chalitEntry.bhavaNumber : rashiHouse;

    if (rashiHouse === chalitHouse) {
      return {
        planet: p.name, rashiHouse, chalitHouse, differs: false,
        explanation: `${p.name} is in the same house in both Rashi (Whole Sign) and Chalit (Sripati unequal-Bhava) systems — no reclassification needed.`,
      };
    }
    return {
      planet: p.name, rashiHouse, chalitHouse, differs: true,
      explanation: `${p.name} sits near the edge of its Rashi sign (${p.degInSign}° into ${p.sign}), close enough to the adjacent Bhava boundary that the real unequal-Bhava (Chalit) system places it in House ${chalitHouse} instead of the Whole-Sign House ${rashiHouse}. Classical texts consider the Chalit placement more accurate for judging actual results (Phala), while Rashi/Whole-Sign is used for general strength and yoga analysis.`,
    };
  });

  return { houses, differenceExplanations };
}

export default { buildChalitTable };
