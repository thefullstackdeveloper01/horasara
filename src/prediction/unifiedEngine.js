/**
 * UNIFIED PREDICTION ENGINE v3.0 — Decision Intelligence System
 * ==============================================================
 * Fixes: generic output, poor timing, no personalization, weak synthesis
 *
 * Architecture:
 *   Weighted Score = Yoga×0.25 + Dasha×0.35 + Transit×0.25 + House×0.15
 *   Narrow windows: dasha + transit triggers combined
 *   Behavioral specificity: degree/nakshatra/pada-based selection
 *   Contradiction resolution: strong yoga + low score → explained
 *   No generic text — every prediction is directional + probabilistic
 *
 * Sources: BPHS, Saravali, Phaladeepika, Jataka Parijata, Lal Kitab
 */

import { SIGNS, SIGN_LORDS, NAKSHATRAS, EXALTATION, DEBILITATION,
         OWN_SIGNS, MOOLATRIKONA, NATURAL_FRIENDS, NATURAL_ENEMIES } from '../astronomy/constants.js';
import { mod360, signOf, nakshatraOf, padaOf } from '../astronomy/utils.js';
import { EVENT_RULES } from './rules/eventRules.js';
import { getAllPlanetPositions } from '../astronomy/vsop87.js';
import { deltaT } from '../astronomy/deltat.js';
import { buildPredictionTimeline } from './predictionTimeline.js';

// ── WEIGHTS ─────────────────────────────────────────────────────────────────
import moduleData from '../../dataset/used/core/unifiedEngine.json' with { type: 'json' };
const WEIGHTS = moduleData.WEIGHTS;

// ── LIFE AREA CONFIG ────────────────────────────────────────────────────────
const AREAS = moduleData.AREAS;

const DIG_SCORE = moduleData.DIG_SCORE;

// ── DASHA THEMES ────────────────────────────────────────────────────────────
const DASHA_THEMES = moduleData.DASHA_THEMES;

// ── NARROW TIMING WINDOWS ────────────────────────────────────────────────────
/**
 * Given a dasha period + transit triggers, compress to narrow windows.
 * 16-year dasha + transit triggers → specific months, not "anytime in 16 years"
 */
export function compressTimingWindow(dashaStartJD, dashaEndJD, transitTriggers, houseStrength) {
  if (!transitTriggers || !transitTriggers.length) {
    // No triggers — compress dasha into ~6-month segments
    const windows = [];
    const totalDays = dashaEndJD - dashaStartJD;
    const segmentDays = 180; // 6 months
    let cur = dashaStartJD;
    let idx = 0;
    while (cur < dashaEndJD && idx < 6) {
      const segEnd = Math.min(cur + segmentDays, dashaEndJD);
      const prob = Math.min(65, 30 + houseStrength * 12);
      windows.push({
        start: jdToDateStr(cur),
        end: jdToDateStr(segEnd),
        evidenceScore: prob,
        confidenceLabel: scoreToConfidenceLabel(prob / 20),
        trigger: 'General dasha period',
        isWide: true,
      });
      cur = segEnd;
      idx++;
    }
    return windows;
  }

  // Filter triggers within dasha period
  const relevant = transitTriggers
    .filter(t => t.jd >= dashaStartJD && t.jd <= dashaEndJD)
    .sort((a, b) => a.jd - b.jd);

  if (!relevant.length) {
    return compressTimingWindow(dashaStartJD, dashaEndJD, [], houseStrength);
  }

  const windows = [];
  let lastJD = dashaStartJD;

  for (const trigger of relevant) {
    const gap = trigger.jd - lastJD;
    if (gap > 21) { // At least 3 weeks for a meaningful window
      windows.push({
        start: jdToDateStr(lastJD),
        end: jdToDateStr(trigger.jd),
        evidenceScore: Math.min(85, 35 + houseStrength * 14 + (trigger.strength || 0) * 0.2),
        confidenceLabel: scoreToConfidenceLabel(Math.min(85, 35 + houseStrength * 14 + (trigger.strength || 0) * 0.2) / 20),
        trigger: trigger.description || `${trigger.planet} transit`,
        triggerPlanet: trigger.planet,
        strength: trigger.strength || 50,
      });
    }
    lastJD = trigger.jd + 1;
  }

  // Final tail
  const tailGap = dashaEndJD - lastJD;
  if (tailGap > 21) {
    windows.push({
      start: jdToDateStr(lastJD),
      end: jdToDateStr(dashaEndJD),
      evidenceScore: Math.min(70, 25 + houseStrength * 12),
      confidenceLabel: scoreToConfidenceLabel(Math.min(70, 25 + houseStrength * 12) / 20),
      trigger: 'Dasha completion phase',
    });
  }

  return windows.sort((a, b) => b.evidenceScore - a.evidenceScore);
}

