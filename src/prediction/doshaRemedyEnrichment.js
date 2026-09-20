/**
 * DOSHA CLASSICAL REMEDY ENRICHMENT
 * ===================================
 * The engine's own dosha-detection logic (src/dosha/doshas.js) decides
 * WHETHER a dosha is present — untouched here. This module adds the real,
 * detailed classical remedies (specific mantras, deities, donation items,
 * ritual names and locations) from the bundled classical doshas database
 * (dataset/used/core/doshas_detailed_database.json)
 * alongside whichever doshas the engine already detected, replacing only
 * the previous generic 2-3-word remedy list with the real classical detail
 * where this database covers that dosha (currently: Manglik/Kuja, Kaal
 * Sarp, Pitru). Doshas outside its coverage keep exactly what the engine
 * already computed — nothing is invented to fill a gap.
 */
import { readFileSync } from 'fs';
import { reportDatasetMiss } from './_datasetLoad.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DS_PATH = join(__dir, '../../dataset/used/core/doshas_detailed_database.json');

let _db = null;
function loadDb() {
  if (_db) return _db;
  try {
    const raw = JSON.parse(readFileSync(DS_PATH, 'utf8'));
    _db = raw.doshas_database;
  } catch (e) {
    reportDatasetMiss('doshaRemedyEnrichment', 'doshas_detailed_database');
    _db = {};
  }
  return _db;
}

// Flatten one dosha's varied remedy-category shape (spiritual_remedies,
// gemstone_remedies, donation_remedies, etc — each an array of small
// objects with different keys) into a single ordered list of short,
// human-readable remedy lines, keeping the real classical specifics
// (mantra text, deity, ritual name, donation item + day) rather than
// collapsing them into a generic phrase.
function flattenRemedies(remediesObj) {
  if (!remediesObj || typeof remediesObj !== 'object') return [];
  const lines = [];
  for (const [category, entries] of Object.entries(remediesObj)) {
    if (!Array.isArray(entries)) continue;
    for (const e of entries) {
      const parts = [];
      const title = e.remedy || e.practice || e.activity || e.gemstone || e.item || e.deity || category.replace(/_/g, ' ');
      parts.push(title);
      if (e.mantra) parts.push(`mantra: ${e.mantra}`);
      if (e.count) parts.push(`${e.count}`);
      if (e.duration) parts.push(`for ${e.duration}`);
      if (e.frequency) parts.push(`(${e.frequency})`);
      if (e.day || e.day_to_wear) parts.push(`on ${e.day || e.day_to_wear}`);
      if (e.location) parts.push(`at ${e.location}`);
      if (e.procedure) parts.push(`— ${e.procedure}`);
      if (e.benefit || e.benefits) parts.push(`(benefit: ${e.benefit || e.benefits})`);
      lines.push(parts.join(' '));
    }
  }
  return lines;
}

/**
 * @param {'manglik'|'kaalsarp'|'pitru'} kind
 * @returns {{name, alsoKnownAs, description, remedies: string[], source}|null}
 */
export function lookupDoshaClassicalRemedy(kind) {
  const db = loadDb();
  const key = kind === 'manglik' ? 'manglik_dosha' : kind === 'kaalsarp' ? 'kaal_sarp_dosha' : kind === 'pitru' ? 'pitru_dosha' : null;
  if (!key || !db[key]) return null;
  const d = db[key];
  return {
    name: d.dosha_name,
    alsoKnownAs: d.also_known_as || [],
    description: d.description,
    remedies: flattenRemedies(d.remedies),
    source: 'Classical Dosha reference database (bundled doshas_detailed_database.json)',
  };
}

/**
 * Enrich the engine's already-computed doshas object ({mangal, kalsarpa,
 * pitru, ...}) with real classical remedy detail where the dosha is
 * present. Never mutates the input; returns a new object. Doshas without
 * database coverage (Grahan, Nadi) or not present in this chart pass
 * through unchanged.
 */
export function enrichDoshasWithClassicalRemedies(doshas) {
  if (!doshas || typeof doshas !== 'object') return doshas;
  const out = { ...doshas };

  if (out.mangal?.hasDosha) {
    const detail = lookupDoshaClassicalRemedy('manglik');
    if (detail) out.mangal = { ...out.mangal, classicalRemedy: detail };
  }
  if (out.kalsarpa?.hasDosha) {
    const detail = lookupDoshaClassicalRemedy('kaalsarp');
    if (detail) out.kalsarpa = { ...out.kalsarpa, classicalRemedy: detail };
  }
  if (out.pitru?.hasDosha) {
    const detail = lookupDoshaClassicalRemedy('pitru');
    if (detail) out.pitru = { ...out.pitru, classicalRemedy: detail };
  }
  return out;
}

export default { lookupDoshaClassicalRemedy, enrichDoshasWithClassicalRemedies };
