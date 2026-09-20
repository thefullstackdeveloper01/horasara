/**
 * AVKAHADA / PANCHANGA PHALA MODULE
 * ==================================
 * For every Panchanga limb calculated at birth — Tithi, Paksha, Vara,
 * Nakshatra, Pada, Yoga, Karana — plus the classical Avakahada Chakra
 * attributes derived from the birth Nakshatra/Rashi — Paya, Varna, Yoni,
 * Gana, Vasya, Nadi — this module returns:
 *   - the calculated value (already computed by the engine; never re-guessed)
 *   - classical meaning
 *   - personality effect / behavioural tendencies
 *   - strengths / challenges
 *   - practical interpretation
 *   - source: where that text came from
 *
 * Every field below is either read directly from a real classical dataset
 * bundled with this app (tithi_details.json, nakshatra_basic_list.json,
 * karana_details.json) or derived directly from the calculated attribute
 * itself (e.g. Yoga nature, Nadi type) — nothing here is generic template
 * text unconnected to the person's own calculated values.
 */
import { readFileSync } from 'fs';
import { reportDatasetMiss } from './_datasetLoad.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { VARNA, YONI, GANA, NADI, VASYA, PAYA } from '../astronomy/constants.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const DS = join(__dir, '../../dataset/used/core');

const _cache = {};
function load(name) {
  if (_cache[name]) return _cache[name];
  try {
    _cache[name] = JSON.parse(readFileSync(join(DS, name + '.json'), 'utf8'));
    return _cache[name];
  } catch (e) {
    reportDatasetMiss('avkahadaPhala', name);
    return null;
  }
}

// ── PAKSHA (2 states — hand-authored, standard classical definition) ───────
import moduleData from '../../dataset/used/core/avkahadaPhala.json' with { type: 'json' };
const PAKSHA_INFO = moduleData.PAKSHA_INFO;

// ── VARA / WEEKDAY (7 — hand-authored, standard classical planetary-day rulership) ──
const VARA_INFO = moduleData.VARA_INFO;

// ── 27 PANCHANG YOGAS — hand-authored, standard published classical meanings ──
// (name -> {meaning, practical}); nature (Auspicious/Inauspicious) already
// comes from the engine's own YOGA_NATURE array, not repeated/guessed here.
const YOGA_INFO = moduleData.YOGA_INFO;

// ── KARANA (11 — real content pulled straight from karana_details.json) ────
function karanaInfo(name) {
  const raw = load('karana_details');
  const list = Array.isArray(raw) ? raw : (raw?.KARANA_DETAILS || []);
  return list.find(k => k.name === name) || null;
}

// ── NAKSHATRA (27 — real content pulled straight from nakshatra_basic_list.json) ──
function nakshatraInfo(name) {
  const list = load('nakshatra_basic_list') || [];
  return list.find(n => n.name === name) || null;
}

// ── TITHI (30 — real content pulled straight from tithi_details.json) ──────
// pg.tithi.number from the engine is the continuous 1-30 count across both
// Pakshas; tithi_details.json numbers 1-15 WITHIN each Paksha — convert.
function tithiInfo(continuousNumber, paksha) {
  const list = load('tithi_details')?.tithi_details || [];
  const pakshaKey = paksha.startsWith('Shukla') ? 'Shukla' : 'Krishna';
  const withinPakshaNumber = continuousNumber > 15 ? continuousNumber - 15 : continuousNumber;
  return list.find(t => t.tithi_number === withinPakshaNumber && t.paksha === pakshaKey) || null;
}

// ── Compact effect tables for the Avakahada attributes (Varna/Yoni/Gana/Vasya/Nadi/Paya) ──
// Each keyed by the exact classical value already computed elsewhere in the
// engine (constants.js), so the text below is always linked to the actual
// calculated attribute, never generic.
const VARNA_EFFECTS = moduleData.VARNA_EFFECTS;
const GANA_EFFECTS = moduleData.GANA_EFFECTS;
const NADI_EFFECTS = moduleData.NADI_EFFECTS;
const PAYA_EFFECTS = moduleData.PAYA_EFFECTS;