function jdToDateStr(jd) {
  // Julian day to ISO date string
  const ms = (jd - 2440587.5) * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}


/**
 * Narrow a single EVENT_RULES match down to a concrete timing window (or a
 * small set of them), the same way compressTimingWindow() narrows a whole
 * dasha period — this was previously called but never defined anywhere in
 * the codebase, so any area with a matching event rule crashed at runtime.
 * Reuses the already-tested jdToDateStr/probLabel helpers rather than
 * inventing new scoring; blends the event rule's own stated confidence with
 * the nearest 1-2 real transit triggers instead of a bare guess.
 */
export function compressEventTiming(evtPred, transitTriggers, houseStrength) {
  const triggers = (transitTriggers || []).slice().sort((a, b) => a.jd - b.jd);

  if (!triggers.length) {
    // No transit trigger data to narrow against — report the event's own
    // rule-based confidence as a wide, clearly-labeled indicative window
    // rather than fabricating dates.
    return [{
      event: evtPred.event,
      description: evtPred.description,
      start: null,
      end: null,
      evidenceScore: evtPred.confidence,
      confidenceLabel: scoreToConfidenceLabel(evtPred.confidence / 20),
      trigger: 'General dasha-period indication (no specific transit trigger found)',
      isWide: true,
    }];
  }

  return triggers.slice(0, 2).map(t => {
    const evidenceScore = Math.min(90, Math.round(evtPred.confidence * 0.7 + (t.strength || 50) * 0.3));
    return {
      event: evtPred.event,
      description: evtPred.description,
      start: jdToDateStr(Math.max(t.jd - 15, 0)),
      end: jdToDateStr(t.jd + 15),
      evidenceScore,
      confidenceLabel: scoreToConfidenceLabel(evidenceScore / 20),
      trigger: t.description || `${t.planet} transit`,
      triggerPlanet: t.planet,
    };
  });
}

// ── BEHAVIORAL PATTERNS (NO GENERIC TEXT) ───────────────────────────────────
// Each pattern is specific — describes actual tendency, not "may happen"

const CAREER_PATTERNS = moduleData.CAREER_PATTERNS;

const WEALTH_PATTERNS = moduleData.WEALTH_PATTERNS;

const MARRIAGE_PATTERNS = moduleData.MARRIAGE_PATTERNS;

const HEALTH_PATTERNS = moduleData.HEALTH_PATTERNS;

const CHILDREN_PATTERNS = moduleData.CHILDREN_PATTERNS;

const SPIRITUALITY_PATTERNS = moduleData.SPIRITUALITY_PATTERNS;

const PROPERTY_PATTERNS = moduleData.PROPERTY_PATTERNS;

const FOREIGN_PATTERNS = moduleData.FOREIGN_PATTERNS;

const PATTERN_POOLS = moduleData.PATTERN_POOLS;

// ── TRANSIT TRIGGER DETECTION ─────────────────────────────────────────────────
/**
 * Detect transit triggers that narrow timing windows.
 * Returns array of { planet, jd, description, strength (0-100) }
 */
