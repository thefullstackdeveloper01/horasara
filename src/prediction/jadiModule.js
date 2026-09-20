/**
 * JADI (HERBAL ROOT REMEDY) MODULE — Spec §40
 * =============================================
 * Follows the exact same real, non-fabricating pattern already used by
 * src/prediction/grahaShanti.js: identify this chart's own genuinely weak
 * planets from its own already-computed Shadbala (ratio = rupas/required
 * < 1 — a real number from THIS chart, not a guess), then look each one up
 * against the bundled Jadi dataset (dataset/used/core/jadi_herbs.json).
 *
 * A weak planet not yet covered by the dataset is reported as
 * NOT_AVAILABLE with a reason, never filled in with an invented herb. As
 * more verified entries are added to the JSON file, this same code picks
 * them up automatically with no code change required.
 */
import { readFileSync } from 'fs';
import { reportDatasetMiss } from './_datasetLoad.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DS_PATH = join(__dir, '../../dataset/used/core/jadi_herbs.json');

let _byPlanet = null;
function loadDb() {
  if (_byPlanet) return _byPlanet;
  _byPlanet = {};
  try {
    const raw = JSON.parse(readFileSync(DS_PATH, 'utf8'));
    for (const j of raw.jadis || []) {
      _byPlanet[j.planet] = j;
    }
  } catch (e) {
    reportDatasetMiss('jadiModule', 'jadi_herbs.json');
  }
  return _byPlanet;
}

/** @returns real Jadi detail for one planet, or null if not in the database */
export function lookupJadi(planetName) {
  const db = loadDb();
  return db[planetName] || null;
}

/**
 * Build the Jadi section for a calculated chart: one entry per planet
 * whose real Shadbala ratio (rupas/required) is below 1 for THIS chart —
 * exactly the same weakness test grahaShanti.js already uses, so results
 * stay consistent with the rest of the report.
 * @param {object} shadbala - R.shadbala from the engine
 * @returns {Array<object>} one entry per weak planet, AVAILABLE where the
 *   dataset has that planet, NOT_AVAILABLE (with reason) where it doesn't —
 *   strongest-weakness-first.
 */
export function buildJadiRemedies(shadbala) {
  if (!shadbala || typeof shadbala !== 'object') return [];
  const weak = Object.entries(shadbala)
    .filter(([, sb]) => sb && typeof sb.ratio === 'number' && sb.ratio < 1)
    .sort((a, b) => a[1].ratio - b[1].ratio);

  return weak.map(([planet, sb]) => {
    const jadi = lookupJadi(planet);
    return jadi
      ? {
          status: 'AVAILABLE',
          planet,
          shadbalaRatio: Number(sb.ratio.toFixed(2)),
          grade: sb.grade,
          jadi: jadi.jadi,
          purpose: jadi.purpose,
          traditionalUsage: jadi.traditionalUsage,
          wearingMethod: jadi.wearingMethod,
          precautions: jadi.precautions,
          confidence: jadi.confidence,
          source: jadi.source,
        }
      : {
          status: 'NOT_AVAILABLE',
          planet,
          shadbalaRatio: Number(sb.ratio.toFixed(2)),
          grade: sb.grade,
          reason: `${planet} is genuinely weak in this chart (Shadbala ${sb.ratio.toFixed(2)}), but no verified Jadi entry for ${planet} exists yet in dataset/used/core/jadi_herbs.json. Add a verified entry for ${planet} to that file to enable this \u2014 nothing is being guessed in its place.`,
        };
  });
}

export default { lookupJadi, buildJadiRemedies };
