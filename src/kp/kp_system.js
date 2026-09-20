/**
 * KP SYSTEM — Krishnamurti Paddhati
 * Sub-lord theory, significators, cuspal positions
 * Pure algorithmic — no external dependencies
 * 
 * ALGORITHM (transparent):
 * 1. Each nakshatra (13°20') is divided into 9 sub-lords proportional to Vimshottari dasha years
 * 2. Sub-lord of a planet determines which house matters get activated
 * 3. Significator = planet that owns/occupies/aspects a house AND whose sub-lord agrees
 * 4. Event happens when dasha lord is significator of relevant houses
 */

import { mod360, signOf, lahiriAyanamsa, deltaT, julianDay } from '../astronomy/utils.js';
import { getAllPlanetPositions, ascendant as vsopAsc, trueNode } from '../astronomy/vsop87.js';
import { placidusHouses } from '../charts/houses.js';
import { SIGNS, SIGN_LORDS, NAKSHATRAS, NAKSHATRA_LORDS, DASHA_YEARS, DASHA_ORDER } from '../astronomy/constants.js';

const NAK_W = 40 / 3; // 13.333...° per nakshatra
import moduleData from '../../dataset/used/core/kp_system.json' with { type: 'json' };
const TOTAL_DASHA_YEARS = moduleData.TOTAL_DASHA_YEARS;

// ── KP SUB-LORD CALCULATION ───────────────────────────────────────────────
/**
 * Given a sidereal longitude, return:
 * - Nakshatra lord (star lord)
 * - Sub-lord (KP sub-lord)
 * - Sub-sub-lord (KP sub-sub-lord)
 * PSEUDOCODE:
 *   1. Find nakshatra index = floor(lon / 13.333°)
 *   2. nakLord = BPHS lord of that nakshatra
 *   3. posInNak = lon % 13.333° (position within nakshatra)
 *   4. Cycle sub-lords starting from nakLord in Vimshottari order
 *   5. Each sub-lord gets width = (its_years / 120) * 13.333°
 *   6. Sub-lord = whichever division contains posInNak
 */
export function getKPPosition(lon) {
  const nakIdx = Math.floor(lon / NAK_W);
  const nakLord = NAKSHATRA_LORDS[nakIdx % 27];
  const posInNak = lon % NAK_W;

  // Start cycling from nakLord's position in Vimshottari
  const startIdx = DASHA_ORDER.indexOf(nakLord);
  const order = [...DASHA_ORDER.slice(startIdx), ...DASHA_ORDER.slice(0, startIdx)];

  let cursor = 0;
  let subLord = nakLord, subLordStart = 0, subLordEnd = 0;
  let subSubLord = nakLord;

  for (const sl of order) {
    const width = (DASHA_YEARS[sl] / TOTAL_DASHA_YEARS) * NAK_W;
    if (posInNak >= cursor && posInNak < cursor + width) {
      subLord = sl;
      subLordStart = cursor;
      subLordEnd = cursor + width;

      // Find sub-sub-lord within this sub-lord segment
      const posInSub = posInNak - cursor;
      const slStartIdx = DASHA_ORDER.indexOf(sl);
      const ssOrder = [...DASHA_ORDER.slice(slStartIdx), ...DASHA_ORDER.slice(0, slStartIdx)];
      let ssCursor = 0;
      for (const ssl of ssOrder) {
        const ssWidth = (DASHA_YEARS[ssl] / TOTAL_DASHA_YEARS) * width;
        if (posInSub >= ssCursor && posInSub < ssCursor + ssWidth) {
          subSubLord = ssl;
          break;
        }
        ssCursor += ssWidth;
      }
      break;
    }
    cursor += width;
  }

  return {
    nakshatra:    NAKSHATRAS[nakIdx % 27],
    nakLord,
    subLord,
    subSubLord,
    degInNak:     posInNak.toFixed(4),
    subLordSpan:  `${(nakIdx * NAK_W + subLordStart).toFixed(3)}° – ${(nakIdx * NAK_W + subLordEnd).toFixed(3)}°`,
  };
}

