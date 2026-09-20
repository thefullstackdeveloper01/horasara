// ============================================================
// VEDIC JYOTISH ENGINE v12 — GRAHA STATES & SPECIAL CONDITIONS
// Implements:
//   - Retrograde flags (explicit)
//   - Combustion (classical distances per BPHS)
//   - Planetary War (Graha Yuddha) 
//   - Heliacal Rise/Set (visibility)
//   - Cazimi (in heart of Sun, < 17')
// ============================================================

import { mod360, signOf } from '../astronomy/utils.js';

// ── COMBUSTION DISTANCES ──────────────────────────────────────
// Source: BPHS Ch.3 — classical combustion degrees
// These are tropical angular distances from the Sun (same sign NOT required in BPHS)
import moduleData from '../../dataset/used/core/graha_states.json' with { type: 'json' };
const COMBUSTION_ORBS = moduleData.COMBUSTION_ORBS;

// Cazimi: planet is in the heart of the sun (< 17 arcmin = 0.2833°)
const CAZIMI_ORB = moduleData.CAZIMI_ORB;

/**
 * Calculate combustion status for all planets
 * @param {Array} planets - planet array with siderealLon, speed, name
 * @param {number} sunLon - Sun's sidereal longitude
 * @returns {Object} combustion status per planet
 */
export function calcCombustion(planets, sunLon) {
  const result = {};

  for (const planet of planets) {
    const { name, siderealLon, retrograde } = planet;
    if (name === 'Sun' || name === 'Rahu' || name === 'Ketu') continue;
    if (!COMBUSTION_ORBS[name]) continue;

    let dist = Math.abs(mod360(siderealLon - sunLon));
    if (dist > 180) dist = 360 - dist;

    // Adjust orb for retrograde Mercury and Venus (smaller orb per some texts)
    let orb = COMBUSTION_ORBS[name];
    if (retrograde && (name === 'Mercury' || name === 'Venus')) {
      orb = name === 'Mercury' ? 12.0 : 8.0;
    }

    const isCazimi    = dist <= CAZIMI_ORB;
    const isCombust   = !isCazimi && dist <= orb;

    result[name] = {
      distance:      parseFloat(dist.toFixed(4)),
      orb:           orb,
      combust:       isCombust,
      cazimi:        isCazimi,
      retrograde:    retrograde || false,
      // Combustion reduces planet's benefic nature significantly
      severity:      isCazimi   ? 'Cazimi (Strengthened)'
                   : dist < orb * 0.5 ? 'Deep Combustion'
                   : isCombust ? 'Combust'
                   : dist < orb * 1.5 ? 'Near Combustion'
                   : 'Clear',
    };
  }

  return result;
}

// ── PLANETARY WAR (GRAHA YUDDHA) ─────────────────────────────
// When two planets are within 1° of each other (longitude difference)
// Traditionally: only true planets (not Sun/Moon/nodes) can be in graha yuddha
// The planet with lower latitude (closer to ecliptic) WINS
// The losing planet is weakened (like being combust)
//
// Source: BPHS Ch.3, Brihat Jataka Ch.2, Saravali Ch.4

const GRAHA_YUDDHA_ORB = moduleData.GRAHA_YUDDHA_ORB;

/**
 * Calculate Graha Yuddha (planetary war) conditions
 * @param {Array} planets - planet array
 * @returns {Array} list of planetary wars with winner/loser
 */
export function calcGrahaYuddha(planets) {
  const wars = [];
  // Only between true planets (exclude Sun, Moon, Rahu, Ketu, outer planets)
  const fighters = planets.filter(p =>
    ['Mars','Mercury','Jupiter','Venus','Saturn'].includes(p.name)
  );

  for (let i = 0; i < fighters.length; i++) {
    for (let j = i + 1; j < fighters.length; j++) {
      const p1 = fighters[i];
      const p2 = fighters[j];

      let dist = Math.abs(mod360(p1.siderealLon - p2.siderealLon));
      if (dist > 180) dist = 360 - dist;

      if (dist <= GRAHA_YUDDHA_ORB) {
        // Determine winner by latitude (closer to ecliptic = winner)
        // If latitudes equal: planet with higher longitude wins
        const lat1 = Math.abs(p1.lat || 0);
        const lat2 = Math.abs(p2.lat || 0);

        let winner, loser;
        if (lat1 < lat2) {
          winner = p1.name;
          loser  = p2.name;
        } else if (lat2 < lat1) {
          winner = p2.name;
          loser  = p1.name;
        } else {
          // Equal latitude — northern (positive lat) wins
          // If both same: higher longitude in sign wins (tradition varies)
          if ((p1.lat || 0) >= (p2.lat || 0)) {
            winner = p1.name;
            loser  = p2.name;
          } else {
            winner = p2.name;
            loser  = p1.name;
          }
        }

        wars.push({
          planets:     [p1.name, p2.name],
          distance:    parseFloat(dist.toFixed(4)),
          winner,
          loser,
          p1Lat:       parseFloat((p1.lat || 0).toFixed(4)),
          p2Lat:       parseFloat((p2.lat || 0).toFixed(4)),
          effect:      `${loser} is weakened (war loss) — strength reduced by ~50%`,
          orb:         GRAHA_YUDDHA_ORB,
        });
      }
    }
  }

  return wars;
}

// ── RETROGRADE FLAGS ──────────────────────────────────────────
// Adds explicit retrograde status with context
export function calcRetrogrades(planets) {
  const result = {};
  for (const planet of planets) {
    const isRetro = planet.retrograde || (planet.speed !== undefined && planet.speed < 0);
    result[planet.name] = {
      retrograde:  isRetro,
      speed:       planet.speed || 0,
      // Stationary: speed < 0.1 but not retrograde
      stationary:  !isRetro && planet.speed !== undefined && Math.abs(planet.speed) < 0.1,
      label:       isRetro ? 'Vakri (R)'
                 : (planet.speed !== undefined && Math.abs(planet.speed) < 0.1) ? 'Stationary'
                 : 'Direct',
    };
  }
  return result;
}

// ── HELIACAL VISIBILITY ────────────────────────────────────────
// Approximate: planet visible if > visibility_threshold degrees from Sun
const HELIACAL_LIMITS = moduleData.HELIACAL_LIMITS;

export function calcHeliacalStatus(planets, sunLon) {
  const result = {};
  for (const planet of planets) {
    const { name, siderealLon } = planet;
    const limit = HELIACAL_LIMITS[name];
    if (!limit) continue;

    let dist = Math.abs(mod360(siderealLon - sunLon));
    if (dist > 180) dist = 360 - dist;

    result[name] = {
      distance: parseFloat(dist.toFixed(3)),
      visible:  dist > limit,
      limit,
      status:   dist > limit ? 'Visible' : dist < (limit * 0.5) ? 'Deep Asta' : 'Asta (Setting/Rising)',
    };
  }
  return result;
}

// ── COMPREHENSIVE PLANET STATUS ───────────────────────────────
export function calcAllPlanetaryStates(planets, sunLon) {
  const combustion   = calcCombustion(planets, sunLon);
  const retrogrades  = calcRetrogrades(planets);
  const grahaYuddha  = calcGrahaYuddha(planets);
  const visibility   = calcHeliacalStatus(planets, sunLon);

  // Merge into per-planet status
  const states = {};
  for (const planet of planets) {
    const name = planet.name;
    states[name] = {
      retrograde:  retrogrades[name] || { retrograde: false, label: 'Direct' },
      combustion:  combustion[name]  || null,
      visibility:  visibility[name]  || null,
    };
  }

  return { states, grahaYuddha };
}
