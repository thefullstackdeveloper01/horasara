/**
 * YOGA CLASSICAL ENRICHMENT
 * ==========================
 * The engine's own yoga-detection logic (src/yoga/yogas.js) decides WHICH
 * yogas are present in a chart — that logic is untouched here. This module
 * only adds real classical detail (effects, strength factors, cancellation
 * conditions) to whichever yogas were already detected, by matching each
 * detected yoga's name against the bundled classical yoga database
 * (dataset/used/core/yogas_detailed_database.json —
 * 47 yogas with real BPHS/Phaladeepika/Saravali-descended rules).
 *
 * Matching is name-based and conservative: only yogas whose name resolves
 * to a real classical database entry get enriched. Any yoga this database
 * doesn't cover is left exactly as the engine already described it — no
 * text is invented to fill a gap.
 */
import { readFileSync } from 'fs';
import { reportDatasetMiss } from './_datasetLoad.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DS_PATH = join(__dir, '../../dataset/used/core/yogas_detailed_database.json');

let _db = null;
function loadDb() {
  if (_db) return _db;
  try {
    const raw = JSON.parse(readFileSync(DS_PATH, 'utf8'));
    _db = raw.yogas_database;
  } catch (e) {
    reportDatasetMiss('yogaEnrichment', 'yogas_detailed_database');
    _db = { shubh_yogas: {}, ashubh_yogas: {}, mixed_yogas: {} };
  }
  return _db;
}


function classifyYogaStatus(y, detail) {
  const raw = String(y?.name || '').toLowerCase();
  if (raw.includes('cancelled') || raw.includes('cancelled')) return 'CANCELLED';
  if (detail?.rules?.cancellation && /cancel/i.test(JSON.stringify(detail.rules.cancellation))) return 'CONDITIONAL';
  if (detail?.rules?.condition) return 'CONFIRMED';
  return y?.classicalDetail ? 'CLASSICAL_MATCH' : 'ENGINE_DETECTED';
}

function normalizeName(s) {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/mahapurusha/g, '')
    .replace(/yoga/g, '')
    .replace(/-/g, ' ')
    .replace(/[^a-z]/g, '');
}

// Known classical spelling variants between the engine's own yoga names
// and this database's naming — every entry here is the SAME yoga under a
// different transliteration, not a different yoga.
import moduleData from '../../dataset/used/core/yogaEnrichment.json' with { type: 'json' };
const ALIASES = moduleData.ALIASES;

let _byNormName = null;
function buildIndex() {
  if (_byNormName) return _byNormName;
  const db = loadDb();
  _byNormName = {};
  for (const cat of ['shubh_yogas', 'ashubh_yogas', 'mixed_yogas']) {
    for (const entry of Object.values(db[cat] || {})) {
      _byNormName[normalizeName(entry.name)] = { ...entry, category: cat };
    }
  }
  return _byNormName;
}

/**
 * Look up classical detail for one yoga name (as produced by the engine's
 * own detectYogas()). Returns null if this database doesn't cover it —
 * callers should keep the engine's own description in that case.
 */
export function lookupYogaClassicalDetail(engineYogaName) {
  const index = buildIndex();
  let key = normalizeName(engineYogaName);
  if (ALIASES[key]) key = ALIASES[key];
  return index[key] || null;
}

/**
 * Enrich an array of engine-detected yogas (each {name, type, strength,
 * desc, planets}) with classical detail where a match exists. Never
 * mutates the input; returns a new array. Yogas without a database match
 * pass through unchanged (still fully valid — just not augmented).
 */
export function enrichYogasWithClassicalDetail(yogas) {
  if (!Array.isArray(yogas)) return yogas;
  return yogas.map(y => {
    const detail = lookupYogaClassicalDetail(y.name);
    if (!detail) return { ...y, classicalDetail: null, classification: 'ENGINE_DETECTED', classificationBasis: 'engine detection only' };
    return {
      ...y,
      classicalDetail: {
        classicalName: detail.name,
        category: detail.category === 'shubh_yogas' ? 'Auspicious (Shubh)' : detail.category === 'ashubh_yogas' ? 'Inauspicious (Ashubh)' : 'Mixed',
        condition: detail.rules?.condition || null,
        strengthFactors: detail.rules?.strength_factors || null,
        effects: detail.rules?.effects || null,
        cancellation: detail.rules?.cancellation || null,
        source: 'Classical Yoga reference database (BPHS/Phaladeepika/Saravali-descended rules)',
      },
      classification: classifyYogaStatus(y, detail),
      classificationBasis: detail ? 'classical database match + engine detection' : 'engine detection only',
    };
  });
}

export default { lookupYogaClassicalDetail, enrichYogasWithClassicalDetail };
