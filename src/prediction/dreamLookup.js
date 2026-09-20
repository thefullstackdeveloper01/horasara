/**
 * DREAM SYMBOL REFERENCE (standalone lookup — NOT part of the automatic
 * Kundali Reading pipeline)
 * ============================================================================
 * IMPORTANT — why this is not wired into calculateChart():
 * Dream content cannot be derived from a birth date/time/place. Doing so
 * would mean inventing what someone dreamed, which this app's own "never
 * invent it" principle forbids. This module only provides an honest,
 * on-demand LOOKUP: given a dream symbol the person actually reports
 * (e.g. "snake", "flying", "water"), it returns the real classical
 * interpretation from the bundled dataset
 * (dataset/used/core/dream_meanings.json).
 * A caller (CLI flow, future feature) is responsible for actually asking
 * the person what they dreamed before calling this.
 */
import { readFileSync } from 'fs';
import { reportDatasetMiss } from './_datasetLoad.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DS_PATH = join(__dir, '../../dataset/used/core/dream_meanings.json');

let _bySymbol = null;
function loadDb() {
  if (_bySymbol) return _bySymbol;
  _bySymbol = {};
  try {
    const raw = JSON.parse(readFileSync(DS_PATH, 'utf8'));
    for (const d of raw.dreams || []) {
      _bySymbol[d.symbol.toLowerCase()] = d;
    }
  } catch (e) {
    reportDatasetMiss('dreamLookup', 'dream_meanings');
  }
  return _bySymbol;
}

/**
 * @param {string} symbol - what the person says they dreamed about (e.g. "snake")
 * @returns {object|null} the real classical dream interpretation, or null if
 *   this symbol isn't in the bundled 50-symbol database
 */
export function lookupDreamMeaning(symbol) {
  const db = loadDb();
  const entry = db[String(symbol || '').toLowerCase().trim()];
  if (!entry) return null;
  return {
    symbol: entry.symbol,
    hindiName: entry.hindi_name,
    meaning: entry.meaning,
    astrologicalInterpretation: entry.astrological_interpretation,
    positiveOutcome: entry.positive_outcome,
    negativeOutcome: entry.negative_outcome,
    remedy: entry.remedy,
    source: 'Classical Dream-Symbol reference database (bundled dream_meanings.json)',
  };
}

/** @returns {string[]} every symbol this database covers, for building a picker/menu */
export function listAvailableDreamSymbols() {
  return Object.keys(loadDb());
}

export default { lookupDreamMeaning, listAvailableDreamSymbols };