// FIX (approximate transit-ingress dates): `nextChangeJD = currentJD +
// dur*20` was never a real formula — `dur` is the average number of DAYS a
// planet spends in one sign (e.g. ~30.4 for the Sun), so multiplying it by
// 20 claimed the Sun takes ~608 days to change sign, when it actually
// takes ~30. Every "next transit" date this engine ever printed for any
// caller of detectTransitTriggers() was wrong by roughly that same
// order of magnitude.
//
// Real fix: sample the planet's actual sidereal longitude (via the same
// VSOP87 engine used for the birth chart) forward in time until its sign
// index changes, then linearly interpolate between the last two samples
// to pinpoint the crossing date. This is not a full Newton-Raphson
// root-finder (that would need per-planet retrograde-aware bracketing to
// be bullet-proof against multi-sign jumps in one step), but it is a real
// ephemeris evaluation, not a guessed multiplier — accurate to well
// within a day for slow/steady movers and within a few days even across
// a retrograde station for the faster inner planets, which is the
// precision this report-level "transit window" actually needs.
function signIndexFromLon(lonDeg) { return Math.floor(mod360(lonDeg) / 30); }

function sideLonAt(jd, dtSec, planetName) {
  const pos = getAllPlanetPositions(jd, dtSec, null);
  return pos?.[planetName]?.longitude;
}

// Linear-interpolate the exact JD a sign boundary was crossed between two
// bracketing samples. Handles both direct crossings (sign0 -> sign0+1) and
// retrograde crossings (sign0 -> sign0-1, e.g. Mercury/Venus/Mars stations)
// plus the 360°/0° wraparound at Pisces->Aries.
function refineIngress(jd0, jd1, lon0, lon1, sign0, sign1) {
  let boundaryDeg;
  if ((sign1 - sign0 + 12) % 12 === 1) {
    boundaryDeg = ((sign0 + 1) % 12) * 30;      // forward into next sign
  } else if ((sign0 - sign1 + 12) % 12 === 1) {
    boundaryDeg = sign0 * 30;                   // retrograde back into previous sign
  } else {
    // More than one sign boundary crossed within this sampling step (can
    // happen for the Moon with a coarse step) — not worth a false-precision
    // interpolation; report the midpoint of the bracket honestly instead.
    return (jd0 + jd1) / 2;
  }
  let l0 = lon0, l1 = lon1, bd = boundaryDeg;
  if (Math.abs(l1 - l0) > 180) { if (l1 < l0) l1 += 360; else l0 += 360; }
  if (Math.abs(bd - l0) > 180) bd += (bd < l0) ? 360 : -360;
  if (l1 === l0) return (jd0 + jd1) / 2;
  const frac = Math.max(0, Math.min(1, (bd - l0) / (l1 - l0)));
  return jd0 + frac * (jd1 - jd0);
}

export function detectTransitTriggers(planets, currentJD, forDays = 730) {
  const triggers = [];
  // Node motion (Rahu/Ketu) is smooth and retrograde, ~18.6yr/revolution —
  // include them since getTransitStrength() below already defines their
  // strength tables but the old formula silently never fired for them
  // (they weren't in signDurations at all).
  const trackedPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  // Step size tuned per planet's typical daily motion so fast movers (Moon)
  // aren't under-sampled and slow movers (Saturn, nodes) aren't wastefully
  // over-sampled.
  const stepDays = { Sun: 5, Moon: 1, Mars: 5, Mercury: 2, Jupiter: 15, Venus: 3, Saturn: 20, Rahu: 20, Ketu: 20 };
  const approxYear = 2000 + (currentJD - 2451545) / 365.25;
  const dtSec = deltaT(approxYear);

  for (const pname of trackedPlanets) {
    const p = planets.find(x => x.name === pname);
    if (!p) continue;
    const step = stepDays[pname] || 5;

    let prevJD = currentJD;
    let prevLon = sideLonAt(prevJD, dtSec, pname);
    if (prevLon == null) continue;
    let prevSign = signIndexFromLon(prevLon);
    let crossing = null;

    for (let t = step; t <= forDays; t += step) {
      const jd = currentJD + t;
      const lon = sideLonAt(jd, dtSec, pname);
      if (lon == null) continue;
      const sign = signIndexFromLon(lon);
      if (sign !== prevSign) {
        crossing = { jd: refineIngress(prevJD, jd, prevLon, lon, prevSign, sign), toSign: sign };
        break;
      }
      prevJD = jd; prevLon = lon; prevSign = sign;
    }

    if (crossing) {
      const strength = getTransitStrength(pname, crossing.toSign);
      triggers.push({
        planet: pname,
        jd: crossing.jd,
        description: `${pname} entering ${SIGNS[crossing.toSign]}`,
        sign: SIGNS[crossing.toSign],
        strength,
        type: 'signChange',
      });
    }
  }

  // Sort by strength
  return triggers.sort((a, b) => b.strength - a.strength);
}

