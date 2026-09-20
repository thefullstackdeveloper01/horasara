/**
 * BPHS PREDICTION ENGINE v1.0
 * ============================
 * Uses real Brihat Parasara Hora Shastra datasets for predictions.
 * Reads from: bphs_master.json, house_effects_bphs.json,
 *             bhava_lords_bphs.json, dasha_bphs.json, remedies_bphs.json
 *
 * All predictions are grounded in actual BPHS shlokas with:
 *  - Sanskrit text reference
 *  - English translation
 *  - Hindi translation
 *  - Chapter & shloka number for citation
 */

import { readFileSync } from 'fs';
import { reportDatasetMiss } from './_datasetLoad.js';
import { ordinalSuffix } from './lordshipQuality.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { searchScriptureLibrary, isScriptureLibraryAvailable } from '../reference/scriptureLibrary.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const DS = join(__dir, '../../dataset/used/core');
const VJDB_YOGA = join(__dir, '../../dataset/used/core');

// ── Cached loaders ──────────────────────────────────────────────────────────
const _cache = {};
function load(name) {
  // BUG FIX: the previous version only cached successful loads, so any
  // missing/invalid file (e.g. raja_yoga.json, which shipped as a 0-byte
  // file and therefore failed JSON.parse) re-read the file from disk and
  // re-emitted the same console.warn on EVERY call to the function that
  // uses it (once per report generated). We now cache the failure too
  // (as `null`), so the cost and the warning happen once per process.
  if (Object.prototype.hasOwnProperty.call(_cache, name)) return _cache[name];
  try {
    const path = name === 'raja_yoga' ? join(VJDB_YOGA, 'yogas__raja_yoga.json') : join(DS, name + '.json');
    _cache[name] = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    reportDatasetMiss('bphsEngine', name);
    _cache[name] = null;
  }
  return _cache[name];
}

// FIX (dead-code/duplication audit): the citation template
// `BPHS Ch${chapter}, Shloka ${shloka}` and the "does this item's text
// contain any of the lowercased search keywords" test were each
// independently re-typed, byte-for-byte identical, across all four
// getBPHS*() keyword-search functions below (Yoga, Raja Yoga, Remedies,
// Ashtakavarga). Extracted here so a future citation-format change only
// needs to happen once. Each function's own field-selection/mapping
// (which genuinely differs per dataset — e.g. Remedies includes
// chapter_title in its match text, Ashtakavarga's output omits gujarati)
// is left untouched, since collapsing those into one generic function
// would risk silently misattributing which field goes where in citations
// that are meant to point to real classical shlokas.
function bphsCitation(item) {
  return `BPHS Ch${item.chapter}, Shloka ${item.shloka}`;
}
function matchesAnyKeyword(text, kwLower) {
  return kwLower.length === 0 || kwLower.some(k => text.toLowerCase().includes(k));
}

// ── House Effects from BPHS (Ch 12-23) ──────────────────────────────────────
/**
 * Get BPHS shloka-based effects for a house
 * @param {number} houseNum - 1-12
 * @param {string[]} planetsInHouse - planet names
 * @returns {Object} { shlokas, summary }
 */
export function getBPHSHouseEffects(houseNum, planetsInHouse = []) {
  const data = load('house_effects_bphs');
  if (!data) return { shlokas: [], summary: '' };

  const houseData = data[String(houseNum)];
  if (!houseData) return { shlokas: [], summary: '' };

  const allShlokas = houseData.shlokas || [];

  // Filter relevant shlokas by keywords matching planets in house
  const relevant = allShlokas.filter(s => {
    if (!planetsInHouse.length) return true;
    const kwLower = (s.kw || []).join(' ').toLowerCase();
    return planetsInHouse.some(p => kwLower.includes(p.toLowerCase()));
  });

  const shlokas = (relevant.length > 0 ? relevant : allShlokas).slice(0, 3);

  return {
    house: houseNum,
    chapter: houseData.chapter,
    title: houseData.title,
    shlokas: shlokas.map(s => ({
      number: s.n,
      english: s.en,
      hindi: s.hi,
      gujarati: s.gu,
      keywords: s.kw,
      citation: `BPHS Ch${houseData.chapter}, Shloka ${s.n}`
    })),
    summary: shlokas[0]?.en || ''
  };
}

