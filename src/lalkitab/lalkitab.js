/**
 * LAL KITAB — Urdu-Persian Vedic System
 * Planet-in-house predictions + specific remedies
 * Based on "Lal Kitab" by Pt. Roop Chand Joshi (1939-1952 editions)
 *
 * KEY DIFFERENCES FROM CLASSICAL JYOTISH:
 * 1. Uses Whole Sign from Lagna (same as Vedic)
 * 2. Planets in debilitation here act like enemies in their own sign
 * 3. Rahu/Ketu get "pakka ghar" (permanent houses) — Rahu H12, Ketu H6
 * 4. Remedies are practical daily-life actions, not mantra-based
 * 5. "Teva" — birth chart is read house by house differently
 */

import lalKitabData from '../../dataset/used/core/lal-kitab-data.json' with { type: 'json' };

// Cache for memoization
const predictionCache = new Map();
const debtCache = new Map();

/**
 * Validates if a planet name is valid
 * @param {string} planet - Planet name to validate
 * @returns {boolean} - True if valid
 */
function isValidPlanet(planet) {
  return lalKitabData.metadata.validPlanets.includes(planet);
}

/**
 * Validates if a house number is valid
 * @param {number} house - House number to validate (1-12)
 * @returns {boolean} - True if valid
 */
function isValidHouse(house) {
  return lalKitabData.metadata.validHouses.includes(house);
}

/**
 * Validates planet data structure
 * @param {Object} planetData - Planet data object
 * @returns {boolean} - True if valid
 */
function isValidPlanetData(planetData) {
  return planetData && typeof planetData === 'object' &&
    planetData.effect && Array.isArray(planetData.remedy);
}

/**
 * Gets Lal Kitab prediction for a specific planet in a specific house
 * @param {string} planet - Planet name (Sun, Moon, Mars, etc.)
 * @param {number} house - House number (1-12)
 * @returns {Object} Prediction result with effect, remedies, strengths, etc.
 * @throws {Error} If planet or house is invalid
 */
export function getLalKitabPrediction(planet, house) {
  // Input validation
  if (!planet || typeof planet !== 'string') {
    throw new Error('Invalid planet: Planet must be a non-empty string');
  }

  if (!isValidPlanet(planet)) {
    throw new Error(`Invalid planet: "${planet}". Valid planets are: ${lalKitabData.metadata.validPlanets.join(', ')}`);
  }

  if (!Number.isInteger(house) || !isValidHouse(house)) {
    throw new Error(`Invalid house: ${house}. House must be an integer between 1 and 12`);
  }

  // Check cache first for performance
  const cacheKey = `${planet}-${house}`;
  if (predictionCache.has(cacheKey)) {
    return { ...predictionCache.get(cacheKey) }; // Return copy to prevent mutation
  }

  const planetData = lalKitabData.planets[planet];

  if (!planetData) {
    throw new Error(`No data found for planet: ${planet}`);
  }

  const houseData = planetData[house.toString()];

  if (!houseData || !isValidPlanetData(houseData)) {
    // Return a structured error response instead of throwing
    const errorResult = {
      planet,
      house,
      effect: `Data not available for ${planet} in house ${house}`,
      remedy: ['Consult a Lal Kitab expert for detailed analysis'],
      positive: ['Data incomplete'],
      challenges: ['Limited information available'],
      pakka_ghar: null,
      pakka_ghar_note: `No Pakka Ghar information available for ${planet} in house ${house}`,
      strength: 'Unknown',
      error: true
    };
    predictionCache.set(cacheKey, errorResult);
    return { ...errorResult };
  }

  // Calculate strength based on house position
  let strength = 'Moderate';
  if (houseData.pakka_ghar === house) {
    strength = 'Maximum';
  } else if (lalKitabData.metadata.strongHouses.includes(house)) {
    strength = 'Strong';
  }

  const result = {
    planet,
    house,
    effect: houseData.effect,
    remedy: [...houseData.remedy], // Copy arrays to prevent mutation
    positive: [...(houseData.positive || [])],
    challenges: [...(houseData.challenges || [])],
    pakka_ghar: houseData.pakka_ghar,
    pakka_ghar_note: houseData.pakka_ghar === house
      ? `${planet} is in its Pakka Ghar (permanent house H${house}) — strongest possible position in Lal Kitab`
      : `Pakka Ghar for ${planet} is H${houseData.pakka_ghar}`,
    strength,
    error: false
  };

  // Cache the result
  predictionCache.set(cacheKey, result);

  return { ...result }; // Return copy to prevent mutation
}

