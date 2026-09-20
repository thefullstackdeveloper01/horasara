/**
 * lordshipQuality.js — Shared, lordship-aware Dasha/period quality scoring.
 *
 * ── WHY THIS FILE EXISTS (root-cause audit fix) ─────────────────────────────
 * Every "Dasha quality" star-rating in this report used to be computed ONLY
 * from where a planet SITS (occupied house type + sign dignity + Ashtakavarga
 * points) — e.g. src/extensions/extended_sections.js's old dashQualityScore().
 * That completely ignores what houses the planet RULES from the Ascendant.
 *
 * Classical BPHS judges a Mahadasha primarily by the dasha lord's FUNCTIONAL
 * nature for THIS lagna:
 *   - Lord of a Kendra/Trikona (a "Raja Yoga" or Yogakaraka lord) → the
 *     dasha is inherently a RISING period. A hard placement makes the climb
 *     harder, it does not turn the period "Bad".
 *   - Lord of a pure Dusthana (6/8/12, no Trikona) → the dasha is a
 *     transformative/karmic period. Occupation modulates HOW MUCH friction,
 *     not whether the underlying lordship is malefic.
 *
 * src/strength/functional_nature.js already computes this correctly, and
 * src/engine.js already attaches the result to every planet object as
 * `p.functionalNature` / `p.functionalGrade` — but until this fix, nothing
 * in the actual printed report ever read that attached data back out when
 * grading a dasha. This module is that missing link: every place in the
 * report that rates a Mahadasha/Antardasha or classifies a life phase should
 * go through the functions here, so the same planet gets the same verdict
 * everywhere in the report (Section 21, 22, 23, 26, 37, 38, 45, 47).
 */

import moduleData from '../../dataset/used/core/lordshipQuality.json' with { type: 'json' };
const KENDRA = moduleData.KENDRA;
const TRIKONA = moduleData.TRIKONA;
const DUSTHANA = moduleData.DUSTHANA;

const ORDINAL_LORD_KEY = moduleData.ORDINAL_LORD_KEY;

export function ordinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/**
 * Score a dasha/antardasha period for the given planet.
 * @param {string} planetName
 * @param {number} house      — house the planet OCCUPIES (natal)
 * @param {string} dignity    — sign dignity (Exalted/Own/Friend/Enemy/Debilitated/...)
 * @param {number} avPts      — Sarvashtakavarga points in that house
 * @param {Array}  planets    — the full planets array (must already carry
 *                              p.functionalNature/p.functionalGrade, which
 *                              engine.js attaches for every chart)
 */
export function dashaScore(planetName, house, dignity, avPts, planets) {
  const p = (planets || []).find(x => x.name === planetName);
  const functionalGrade = p?.functionalGrade ?? 3;
  const functionalNature = p?.functionalNature ?? 'Neutral';

  // Dominant term: what the planet RULES, not just where it sits. This is
  // the single change that fixes "10th lord in 10th house rated Bad".
  let score = (functionalGrade - 3) * 2; // ranges roughly -4..+4

  if (dignity === 'Exalted') score += 2;
  else if (dignity === 'Own' || dignity === 'Moolatrikona') score += 1.5;
  else if (dignity === 'Friend') score += 0.5;
  else if (dignity === 'Enemy') score -= 0.5;
  else if (dignity === 'Debilitated') score -= 1.5;

  if (TRIKONA.includes(house)) score += 1.5;
  else if (KENDRA.includes(house)) score += 1;
  else if (DUSTHANA.includes(house)) score -= 1;

  if (avPts >= 35) score += 1;
  else if (avPts >= 28) score += 0.5;
  else if (avPts < 20) score -= 0.5;

  const isBeneficLord = ['Yogakaraka', 'Functional Benefic'].includes(functionalNature);
  const isMaleficLord = functionalNature === 'Functional Malefic';

  // Classical floor: BPHS never calls a Trikona/Yogakaraka lord's own
  // Mahadasha destructive. A difficult placement makes it a harder climb,
  // never a fall — so a "benefic lord" dasha cannot score below this floor.
  if (isBeneficLord) score = Math.max(score, 1);

  return { score, functionalNature, functionalGrade, isBeneficLord, isMaleficLord, house, dignity, avPts };
}

