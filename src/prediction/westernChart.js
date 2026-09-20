/**
 * WESTERN TROPICAL CHART + WESTERN HOUSE/CUSP CHART
 * =====================================================
 * Section 7 spec: "Western Tropical Chart" and "Western House/Cusp chart",
 * with the explicit instruction "Do not mix Vedic and Western values."
 *
 * This module is built ENTIRELY from tropicalLon (already computed per
 * planet by the engine — tropicalLon = siderealLon + ayanamsa) and a
 * tropical Ascendant/MC, using the engine's own already-implemented
 * Placidus house system (src/charts/houses.js) fed tropical coordinates.
 * Nothing here touches siderealLon, Nakshatra, Vedic dignity, or any
 * other Vedic-only concept — those belong only in the Vedic chart output.
 */
import { getHouseCusps } from '../charts/houses.js';
import { SIGNS, SIGN_LORDS } from '../astronomy/constants.js';
import { mod360, signOf, formatDMS } from '../astronomy/utils.js';

import moduleData from '../../dataset/used/core/westernChart.json' with { type: 'json' };
const WESTERN_SIGN_RULERS_MODERN = moduleData.WESTERN_SIGN_RULERS_MODERN;

/**
 * @param {Array<object>} planets - R.planets (each has tropicalLon)
 * @param {number} ascLonTropical - tropical Ascendant longitude
 * @param {number} mcLonTropical - tropical MC longitude
 * @param {number} lat - geographic latitude
 * @param {number} ramc - Right Ascension of MC
 * @param {number} eps - obliquity of ecliptic
 * @param {string} [houseSystem='placidus'] - Western house system to use
 * @returns {object} a self-contained Western/tropical chart — no Vedic fields
 */
export function buildWesternTropicalChart(planets, ascLonTropical, mcLonTropical, lat, ramc, eps, houseSystem = 'placidus') {
  const cusps = getHouseCusps(houseSystem, ascLonTropical, mcLonTropical, lat, ramc, eps, 0 /* ayanamsa=0: purely tropical, no sidereal correction */);

  const ascSignIdx = signOf(ascLonTropical);

  const westernPlanets = planets
    .filter(p => p.tropicalLon !== undefined)
    .map(p => {
      const lon = mod360(p.tropicalLon);
      const signIdx = signOf(lon);
      const sign = SIGNS[signIdx];
      // Western (tropical) house assignment: whichever cusp range this
      // planet's tropical longitude falls into, using the SAME tropical
      // house-cusp system computed above (not the Vedic whole-sign house).
      let house = 1;
      for (let i = 0; i < 12; i++) {
        const start = cusps[i].cusp !== undefined ? cusps[i].cusp : cusps[i].startDeg;
        const end = cusps[(i + 1) % 12].cusp !== undefined ? cusps[(i + 1) % 12].cusp : cusps[(i + 1) % 12].endDeg;
        const inRange = start > end ? (lon >= start || lon < end) : (lon >= start && lon < end);
        if (inRange) { house = i + 1; break; }
      }
      return {
        planet: p.name,
        tropicalLongitude: Number(lon.toFixed(4)),
        sign,
        degreeInSign: Number((lon % 30).toFixed(2)),
        dms: formatDMS(lon % 30),
        modernRuler: WESTERN_SIGN_RULERS_MODERN[sign],
        house,
        retrograde: p.retrograde,
      };
    });

  return {
    system: 'Western Tropical Zodiac',
    houseSystem: cusps[0]?.system || houseSystem,
    ascendant: {
      tropicalLongitude: Number(mod360(ascLonTropical).toFixed(4)),
      sign: SIGNS[ascSignIdx],
      dms: formatDMS(mod360(ascLonTropical) % 30),
    },
    midheaven: {
      tropicalLongitude: Number(mod360(mcLonTropical).toFixed(4)),
      sign: SIGNS[signOf(mcLonTropical)],
      dms: formatDMS(mod360(mcLonTropical) % 30),
    },
    houseCusps: cusps.map(c => ({
      house: c.house,
      cuspLongitude: c.cusp,
      sign: c.sign,
      modernRuler: WESTERN_SIGN_RULERS_MODERN[c.sign],
    })),
    planets: westernPlanets,
    note: 'This chart uses the tropical zodiac (equinox-based, 0° Aries = vernal equinox) throughout — no ayanamsa/sidereal correction. It is intentionally kept separate from the Vedic sidereal chart above; the two use different zero-points and are not directly comparable degree-for-degree.',
  };
}

export default { buildWesternTropicalChart };