/**
 * Gets predictions for multiple planets
 * @param {Array} planets - Array of planet objects with name and house properties
 * @returns {Array} Array of predictions
 * @throws {Error} If planets array is invalid
 */
export function getLalKitabChart(planets) {
  if (!Array.isArray(planets)) {
    throw new Error('Invalid input: planets must be an array');
  }

  if (planets.length === 0) {
    console.warn('Warning: Empty planets array provided');
    return [];
  }

  // Filter out outer planets if needed (maintaining original logic)
  const validPlanets = planets.filter(p => p && p.name && !p.outer);

  if (validPlanets.length === 0) {
    console.warn('Warning: No valid planets found after filtering');
    return [];
  }

  return validPlanets.map(p => {
    try {
      return getLalKitabPrediction(p.name, p.house);
    } catch (error) {
      console.error(`Error processing planet ${p.name} in house ${p.house}:`, error.message);
      // Return error object for this planet instead of failing completely
      return {
        planet: p.name,
        house: p.house,
        effect: `Error: ${error.message}`,
        remedy: ['Consult an expert'],
        positive: [],
        challenges: [],
        pakka_ghar: null,
        pakka_ghar_note: 'Data unavailable',
        strength: 'Unknown',
        error: true
      };
    }
  });
}

/**
 * Gets planetary debts (Karz) based on Lal Kitab system
 * @param {Array} planets - Array of planet objects with name, house, retrograde properties
 * @returns {Array} Array of active debts
 * @throws {Error} If planets array is invalid
 */
// FIX (Lal Kitab audit): the previous getLalKitabDebts() implementation
// detected debts via a static "planet A owes planet B" pair table stored
// in lal-kitab-data.json — but that structure does not match real Lal
// Kitab doctrine at all. Sourced from 4 independent references (including
// one academic paper citing the primary Arun Samhita text) that all
// agree: real Lal Kitab "Rin" (debts) are detected from specific PLANET-
// IN-HOUSE combinations, not planet-to-planet pairs:
//   - Pitru Rin (ancestor/father debt): Venus, Mercury, or Rahu (alone or
//     in combination) placed in house 2, 5, 9, or 12
//   - Matru Rin (mother debt): Ketu placed in house 4
//   - Stri Rin (debt to women/wife): Sun, Moon, or Rahu (alone or in
//     combination) placed in house 2 or 7
// Some fuller classical treatments describe additional debt types (Guru
// Rin/Atma Rin/Deva Rin) with more elaborate trigger conditions (one
// primary-source citation describes a 3-condition test for Pitru Rin
// involving sign-lord/enemy relationships, not just simple house
// placement) — this implementation covers the three most consistently
// corroborated debts across sources, not the full elaborated tradition,
// and says so in its output rather than silently claiming completeness.
import moduleData from '../../dataset/used/core/lalkitab.json' with { type: 'json' };
const RIN_RULES = moduleData.RIN_RULES;

export function getLalKitabDebts(planets) {
  if (!Array.isArray(planets)) {
    throw new Error('Invalid input: planets must be an array');
  }

  const cacheKey = 'v2:' + JSON.stringify(planets.map(p => ({ name: p.name, house: p.house })));
  if (debtCache.has(cacheKey)) {
    return debtCache.get(cacheKey).map(debt => ({ ...debt }));
  }

  const planetMap = new Map();
  planets.forEach(p => { if (p && p.name) planetMap.set(p.name, p); });

  const debts = [];
  for (const rule of RIN_RULES) {
    const triggeringPlanets = rule.triggerPlanets.filter(name => {
      const p = planetMap.get(name);
      return p && rule.triggerHouses.includes(p.house);
    });

    if (triggeringPlanets.length > 0) {
      debts.push({
        name: rule.name,
        label: rule.label,
        triggeringPlanets,
        houses: [...new Set(triggeringPlanets.map(n => planetMap.get(n).house))],
        severity: triggeringPlanets.length > 1 ? 'High (multiple triggers)' : 'Active',
        indication: rule.indication,
        remedy: rule.remedy,
      });
    }
  }

  debtCache.set(cacheKey, [...debts]);
  return debts.map(debt => ({ ...debt }));
}