// ── Bhava Lord Effects (Ch 24 — 130 shlokas) ────────────────────────────────
/**
 * Get BPHS effects for a bhava lord in a specific house
 * @param {number} lordHouse - which house the lord is placed in
 * @param {string} lordPlanet - planet name
 * @returns {Object[]} matching shlokas
 */
// Get bhava lord effects — FIX (bug report audit, Section 17 repetition):
// this used to search by `${lordHouse}th lord` where lordHouse was the
// DESTINATION house the lord planet physically sits in (e.g. 1 for the
// ascendant) — never the ORIGIN bhava whose lordship is actually being
// described (e.g. 9 for a Spirituality query, 4 for a Property query).
// Since the underlying BPHS data has a full, genuine 12-destination-house
// matrix for each of the 11 origin lords (lagna lord, 2nd lord, ... 11th
// lord — confirmed: 130 real BPHS Ch.24 shlokas, keywords[0]=origin,
// keywords[1]=destination), a query that never specifies the origin bhava
// simply matched the wrong entry whenever the DESTINATION coincided
// (e.g. two unrelated areas both having their house-lord parked in the
// ascendant), returning byte-identical text under "SPIRITUALITY" and
// "PROPERTY" for completely different houses (9th vs 4th) — verified
// directly in a real report during this audit. Fixed by requiring BOTH
// the origin bhava number and the destination house to match, using the
// data's own exact keyword scheme rather than loose substring search.
export function getBPHSBhavaLordEffects(originHouse, destHouse, lordPlanet) {
  const data = load('bhava_lords_bphs');
  if (!data || !Array.isArray(data)) return [];

  const originKw = originHouse === 1 ? 'lagna lord' : `${originHouse}${ordinalSuffix(originHouse)} lord`;
  const destKw = destHouse === 1 ? 'lagna' : `${destHouse}${ordinalSuffix(destHouse)} house`;

  const exact = data.filter(s => {
    const kws = (s.keywords || []).map(k => k.toLowerCase());
    return kws.includes(originKw) && kws.includes(destKw);
  });

  // Fall back to origin-only match (still correct, just less specific)
  // ONLY if the exact origin+destination combination genuinely isn't in
  // this 130-entry dataset (e.g. some destination houses are missing for
  // a few origins) — never silently fall back to a random destination's
  // text, which is exactly the bug this fix removes.
  const pool = exact.length ? exact : data.filter(s => {
    const kws = (s.keywords || []).map(k => k.toLowerCase());
    return kws.includes(originKw);
  });

  return pool
    .slice(0, 2)
    .map(s => ({
      shloka: s.shloka,
      english: s.description,
      hindi: s.hindi,
      keywords: s.keywords,
      citation: `BPHS Ch24, Shloka ${s.shloka}`
    }));
}

// ── Dasha Effects from BPHS (Ch 46-56) ──────────────────────────────────────
/**
 * Get BPHS-based dasha prediction text
 * @param {string} mahadasha - mahadasha lord name
 * @param {string} antardasha - antardasha lord name
 * @returns {Object} { shlokas, prediction }
 */