// ── HOUSE CUSPS (KP requires true Placidus cuspal positions) ─────────────
/**
 * KP (Krishnamurti Paddhati) is defined around Placidus cuspal positions —
 * this isn't an interchangeable detail, sub-lord-of-the-cusp is the core
 * KP technique. Previously this used Equal-house cusps as a stand-in
 * (honestly commented as such) because Placidus needs iteration.
 *
 * FIX: now that astronomy/charts/houses.js has a verified, correct
 * Placidus implementation (see its own audit notes), this uses the real
 * thing whenever the caller supplies mcLon/lat/ramc. If they're omitted,
 * this transparently falls back to the previous Equal-house approximation
 * so any other/older caller of getKPCusps(ascLon) keeps working unchanged.
 *
 * @param {number} ascLon - Ascendant longitude (sidereal, degrees)
 * @param {object} [placidusParams] - { mcLon, lat, ramc, eps } for real Placidus cusps
 */
export function getKPCusps(ascLon, placidusParams = null) {
  if (placidusParams && placidusParams.mcLon !== undefined &&
      placidusParams.lat !== undefined && placidusParams.ramc !== undefined) {
    const { mcLon, lat, ramc, eps, ayanamsa } = placidusParams;
    const ph = placidusHouses(ascLon, mcLon, lat, ramc, eps, ayanamsa || 0);
    return ph.map(h => ({
      house: h.house,
      cusp: h.cusp,
      sign: h.sign,
      kp: getKPPosition(mod360(h.cusp)),
      cuspSystem: h.system, // 'Placidus' or the circumpolar-fallback label
    }));
  }
  // Fallback: Equal house from ASC (used only when Placidus inputs aren't supplied)
  return Array.from({length: 12}, (_, i) => ({
    house: i + 1,
    cusp: mod360(ascLon + i * 30),
    sign: SIGNS[signOf(mod360(ascLon + i * 30))],
    kp: getKPPosition(mod360(ascLon + i * 30)),
    cuspSystem: 'Equal (approximation — no Placidus inputs supplied)',
  }));
}

// ── SIGNIFICATORS ─────────────────────────────────────────────────────────
/**
 * A planet is a SIGNIFICATOR of a house if:
 * Level 1 (strongest): Planet occupies that house
 * Level 2: Planet owns that house sign (sign lord)
 * Level 3: Planet is in nakshatra of another planet in that house
 * Level 4: Planet is in nakshatra of the sign lord of that house
 * Level 5: Planet aspects that house (using Vedic Drishti)
 * 
 * KP Event Rule: Event occurs when:
 *   - Dasha lord is significator of relevant houses
 *   - AND sub-lord of the dasha lord is also a significator of those houses
 */
export function getSignificators(planets, cusps) {
  const signifs = {};

  // Which cuspal house (by actual, possibly unequal-width, cusp boundaries)
  // a longitude falls into — walks the 12 cusps and finds the arc containing
  // the point. FIX: previously this always used a flat 30°-per-house rule
  // from H1 regardless of the actual cusps passed in, which silently
  // discarded true Placidus cusp widths (houses 2-12 aren't all 30° wide
  // in Placidus) and made occupancy identical to Equal-house math even
  // after real Placidus cusps were wired in above.
  function houseOfLongitude(lon) {
    const l = mod360(lon);
    for (let i = 0; i < 12; i++) {
      const start = cusps[i].cusp;
      const end = cusps[(i + 1) % 12].cusp;
      const inRange = start <= end ? (l >= start && l < end) : (l >= start || l < end);
      if (inRange) return i + 1;
    }
    return 12; // fallback (shouldn't normally be reached — 12 cusps always tile the circle)
  }

  // Build house occupancy and ownership
  for (let h = 1; h <= 12; h++) {
    const cusp = cusps[h-1];
    const occupants = planets.filter(p => houseOfLongitude(p.siderealLon) === h);
    const owner = SIGN_LORDS[cusp.sign];
    const ownerPlanet = planets.find(p => p.name === owner);

    signifs[h] = {
      house: h,
      owner,
      occupants: occupants.map(p => p.name),
      significators: [],
      kpSubLord: cusp.kp.subLord,
    };

    // Level 1: Occupants
    for (const p of occupants) signifs[h].significators.push({planet:p.name, level:1, reason:'Occupies house'});

    // Level 2: Owner
    if (!occupants.find(p => p.name === owner)) {
      signifs[h].significators.push({planet:owner, level:2, reason:'Owns house sign'});
    }

    // Level 3 & 4: Nakshatra lords
    for (const p of planets) {
      const nakLord = NAKSHATRA_LORDS[Math.floor(p.siderealLon / NAK_W) % 27];
      // If nakshatra lord is an occupant of this house
      if (occupants.find(occ => occ.name === nakLord) && !signifs[h].significators.find(s=>s.planet===p.name)) {
        signifs[h].significators.push({planet:p.name, level:3, reason:`Nak lord ${nakLord} is in house`});
      }
      // If nakshatra lord is the house owner
      if (nakLord === owner && !signifs[h].significators.find(s=>s.planet===p.name)) {
        signifs[h].significators.push({planet:p.name, level:4, reason:`Nak lord ${nakLord} owns house`});
      }
    }

    // Sort by level (lower = stronger)
    signifs[h].significators.sort((a,b) => a.level - b.level);
  }

  return signifs;
}

