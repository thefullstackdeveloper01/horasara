/**
 * LAGNA CLASSICAL PROFILE
 * =========================
 * Looks up this chart's own already-calculated Lagna (Ascendant) sign in
 * the bundled classical 12-Lagna personality/career/health/spiritual
 * profile database (dataset/09_predictions_and_forecasts/
 * lagna_predictions.json — real classical content, Hindi/Hinglish).
 * Read-only lookup keyed by the chart's own Lagna sign; nothing invented.
 */
import { readFileSync } from 'fs';
import { reportDatasetMiss } from './_datasetLoad.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DS_PATH = join(__dir, '../../dataset/used/core/lagna_predictions.json');

let _byRashi = null;
function loadDb() {
  if (_byRashi) return _byRashi;
  _byRashi = {};
  try {
    const raw = JSON.parse(readFileSync(DS_PATH, 'utf8'));
    for (const entry of raw.lagna_predictions || []) {
      _byRashi[entry.rashi] = entry; // e.g. "Aries" -> full profile
    }
  } catch (e) {
    reportDatasetMiss('lagnaProfile', 'lagna_predictions');
  }
  return _byRashi;
}

/**
 * @param {string} lagnaSign - e.g. "Aries" (this chart's own calculated Lagna sign)
 * @returns {object|null} the full classical profile for that Lagna, or null if not found
 */
export function buildLagnaClassicalProfile(lagnaSign) {
  const db = loadDb();
  const entry = db[lagnaSign];
  if (!entry) return null;
  return {
    lagnaSanskrit: entry.lagna,
    rashi: entry.rashi,
    signLord: entry.sign_lord,
    element: entry.element,
    quality: entry.quality,
    personality: entry.basic_traits?.personality,
    strengths: entry.basic_traits?.strengths || [],
    weaknesses: entry.basic_traits?.weaknesses || [],
    physicalAppearance: entry.basic_traits?.physical_appearance,
    suitableCareerFields: entry.career_and_profession?.suitable_fields || [],
    workStyle: entry.career_and_profession?.work_style,
    relationshipNature: entry.relationships_and_family?.nature_in_relationships,
    familyLife: entry.relationships_and_family?.family_life,
    healthVulnerableAreas: entry.health?.vulnerable_areas || [],
    healthTips: entry.health?.general_health_tips,
    luckyNumbers: entry.favorable_factors?.lucky_numbers || [],
    luckyDays: entry.favorable_factors?.lucky_days || [],
    luckyColors: entry.favorable_factors?.lucky_colors || [],
    luckyGemstone: entry.favorable_factors?.lucky_gemstone,
    favorableDirections: entry.favorable_factors?.favorable_directions || [],
    favorableMetal: entry.favorable_factors?.favorable_metal,
    emotionalNature: entry.spiritual_and_emotional?.emotional_nature,
    spiritualInclination: entry.spiritual_and_emotional?.spiritual_inclination,
    sourceLanguage: 'Romanized Hindi',
    source: 'Classical Lagna reference database (bundled lagna_predictions.json)',
  };
}

export default { buildLagnaClassicalProfile };