export function getBPHSDashaPrediction(mahadasha, antardasha) {
  const data = load('dasha_bphs');
  if (!data) return { shlokas: [], prediction: '' };

  // Map planets to chapter numbers for antardasha
  const antarChapters = {
    Sun: '52', Moon: '53', Mars: '54', Rahu: '55', Jupiter: '56'
  };

  const results = [];

  // Try to find antardasha chapter
  const antarCh = antarChapters[mahadasha];
  if (antarCh && data[antarCh]) {
    const chData = data[antarCh];
    const shlokas = chData.shlokas || [];
    // Find shlokas mentioning antardasha planet
    const relevant = shlokas.filter(s =>
      s.keywords.some(k => k.toLowerCase().includes((antardasha || '').toLowerCase()))
    );
    results.push(...(relevant.length > 0 ? relevant : shlokas.slice(0, 2)));
  }

  // Get general dasha effects from Ch47
  if (data['47']) {
    const ch47 = data['47'];
    const general = (ch47.shlokas || []).filter(s =>
      s.keywords.some(k => k.toLowerCase().includes((mahadasha || '').toLowerCase()))
    ).slice(0, 1);
    results.push(...general);
  }

  const unique = results.filter((s, i, arr) => arr.findIndex(x => x.shloka === s.shloka) === i);

  return {
    mahadasha,
    antardasha,
    shlokas: unique.slice(0, 3).map(s => ({
      shloka: s.shloka,
      english: s.text,
      hindi: s.hindi,
      keywords: s.keywords,
      citation: `BPHS Dasha Chapter`
    })),
    prediction: unique[0]?.text || `${mahadasha} Mahadasha brings focus on ${getDashaNature(mahadasha)}.`
  };
}

// ── Yoga Lookup from BPHS ────────────────────────────────────────────────────
/**
 * Get BPHS yoga descriptions by keyword/name
 * @param {string[]} keywords - keywords to search
 * @returns {Object[]} matching yoga shlokas
 */
export function getBPHSYogaByKeywords(keywords) {
  const data = load('yogas');
  if (!data || !Array.isArray(data)) return [];

  const kwLower = keywords.map(k => k.toLowerCase());

  return data
    .filter(y => {
      if (!y.source || y.source !== 'BPHS') return false;
      const yText = (y.description + ' ' + (y.keywords || []).join(' ')).toLowerCase();
      return kwLower.some(k => yText.includes(k)); // NOTE: unlike the other 3 getBPHS* functions, an empty keywords[] here intentionally matches nothing (preserved from original behavior)
    })
    .slice(0, 3)
    .map(y => ({
      name: y.name,
      chapter: y.chapter,
      shloka: y.shloka,
      english: y.description,
      hindi: y.hindi,
      gujarati: y.gujarati,
      keywords: y.keywords,
      citation: bphsCitation(y)
    }));
}

// ── Raja Yoga Lookup ─────────────────────────────────────────────────────────
/**
 * Get matching raja yoga descriptions from BPHS
 * @param {string[]} keywords
 * @returns {Object[]}
 */
export function getBPHSRajaYoga(keywords = []) {
  const data = load('raja_yoga');
  if (!data || !Array.isArray(data) || data.length === 0) {
    // FIX (P0 dataset-integrity gap): raja_yoga.json ships empty (3 bytes)
    // in this build, so the structured lookup above has nothing to
    // return. Rather than silently returning [] — which the old code did,
    // and which reads as "no Raja Yoga found for this chart" when the
    // real reason is "no structured rule file exists" — fall back to a
    // real, attributed search of the bundled scripture library (252
    // classical texts, previously unwired dead weight; see
    // src/reference/scriptureLibrary.js). This returns genuine citations
    // with source/title/creator, or an empty array if the library truly
    // has no match — never a fabricated shloka.
    if (!isScriptureLibraryAvailable()) return [];
    const hits = searchScriptureLibrary(['raja yoga', ...keywords], { maxResults: 3 });
    return hits.map(h => ({
      name: 'Raja Yoga (scripture-library citation, not the structured raja_yoga.json rule set)',
      chapter: null,
      shloka: null,
      english: h.snippet,
      hindi: null,
      gujarati: null,
      keywords,
      source: `${h.title}${h.creator && h.creator !== 'Unknown' ? ' — ' + h.creator : ''} (${h.date})`,
      citation: `Scripture library OCR text, matched on "${h.matchedTerm}". Verify against the original before quoting — this is an OCR excerpt, not a proofread edition.`,
    }));
  }

  const kwLower = keywords.map(k => k.toLowerCase());

  return data
    .filter(y => {
      const yText = (y.description + ' ' + (y.keywords || []).join(' '));
      return matchesAnyKeyword(yText, kwLower);
    })
    .slice(0, 3)
    .map(y => ({
      name: y.name,
      chapter: y.chapter,
      shloka: y.shloka,
      english: y.description,
      hindi: y.hindi,
      gujarati: y.gujarati,
      keywords: y.keywords,
      citation: bphsCitation(y)
    }));
}