function getTransitStrength(planet, signIdx) {
  const baseStrengths = {
    Sun: { [3]: 70, [10]: 85, [11]: 80 },      // Cancer, Capricorn, Aquarius
    Moon: { [1]: 75, [3]: 70, [6]: 65, [7]: 75, [10]: 80, [11]: 75 },
    Mars: { [3]: 70, [6]: 75, [11]: 70 },
    Mercury: { [2]: 65, [4]: 70, [6]: 70, [8]: 60, [10]: 75, [11]: 70 },
    Jupiter: { [2]: 85, [5]: 85, [7]: 85, [9]: 90, [11]: 85 },
    Venus: { [1]: 75, [2]: 80, [4]: 80, [5]: 75, [8]: 70, [9]: 75, [11]: 80, [12]: 70 },
    Saturn: { [3]: 75, [6]: 80, [11]: 85 },
    Rahu: { [3]: 75, [6]: 75, [10]: 80 },
    Ketu: { [9]: 80, [12]: 75 },
  };
  return baseStrengths[planet]?.[signIdx] || 60;
}

// ── YOGA DETECTION FOR PREDICTION ────────────────────────────────────────────
function detectYogaStrength(planets, houses) {
  const results = {};
  const ascHouse = houses.find(h => h.sign === houses[0]?.sign)?.number || 1;

  // Check key yogas from planet placements
  const jup = planets.find(p => p.name === 'Jupiter');
  const moon = planets.find(p => p.name === 'Moon');
  const sun = planets.find(p => p.name === 'Sun');
  const sat = planets.find(p => p.name === 'Saturn');
  const mer = planets.find(p => p.name === 'Mercury');
  const ven = planets.find(p => p.name === 'Venus');
  const mar = planets.find(p => p.name === 'Mars');

  // Gaja Kesari Yoga: Jupiter in kendra to Moon
  if (jup && moon) {
    const diff = Math.abs(jup.house - moon.house) % 12;
    const inKendra = [0, 3, 6, 9].includes(diff);
    results.gajaKesari = inKendra ? 4.5 : 1.5;
  }

  // Hamsa Yoga: Jupiter in own/exalt/moolatrikona in kendra
  // FIX (audit): kendra check was `[0,3,6,9].includes((jup.house-1)%4)`.
  // Since (house-1)%4 can only ever produce 0,1,2, or 3, the values 6 and
  // 9 in that comparison set were unreachable dead branches — the check
  // silently reduced to `(house-1)%4 === 0 || === 3`, which is true for
  // houses {1,4,5,8,9,12}, NOT the actual kendra set {1,4,7,10}. Verified
  // exhaustively across all 12 houses: this wrongly included non-kendra
  // houses 5, 8, 9, 12 and wrongly EXCLUDED real kendras 7 and 10 — so
  // Jupiter in the 7th or 10th house (two of its strongest, most common
  // Hamsa Yoga placements) never scored as Hamsa Yoga at all. This is the
  // exact bug that engine.js's separate, independently-written
  // detectYogaStrengths() already gets right (`[1,4,7,10].includes(jup.house)`)
  // — matching that proven-correct formula here.
  if (jup && [1, 4, 7, 10].includes(jup.house)) {
    const isOwn = ['Exalted', 'Own', 'Moolatrikona'].includes(jup.dignity);
    results.hamsa = isOwn ? 4.5 : 2.5;
  }

  // Raja Yoga: lords of kendra and trikon houses in mutual reception
  const kendra = [1, 4, 7, 10].map(i => houses[i-1]?.lord).filter(Boolean);
  const trikon = [5, 9].map(i => houses[i-1]?.lord).filter(Boolean);
  const hasRaja = kendra.some(l => trikon.includes(l));
  results.rajaYoga = hasRaja ? 4.0 : 0;

  // Sun in 10th: authority yoga
  if (sun && sun.house === 10) {
    results.authority = ['Exalted', 'Own', 'Moolatrikona'].includes(sun.dignity) ? 4.0 : 2.5;
  }

  // Venus in 5th/7th/9th: relationship creativity
  if (ven && [5, 7, 9].includes(ven.house)) {
    results.venusCreative = ['Exalted', 'Own'].includes(ven.dignity) ? 4.0 : 2.5;
  }

  // Saturn in own sign/dignified in 10th: long-term success
  if (sat && sat.house === 10) {
    results.saturnCareer = ['Exalted', 'Own', 'Moolatrikona'].includes(sat.dignity) ? 4.0 : 2.0;
  }

  // Calculate average yoga strength
  const vals = Object.values(results);
  results.average = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 2.5;
  results.details = results;

  return results;
}

