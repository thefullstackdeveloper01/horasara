/**
 * DIVISIONAL CHART (VARGA) CLASSICAL SIGNIFICATIONS
 * ====================================================
 * The engine computes the sixteen standard Shodashavarga charts. This module
 * now wires the complete divisional catalog (D1,D2,D3,D4,D7,D9,D10,D12,
 * D16,D20,D24,D27,D30,D40,D45,D60) into the result, while retaining the
 * deeper rule datasets for D9/D10/Jaimini. Catalog text is reference guidance,
 * not fabricated outcome claims.
 *   dataset/05_divisional_charts_varga/
 *     d9_navamsa_rules.json, d10_dashamsa_rules.json, karakamsha_rules.json
 *
 * Every interpretation below is looked up by a sign/planet this chart's
 * own engine already calculated — nothing is invented.
 */
import { readFileSync } from 'fs';
import { reportDatasetMiss } from './_datasetLoad.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { calcCharaKarakas } from '../dasha/chara.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const DS_DIR = join(__dir, '../../dataset/used/core');

const _cache = {};
function load(name) {
  // BUG FIX: caching `null` on failure is falsy, so `if (_cache[name])`
  // never short-circuits for a missing/invalid file — every call re-reads
  // the file from disk and re-emits the warning (same bug class fixed in
  // bphsEngine.js's load()). Use hasOwnProperty so a genuine null result
  // is still cached and only warned once.
  if (Object.prototype.hasOwnProperty.call(_cache, name)) return _cache[name];
  try {
    _cache[name] = JSON.parse(readFileSync(join(DS_DIR, name + '.json'), 'utf8'));
  } catch (e) {
    reportDatasetMiss('vargaSignifications', name);
    _cache[name] = null;
  }
  return _cache[name];
}

/**
 * @param {object} R - the calculated chart object (needs R.vargas, R.planets)
 * @returns {object} { charaKarakas, navamsaSpouse, dashamsaCareer, karakamshaLagna }
 */
export function buildVargaSignifications(R) {
  const out = {};

  // Full Varga interpretation coverage: the bundled divisional_charts.json
  // contains classical purpose/how-to-read metadata for D1 through D60.
  // Expose all of it so calculated D2/D3/.../D60 charts are not reported as
  // 'raw only' merely because only D9/D10 had specialized narrative rules.
  const catalog = load('divisional_charts');
  if (Array.isArray(catalog)) {
    out.catalog = catalog.map(v => ({
      chart: v.chart, name: v.name, division: v.division, purpose: v.purpose,
      primaryDomains: v.primary_domains || [], secondaryDomains: v.secondary_domains || [],
      traditionalText: v.traditional_text || 'Classical divisional-chart reference',
      howToRead: v.how_to_read || null, importance: v.importance || 'Reference',
      signCalculation: v.sign_calculation || null, planetsUsed: v.planets_used || null,
      keyAscendant: v.key_ascendant || null,
      interpretationStatus: 'CLASSICAL_REFERENCE_WIRED',
      calculated: !!R.vargas?.[v.chart],
      position: R.vargas?.[v.chart] || null,
      source: 'dataset/used/core/divisional_charts.json',
    }));
  }

  // Canonical coverage gate: all 16 standard Vargas must have a catalog entry
  // and a calculated placement before the platform can call Shodashavarga
  // interpretation complete.
  const standard = ['D1','D2','D3','D4','D7','D9','D10','D12','D16','D20','D24','D27','D30','D40','D45','D60'];
  const catalogByChart = Object.fromEntries((out.catalog || []).map(x => [x.chart, x]));
  out.coverage = {
    standardVargas: standard,
    catalogComplete: standard.every(k => !!catalogByChart[k]),
    calculationComplete: standard.every(k => !!R.vargas?.[k]),
    interpretationComplete: standard.every(k => !!catalogByChart[k]?.howToRead),
    status: standard.every(k => !!catalogByChart[k] && !!R.vargas?.[k] && !!catalogByChart[k]?.howToRead) ? 'AVAILABLE' : 'PARTIAL',
  };

  // ── CHARA KARAKAS (already implemented in src/dasha/chara.js, just never
  // wired into the engine's output before now) ─────────────────────────
  try {
    out.charaKarakas = calcCharaKarakas(R.planets).map(k => ({
      ...k,
      source: 'Jaimini Chara Karaka system (7-planet ranking by degree-in-sign)',
    }));
  } catch (e) {
    out.charaKarakas = null;
  }

  const atmakaraka = out.charaKarakas?.find(k => k.karakaShort === 'AK')?.planet;

  // ── D9 NAVAMSA — SPOUSE NATURE (via this chart's own D9 Lagna sign) ──
  const d9db = load('d9_navamsa_rules');
  const d9LagnaSign = R.vargas?.ascendant?.D9?.sign;
  if (d9db && d9LagnaSign) {
    const key = `${d9LagnaSign}_D9`;
    out.navamsaSpouse = {
      d9LagnaSign,
      spouseNatureText: d9db.sign_interpretations?.[key] || null,
      classicalRules: (d9db.rules || []).map(r => ({ name: r.name, interpretation: r.interpretation })),
      overview: d9db.overview,
      source: d9db.source,
    };
  }

  // ── D10 DASHAMSA — CAREER (via this chart's own D10 Lagna sign & lord) ──
  const d10db = load('d10_dashamsa_rules');
  const d10Lagna = R.vargas?.ascendant?.D10;
  if (d10db && d10Lagna) {
    out.dashamsaCareer = {
      d10LagnaSign: d10Lagna.sign,
      d10LagnaLord: d10Lagna.lord,
      careerFieldsForLord: d10db.career_by_planet?.[d10Lagna.lord] || [],
      careerTypesForSign: d10db.sign_career_types?.[d10Lagna.sign] || null,
      classicalRules: (d10db.rules || []).map(r => ({ name: r.name, interpretation: r.interpretation })),
      overview: d10db.overview,
      source: d10db.source,
    };
  }

  // ── KARAKAMSHA LAGNA — sign occupied by this chart's own Atmakaraka in D9 ──
  const kkdb = load('karakamsha_rules');
  if (kkdb && atmakaraka) {
    const akD9Sign = R.vargas?.[atmakaraka]?.D9?.sign;
    const definitionRule = kkdb.find(r => r.concept === 'Karakamsha Lagna');
    out.karakamshaLagna = {
      atmakaraka,
      karakamshaLagnaSign: akD9Sign,
      definition: definitionRule?.definition,
      purpose: definitionRule?.purpose,
      usage: definitionRule?.usage || [],
      source: definitionRule?.source || 'Jaimini Sutras',
    };
  }

  return out;
}

export default { buildVargaSignifications };
