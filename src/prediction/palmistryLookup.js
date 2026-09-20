/**
 * PALMISTRY FEATURE REFERENCE (standalone lookup — NOT part of the
 * automatic Kundali Reading pipeline)
 * ============================================================================
 * IMPORTANT — why this is not wired into calculateChart():
 * A person's actual palm lines, mounts, and finger shapes cannot be
 * derived from a birth date/time/place — there is no astronomical
 * relationship between the two. Auto-generating "your life line is long
 * and deep" from birth data alone would be pure invention, which this
 * app's own "never invent it" principle forbids. This module only
 * provides an honest, on-demand LOOKUP: given a palm feature the person
 * actually reports observing on their own hand (e.g. "life line: broken",
 * "mount of Jupiter: prominent"), it returns the real classical
 * interpretation from the bundled dataset
 * (dataset/used/core/palmistry_rules.json).
 * A caller (CLI flow, future feature) is responsible for actually asking
 * the person to describe their own hand before calling this.
 */
import { readFileSync } from 'fs';
import { reportDatasetMiss } from './_datasetLoad.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DS_PATH = join(__dir, '../../dataset/used/core/palmistry_rules.json');

let _db = null;
function loadDb() {
  if (_db) return _db;
  try {
    const raw = JSON.parse(readFileSync(DS_PATH, 'utf8'));
    _db = raw.palmistry_rules;
  } catch (e) {
    reportDatasetMiss('palmistryLookup', 'palmistry_rules');
    _db = {};
  }
  return _db;
}

/**
 * @param {'major_lines'|'minor_lines'|'mounts'|'fingers'|'hand_shapes'|'hand_types'} category
 * @param {string} featureName - e.g. "life_line", "mount_of_jupiter"
 * @param {string} [observedTrait] - e.g. "long_deep", "broken" (a key under interpretations)
 * @returns {object|null}
 */
export function lookupPalmistryFeature(category, featureName, observedTrait) {
  const db = loadDb();
  const group = db[category];
  const entry = group?.[featureName];
  if (!entry) return null;
  const result = {
    category,
    feature: featureName,
    location: entry.location,
    source: 'Classical Palmistry (Hast Rekha Shastra) reference database (bundled palmistry_rules.json)',
  };
  if (observedTrait && entry.interpretations?.[observedTrait]) {
    result.observedTrait = observedTrait;
    result.interpretation = entry.interpretations[observedTrait];
  } else {
    result.allPossibleTraits = entry.interpretations || null;
  }
  return result;
}

/** @returns {string[]} every top-level category this database covers */
export function listPalmistryCategories() {
  return Object.keys(loadDb());
}

/** @returns {string[]} every named feature within one category (e.g. all major lines) */
export function listFeaturesInCategory(category) {
  const db = loadDb();
  return Object.keys(db[category] || {});
}

export default { lookupPalmistryFeature, listPalmistryCategories, listFeaturesInCategory };