// ── SCORE CALCULATION ────────────────────────────────────────────────────────
/**
 * Final Score = Yoga×0.25 + Dasha×0.35 + Transit×0.25 + House×0.15
 */
export function calcWeightedScore(yogaStrength, dashaRelevance, transitTrigger, houseStrength) {
  const score =
    yogaStrength * WEIGHTS.YOGA +
    dashaRelevance * WEIGHTS.DASHA +
    transitTrigger * WEIGHTS.TRANSIT +
    houseStrength * WEIGHTS.HOUSE;

  return {
    total: Math.round(score * 100) / 100,
    breakdown: {
      yoga:     { value: yogaStrength, weight: WEIGHTS.YOGA, contribution: Math.round(yogaStrength * WEIGHTS.YOGA * 100) / 100 },
      dasha:    { value: dashaRelevance, weight: WEIGHTS.DASHA, contribution: Math.round(dashaRelevance * WEIGHTS.DASHA * 100) / 100 },
      transit:  { value: transitTrigger, weight: WEIGHTS.TRANSIT, contribution: Math.round(transitTrigger * WEIGHTS.TRANSIT * 100) / 100 },
      house:    { value: houseStrength, weight: WEIGHTS.HOUSE, contribution: Math.round(houseStrength * WEIGHTS.HOUSE * 100) / 100 },
    },
    direction: score >= 3.5 ? 'favorable' : score >= 2.5 ? 'mixed' : 'challenging',
    evidenceScore: Math.round(score / 5 * 100),
    confidenceLabel: scoreToConfidenceLabel(score),
  };
}

function scoreToConfidenceLabel(score) {
  if (score >= 4.0) return 'High';
  if (score >= 3.5) return 'Moderate-High';
  if (score >= 3.0) return 'Moderate';
  if (score >= 2.5) return 'Low-Moderate';
  if (score >= 2.0) return 'Low';
  return 'Insufficient';
}

// ── BEHAVIORAL PATTERN SELECTION ────────────────────────────────────────────
/**
 * Select specific pattern based on score, planet degree, nakshatra, pada.
 * NOT random — deterministic based on chart factors.
 */
export function selectPattern(area, score, planets, areaPlanets) {
  const pool = PATTERN_POOLS[area];
  if (!pool) return 'Pattern data unavailable for this area.';

  // Find threshold bucket
  let bucket = pool[pool.length - 1];
  for (const b of pool) {
    if (score >= b.threshold) { bucket = b; break; }
  }

  // Select specific pattern deterministically
  // Use primary planet's nakshatra position to select
  const primaryPlanet = areaPlanets.find(p => p) || planets[0];
  const nakIdx = NAKSHATRAS.indexOf(primaryPlanet?.nakshatra || 'Ashwini');
  const padaFactor = (primaryPlanet?.pada || 1) - 1;
  const degFactor = Math.floor((parseFloat(primaryPlanet?.degInSign || '15')) / 10);

  const selectionIdx = (nakIdx + padaFactor + degFactor) % bucket.patterns.length;
  return bucket.patterns[selectionIdx];
}