// ── FULL KP CHART ─────────────────────────────────────────────────────────
export function calcKPChart(planets, ascLon, ayanamsa, placidusParams = null) {
  const cusps = getKPCusps(ascLon, placidusParams);
  // Classical KP (Krishnamurti Paddhati) significators use only the 9
  // traditional grahas — filter out modern outer planets (Uranus/Neptune/
  // Pluto) the same way the Yoga and Lal Kitab engines do, for consistency.
  const signifs = getSignificators(planets.filter(p => !p.outer), cusps);

  // KP position for each planet
  const kpPlanets = planets.filter(p => !p.outer).map(p => ({
    name:       p.name,
    longitude:  p.siderealLon.toFixed(4),
    sign:       p.sign,
    ...getKPPosition(p.siderealLon),
    house:      p.house,
    retrograde: p.retrograde,
  }));

  // KP prediction rules for common life events
  const predictions = {
    marriage: {
      houses: [7, 2, 11, 1],
      desc: 'Marriage: Houses 7 (partner), 2 (family), 11 (fulfillment), 1 (self)',
      trigger: 'When dasha lord is significator of H7 and sub-lord agrees with H7',
    },
    career: {
      houses: [10, 6, 2, 11],
      desc: 'Career: Houses 10 (profession), 6 (service/work), 2 (wealth), 11 (income)',
      trigger: 'When dasha lord is significator of H10 and sub-lord is in H10 cuspal chain',
    },
    property: {
      houses: [4, 12, 2, 11],
      desc: 'Property: Houses 4 (land/home), 2 (capital), 11 (gains)',
    },
    foreign_travel: {
      houses: [12, 9, 3, 8],
      desc: 'Foreign: Houses 12 (foreign), 9 (long journey), 3 (short travel)',
    },
    health: {
      houses: [1, 6, 8, 12],
      desc: 'Health: Houses 1 (body), 6 (disease), 8 (surgery/chronic), 12 (hospitalization)',
    },
  };

  return {
    ayanamsa,
    cusps,
    planets: kpPlanets,
    significators: signifs,
    predictions,
    note: 'KP sub-lords computed using Vimshottari proportional division of nakshatras',
  };
}

/** Exact planet-to-KP-cusp aspect table. Uses the same tropical/sidereal
 * longitude frame as the supplied chart and a configurable orb. */
export function calcKPCuspAspects(planets, cusps, orb=6) {
  const traditional = new Set(['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu']);
  const rows=[];
  for(const p of (planets||[]).filter(x=>traditional.has(x.name))){
    for(const c of (cusps||[])){
      const raw=Math.abs(((p.siderealLon-c.cusp)%360+360)%360);
      const sep=Math.min(raw,360-raw);
      const aspects=[{name:'Conjunction',angle:0},{name:'Opposition',angle:180},{name:'Trine',angle:120},{name:'Square',angle:90},{name:'Sextile',angle:60}];
      const hit=aspects.map(a=>({...a,deviation:Math.abs(sep-a.angle)})).filter(a=>a.deviation<=orb).sort((a,b)=>a.deviation-b.deviation)[0];
      if(hit) rows.push({planet:p.name,house:c.house,cusp:c.cusp,aspect:hit.name,angle:hit.angle,separation:Number(sep.toFixed(6)),orb:Number(hit.deviation.toFixed(6)),withinOrb:true});
    }
  }
  return {status:'AVAILABLE',orb,rows};
}
