/**
 * ISHTA DEVATA — Spec §33
 * ========================
 * Calculates this chart's own Atmakaraka (already computed dynamically by
 * src/dasha/chara.js, surfaced via src/prediction/vargaSignifications.js —
 * nothing is recomputed or duplicated here) and looks it up against the
 * bundled classical mapping dataset
 * (dataset/used/core/ishta_devata_mapping.json).
 *
 * If this chart's Atmakaraka planet is not yet present in the dataset,
 * this returns an explicit NOT_AVAILABLE result with a reason — it never
 * fabricates a deity to fill the field. As more verified entries are
 * added to the JSON file, this same code will pick them up automatically
 * with no code change required.
 */
import { readFileSync } from 'fs';
import { reportDatasetMiss } from './_datasetLoad.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DS_PATH = join(__dir, '../../dataset/used/core/ishta_devata_mapping.json');

let _byPlanet = null;
function loadDb() {
  if (_byPlanet) return _byPlanet;
  _byPlanet = {};
  try {
    const raw = JSON.parse(readFileSync(DS_PATH, 'utf8'));
    for (const m of raw.mappings || []) {
      _byPlanet[m.atmakarakaPlanet] = m;
    }
  } catch (e) {
    reportDatasetMiss('ishtaDevata', 'ishta_devata_mapping.json');
  }
  return _byPlanet;
}

/**
 * @param {object} R - the calculated chart object. Requires
 *   R.vargaSignifications.charaKarakas (Atmakaraka) and
 *   R.vargaSignifications.karakamshaLagna (Karakamsha sign) — both already
 *   real, dynamic, chart-specific values computed elsewhere in the engine.
 * @returns {object} either an AVAILABLE result with the looked-up deity, or
 *   a NOT_AVAILABLE result explaining exactly why (no data yet).
 */
export function buildIshtaDevata(R) {
  const atmakaraka = R?.vargaSignifications?.charaKarakas?.find(k => k.karakaShort === 'AK')?.planet;
  const karakamshaSign = R?.vargaSignifications?.karakamshaLagna?.karakamshaLagnaSign;

  if (!atmakaraka) {
    return {
      status: 'NOT_AVAILABLE',
      reason: "This chart's Atmakaraka could not be determined (Chara Karaka calculation did not return a result), so no Ishta Devata lookup can be attempted.",
    };
  }

  const db = loadDb();
  const entry = db[atmakaraka];

  if (!entry) {
    return {
      status: 'NOT_AVAILABLE',
      atmakaraka,
      karakamshaSign: karakamshaSign || null,
      reason: `This chart's own Atmakaraka is ${atmakaraka}, but no verified Atmakaraka\u2192Ishta-Devata entry for ${atmakaraka} exists yet in dataset/used/core/ishta_devata_mapping.json. Add a verified entry for ${atmakaraka} to that file to enable this for charts like this one \u2014 nothing is being guessed in its place.`,
    };
  }

  return {
    status: 'AVAILABLE',
    atmakaraka,
    karakamshaSign: karakamshaSign || null,
    deity: entry.deity,
    deitySanskrit: entry.deitySanskrit,
    reasoning: entry.reasoning,
    traditionalPractice: entry.traditionalPractice,
    confidence: entry.confidence,
    methodology: 'Atmakaraka-planet method (Jaimini)',
    source: entry.source,
  };
}

export default { buildIshtaDevata };