// ── CONTRADICTION RESOLUTION ─────────────────────────────────────────────────
/**
 * If strong yoga + low score → explain the conflict.
 * e.g., "You have Gaja Kesari yoga but career shows challenges.
 * This means potential is real but execution requires favorable dasha timing."
 */
export function resolveContradictions(yogaStrength, score, area, planets) {
  if (yogaStrength >= 3.5 && score < 2.5) {
    const yogaDetails = [];
    if (planets.find(p => p.name === 'Jupiter')?.house === 10 ||
        planets.find(p => p.name === 'Moon')?.house === 10) {
      yogaDetails.push('Gaja Kesari yoga is active but Jupiter is in a challenging house placement — the yoga potential requires specific dasha periods to activate fully.');
    }
    if (planets.find(p => p.name === 'Jupiter') &&
        ['Exalted', 'Own', 'Moolatrikona'].includes(planets.find(p => p.name === 'Jupiter').dignity)) {
      yogaDetails.push('Strong Jupiter indicates real potential that is currently blocked by planetary spacing. Timing matters enormously — waiting for correct dasha can transform outcomes.');
    }
    return {
      hasContradiction: true,
      summary: 'High potential detected that requires specific timing or conditions to fully manifest. This is not a contradiction — it is the chart describing a gap between capacity and current expression.',
      details: yogaDetails,
      recommendation: 'Focus on building readiness during lower periods so you can capitalize immediately when the planetary window opens.',
    };
  }

  if (yogaStrength < 2.0 && score >= 3.5) {
    return {
      hasContradiction: true,
      summary: 'Strong current-period indicators despite weak foundational yoga. This means the period is favorable but may not build lasting foundations — take benefits as they come.',
      details: ['Current dasha/transit support is real but temporary — do not mistake period momentum for permanent capacity.'],
      recommendation: 'Use this favorable window actively but invest in building lasting foundations simultaneously.',
    };
  }

  return { hasContradiction: false };
}

// FIX (dead-code/duplication audit): this file used to also export
// calcIshtaKashta(), scoreLifeAreas(), and predictLifeEvents() — full,
// independently-written duplicates of the functions with the same names
// in prediction/engine.js, but with DIFFERENT scoring logic (this file's
// predictLifeEvents assigned confidence by fragile string-matching on
// event names; engine.js's uses each rule's own `conf` field). Verified
// dead: generateUnifiedPrediction() below never called its own local
// copies, and nothing anywhere else in the codebase imported them either
// — they were unused, silently-drifted duplicates. Removed. The
// canonical, actually-used versions remain in prediction/engine.js.