/** Human star-rating string. Never says flatly "Bad"/"Very Bad" for a
 *  benefic-lord dasha, and reframes a malefic-lord dasha as transformational
 *  rather than simply "bad" (matching classical usage — e.g. Rahu/Saturn/a
 *  dusthana lord's dasha is described as karmic and high-effort, not doomed). */
export function starsFromDashaScore(v) {
  const { score, isBeneficLord, isMaleficLord } = v;
  if (score >= 5) return '★★★★★ Excellent — Peak Growth';
  if (score >= 3) return '★★★★ Good — Rising Period';
  if (score >= 1) return isBeneficLord ? '★★★ Growth With Hard Work' : '★★★ Neutral';
  if (score >= -1.5) return isMaleficLord ? '★★ Transformational — Change & Challenge' : '★★ Mixed — Effort Needed';
  return isMaleficLord ? '★ Karmic Reset — High Effort, Deep Learning' : '★ Difficult — Extra Caution';
}

/**
 * starsFromCappedScore() — FIX (bug report audit, Section 21 rating
 * conflict): starsFromDashaScore() above reads the RAW dashaScore
 * directly, with no reference to Ashtakavarga strength or dignity/
 * cancellation status — while the separate numeric /10 Annual Score
 * Chart (Section 21/buildFutureForecast) feeds the same raw dashaScore
 * through applyRealisticScoreCap() first. Because only one of the two
 * paths applies the realistic-scoring guard, the same period could
 * legitimately show "★★★★★ Peak Growth" here while its own numeric
 * score elsewhere was correctly capped down to 6-8/10 — a direct rating
 * conflict for the same underlying period. This function makes the star
 * label go through the IDENTICAL 1-10 transform and cap used by the
 * numeric chart, so "5 stars" can only ever appear when the numeric
 * score would also genuinely reach 9-10.
 * @param {object} v - the {score, isBeneficLord, isMaleficLord} object from dashaScore()
 * @param {object} ctx - {avPts, dignity, isCancelled, transitSupportive}
 */
export function starsFromCappedScore(v, ctx = {}) {
  const { avPts, dignity, isCancelled = false, transitSupportive = true } = ctx;
  const numeric = Math.max(1, Math.min(10, 5 + v.score));
  const capped = applyRealisticScoreCap(numeric, { avPts, dignity, isCancelled, transitSupportive }).score;
  const { isBeneficLord, isMaleficLord } = v;
  if (capped >= 9) return '★★★★★ Excellent — Peak Growth';
  if (capped >= 7) return '★★★★ Good — Rising Period';
  if (capped >= 5) return isBeneficLord ? '★★★ Growth With Hard Work' : '★★★ Neutral';
  if (capped >= 3) return isMaleficLord ? '★★ Transformational — Change & Challenge' : '★★ Mixed — Effort Needed';
  return isMaleficLord ? '★ Karmic Reset — High Effort, Deep Learning' : '★ Difficult — Extra Caution';
}

/**
 * applyRealisticScoreCap() — Section 3 "Realistic Scoring" guard for any
 * 1-10 yearly/period score derived from dashaScore().
 *
 * Two rules enforced, independent of how high the raw additive score is:
 *   1. THRESHOLD CAP: if the house's Ashtakavarga bindus are low (<25), OR
 *      the period lord is in an Enemy sign, OR Debilitated WITHOUT a
 *      verified Neecha Bhanga cancellation, the score can never exceed 6.
 *      (An Enemy-sign placement has no classical "cancellation" concept,
 *      so it is capped unconditionally; Debilitated is capped only when
 *      not cancelled.)
 *   2. 9-10 GATE: a score of 9 or 10 may only be shown when Dasha lord
 *      dignity, Ashtakavarga (>30), AND transit support are ALL
 *      simultaneously strong — never from one strong factor alone. This
 *      is what stops an inflated single-factor score from reading as
 *      "9/10 for 16 straight years" across an entire Mahadasha.
 *
 * @param {number} rawScore - the 1-10 score before this guard
 * @param {object} ctx
 * @param {number} ctx.avPts - Ashtakavarga bindus for the relevant house
 * @param {string} ctx.dignity - 'Exalted'|'Own'|'Moolatrikona'|'Friend'|'Neutral'|'Enemy'|'Debilitated'
 * @param {boolean} [ctx.isCancelled] - true if Debilitated AND Neecha-Bhanga-cancelled
 * @param {boolean} [ctx.transitSupportive] - true if the current transit component is favorable (not reducing the score)
 * @returns {{score:number, capped:boolean, capReason:string|null}}
 */
