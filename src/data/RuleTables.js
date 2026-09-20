/**
 * RuleTables — domain tables that ship in dataset/used/core but had no import
 * path into the engine before the database was wired up.
 *
 * Each table is read once, on first access, and frozen. Nothing is loaded at
 * module import time, so pulling in this module costs nothing until a table is
 * actually asked for.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bucketDir } from '../dataset/DatasetCatalog.js';

const CORE = bucketDir('core');

/** Logical name -> file in dataset/used/core. */
export const RULE_TABLES = Object.freeze({
  // classical BPHS tables
  ashtakavargaBphs: 'ashtakavarga_bphs.json',
  bhavaLordsBphs: 'bhava_lords_bphs.json',
  dashaBphs: 'dasha_bphs.json',
  houseEffectsBphs: 'house_effects_bphs.json',
  remediesBphs: 'remedies_bphs.json',
  // life-area prediction rules
  careerRules: 'career_prediction_rules.json',
  financeRules: 'finance_prediction_rules.json',
  healthRules: 'health_prediction_rules.json',
  marriageRules: 'marriage_prediction_rules.json',
  // divisional and jaimini
  navamsaRules: 'd9_navamsa_rules.json',
  dashamsaRules: 'd10_dashamsa_rules.json',
  karakamshaRules: 'karakamsha_rules.json',
  rajaYoga: 'raja_yoga.json',
  // panchanga and remedial reference
  nakshatraBasicList: 'nakshatra_basic_list.json',
  tithiDetails: 'tithi_details.json',
  karanaDetails: 'karana_details.json',
  gemstoneRecommendation: 'gemstones_recommendation.json',
  // manifests and schemas
  allJsonCatalog: 'all-json-catalog.json',
  booksIndex: 'books_index.json',
  completionManifest: 'completion-manifest-v7.json',
  outcomeSchema: 'outcome-schema.json',
});

const cache = new Map();

export function getRuleTable(name) {
  const file = RULE_TABLES[name];
  if (!file) throw new Error(`Unknown rule table: ${name}`);
  if (cache.has(name)) return cache.get(name);
  const value = Object.freeze(JSON.parse(readFileSync(join(CORE, file), 'utf8')));
  cache.set(name, value);
  return value;
}

export function listRuleTables() {
  return Object.entries(RULE_TABLES).map(([name, file]) => ({ name, file, path: `dataset/used/core/${file}` }));
}

export function loadAllRuleTables() {
  const out = {};
  for (const name of Object.keys(RULE_TABLES)) out[name] = getRuleTable(name);
  return Object.freeze(out);
}