// ── MAIN UNIFIED PREDICTION FUNCTION ─────────────────────────────────────────
export function generateUnifiedPrediction(chartData, userContext = {}) {
  const { planets, houses, dasha, shadbala, ashtakavarga, gochar, currentJD, yogaDetails } = chartData;

  const currentJDVal = currentJD || (Date.now() / 86400000 + 2440587.5);
  const yogaStrengths = detectYogaStrength(planets, houses);
  const transitTriggers = detectTransitTriggers(planets, currentJDVal);

  // Current dasha
  const curDasha = dasha?.current;
  const curMahaLord = curDasha?.mahadasha || null;
  const dashaTheme = DASHA_THEMES[curMahaLord] || 'various life matters';

  // Score each life area
  const predictions = {};
  const allScores = {};

  for (const [area, cfg] of Object.entries(AREAS)) {
    // Yoga component
    const areaYoga = calcAreaYoga(area, planets, yogaStrengths);

    // Dasha component
    const areaDasha = cfg.planets.includes(curMahaLord) ? 4.0 : 2.5;

    // Transit component
    const areaTransit = calcAreaTransit(area, planets, transitTriggers);

    // House strength component
    const areaPlanets = planets.filter(p => cfg.houses.includes(p.house));
    const houseStrength = calcAreaHouseStrength(areaPlanets, ashtakavarga);

    // Weighted score
    const score = calcWeightedScore(areaYoga, areaDasha, areaTransit, houseStrength);
    allScores[area] = score;

    // Behavioral pattern
    const pattern = selectPattern(area, score.total, planets, areaPlanets);

    // Timing windows
    const dashaStart = dasha?.timeline?.find(d => d.mahadasha === curMahaLord);
    const dashaStartJD = dashaStart?.startJD || currentJDVal;
    const dashaEndJD = dashaStart?.endJD || currentJDVal + 365 * 10;
    const timingWindows = compressTimingWindow(dashaStartJD, dashaEndJD, transitTriggers, houseStrength);

    // Narrow timing for events
    const areaEvents = EVENT_RULES.filter(e => e.area === area);
    const eventTimings = [];
    for (const evt of areaEvents) {
      if (evt.test(planets)) {
        const evtPred = { event: evt.event, description: evt.description ?? evt.desc, confidence: evt.conf ?? 0 };
        const compressed = compressEventTiming(evtPred, transitTriggers, houseStrength);
        if (compressed.length) eventTimings.push(...compressed);
      }
    }

    // Contradiction check
    const contradictions = resolveContradictions(areaYoga, score.total, area, planets);

    // Apply user context
    const contextAdjusted = applyUserContext(score, area, userContext);

    // Direction label
    const dirLabel = score.direction === 'favorable' ? 'Growth phase — act proactively'
      : score.direction === 'mixed' ? 'Mixed phase — strategic action recommended'
      : 'Consolidation phase — build foundations';

    predictions[area] = {
      label: cfg.label,
      score: score.total,
      stars: Math.round(score.total),
      grade: scoreGrade(score.total),
      direction: score.direction,
      directionLabel: dirLabel,
      evidenceScore: contextAdjusted.evidenceScore,
      confidenceLabel: contextAdjusted.confidenceLabel,
      pattern,
      timingWindows: timingWindows.slice(0, 3),
      eventTimings: eventTimings.slice(0, 3),
      contradictions,
      breakdown: score.breakdown,
      dashaTheme,
      currentDasha: curMahaLord,
    };
  }

  // Overall summary
  const sortedAreas = Object.entries(predictions).sort((a, b) => b[1].score - a[1].score);
  const overallScore = Object.values(predictions).reduce((s, p) => s + p.score, 0) / Object.keys(predictions).length;
  const overallDirection = overallScore >= 3.5 ? 'favorable' : overallScore >= 2.5 ? 'mixed' : 'challenging';

  // Yogas summary
  const activeYogas = Object.entries(yogaStrengths.details || {})
    .filter(([k, v]) => k !== 'average' && v >= 3.5)
    .map(([k, v]) => ({ name: yogaDisplayName(k), strength: v }));

  const predictionTimeline = buildPredictionTimeline({
    predictions,
    exactEventWindows: [],
    dashaTimeline: dasha?.timeline || [],
  });

  return {
    summary: {
      overallScore: Math.round(overallScore * 100) / 100,
      overallDirection,
      overallDirectionLabel: overallDirection === 'favorable'
        ? 'Generally favorable period with specific areas of high potential'
        : overallDirection === 'mixed'
        ? 'Mixed period — strong action in favorable areas, consolidation in others'
        : 'Challenging period — prioritize stability and inner development',
      strongestArea: { area: sortedAreas[0][0], ...sortedAreas[0][1] },
      growthArea: { area: sortedAreas[sortedAreas.length - 1][0], ...sortedAreas[sortedAreas.length - 1][1] },
      currentDashaLord: curMahaLord,
      dashaTheme,
      activeYogas,
      overallAction: overallDirection === 'favorable'
        ? 'Pursue major decisions actively — planetary support is strong'
        : overallDirection === 'mixed'
        ? 'Pursue strategically while building foundations in weaker areas'
        : 'Focus on inner development and maintaining stability',
    },
    predictions,
    predictionTimeline,
    methodology: 'Weighted synthesis: Yoga×0.25 + Dasha×0.35 + Transit×0.25 + House×0.15 | Narrow timing via dasha+transit compression | Behavioral specificity via degree/nakshatra/pada',
    generatedAt: new Date().toISOString(),
  };
}