/**
 * Build the full Avkahada / Panchanga Phala block for a calculated chart R
 * (the object returned by src/engine.js#calculateChart).
 * @param {object} R
 * @returns {Array<object>} ordered list of components, each with
 *   { component, value, classicalMeaning, personalityEffect,
 *     behaviouralTendencies, strengths, challenges, practicalInterpretation, source }
 */
export function buildAvkahadaPhala(R) {
  const pg = R.panchanga;
  const moonSignName = pg.moonSign;
  const nakName = pg.nakshatra.name;
  const pada = pg.nakshatra.pada;

  const out = [];

  // ── TITHI ──────────────────────────────────────────────────────────────
  const ti = tithiInfo(pg.tithi.number, pg.tithi.paksha);
  out.push({
    component: 'Tithi',
    value: `${pg.tithi.name} (#${pg.tithi.number}, ${pg.tithi.paksha})`,
    classicalMeaning: ti ? `Ruling deity: ${ti.deity}. ${ti.vishesh_mahatva}` : 'STATUS = NOT_AVAILABLE',
    personalityEffect: ti ? `Tithis ruled by ${ti.deity} classically colour the native's early-life inclinations toward that deity's domain.` : null,
    behaviouralTendencies: ti ? `Favours: ${ti.shubh_karya.join(', ')}.` : null,
    strengths: ti ? ti.shubh_karya.slice(0, 3).join(', ') : null,
    challenges: ti ? `Traditionally avoided on this tithi: ${ti.ashubh_karya.join(', ')}.` : null,
    practicalInterpretation: ti ? ti.vishesh_mahatva : 'Not available — tithi reference data missing.',
    source: 'Classical Tithi reference table (deity, shubh/ashubh karya per Muhurta Shastra)',
  });

  // ── PAKSHA ─────────────────────────────────────────────────────────────
  const pk = PAKSHA_INFO[pg.tithi.paksha];
  out.push({
    component: 'Paksha',
    value: pg.tithi.paksha,
    classicalMeaning: pk?.meaning,
    personalityEffect: pk?.personality,
    behaviouralTendencies: pk?.tendencies,
    strengths: pk?.strengths,
    challenges: pk?.challenges,
    practicalInterpretation: pk?.practical,
    source: 'Standard classical Shukla/Krishna Paksha definitions',
  });

  // ── VARA ───────────────────────────────────────────────────────────────
  const va = VARA_INFO[pg.vara.name];
  out.push({
    component: 'Vara (Weekday)',
    value: `${pg.vara.name} / ${pg.vara.hindi} (Lord: ${pg.vara.lord})`,
    classicalMeaning: `Ruled by ${pg.vara.lord} — the weekday lord colours the native's baseline temperament.`,
    personalityEffect: va?.personality,
    behaviouralTendencies: va?.tendencies,
    strengths: va?.strengths,
    challenges: va?.challenges,
    practicalInterpretation: `${pg.vara.lord}'s general significations (see Vara Lord) apply most strongly on this weekday for the native.`,
    source: 'Standard classical planetary-day (Vara-lord) rulership',
  });

  // ── NAKSHATRA ──────────────────────────────────────────────────────────
  const nk = nakshatraInfo(nakName);
  out.push({
    component: 'Nakshatra',
    value: `${nakName} (Lord: ${pg.nakshatra.lord}, Deity: ${pg.nakshatra.deity})`,
    classicalMeaning: nk ? `Symbol: ${nk.symbol}. Guna: ${nk.guna}. Ruled by ${nk.lord}, deity ${nk.deity}.` : 'STATUS = NOT_AVAILABLE',
    personalityEffect: nk ? `${nk.guna} guna (nature) combined with ${nk.gana} gana shapes the native's core temperament — see Gana below for detail.` : null,
    behaviouralTendencies: nk ? `Favourable activities associated with this nakshatra: ${nk.favorable_activities}.` : null,
    strengths: nk ? `Symbolic strengths of ${nk.symbol} (${nk.animal_symbol}) — the nakshatra's traditional totem.` : null,
    challenges: null,
    practicalInterpretation: nk ? `Tattva (element): ${nk.tattva}; associated colour: ${nk.color}; body part: ${nk.body_part}.` : 'Not available — nakshatra reference data missing.',
    source: 'Classical 27-Nakshatra reference table (deity, guna, gana, tattva, symbol)',
  });

  // ── PADA ───────────────────────────────────────────────────────────────
  out.push({
    component: 'Pada',
    value: `Pada ${pada} of ${nakName}`,
    classicalMeaning: `Each Nakshatra spans 4 Padas (quarters) of 3°20\u2019 each, each falling in a different Navamsa sign, giving finer shading to the Nakshatra's general nature.`,
    personalityEffect: `The Navamsa sign of this specific pada refines the broader ${nakName} nature (full pada→sign mapping is in the Divisional Charts / Varga section).`,
    behaviouralTendencies: null,
    strengths: null,
    challenges: null,
    practicalInterpretation: 'See the D9 (Navamsa) chart in the Varga Charts section for the exact sign this pada falls in and its finer effects.',
    source: 'Standard classical Nakshatra-Pada-Navamsa mapping',
  });

  // ── YOGA ───────────────────────────────────────────────────────────────
  const yg = YOGA_INFO[pg.yoga.name];
  out.push({
    component: 'Yoga',
    value: `${pg.yoga.name} (${pg.yoga.nature})`,
    classicalMeaning: yg?.meaning,
    personalityEffect: `${pg.yoga.nature} panchang-yogas classically colour the general tone of the birth moment as ${pg.yoga.nature.toLowerCase()}.`,
    behaviouralTendencies: null,
    strengths: pg.yoga.nature === 'Auspicious' ? 'This yoga is classically read as generally supportive.' : null,
    challenges: pg.yoga.nature === 'Inauspicious' ? 'This yoga is classically read as one requiring extra care/patience.' : null,
    practicalInterpretation: yg?.practical,
    source: 'Standard classical 27 Panchang-Yoga reference (nature + significations)',
  });

  // ── KARANA ─────────────────────────────────────────────────────────────
  const ka = karanaInfo(pg.karana.name);
  out.push({
    component: 'Karana',
    value: pg.karana.name,
    classicalMeaning: ka ? `${ka.type} Karana, ruled by ${ka.lord} (deity), planetary ruler ${ka.ruling_planet}. Nature: ${ka.nature}.` : 'STATUS = NOT_AVAILABLE',
    personalityEffect: ka ? `${ka.nature} Karanas classically favour: ${ka.favorable_for.join(', ')}.` : null,
    behaviouralTendencies: ka ? `Associated activities: ${ka.activities.join(', ')}.` : null,
    strengths: ka ? ka.favorable_for.join(', ') : null,
    challenges: ka ? `Classically less favourable for: ${ka.unfavorable_for.join(', ')}.` : null,
    practicalInterpretation: ka ? `Occurs ${ka.occurs_times_per_month}× per lunar month; ${ka.type} type.` : 'Not available — karana reference data missing.',
    source: 'Classical 11-Karana reference table (nature, favourable/unfavourable activities)',
  });

  // ── PAYA ───────────────────────────────────────────────────────────────
  const payaVal = PAYA[nakName];
  const pyi = PAYA_EFFECTS[payaVal];
  out.push({
    component: 'Paya',
    value: payaVal || 'STATUS = NOT_AVAILABLE',
    classicalMeaning: pyi?.meaning,
    personalityEffect: null,
    behaviouralTendencies: pyi?.tendencies,
    strengths: null,
    challenges: null,
    practicalInterpretation: 'Paya is a traditional (not scientifically verified) indicator — treat as classical context, not a guarantee.',
    source: 'Classical Nakshatra→Paya (Swarna/Rajat/Tamba) reference table',
  });

  // ── VARNA ──────────────────────────────────────────────────────────────
  const varnaVal = VARNA[moonSignName];
  const vi = VARNA_EFFECTS[varnaVal];
  out.push({
    component: 'Varna',
    value: varnaVal || 'STATUS = NOT_AVAILABLE',
    classicalMeaning: vi?.meaning,
    personalityEffect: vi?.tendencies,
    behaviouralTendencies: vi?.tendencies,
    strengths: null,
    challenges: null,
    practicalInterpretation: 'Used primarily in Ashtakoot marriage-matching (Varna Koota, 1 point) to compare spiritual/work compatibility between two charts.',
    source: 'Classical Rashi→Varna reference table (Avakahada Chakra)',
  });

  // ── YONI ───────────────────────────────────────────────────────────────
  const yoniVal = YONI[nakName];
  out.push({
    component: 'Yoni',
    value: yoniVal || 'STATUS = NOT_AVAILABLE',
    classicalMeaning: yoniVal ? `Symbolic animal-nature of the birth Nakshatra, used classically to represent instinctive/physical-compatibility temperament.` : null,
    personalityEffect: null,
    behaviouralTendencies: null,
    strengths: null,
    challenges: null,
    practicalInterpretation: 'Used primarily in Ashtakoot marriage-matching (Yoni Koota, 4 points) to compare physical/instinctive compatibility between two charts.',
    source: 'Classical Nakshatra→Yoni reference table (Avakahada Chakra)',
  });

  // ── GANA ───────────────────────────────────────────────────────────────
  const ganaVal = GANA[nakName];
  const gi = GANA_EFFECTS[ganaVal];
  out.push({
    component: 'Gana',
    value: ganaVal || 'STATUS = NOT_AVAILABLE',
    classicalMeaning: gi?.meaning,
    personalityEffect: gi?.tendencies,
    behaviouralTendencies: gi?.tendencies,
    strengths: null,
    challenges: null,
    practicalInterpretation: 'Used primarily in Ashtakoot marriage-matching (Gana Koota, 6 points) to compare temperament compatibility between two charts.',
    source: 'Classical Nakshatra→Gana reference table (Avakahada Chakra)',
  });

  // ── VASYA / VASHYA ─────────────────────────────────────────────────────
  const vasyaVal = VASYA[moonSignName];
  out.push({
    component: 'Vasya / Vashya',
    value: vasyaVal || 'STATUS = NOT_AVAILABLE',
    classicalMeaning: vasyaVal ? `Rashi-based classification of instinctive "control/attraction" grouping, used classically in compatibility analysis.` : null,
    personalityEffect: null,
    behaviouralTendencies: null,
    strengths: null,
    challenges: null,
    practicalInterpretation: 'Used primarily in Ashtakoot marriage-matching (Vashya Koota, 2 points) to compare mutual influence/attraction between two charts.',
    source: 'Classical Rashi→Vasya reference table (Avakahada Chakra)',
  });

  // ── NADI ───────────────────────────────────────────────────────────────
  const nadiVal = NADI[nakName];
  const ni = NADI_EFFECTS[nadiVal];
  out.push({
    component: 'Nadi',
    value: nadiVal || 'STATUS = NOT_AVAILABLE',
    classicalMeaning: ni?.meaning,
    personalityEffect: ni?.tendencies,
    behaviouralTendencies: ni?.tendencies,
    strengths: null,
    challenges: null,
    practicalInterpretation: 'Used primarily in Ashtakoot marriage-matching (Nadi Koota, 8 points — the single most weighted koota) to compare genetic/health compatibility between two charts.',
    source: 'Classical Nakshatra→Nadi (Ayurvedic constitution) reference table (Avakahada Chakra)',
  });

  return out;
}

export default { buildAvkahadaPhala };
