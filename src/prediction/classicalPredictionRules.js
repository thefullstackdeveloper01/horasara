/**
 * CLASSICAL PREDICTION RULES — Career / Finance / Health / Marriage
 * ====================================================================
 * The engine already has its own independent Career/Wealth/Marriage/
 * Health scoring logic elsewhere (src/prediction/*.js,
 * src/extensions/new_sections.js) — that logic is untouched here.
 *
 * This module is a SEPARATE, explicitly classical cross-reference: it
 * takes this chart's own already-calculated placements (which planet
 * rules/occupies the 10th, 2nd, 11th, 7th houses; the Lagna sign; the
 * current Dasha/Antardasha) and looks up the matching rule in the
 * bundled real BPHS-sourced rule databases
 * (dataset/09_predictions_and_forecasts/
 *   career_prediction_rules.json, finance_prediction_rules.json,
 *   health_prediction_rules.json, marriage_prediction_rules.json),
 * citing the exact classical source (e.g. "BPHS Ch.41") for every line.
 *
 * Nothing here is invented: every mapping (planet→career field,
 * planet-in-house→wealth type, sign→body part, marriage-timing
 * supporting factor) is read directly from the bundled dataset and
 * only ever applied to a value this chart's own engine already computed.
 */
import { readFileSync } from 'fs';
import { reportDatasetMiss } from './_datasetLoad.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DS_DIR = join(__dir, '../../dataset/used/core');

const _cache = {};
function load(name) {
  if (_cache[name]) return _cache[name];
  try {
    _cache[name] = JSON.parse(readFileSync(join(DS_DIR, name + '.json'), 'utf8'));
  } catch (e) {
    reportDatasetMiss('classicalPredictionRules', name);
    _cache[name] = [];
  }
  return _cache[name];
}

function houseOf(R, num) {
  // R.houses is keyed '0'..'11' where houses[i].number === i+1
  return R.houses?.[String(num - 1)] || Object.values(R.houses || {}).find(h => h.number === num);
}

function planetOf(R, name) {
  return (R.planets || []).find(p => p.name === name);
}

// ── CAREER ───────────────────────────────────────────────────────────────
export function buildCareerClassicalPrediction(R) {
  const rules = load('career_prediction_rules');
  const primary = rules.find(r => r.category === 'Career Identification') || rules[0];
  if (!primary) return null;

  const h10 = houseOf(R, 10);
  const lordPlanet = planetOf(R, h10?.lord);
  const fields = primary.planet_career_mapping?.[h10?.lord] || [];
  const lordShadbala = R.shadbala?.[h10?.lord];
  const isStrong = lordShadbala ? lordShadbala.ratio >= 1 : null;

  return {
    tenthHouse: { sign: h10?.sign, lord: h10?.lord, lordPlacedInHouse: lordPlanet?.house, lordDignity: lordPlanet?.dignity },
    suggestedFields: fields,
    strengthAssessment: isStrong === null ? 'Shadbala data unavailable for this lord' :
      isStrong ? `${h10?.lord} (10th lord) meets its classical minimum strength (Shadbala ratio ${lordShadbala.ratio.toFixed(2)}x) — career field indications are classically well-supported.`
               : `${h10?.lord} (10th lord) falls below its classical minimum strength (Shadbala ratio ${lordShadbala.ratio.toFixed(2)}x) — career gains classically require more sustained effort or timing support from a strong Dasha lord.`,
    classicalRule: primary.rule,
    source: primary.source,
  };
}

// ── FINANCE ──────────────────────────────────────────────────────────────
export function buildFinanceClassicalPrediction(R) {
  const rules = load('finance_prediction_rules');
  const primary = rules.find(r => r.category === 'Wealth Assessment') || rules[0];
  if (!primary) return null;

  const h2 = houseOf(R, 2);
  const h11 = houseOf(R, 11);
  const lord2 = planetOf(R, h2?.lord);
  const lord11 = planetOf(R, h11?.lord);
  const sb2 = R.shadbala?.[h2?.lord];
  const sb11 = R.shadbala?.[h11?.lord];

  // planetOf(R, name)?.house tells us which house that lord sits in; the
  // mapping keys are like "Jupiter_in_2nd" — build the same key for
  // whichever planet(s) actually occupy the 2nd house in THIS chart.
  const planetsIn2nd = h2?.planets || [];
  const matchedInsights = planetsIn2nd
    .map(pl => primary.planet_mapping?.[`${pl}_in_2nd`])
    .filter(Boolean);

  return {
    secondHouse: { sign: h2?.sign, lord: h2?.lord, lordHouse: lord2?.house, planetsPresent: planetsIn2nd },
    eleventhHouse: { sign: h11?.sign, lord: h11?.lord, lordHouse: lord11?.house },
    bothLordsStrength: {
      lord2Ratio: sb2 ? Number(sb2.ratio.toFixed(2)) : null,
      lord11Ratio: sb11 ? Number(sb11.ratio.toFixed(2)) : null,
      verdict: (sb2?.ratio >= 1 && sb11?.ratio >= 1)
        ? 'Both 2nd and 11th lords meet classical minimum strength — classically indicates a prosperous wealth profile.'
        : 'One or both wealth-house lords fall below classical minimum strength — classical texts indicate wealth arrives with more effort, delay, or dependence on supporting Dasha periods.',
    },
    specificInsights: matchedInsights.length ? matchedInsights : ['No planet from the bundled rule-mapping list occupies the 2nd house in this specific chart.'],
    classicalRule: primary.rule,
    source: primary.source,
  };
}

