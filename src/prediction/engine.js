/**
 * PREDICTION ENGINE — Real rule-weighted predictions
 * Sources: BPHS, Saravali, Phaladeepika, Jataka Parijata
 */

import { SIGNS, DASHA_ORDER } from '../astronomy/constants.js';
import { signOf, mod360 } from '../astronomy/utils.js';

// ── ISHTA / KASHTA PHALA (BPHS Ch.27) ────────────────────────────────────
export function calcIshtaKashta(planets, shadbala) {
  const result = {};
  const SEVEN = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
  for (const pname of SEVEN) {
    const sb = shadbala?.[pname];
    if (!sb) { result[pname] = { ishta:30, kashta:30, net:0, grade:'Mixed' }; continue; }
    const uchcha = Math.min(60, sb.occhaBala || 0);
    const chesta = Math.min(60, sb.cheshtaBala || 0);
    const ishta  = Math.sqrt(uchcha * chesta);
    const kashta = Math.sqrt(Math.max(0, 60-uchcha) * Math.max(0, 60-chesta));
    result[pname] = {
      ishta:  parseFloat(ishta.toFixed(2)),
      kashta: parseFloat(kashta.toFixed(2)),
      net:    parseFloat((ishta - kashta).toFixed(2)),
      grade:  ishta >= 45 ? 'Very Benefic' : ishta >= 30 ? 'Benefic'
            : kashta >= 45 ? 'Very Malefic' : kashta >= 30 ? 'Malefic' : 'Mixed',
    };
  }
  return result;
}

// ── LIFE AREA SCORES ──────────────────────────────────────────────────────
import moduleData from '../../dataset/used/core/engine.json' with { type: 'json' };
const AREA_CFG = moduleData.AREA_CFG;
const AREA_LABELS = moduleData.AREA_LABELS;
const DIG_SCORE = moduleData.DIG_SCORE;

export function scoreLifeAreas(planets, houses, ashtakavarga, shadbala, dashaCurrent) {
  const avSarva = ashtakavarga?.sarva || Array(12).fill(28);
  const scores  = {};
  for (const [area, cfg] of Object.entries(AREA_CFG)) {
    let tot=0, wt=0;
    for (const h of cfg.houses) {
      const pts = avSarva[h-1]||0;
      const w   = cfg.hw[h]||0.1;
      const inv = (cfg.inv||[]).includes(h);
      tot += (inv ? 1-pts/56 : pts/56) * w;
      wt  += w;
    }
    const houseScore = wt>0 ? (tot/wt)*5 : 3;
    const digScores  = cfg.planets.map(pn => DIG_SCORE[planets.find(x=>x.name===pn)?.dignity||'Neutral']||3);
    const avgDig     = digScores.length ? digScores.reduce((a,b)=>a+b,0)/digScores.length : 3;
    const sbVals     = cfg.planets.map(p => shadbala?.[p]?.ratio).filter(Boolean);
    const sbScore    = sbVals.length ? Math.min(5,(sbVals.reduce((a,b)=>a+b,0)/sbVals.length)*3) : 3;
    const dashaBoost = cfg.planets.includes(dashaCurrent?.mahadasha) ? 0.5 : 0;
    const composite  = Math.min(5,Math.max(1, houseScore*.4 + avgDig*.35 + sbScore*.2 + dashaBoost*.05));
    scores[area] = {
      label:  AREA_LABELS[area],
      score:  parseFloat(composite.toFixed(2)),
      stars:  Math.round(composite),
      grade:  composite>=4.5?'Excellent':composite>=3.5?'Good':composite>=2.5?'Average':composite>=1.5?'Challenging':'Difficult',
    };
  }
  return scores;
}

// ── EVENT PREDICTION ENGINE ───────────────────────────────────────────────
// EVENT_RULES now lives in rules/eventRules.js — single source of truth,
// also imported by unifiedEngine.js (previously that file referenced this
// array without importing it, which threw "EVENT_RULES is not defined").
import { EVENT_RULES } from './rules/eventRules.js';

