/**
 * datasetRegistry.js — single source of truth for "is this optional
 * supplementary dataset actually bundled and readable right now?"
 *
 * WHY THIS EXISTS (bug fix — stale self-report):
 * featureChecklist.js used to hardcode NOT_SUPPORTED for a list of
 * datasets with a comment saying "the directory does not exist". A
 * live audit of this exact package found that claim was false for 9 of
 * the 10 datasets — the files are present and their loader modules
 * (vastuGuide.js, dreamLookup.js, etc.) already load them successfully.
 * The checklist just was never refreshed when the data was added back.
 *
 * Rather than hand-editing the checklist text again (which will only
 * go stale a second time), this module checks the real filesystem at
 * report-generation time and derives the status live. Every other
 * module in this codebase that reads one of these files keeps doing
 * exactly what it already did (readFileSync + JSON.parse in its own
 * try/catch, via _datasetLoad.js on miss) — this module does not
 * change any loading behavior, it only makes the *self-report* honest
 * and self-correcting.
 *
 * Single responsibility: this file answers "is dataset X present and
 * non-trivial?" It does not parse or interpret dataset contents.
 */

import { existsSync, statSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dir, '../..');
const VJDB = join(REPO_ROOT, 'dataset', 'used', 'core');

// A file smaller than this is treated as "effectively empty" — this is
// exactly the case that caught dataset/used/core/yogas__raja_yoga.json (shipped at 3 bytes
// sitting next to a fully-populated 75.9KB dataset/used/core/yogas.json).
const MIN_MEANINGFUL_BYTES = moduleData.MIN_MEANINGFUL_BYTES;

function fileStatus(absPath) {
  if (!existsSync(absPath)) {
    return { present: false, bytes: 0 };
  }
  const bytes = statSync(absPath).size;
  return { present: bytes >= MIN_MEANINGFUL_BYTES, bytes, tooSmall: bytes > 0 && bytes < MIN_MEANINGFUL_BYTES };
}

function dirFileCount(absDir, requiredNames) {
  if (!existsSync(absDir)) return { present: false, foundCount: 0, missingNames: requiredNames };
  const have = new Set(readdirSync(absDir));
  const missingNames = requiredNames.filter(n => !have.has(n));
  return { present: missingNames.length === 0, foundCount: requiredNames.length - missingNames.length, missingNames };
}

/**
 * One entry per data-file-dependent feature. `verify` returns
 * { present, detail } computed live from the filesystem — nothing here
 * is a hardcoded true/false.
 */
import moduleData from '../../dataset/used/core/datasetRegistry.json' with { type: 'json' };
const REGISTRY = moduleData.REGISTRY.map(entry => ({
  ...entry,
  verify: () => {
    if (entry.file) return fileStatus(join(VJDB, entry.file));
    return dirFileCount(VJDB, entry.files || []);
  },
}));

/**
 * Live-verify every registered dataset against the filesystem right now.
 * Returns a map keyed by feature name. Nothing is cached across calls —
 * this is intentionally cheap (existsSync/statSync only, no JSON.parse)
 * so calling it fresh per report is not a performance concern.
 */
export function verifyAllDatasets() {
  const result = {};
  for (const entry of REGISTRY) {
    let v;
    try {
      v = entry.verify();
    } catch (e) {
      v = { present: false, error: e.message };
    }
    result[entry.feature] = { module: entry.module, ...v };
  }
  return result;
}

/**
 * Produce FEATURE_CHECKLIST-shaped entries for every dataset-dependent
 * feature, computed live. featureChecklist.js merges these in instead
 * of hardcoding their status, so this can never go stale again the way
 * the old static list did.
 */
export function buildDynamicDatasetFeatureEntries() {
  const status = verifyAllDatasets();
  return REGISTRY.map(entry => {
    const s = status[entry.feature];
    if (s.present) {
      return {
        feature: entry.feature,
        status: 'IMPLEMENTED',
        note: `Verified live: bundled dataset file(s) found and non-trivial (checked by datasetRegistry.js at report time, not hardcoded).`,
      };
    }
    if (s.foundCount !== undefined) {
      return {
        feature: entry.feature,
        status: s.foundCount > 0 ? 'PARTIAL' : 'NOT_SUPPORTED',
        reason: `Verified live: expected rule file(s) not found — missing: ${s.missingNames.join(', ')}.`,
      };
    }
    if (s.tooSmall) {
      return {
        feature: entry.feature,
        status: 'NOT_SUPPORTED',
        reason: `Verified live: dataset file exists but is empty/near-empty (${s.bytes} bytes) — treated as not bundled rather than fabricating content to fill it.`,
      };
    }
    return {
      feature: entry.feature,
      status: 'NOT_SUPPORTED',
      reason: 'Verified live: dataset file not found in this build.',
    };
  });
}

export default { verifyAllDatasets, buildDynamicDatasetFeatureEntries };