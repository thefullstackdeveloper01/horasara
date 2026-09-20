/**
 * FUNCTIONAL BENEFIC / MALEFIC CLASSIFICATION
 * Source: BPHS Ch.34 — "Karaka" and lordship rules
 *
 * Rules:
 * 1. Lords of Trikona (1,5,9) = functional benefics for that lagna
 * 2. Lords of Dusthana (6,8,12) = functional malefics
 * 3. Lords of Kendra (1,4,7,10) = neutral (benefic if also trikona lord)
 * 4. Lords of 2H and 11H = mild malefics (artha houses, materialistic)
 * 5. The same planet can be both: Jupiter for Taurus lagna = lord of 8H + 11H = malefic
 * 6. Yogakaraka: planet ruling both kendra and trikona = highly benefic
 * 7. Saturn: only malefic in natural sense; for Taurus and Libra = yogakaraka
 * 8. Nodes (Rahu/Ketu): adopt nature of sign lord and conjunct planets
 */

import { SIGN_LORDS, SIGNS } from '../astronomy/constants.js';
import { signOf, mod360 } from '../astronomy/utils.js';

// House classifications
const TRIKONA   = new Set([1, 5, 9]);
const YOGAKARAKA_TRIKONA = new Set([5, 9]);       // dharma houses — pure benefic lords
const KENDRA    = new Set([1, 4, 7, 10]);
// Classical Yogakaraka status is reserved for a planet that owns a
// Trikona (5/9) AND a non-Lagna Kendra (4/7/10). The Lagna lord is already
// both Kendra and Trikona by definition, but is not therefore called a
// Yogakaraka. This prevents Jupiter being mislabeled Yogakaraka for
// Sagittarius Lagna (where it owns 1+4).
const YOGAKARAKA_KENDRA = new Set([4, 7, 10]);   // angle houses — neutral/good lords
const DUSTHANA  = new Set([6, 8, 12]);      // evil houses — malefic lords
const UPACHAYA  = new Set([3, 6, 10, 11]);  // growth houses
const MARAKA    = new Set([2, 7]);          // death-inflicting houses

/**
 * Compute functional nature of all planets for a given lagna sign
 * @param {number} lagnaSignIdx — 0-indexed sign of ascendant
 * @param {Array} planets — planet array from engine
 * @returns {Object} map: planet name → { nature, houses, yogakaraka, reason }
 */