// ── HEALTH ───────────────────────────────────────────────────────────────
export function buildHealthClassicalPrediction(R) {
  const rules = load('health_prediction_rules');
  const primary = rules.find(r => r.category === 'General Health') || rules[0];
  if (!primary) return null;

  const lagnaSign = R.lagna?.sign;
  const bodyArea = primary.body_mapping?.[lagnaSign];
  const lagnaLordName = R.lagna?.lord || houseOf(R, 1)?.lord;
  const lagnaLordPlanet = planetOf(R, lagnaLordName);
  const sbLagnaLord = R.shadbala?.[lagnaLordName];

  return {
    lagna: { sign: lagnaSign, associatedBodyArea: bodyArea },
    lagnaLord: { name: lagnaLordName, house: lagnaLordPlanet?.house, dignity: lagnaLordPlanet?.dignity },
    constitutionAssessment: sbLagnaLord
      ? (sbLagnaLord.ratio >= 1
        ? `Lagna lord (${lagnaLordName}) meets its classical minimum strength — classically indicates a resilient constitution.`
        : `Lagna lord (${lagnaLordName}) falls below its classical minimum strength (ratio ${sbLagnaLord.ratio.toFixed(2)}x) — classically indicates a constitution more susceptible to illness; general preventive care is emphasized in the classical texts for this configuration.`)
      : 'Shadbala data unavailable for the Lagna lord.',
    // Cross-reference with this chart's OWN weak planets (already computed
    // via real Shadbala, same list used in the Graha Shanti section) —
    // not a separate guess.
    weakPlanetHealthNotes: (R.grahaShanti || []).map(g => ({ planet: g.planet, note: g.remedy?.healthEffectsIfWeak })).filter(n => n.note),
    classicalRule: primary.rule,
    source: primary.source,
  };
}

// ── MARRIAGE TIMING ──────────────────────────────────────────────────────
export function buildMarriageClassicalPrediction(R) {
  const rules = load('marriage_prediction_rules');
  const primary = rules.find(r => r.category === 'Marriage Timing — Primary') || rules[0];
  if (!primary) return null;

  const h7 = houseOf(R, 7);
  const lord7 = planetOf(R, h7?.lord);
  const currentMaha = R.dasha?.current?.mahadasha;
  const currentAntar = R.dasha?.current?.antardasha;

  const in7thLordMahadasha = currentMaha === h7?.lord;
  const in7thLordAntardasha = currentAntar === h7?.lord;
  const inVenusDasha = currentMaha === 'Venus' || currentAntar === 'Venus';

  const activeFactors = [];
  if (in7thLordMahadasha) activeFactors.push(`Currently running ${h7?.lord}'s own Mahadasha (7th lord) — a classically primary marriage-timing window`);
  if (in7thLordAntardasha) activeFactors.push(`Currently running ${h7?.lord}'s Antardasha (7th lord) — a classically primary marriage-timing window`);
  if (inVenusDasha) activeFactors.push('Currently running a Venus Dasha/Antardasha — one of the classical supporting factors for marriage timing');

  return {
    seventhHouse: { sign: h7?.sign, lord: h7?.lord, lordHouse: lord7?.house },
    currentDasha: { mahadasha: currentMaha, antardasha: currentAntar },
    activeClassicalFactors: activeFactors.length ? activeFactors : ['None of the primary classical marriage-timing Dasha windows are currently active for this chart.'],
    supportingFactorsChecklist: primary.supporting_factors || [],
    classicalRule: primary.rule,
    source: primary.source,
  };
}

export default {
  buildCareerClassicalPrediction,
  buildFinanceClassicalPrediction,
  buildHealthClassicalPrediction,
  buildMarriageClassicalPrediction,
};
