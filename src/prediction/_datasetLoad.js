/**
 * _datasetLoad.js — shared "optional supplementary dataset is missing"
 * reporter.
 *
 * FIX (bug audit — noisy/leaky startup warnings): 14 separate modules
 * (classicalPredictionRules, vastuGuide, ghatakFavourable,
 * vargaSignifications, dreamLookup, bphsEngine, grahaShanti, jadiModule,
 * yogaEnrichment, avkahadaPhala, palmistryLookup, lagnaProfile,
 * doshaRemedyEnrichment, ishtaDevata) each independently wrap their
 * readFileSync/JSON.parse in try/catch and, on failure, ran
 * `console.warn(`[tag] Could not load X: ${e.message}`)`. Two real
 * problems with that, neither about the graceful-degradation logic
 * itself (which is correct and stays untouched):
 *
 *   1. `e.message` for an ENOENT includes the full absolute local
 *      filesystem path (e.g. "/home/user/.../dataset/
 *      database/09_predictions_and_forecasts/finance_prediction_rules.json"),
 *      which has no business being printed to an end user running a
 *      birth-chart report — it's an internal implementation detail, not
 *      something the report reader needs, and leaks local directory
 *      structure.
 *   2. All 14 datasets live under the same not-bundled
 *      `dataset/` supplementary directory (confirmed
 *      absent from this package — see the featureChecklist section,
 *      which already discloses this honestly for dream/palmistry), so a
 *      normal run prints 11+ near-identical raw stack-style lines before
 *      the report even starts, which reads like a crash even though
 *      nothing crashed.
 *
 * This module keeps the exact same fallback behavior (callers still get
 * null/[]/{} and degrade exactly as before) but reports the miss once,
 * concisely, without a leaked path, no matter how many of the 14
 * datasets are missing.
 */

const _reportedTags = new Set();
let _summaryPrinted = false;

/**
 * Call from a dataset loader's catch block instead of console.warn.
 * @param {string} tag - the module tag, e.g. 'classicalPredictionRules'
 * @param {string} datasetName - short dataset name, e.g. 'finance_prediction_rules'
 */
export function reportDatasetMiss(tag, datasetName) {
  const key = `${tag}:${datasetName}`;
  if (_reportedTags.has(key)) return; // already reported this exact miss
  _reportedTags.add(key);

  if (!_summaryPrinted) {
    _summaryPrinted = true;
    console.warn(
      '\n⚠  Some optional supplementary reference data (dataset/) ' +
      'is not bundled with this build — the affected sections fall back to this ' +
      "engine's own built-in rules instead of the extended cross-reference set. " +
      'Nothing crashes; results are simply less richly cross-referenced in those ' +
      'specific spots. Run with JYOTISH_DEBUG_DATASETS=1 for the full per-file list.\n'
    );
  }
  if (process.env.JYOTISH_DEBUG_DATASETS) {
    console.warn(`  [${tag}] missing dataset: ${datasetName}`);
  }
}