export function applyRealisticScoreCap(rawScore, { avPts, dignity, isCancelled = false, transitSupportive = true } = {}) {
  let score = rawScore;
  let capped = false;
  let capReason = null;

  const lowAshtakavarga = typeof avPts === 'number' && avPts < 25;
  const unfavorableDignity =
    dignity === 'Enemy' || (dignity === 'Debilitated' && !isCancelled);

  if ((lowAshtakavarga || unfavorableDignity) && score > 6) {
    score = 6;
    capped = true;
    capReason = lowAshtakavarga && unfavorableDignity
      ? 'Low Ashtakavarga (<25 bindus) and unfavorable dignity without cancellation'
      : lowAshtakavarga
      ? 'Low Ashtakavarga for this house (<25 bindus)'
      : `${dignity} placement without Neecha Bhanga/Nadi cancellation`;
  }

  const strongDignity = ['Exalted', 'Own', 'Moolatrikona'].includes(dignity);
  const strongAshtakavarga = typeof avPts === 'number' && avPts > 30;
  const allThreeAligned = strongDignity && strongAshtakavarga && transitSupportive;

  if (score >= 9 && !allThreeAligned) {
    score = 8;
    capped = true;
    capReason = capReason || 'A 9-10 score requires Dasha dignity, Ashtakavarga (>30), and transit support to ALL align simultaneously — only some are currently strong';
  }

  return { score, capped, capReason };
}

/** Life-phase label used in Section 22/45. A Trikona/Yogakaraka lord's
 *  dasha is never labeled "Struggle" — see BPHS rule above. */
export function phaseFromDashaScore(v) {
  const { score, isBeneficLord, isMaleficLord } = v;
  if (score >= 6) return 'PEAK';
  if (score >= 3) return 'GROWTH';
  if (isBeneficLord) return 'BUILDING'; // floor for benefic lords — never "struggle"
  if (score >= 0.5) return 'BUILDING';
  if (isMaleficLord) return 'TRANSFORMATION';
  return 'CONSOLIDATION';
}

/**
 * Dynamic theme text for a dasha lord: which house(s) it RULES in THIS
 * chart, cross-referenced against dataset/used/core/dasha_meanings.json's `house_effects`
 * table. (decade_forecast.js already did this correctly for Section 47;
 * this generalizes that pattern for reuse across every other section.)
 */
export function lordshipTheme(planetName, hmap, dashaMeaningsData) {
  const ruledHouses = (hmap || [])
    .filter(h => h.lord === planetName)
    .map(h => h.number);
  const meaning = dashaMeaningsData?.[planetName];
  const effects = [];
  for (const h of ruledHouses) {
    const key = ORDINAL_LORD_KEY[h - 1];
    const text = meaning?.house_effects?.[key];
    if (text) effects.push(`As ${h}${ordinalSuffix(h)} house lord: ${text}`);
  }
  return { ruledHouses, effects };
}

/**
 * Dynamic fallback theme for "planet X's dasha, with X sitting in house Y"
 * — used when the static AREA_PREDICTIONS map (in extended_sections.js)
 * has no hand-authored entry for this exact planet+house combination (it
 * never covered all 9×12 combinations — e.g. it had no entry at all for
 * Rahu in the 12th house). Built from HOUSE_SIGNIFICATIONS (already in
 * src/astronomy/constants.js) plus the planet's functional nature, so it's
 * always personalized to this chart rather than a flat generic sentence.
 */
export function occupiedHouseTheme(planetName, house, houseSignifications, planets) {
  const sig = houseSignifications?.[house];
  const p = (planets || []).find(x => x.name === planetName);
  const nature = p?.functionalNature;
  const areas = (sig?.areas || []).slice(0, 3).join(', ');
  if (!areas) return null;
  const flavor = nature === 'Yogakaraka' || nature === 'Functional Benefic'
    ? 'brings supportive, growth-oriented results here'
    : nature === 'Functional Malefic'
      ? 'brings transformative, effort-intensive results here'
      : 'brings mixed, situation-dependent results here';
  return `${planetName} MD activates H${house} (${sig.name}: ${areas}) — ${flavor}`;
}