export function predictLifeEvents(planets, dashaTimeline, currentJD) {
  const predictions = [];
  for (const rule of EVENT_RULES) {
    if (!rule.test(planets)) continue;
    const periods = [];
    for (const maha of dashaTimeline) {
      if (!rule.lords.includes(maha.mahadasha)) continue;
      const isCur  = maha.startJD <= currentJD && maha.endJD > currentJD;
      const isFut  = maha.startJD > currentJD;
      const isPast = maha.endJD < currentJD;
      const syear  = Math.round(1900 + (maha.startJD-2415020)/365.2422);
      const eyear  = Math.round(1900 + (maha.endJD-2415020)/365.2422);
      periods.push({ mahadasha:maha.mahadasha, start:maha.start, end:maha.end,
        startYear:syear, endYear:eyear,
        status: isCur?'current':isFut?'future':'past' });
    }
    if (!periods.length) continue;
    const timing = periods.find(p=>p.status==='current') || periods.find(p=>p.status==='future') || periods[periods.length-1];
    predictions.push({ event:rule.event, area:rule.area, description:rule.desc,
      confidence:rule.conf, confidenceLabel:rule.conf>=75?'High':rule.conf>=60?'Moderate':'Indicative',
      activePeriods:periods, timing });
  }
  return predictions.sort((a,b) => {
    const o={current:0,future:1,past:2};
    return (o[a.timing?.status]||2) - (o[b.timing?.status]||2);
  });
}

// ── NARRATIVE INSIGHTS (2-3 sentences per area) ────────────────────────────
const DASHA_THEME = moduleData.DASHA_THEME;

const INSIGHT_TEMPLATES = moduleData.INSIGHT_TEMPLATES;

// FIX (audit, Points 3 & 4): the insight text above is a template chosen
// only by an overall grade bucket (Excellent/Good/Average/...), so it could
// never mention a specific strong or nuanced placement inside that area —
// e.g. Venus sitting in its own 7th house, or a 5th/12th lord's house
// pointing to a specific delayed-but-real outcome. This computes those
// concrete, chart-specific facts dynamically (no hardcoding) and appends
// them as an extra sentence so an "Average" composite never silently hides
// a genuinely strong or specific factor.
const KENDRA_H = moduleData.KENDRA_H;
const TRIKONA_H = moduleData.TRIKONA_H;
const DUSTHANA_H = moduleData.DUSTHANA_H;

function lordOf(houseNum, houses) {
  return houses?.find(h => h.number === houseNum)?.lord || null;
}

function placementQualityPhrase(house) {
  if (TRIKONA_H.includes(house)) return 'a Trikona house — a genuinely strong placement';
  if (KENDRA_H.includes(house)) return 'a Kendra house — a stable, supportive placement';
  if (DUSTHANA_H.includes(house)) return 'a Dusthana house — this delays the timing and asks for more effort, it does not remove the outcome';
  return 'a moderate house';
}

