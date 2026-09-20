/**
 * VASTU DIRECTION GUIDE — personalized by this chart's own favourable planets
 * ==============================================================================
 * Vastu Shastra is architectural, not a birth-chart calculation — there is
 * no astronomical "Vastu of a person." What this module does responsibly
 * is cross-reference the classical direction↔planet rulership table
 * (dataset/used/core/vastu_rules.json)
 * against planets THIS chart's own engine already found to be Yogakaraka /
 * Functional Benefic for this Lagna (same real data as the Ghatak/
 * Favourable Points section) — so "which directions this person might lean
 * on for the activities that matter to their own favourable planets" is a
 * genuine chart-specific cross-reference, not decorative generic content.
 */
import { readFileSync } from 'fs';
import { reportDatasetMiss } from './_datasetLoad.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DS_PATH = join(__dir, '../../dataset/used/core/vastu_rules.json');

let _directions = null;
function loadDirections() {
  if (_directions) return _directions;
  _directions = [];
  try {
    const raw = JSON.parse(readFileSync(DS_PATH, 'utf8'));
    const d = raw.vastu_rules?.directions;
    // The bundled dataset splits directions across three groups: 4
    // cardinal (N/S/E/W), 4 diagonal sub-directions (NE/SE/SW/NW — the
    // ones with planetary rulers in Vastu), and 8 finer "extended"
    // compass points (NNE, ENE, etc. — no planetary ruler assigned in
    // this dataset, so they're intentionally excluded from a
    // planet-driven personalization; only cardinal + diagonal carry a
    // "planet" field this module can match against).
    _directions = [...(d?.cardinal || []), ...(d?.diagonal_sub_directions || [])];
  } catch (e) {
    reportDatasetMiss('vastuGuide', 'vastu_rules');
  }
  return _directions;
}

// The dataset uses short planet names in Hindi/English mixed form
// ("Mercury (Budh)") — normalize to the plain English name this app's
// engine uses everywhere else.
function normalizePlanetName(s) {
  if (!s) return null;
  const known = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  return known.find(k => s.includes(k)) || null;
}

/**
 * @param {object} functionalNature - R.functionalNature (planet -> {nature, reason})
 * @returns {Array<object>} one entry per direction ruled by a Yogakaraka/
 *   Functional Benefic planet for this chart's own Lagna
 */
export function buildPersonalizedVastuGuide(functionalNature) {
  const directions = loadDirections();
  if (!directions.length || !functionalNature) return [];

  const favourablePlanets = Object.entries(functionalNature)
    .filter(([, v]) => ['Yogakaraka', 'Functional Benefic'].includes(v.nature))
    .map(([p]) => p);

  return directions
    .map(d => ({ ...d, planetNormalized: normalizePlanetName(d.planet) }))
    .filter(d => favourablePlanets.includes(d.planetNormalized))
    .map(d => ({
      direction: d.direction,
      hindiName: d.hindi_name,
      rulingDeity: d.ruling_deity,
      element: d.element,
      planet: d.planetNormalized,
      significance: d.significance,
      positiveActivities: d.positive_activities || [],
      negativeActivities: d.negative_activities || [],
      remedies: d.remedies || [],
      whyRelevant: `${d.planetNormalized} is a Yogakaraka/Functional Benefic planet for this chart's own Lagna, and classically rules the ${d.direction} direction.`,
      source: 'Classical Vastu Shastra reference database (bundled vastu_rules.json)',
    }));
}

export default { buildPersonalizedVastuGuide };