/**
 * Gets planetary conjunctions based on Lal Kitab rules
 * @param {Array} planets - Array of planet objects with name and house properties
 * @returns {Array} Array of conjunctions found
 * @throws {Error} If planets array is invalid
 */
export function getLalKitabConjunctions(planets) {
  if (!Array.isArray(planets)) {
    throw new Error('Invalid input: planets must be an array');
  }

  const conjunctions = [];
  const planetsInHouse = new Map();

  // Group planets by house
  planets.forEach(p => {
    if (p && p.name && p.house) {
      if (!planetsInHouse.has(p.house)) {
        planetsInHouse.set(p.house, []);
      }
      planetsInHouse.get(p.house).push(p.name);
    }
  });

  // Check for conjunctions in each house
  for (const [house, planetsHere] of planetsInHouse.entries()) {
    if (planetsHere.length < 2) continue;

    // Generate all unique pairs
    for (let i = 0; i < planetsHere.length; i++) {
      for (let j = i + 1; j < planetsHere.length; j++) {
        const p1 = planetsHere[i];
        const p2 = planetsHere[j];

        // Try both orderings of the pair
        const key1 = `${p1}+${p2}`;
        const key2 = `${p2}+${p1}`;
        const data = lalKitabData.conjunctions[key1] || lalKitabData.conjunctions[key2];

        if (data) {
          conjunctions.push({
            house: parseInt(house),
            planets: [p1, p2],
            effect: data.effect,
            remedy: data.remedy
          });
        }
        // Note: the source Lal Kitab dataset documents 18 of the 36 possible
        // classical 2-planet conjunctions. A pair with no entry here simply
        // has no classical Lal Kitab combination text available — that's
        // expected data coverage, not an error, so it's silently skipped
        // rather than logged.
      }
    }
  }

  return conjunctions;
}

/**
 * Gets complete Lal Kitab analysis including predictions, debts, and conjunctions
 * @param {Array} planets - Array of planet objects with name, house, and optional retrograde/outer properties
 * @returns {Object} Complete analysis with all components and summary
 * @throws {Error} If planets array is invalid
 */
export function getLalKitabFullAnalysis(planets) {
  if (!Array.isArray(planets)) {
    throw new Error('Invalid input: planets must be an array');
  }

  // Lal Kitab is a classical 9-graha system — modern outer planets
  // (Uranus/Neptune/Pluto, flagged `outer: true`) have no defined
  // conjunction/house rules in this dataset and must be excluded, or every
  // combination involving them silently falls through to "no data found".
  planets = planets.filter(p => !p.outer);

  try {
    const chart = getLalKitabChart(planets);
    const debts = getLalKitabDebts(planets);
    const conjunctions = getLalKitabConjunctions(planets);

    // Find Pakka Ghar planets (strongest positions)
    const pakkaGharPlanets = chart.filter(p => p.strength === 'Maximum' && !p.error);

    // Calculate summary statistics
    const validPlanets = chart.filter(p => !p.error);
    const strongPlanets = validPlanets.filter(p => p.strength === 'Strong' || p.strength === 'Maximum');

    return {
      planets: chart.map(p => ({ ...p })), // Return copies to prevent mutation
      debts: debts.map(d => ({ ...d })),
      conjunctions: conjunctions.map(c => ({ ...c })),
      pakka_ghar: pakkaGharPlanets.map(p => ({ ...p })),
      summary: {
        total_planets: validPlanets.length,
        strong_planets: strongPlanets.length,
        debts_count: debts.length,
        conjunctions_count: conjunctions.length,
        has_errors: chart.some(p => p.error)
      },
      metadata: {
        version: lalKitabData.metadata.version,
        generated_at: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error generating full analysis:', error);
    throw new Error(`Failed to generate analysis: ${error.message}`);
  }
}

/**
 * Clears all caches (useful for testing or memory management)
 */
export function clearCache() {
  predictionCache.clear();
  debtCache.clear();
}

// Export constants for external use
export const VALID_PLANETS = [...lalKitabData.metadata.validPlanets];
export const VALID_HOUSES = [...lalKitabData.metadata.validHouses];