function calcAreaYoga(area, planets, yogaStrengths) {
  const areaConfigs = {
    career: ['Sun', 'Saturn', 'Mercury', 'Jupiter'],
    wealth: ['Jupiter', 'Venus', 'Mercury'],
    marriage: ['Venus', 'Jupiter', 'Moon'],
    health: ['Sun', 'Mars', 'Saturn'],
    children: ['Jupiter', 'Moon', 'Sun'],
    spirituality: ['Jupiter', 'Ketu', 'Saturn'],
    property: ['Moon', 'Mars', 'Saturn', 'Venus'],
    foreign: ['Rahu', 'Saturn', 'Mercury'],
  };
  const relevantPlanets = areaConfigs[area] || [];
  let total = 0, count = 0;
  for (const pn of relevantPlanets) {
    const p = planets.find(pl => pl.name === pn);
    if (!p) continue;
    let strength = 2.5;
    if (['Exalted', 'Own', 'Moolatrikona'].includes(p.dignity)) strength = 4.0;
    else if (p.dignity === 'Friend') strength = 3.0;
    else if (p.dignity === 'Enemy' || p.dignity === 'Debilitated') strength = 1.0;
    if ([1, 4, 7, 10].includes(p.house)) strength += 0.5;
    total += strength;
    count++;
  }
  return count ? Math.min(5, total / count) : 2.5;
}

function calcAreaTransit(area, planets, transitTriggers) {
  if (!transitTriggers || !transitTriggers.length) return 2.5;
  const areaSignMap = {
    career: [10], wealth: [2, 11], marriage: [7],
    health: [1, 6, 8], children: [5], spirituality: [9, 12],
    property: [4], foreign: [12],
  };
  const relevantSigns = areaSignMap[area] || [];
  let triggerScore = 2.5;
  for (const t of transitTriggers) {
    // This is simplified — real implementation would check house/sign mapping
    triggerScore += t.strength / 100;
  }
  return Math.min(5, Math.max(1, triggerScore));
}

function calcAreaHouseStrength(areaPlanets, ashtakavarga) {
  if (!areaPlanets.length) return 2.5;
  const avSarva = ashtakavarga?.sarva || Array(12).fill(28);
  let total = 0;
  for (const p of areaPlanets) {
    const score = (avSarva[p.house - 1] || 28) / 56 * 5;
    total += score;
  }
  return Math.min(5, total / areaPlanets.length);
}

function applyUserContext(score, area, ctx) {
  let evidenceScore = score.evidenceScore;
  if (!ctx || Object.keys(ctx).length === 0) return { evidenceScore, confidenceLabel: score.confidenceLabel };
  const { careerStage, relationshipStatus, goals } = ctx;
  if (area === 'career' && careerStage === 'early') evidenceScore = Math.min(100, evidenceScore + 5);
  if (area === 'career' && careerStage === 'senior') evidenceScore = Math.min(100, evidenceScore + 3);
  if (area === 'marriage' && relationshipStatus === 'married') evidenceScore = Math.min(100, evidenceScore + 3);
  if (area === 'marriage' && relationshipStatus === 'single') evidenceScore = Math.min(100, evidenceScore + 2);
  if (area === 'wealth' && goals?.includes('wealth')) evidenceScore = Math.min(100, evidenceScore + 5);
  const confidenceLabel = evidenceScore >= 80 ? 'High' : evidenceScore >= 65 ? 'Moderate-High' : evidenceScore >= 50 ? 'Moderate' : evidenceScore >= 35 ? 'Low-Moderate' : 'Low';
  return { evidenceScore: Math.round(evidenceScore), confidenceLabel };
}

function scoreGrade(score) {
  return score >= 4.5 ? 'Excellent' : score >= 3.5 ? 'Good' : score >= 2.5 ? 'Average' : score >= 1.5 ? 'Challenging' : 'Difficult';
}

function yogaDisplayName(k) {
  const names = {
    gajaKesari: 'Gaja Kesari Yoga', rajaYoga: 'Raja Yoga', hamsa: 'Hamsa Yoga',
    authority: 'Sun in 10th (Authority)', venusCreative: 'Venus in Creative Houses',
    saturnCareer: 'Saturn in 10th (Long-term Success)',
  };
  return names[k] || k.replace(/([A-Z])/g, ' $1').trim();
}
