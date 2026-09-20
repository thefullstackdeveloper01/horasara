/**
 * GRAHA SHANTI — CLASSICAL PLANETARY REMEDIES
 * =============================================
 * For any planet this chart's own Shadbala calculation finds below its
 * classical minimum required strength (ratio = rupas/required < 1 — a
 * real, already-computed number, not a guess), this module surfaces the
 * complete classical remedy package for that planet: beej mantra, Vedic
 * mantra, tantric mantra, gemstone, metal, donation items, havan
 * procedure, stotra, kavach, and the classical day/direction — all read
 * straight from the bundled classical dataset
 * (dataset/used/core/graha_shanti_rules.json),
 * never invented.
 *
 * This is presented as traditional Jyotish practice, not medical or
 * financial advice, and gemstone/ritual specifics always carry a note to
 * consult a qualified priest/astrologer before acting on them.
 */
import { readFileSync } from 'fs';
import { reportDatasetMiss } from './_datasetLoad.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DS_PATH = join(__dir, '../../dataset/used/core/graha_shanti_rules.json');

let _byPlanet = null;
function loadDb() {
  if (_byPlanet) return _byPlanet;
  _byPlanet = {};
  try {
    const raw = JSON.parse(readFileSync(DS_PATH, 'utf8'));
    const planets = raw.graha_shanti_rules?.planets || [];
    for (const p of planets) {
      _byPlanet[p.planet_name_english] = p;
    }
  } catch (e) {
    reportDatasetMiss('grahaShanti', 'graha_shanti_rules');
  }
  return _byPlanet;
}

function formatOne(p) {
  return {
    planet: p.planet_name_english,
    sanskritName: p.planet_name_sanskrit,
    day: p.day_of_week,
    direction: p.direction,
    gemstone: p.gemstone,
    metal: p.metal,
    beejMantra: p.beej_mantra,
    vedicMantra: p.vedic_mantra,
    tantricMantra: p.tantric_mantra,
    japaCount: p.japa_count,
    donations: p.items_for_daan,
    havan: p.havan_samagri ? `${p.havan_mantra || ''} (${p.number_of_ahutis || '?'} ahutis; wood: ${p.havan_samagri.wood}; herbs: ${p.havan_samagri.herbs})` : null,
    stotra: p.stotra,
    kavach: p.kavach,
    specificRemedies: p.specific_remedies || [],
    healthEffectsIfWeak: p.health_effects,
    careerEffectsIfWeak: p.career_effects,
    source: 'Classical Graha Shanti reference database (bundled graha_shanti_rules.json)',
  };
}

/** @returns real remedy detail for one planet, or null if not in the database */
export function lookupGrahaShanti(planetName) {
  const db = loadDb();
  return db[planetName] ? formatOne(db[planetName]) : null;
}

/**
 * Build the Graha Shanti section for a calculated chart: one entry per
 * planet whose real Shadbala ratio (rupas/required) is below 1 — i.e.
 * below its own classical minimum strength requirement for THIS chart.
 * @param {object} shadbala - R.shadbala from the engine
 * @returns {Array<object>} weak-planet remedy entries, strongest-weakness-first
 */
export function buildGrahaShantiForWeakPlanets(shadbala) {
  if (!shadbala || typeof shadbala !== 'object') return [];
  const weak = Object.entries(shadbala)
    .filter(([, sb]) => sb && typeof sb.ratio === 'number' && sb.ratio < 1)
    .sort((a, b) => a[1].ratio - b[1].ratio);

  return weak.map(([planet, sb]) => {
    const remedy = lookupGrahaShanti(planet);
    return {
      planet,
      shadbalaRatio: Number(sb.ratio.toFixed(2)),
      grade: sb.grade,
      remedy,
    };
  }).filter(e => e.remedy); // only planets this database actually covers
}

export default { lookupGrahaShanti, buildGrahaShantiForWeakPlanets };