export function dynamicFactorNote(area, planets, houses, avData) {
  const pMap = {}; for (const p of (planets||[])) pMap[p.name] = p;
  const avSarva = avData?.raw || avData?.sarva || [];

  if (area === 'marriage') {
    const d7Lord = lordOf(7, houses);
    const d7LordPl = d7Lord ? pMap[d7Lord] : null;
    const venus = pMap['Venus'];
    const venusInOwnHouse = venus && lordOf(venus.house, houses) === 'Venus';
    const parts = [];
    if (venusInOwnHouse) {
      parts.push(`Venus sits in its own house (H${venus.house}) — a classically strong factor for relationship harmony that a single composite score can undersell.`);
    }
    if (d7LordPl) {
      parts.push(`Your 7th-house lord (${d7Lord}) is placed in H${d7LordPl.house}, ${placementQualityPhrase(d7LordPl.house)} for partnership matters.`);
    }
    if (parts.length) return ' ' + parts.join(' ');
  }

  if (area === 'wealth') {
    const av2 = avSarva[1]; // H2 = index 1
    const d2Lord = lordOf(2, houses);
    const d2LordPl = d2Lord ? pMap[d2Lord] : null;
    const parts = [];
    if (av2 != null && av2 >= 30) {
      parts.push(`H2 (wealth) carries ${av2} Ashtakavarga bindus — a strong number suggesting savings and assets hold up well even where the overall composite reads Average.`);
    }
    if (d2LordPl) {
      parts.push(`Your 2nd-house lord (${d2Lord}) sits in H${d2LordPl.house}, ${placementQualityPhrase(d2LordPl.house)} for finances.`);
    }
    if (parts.length) return ' ' + parts.join(' ');
  }

  if (area === 'health') {
    const h6occupants = (planets||[]).filter(p => p.house === 6).map(p => p.name);
    if (h6occupants.includes('Ketu')) {
      return ' Ketu occupies your 6th house — this classically gives sudden, short-lived health disturbances rather than a constant chronic weakness, so expect fluctuation rather than always-average health.';
    }
    if (h6occupants.includes('Rahu')) {
      return ' Rahu occupies your 6th house — watch for unusual, hard-to-diagnose complaints; these tend to respond to lifestyle/diet correction rather than indicating a chronic condition.';
    }
  }

  if (area === 'foreign') {
    const d12Lord = lordOf(12, houses);
    const d12LordPl = d12Lord ? pMap[d12Lord] : null;
    if (d12LordPl?.house === 10) {
      return ` Your 12th-house lord (${d12Lord}) sits in the 10th house — foreign opportunities are specifically likely to arrive THROUGH your career (relocation, an international role, overseas assignment) rather than independently of it.`;
    }
    if (d12LordPl) {
      return ` Your 12th-house lord (${d12Lord}) is placed in H${d12LordPl.house}, ${placementQualityPhrase(d12LordPl.house)} for foreign matters.`;
    }
  }

  if (area === 'children') {
    const d5Lord = lordOf(5, houses);
    const d5LordPl = d5Lord ? pMap[d5Lord] : null;
    if (d5LordPl?.house === 10) {
      return ` Your 5th-house lord (${d5Lord}) sits in the 10th house — classically this indicates children arriving after career is established (delayed timing), not an absence of children.`;
    }
    if (d5LordPl) {
      return ` Your 5th-house lord (${d5Lord}) is placed in H${d5LordPl.house}, ${placementQualityPhrase(d5LordPl.house)} for this area.`;
    }
  }

  return '';
}

export function generateInsights(planets, lifeScores, dashaCurrent, asc, houses, avData) {
  const maha  = dashaCurrent?.mahadasha || 'Saturn';
  const theme = DASHA_THEME[maha] || 'various life matters';
  const insights = {};
  for (const [area, score] of Object.entries(lifeScores)) {
    const tpl = INSIGHT_TEMPLATES[area]?.[score.grade] || `${score.label} shows ${score.grade.toLowerCase()} prospects. The ${maha} Mahadasha emphasises ${theme}.`;
    const base = tpl.replace(/{maha}/g, maha).replace(/{theme}/g, theme);
    insights[area] = base + dynamicFactorNote(area, planets, houses, avData);
  }
  return insights;
}

// ── CONFIDENCE SCORE ──────────────────────────────────────────────────────
export function calcOverallConfidence(planets, shadbala, ayanamsa, quality = {}) {
  // This is calculation/evidence confidence, never prediction accuracy.
  // Input uncertainty must propagate downward: an approximate birth time can
  // move the Ascendant/house cusps and therefore cannot retain the same
  // confidence as a documented exact time.
  let score = 70;
  if (!['lahiri','trueLahiri'].includes(ayanamsa)) score -= 5;
  const avgRatio = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']
    .map(p => shadbala?.[p]?.ratio||0).reduce((a,b)=>a+b,0)/7;
  if (avgRatio>=1.2) score+=5; else if (avgRatio<0.8) score-=5;

  const timeValue = String(quality.birthTimeConfidence?.value || '').toLowerCase();
  const sourceValue = String(quality.sourceQuality?.value || '').toLowerCase();
  if (/approx|estimated|memory|family/.test(timeValue + ' ' + sourceValue)) score -= 15;
  else if (/provided/.test(String(quality.birthTimeConfidence?.status || '').toLowerCase())) score -= 5;
  if ((quality.diagnostics || []).some(d => d?.status === 'ERROR')) score -= 20;

  score = Math.min(95, Math.max(20, score));
  const label = score >= 85 ? 'High' : score >= 70 ? 'Moderate-High' : score >= 55 ? 'Moderate' : score >= 35 ? 'Low' : 'Indicative';
  return {
    score,
    label,
    note: 'Calculation/evidence confidence only. It is not a prediction hit-rate or empirical probability.',
    inputUncertaintyApplied: /approx|estimated|memory|family/.test(timeValue + ' ' + sourceValue),
    calibrationStatus: 'NOT_CALIBRATED',
  };
}