export function calcFunctionalNature(lagnaSignIdx, planets) {
  const result = {};
  const lagnaIdx = lagnaSignIdx;

  // Build house-lord map: house number → lord name
  const houseLords = {};
  for (let h = 1; h <= 12; h++) {
    const signIdx = (lagnaIdx + h - 1) % 12;
    houseLords[h] = SIGN_LORDS[SIGNS[signIdx]];
  }

  // For each planet, find which houses it lords
  const planetHouses = {};
  const SEVEN = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];

  for (const pname of SEVEN) {
    const owned = [];
    for (let h = 1; h <= 12; h++) {
      if (houseLords[h] === pname) owned.push(h);
    }
    planetHouses[pname] = owned;
  }

  // Classify each planet
  for (const pname of SEVEN) {
    const owned = planetHouses[pname] || [];
    const isTrikona  = owned.some(h => TRIKONA.has(h));
    const isKendra   = owned.some(h => KENDRA.has(h));
    const isDusthana = owned.some(h => DUSTHANA.has(h));
    const isMaraka   = owned.some(h => MARAKA.has(h));
    const isUpachaya = owned.some(h => UPACHAYA.has(h));

    // Yogakaraka: owns BOTH kendra AND trikona (most powerful benefic)
    const isYogakaraka = owned.some(h => YOGAKARAKA_KENDRA.has(h)) && owned.some(h => YOGAKARAKA_TRIKONA.has(h));

    let nature, reason;

    if (isYogakaraka) {
      nature = 'Yogakaraka';
      reason = `Lords of Kendra (${owned.filter(h=>YOGAKARAKA_KENDRA.has(h)).join(',')}) AND Trikona (${owned.filter(h=>YOGAKARAKA_TRIKONA.has(h)).join(',')}) — most benefic`;
    } else if (isTrikona && !isDusthana) {
      nature = 'Functional Benefic';
      reason = `Lord of Trikona house(s) ${owned.filter(h=>TRIKONA.has(h)).join(',')} for ${SIGNS[lagnaIdx]} Lagna`;
    } else if (isTrikona && isDusthana) {
      nature = 'Mixed';
      reason = `Lords of both Trikona (${owned.filter(h=>YOGAKARAKA_TRIKONA.has(h)).join(',')}) and Dusthana (${owned.filter(h=>DUSTHANA.has(h)).join(',')}) — mixed results`;
    } else if (isDusthana && !isTrikona) {
      nature = 'Functional Malefic';
      reason = `Lord of Dusthana house(s) ${owned.filter(h=>DUSTHANA.has(h)).join(',')} for ${SIGNS[lagnaIdx]} Lagna`;
    } else if (isKendra && !isTrikona) {
      // Kendra lords without trikona lordship — Kendradhipati dosha
      // Natural malefics (Saturn, Mars) owning kendra = OK
      // Natural benefics (Jupiter, Venus, Mercury, Moon) owning kendra only = mild malefic (Kendradhipati)
      const naturalBenefics = ['Jupiter','Venus','Moon'];
      if (naturalBenefics.includes(pname)) {
        nature = 'Mild Malefic (Kendradhipati)';
        reason = `Natural benefic ${pname} owning only Kendra (${owned.filter(h=>KENDRA.has(h)).join(',')}) — Kendradhipati dosha`;
      } else {
        nature = 'Neutral';
        reason = `Lord of Kendra house(s) ${owned.filter(h=>KENDRA.has(h)).join(',')} — neutral to good`;
      }
    } else if (isMaraka && !isTrikona) {
      nature = 'Maraka';
      reason = `Lord of Maraka house(s) ${owned.filter(h=>MARAKA.has(h)).join(',')} — potential health concerns in its dasha`;
    } else {
      nature = 'Neutral';
      reason = `Lord of house(s) ${owned.join(',')} — neutral results`;
    }

    result[pname] = {
      nature,
      reason,
      ownedHouses: owned,
      isYogakaraka,
      isTrikona,
      isKendra,
      isDusthana,
      grade: nature === 'Yogakaraka' ? 5
           : nature === 'Functional Benefic' ? 4
           : nature === 'Neutral' ? 3
           : nature === 'Mixed' ? 3
           : nature === 'Mild Malefic (Kendradhipati)' ? 2
           : nature === 'Maraka' ? 2
           : 1, // Functional Malefic
    };
  }

  // Rahu / Ketu: adopt nature of sign dispositor + conjunct planets
  for (const p of planets) {
    if (!['Rahu','Ketu'].includes(p.name)) continue;
    const nodeSign  = signOf(mod360(p.siderealLon));
    const dispositor = SIGN_LORDS[SIGNS[nodeSign]];
    const dispNature = result[dispositor];
    const conjunct   = planets.filter(x =>
      !['Rahu','Ketu'].includes(x.name) && signOf(mod360(x.siderealLon)) === nodeSign
    );
    let nodeNature = dispNature?.nature || 'Neutral';
    let nodeReason = `${p.name}: adopts nature of dispositor ${dispositor} (${nodeNature})`;
    if (conjunct.length) {
      const conjNatures = conjunct.map(x => result[x.name]?.nature).filter(Boolean);
      nodeReason += `; conjunct ${conjunct.map(x=>x.name).join(',')}`;
      // If conjoined with functional malefic, adds malefic tinge
      if (conjNatures.some(n => n.includes('Malefic'))) nodeNature = 'Mixed';
    }
    result[p.name] = {
      nature: nodeNature,
      reason: nodeReason,
      ownedHouses: [],
      isYogakaraka: false,
      grade: result[dispositor]?.grade || 3,
    };
  }

  return result;
}

/**
 * Get human-readable summary of functional nature for display
 */
export function getFunctionalNatureSummary(lagnaSignIdx) {
  const lagnaName = SIGNS[lagnaSignIdx];
  const summary = {};
  const tempPlanets = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'].map(n => ({
    name: n, siderealLon: 0
  }));
  const fn = calcFunctionalNature(lagnaSignIdx, tempPlanets);
  for (const [p, data] of Object.entries(fn)) {
    summary[p] = `${data.nature} (H${data.ownedHouses.join(',')})`;
  }
  return { lagna: lagnaName, planets: summary };
}