// ── Remedies from BPHS (Ch 84-97) ────────────────────────────────────────────
/**
 * Get BPHS remedies relevant to a condition
 * @param {string[]} keywords - e.g. ['mangal', 'dosha', 'eclipse']
 * @returns {Object[]}
 */
export function getBPHSRemedies(keywords = []) {
  const data = load('remedies_bphs');
  if (!data || !Array.isArray(data)) return [];

  const kwLower = keywords.map(k => k.toLowerCase());

  return data
    .filter(r => {
      const rText = (r.description + ' ' + (r.keywords || []).join(' ') + ' ' + r.chapter_title);
      return matchesAnyKeyword(rText, kwLower);
    })
    .slice(0, 3)
    .map(r => ({
      chapter: r.chapter,
      title: r.chapter_title,
      shloka: r.shloka,
      english: r.description,
      hindi: r.hindi,
      gujarati: r.gujarati,
      keywords: r.keywords,
      citation: bphsCitation(r)
    }));
}

// ── Ashtakavarga from BPHS (Ch 66-72) ────────────────────────────────────────
export function getBPHSAshtakavarga(keywords = []) {
  const data = load('ashtakavarga_bphs');
  if (!data || !Array.isArray(data)) return [];
  const kwLower = keywords.map(k => k.toLowerCase());
  return data
    .filter(s => {
      const t = (s.description + ' ' + (s.keywords||[]).join(' '));
      return matchesAnyKeyword(t, kwLower);
    })
    .slice(0, 3)
    .map(s => ({
      chapter: s.chapter, title: s.title, shloka: s.shloka,
      english: s.description, hindi: s.hindi, keywords: s.keywords,
      citation: bphsCitation(s)
    }));
}

// ── Generate Full BPHS-Backed Life Area Prediction ───────────────────────────
/**
 * Generate a complete prediction for a life area backed by BPHS shlokas
 * @param {string} area - 'career'|'wealth'|'marriage'|'health'|'children'|'spirituality'
 * @param {Object} chartData - { planets, houses, dasha }
 * @returns {Object} { prediction, shlokas, remedies }
 */
export function generateBPHSPrediction(area, chartData) {
  const { planets = [], houses = [], dasha = {} } = chartData;

  const areaHouseMap = {
    career:      { houses: [10, 6, 2], keywords: ['career', 'profession', 'work', '10th', 'karma'] },
    wealth:      { houses: [2, 11],    keywords: ['wealth', 'money', 'gains', '2nd', '11th', 'dhana'] },
    marriage:    { houses: [7, 2, 5],  keywords: ['marriage', 'spouse', 'partnership', '7th'] },
    health:      { houses: [1, 6, 8],  keywords: ['health', 'disease', 'longevity', '6th', '8th'] },
    children:    { houses: [5, 9],     keywords: ['children', 'progeny', '5th', 'putra'] },
    spirituality:{ houses: [9, 12],    keywords: ['spiritual', 'religion', 'liberation', '9th', '12th'] },
    property:    { houses: [4, 2],     keywords: ['property', 'home', 'mother', '4th'] },
    foreign:     { houses: [12, 9, 3], keywords: ['foreign', 'travel', 'abroad', '12th', '9th'] },
    // Classical education houses: 4th (foundational learning/mind), 5th
    // (intelligence, purva punya), 9th (higher learning, guru, dharma).
    // 4th is used as the BPHS house-effects anchor because Ch.15 (4th
    // house) is the house most directly tied to early education in BPHS;
    // 5th/9th evidence is layered on top by educationEngine.js.
    education:   { houses: [4, 5, 9],  keywords: ['education', 'vidya', 'learning', 'knowledge', 'intellect', 'student'] }
  };

  const config = areaHouseMap[area] || areaHouseMap.career;
  const primaryHouse = config.houses[0];

  // Get house effects
  const primaryHouseData = houses.find(h => h.number === primaryHouse);
  const planetsInPrimary = primaryHouseData?.planets || [];

  const houseEffects = getBPHSHouseEffects(primaryHouse, planetsInPrimary);

  // Get bhava lord effects
  const houseLord = primaryHouseData?.lord;
  const lordPlanet = planets.find(p => p.name === houseLord);
  const lordInHouse = lordPlanet?.house;
  const bhavaLordEffects = lordInHouse
    ? getBPHSBhavaLordEffects(primaryHouse, lordInHouse, houseLord || '')
    : [];

  // Get yoga shlokas
  const yogaShlokas = getBPHSYogaByKeywords(config.keywords);

  // Get dasha effects
  const dashaPred = dasha?.current?.mahadasha
    ? getBPHSDashaPrediction(dasha.current.mahadasha, dasha.current.antardasha)
    : null;

  // Get remedies
  const remedies = getBPHSRemedies(config.keywords);

  // Compose prediction text — house/bhava-lord effects are area-specific
  // and vary per life area; the current-dasha prediction is the same
  // regardless of area (it's tied to the person's one current dasha, not
  // to any single life area) so it's returned separately rather than
  // repeated verbatim inside every area's text block — the CLI prints it
  // once, shared, instead of 7 identical copies.
  const lines = [];

  if (houseEffects.shlokas.length > 0) {
    lines.push(`📖 ${houseEffects.shlokas[0].english}`);
  }
  if (bhavaLordEffects.length > 0) {
    lines.push(`📖 ${bhavaLordEffects[0].english}`);
  }

  return {
    area,
    prediction: lines.join('\n\n'),
    dashaPrediction: dashaPred?.prediction || null,
    houseEffects,
    bhavaLordEffects,
    yogaShlokas,
    remedies,
    sources: [
      ...houseEffects.shlokas.map(s => s.citation),
      ...bhavaLordEffects.map(s => s.citation),
      ...yogaShlokas.map(s => s.citation)
    ].filter((v, i, a) => a.indexOf(v) === i)
  };
}

// ── Helper: Dasha planet nature ───────────────────────────────────────────────
function getDashaNature(planet) {
  const natures = {
    Sun:     'authority, government, father, career recognition, and vitality',
    Moon:    'emotions, mind, mother, public, and domestic life',
    Mars:    'energy, action, property, siblings, and competitive drive',
    Mercury: 'intellect, business, communication, and analytical pursuits',
    Jupiter: 'wisdom, children, wealth, religion, and expansion',
    Venus:   'relationships, luxuries, arts, marriage, and pleasures',
    Saturn:  'discipline, karma, delays, service, and long-term work',
    Rahu:    'ambition, foreign lands, unconventional paths, and material desires',
    Ketu:    'spirituality, liberation, research, and past-life karma'
  };
  return natures[planet] || 'life transformation and growth';
}

export default {
  getBPHSHouseEffects,
  getBPHSBhavaLordEffects,
  getBPHSDashaPrediction,
  getBPHSYogaByKeywords,
  getBPHSRajaYoga,
  getBPHSRemedies,
  getBPHSAshtakavarga,
  generateBPHSPrediction
};