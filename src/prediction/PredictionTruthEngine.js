/**
 * Prediction Truth Layer — v1
 * ---------------------------
 * This module does not claim that Jyotish predictions are scientifically
 * proven. It makes the report internally auditable and deterministic:
 * canonical input -> calculated factors -> classical rule -> timing trigger
 * -> evidence score -> status.
 *
 * IMPORTANT: evidenceScore is not probability and never becomes "accuracy %"
 * unless an empirical outcome dataset is supplied and calibrated.
 */
import { EVENT_RULES } from './rules/eventRules.js';
import { getTransitPositions } from '../transit/transits.js';
import { julianDay, jdToDate, signOf, mod360, sunriseSunset } from '../astronomy/utils.js';
import { calcPanchanga } from '../panchanga/panchanga.js';
import { SIGNS, NAKSHATRAS } from '../astronomy/constants.js';
import { findExactEventWindows } from './exactEventForecast.js';
import { buildEventPrediction } from './EventPredictionEngine.js';

const EVENT_CONFIG = Object.freeze({
  marriage: {
    label: 'Marriage / Partnership',
    houses: [5, 7, 11],
    transitPlanets: ['Jupiter', 'Venus', 'Saturn', 'Moon'],
    supportingDasha: ['Venus', 'Jupiter', 'Moon', 'Rahu'],
  },
  career: {
    label: 'Career / Promotion / Business',
    houses: [2, 6, 10, 11],
    transitPlanets: ['Jupiter', 'Saturn', 'Sun', 'Mercury', 'Rahu'],
    supportingDasha: ['Sun', 'Saturn', 'Mercury', 'Jupiter', 'Rahu'],
  },
  wealth: {
    label: 'Wealth / Income',
    houses: [2, 5, 9, 11],
    transitPlanets: ['Jupiter', 'Venus', 'Mercury', 'Saturn'],
    supportingDasha: ['Jupiter', 'Venus', 'Mercury', 'Moon'],
  },
  property: {
    label: 'Property / Home',
    houses: [2, 4, 11],
    transitPlanets: ['Jupiter', 'Mars', 'Venus', 'Moon', 'Saturn'],
    supportingDasha: ['Mars', 'Moon', 'Venus', 'Jupiter', 'Saturn'],
  },
  children: {
    label: 'Children / Creativity',
    houses: [2, 5, 9, 11],
    transitPlanets: ['Jupiter', 'Venus', 'Moon'],
    supportingDasha: ['Jupiter', 'Venus', 'Moon', 'Sun'],
  },
  foreign: {
    label: 'Foreign Travel / Relocation',
    houses: [3, 9, 12],
    transitPlanets: ['Rahu', 'Jupiter', 'Saturn', 'Mercury'],
    supportingDasha: ['Rahu', 'Saturn', 'Mercury', 'Jupiter'],
  },
  spirituality: {
    label: 'Spiritual / Inner Development',
    houses: [5, 8, 9, 12],
    transitPlanets: ['Jupiter', 'Saturn', 'Ketu'],
    supportingDasha: ['Ketu', 'Jupiter', 'Saturn'],
  },
  health: {
    label: 'Health / Vitality Monitoring',
    houses: [1, 6, 8, 12],
    transitPlanets: ['Saturn', 'Mars', 'Rahu', 'Sun'],
    supportingDasha: ['Saturn', 'Mars', 'Rahu', 'Ketu'],
  },
});

function clamp(n, lo=0, hi=100) { return Math.max(lo, Math.min(hi, n)); }
function isoDate(jd) {
  const d = jdToDate(jd);
  return `${String(d.year).padStart(4,'0')}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}`;
}
function localDateParts(jd, tz) {
  return jdToDate(jd + tz / 24);
}
function houseFromSign(transitSign, natalSign) { return ((transitSign - natalSign + 12) % 12) + 1; }
function angularSeparation(a,b){ const d=Math.abs(((a-b)%360+360)%360); return Math.min(d,360-d); }
function exactTransitAspects(transitPlanet, transitLon, natalTargets){
  const angles = transitPlanet==='Jupiter' ? [0,120,180] : transitPlanet==='Saturn' ? [0,60,90,180] : transitPlanet==='Mars' ? [0,90,150,180] : [0,180];
  const hits=[]; for(const n of natalTargets){ for(const angle of angles){ const sep=angularSeparation(transitLon,n.lon); const dev=Math.abs(sep-angle); if(dev<=3) hits.push({target:n.planet,house:n.house,angle,separation:Number(sep.toFixed(3)),orb:Number(dev.toFixed(3))}); } }
  return hits;
}
function currentOrNextDasha(timeline=[], nowJD) {
  return timeline.find(d => d.startJD <= nowJD && nowJD < d.endJD)
      || timeline.find(d => d.startJD > nowJD)
      || null;
}
function dashaStatus(d, nowJD) {
  return d.endJD <= nowJD ? 'PAST' : d.startJD <= nowJD ? 'ACTIVE' : 'UPCOMING';
}
function eventRuleMatches(rule, planets) {
  try { return Boolean(rule.test(planets)); } catch { return false; }
}

function ruleEvidence(rule, planets, dasha, area) {
  const cfg = EVENT_CONFIG[area] || { houses: [], supportingDasha: [] };
  const matchedPlanet = (rule.lords || []).find(name => planets.some(p => p.name === name));
  const dashaLord = dasha?.mahadasha;
  const dashaSupport = cfg.supportingDasha.includes(dashaLord);
  let score = Number(rule.conf || 50);
  if (dashaSupport) score += 8;
  const areaPlanets = planets.filter(p => cfg.houses.includes(p.house));
  if (areaPlanets.length) score += Math.min(10, areaPlanets.length * 3);
  return {
    ruleId: rule.event,
    classicalRuleScore: clamp(score),
    dashaSupport,
    matchedPlanet,
    houseEvidence: areaPlanets.map(p => ({ planet: p.name, house: p.house, sign: p.sign })),
  };
}

/**
 * Find concrete future windows for an event. The scan is intentionally
 * event-specific: a career event does not borrow a random marriage transit.
 * Windows are generated from actual daily transit positions and grouped into
 * contiguous 3-day sampling runs. This avoids the previous "first two global
 * transit triggers" shortcut.
 */
export function findEventWindows({
  area, planets, ascendantLon, moonLon, currentJD, horizonDays=365,
  stepDays=1, dashaTimeline=[], ayanamsa=0, customConfig=null, timezoneHours=0,
}={}) {
  const cfg = customConfig || EVENT_CONFIG[area];
  if (!cfg) return [];
  return findExactEventWindows({
    config: cfg,
    planets,
    ascendantLon,
    moonLon,
    currentJD,
    horizonDays,
    stepDays,
    dashaTimeline,
    ayanamsa,
    timezoneHours,
  });
}

export function buildPredictionTruth({
  planets=[], houses=[], dasha={}, currentJD, ascendantLon=0, moonLon=0,
  ayanamsa=0, diagnostics=[], metadata={}, birthFacts=null,
}={}) {
  const timeline = dasha?.timeline || [];
  const currentDasha = currentOrNextDasha(timeline, currentJD);
  // Forecast windows are expensive because they perform numerical transit
  // scans. Compute them once per event area, not once per matching rule.
  // This fixes a major O(rules * planets * horizon) performance multiplier.
  const areaWindowCache = new Map();
  const getAreaWindows = area => {
    if (!EVENT_CONFIG[area]) return [];
    if (!areaWindowCache.has(area)) {
      areaWindowCache.set(area, findEventWindows({
        area, planets, ascendantLon, moonLon, currentJD, ayanamsa,
        dashaTimeline: timeline, horizonDays: 365,
        timezoneHours: Number(metadata?.tz) || 0,
      }));
    }
    return areaWindowCache.get(area);
  };
  const matchedRules = EVENT_RULES
    .filter(rule => eventRuleMatches(rule, planets))
    .map(rule => {
      const area = rule.area || 'general';
      const evidence = ruleEvidence(rule, planets, currentDasha, area);
      const windows = getAreaWindows(area);
      const periods = timeline
        .filter(p => (rule.lords || []).includes(p.mahadasha))
        .map(p => ({
          mahadasha: p.mahadasha, start: p.start, end: p.end,
          startJD: p.startJD, endJD: p.endJD, status: dashaStatus(p, currentJD),
        }));
      return {
        event: rule.event, area, description: rule.description || rule.desc,
        evidence, windows, dashaPeriods: periods,
        status: windows.length ? 'TIMED_INDICATION' : periods.length ? 'DASHA_INDICATION' : 'RULE_MATCH_ONLY',
        notProbability: true,
      };
    });

  const inputTime = metadata?.birthTimeConfidence?.value || metadata?.birthTimeConfidence?.status || 'NOT_AVAILABLE';
  const timeFactor = /exact|certificate|record/i.test(String(inputTime)) ? 1 : /approx|memory|estimated/i.test(String(inputTime)) ? 0.65 : 0.5;
  const predictionByArea = [...new Set(matchedRules.map(r => r.area).filter(a => EVENT_CONFIG[a]))].map(area => {
    const areaRules = matchedRules.filter(r => r.area === area);
    const cfg = EVENT_CONFIG[area];
    const windows = getAreaWindows(area);
    const highSensitivity = planets.some(p => ['D60', 'high-sensitivity'].includes(p?.sensitivityTag));
    return buildEventPrediction({
      event: area,
      ruleMatches: areaRules,
      windows,
      dashaTimeline: timeline,
      currentJD,
      supportingDasha: cfg.supportingDasha,
      birthTimeConfidence: inputTime,
      highSensitivity,
      method: metadata?.methodology || 'PARASHARI',
    });
  });
  const diagnosticErrors = diagnostics.filter(d => d?.status === 'ERROR');
  const calculation = {
    status: diagnosticErrors.length ? 'DEGRADED' : 'PASS',
    errorCount: diagnosticErrors.length,
    inputTimeFactor: timeFactor,
    ephemeris: metadata?.ephemeris || null,
    manifest: metadata?.manifest || null,
  };

  return Object.freeze({
    version: 1,
    generatedAt: new Date().toISOString(),
    calculation,
    currentDasha: currentDasha ? { mahadasha: currentDasha.mahadasha, antardasha: currentDasha.antardasha, status: 'ACTIVE' } : null,
    events: matchedRules,
    predictions: predictionByArea,
    calibration: {
      status: 'NOT_CALIBRATED',
      accuracy: null,
      probability: null,
      reason: 'No labeled real-world outcome dataset was supplied. Evidence scores are deterministic rule-strength scores, not empirical hit-rates.',
      requiredForCalibration: ['outcome date/status', 'prediction timestamp', 'prediction version', 'event definition', 'observed result'],
    },
    audit: {
      canonicalMoon: birthFacts?.moon || null,
      canonicalAscendant: birthFacts?.ascendant || null,
      diagnostics: diagnostics,
    },
  });
}

export function buildRemedySchedule({ lat, lon, tz, currentJD, remedies=[] }={}) {
  if (![lat, lon, tz, currentJD].every(Number.isFinite)) return { status:'NOT_AVAILABLE', reason:'Location and current time are required.' };
  const rows=[];
  for (let i=0;i<14;i++) {
    const jd=currentJD+i;
    try {
      const trans = getTransitPositions(jd, 0);
      const sun=trans.Sun, moon=trans.Moon;
      if (!sun || !moon) continue;
      const p=calcPanchanga(jd, sun.siderealLon ?? sun.longitude, moon.siderealLon ?? moon.longitude, lat, lon, tz, moon.speed, sun.speed);
      const ss=sunriseSunset(jd,lat,lon);
      const day = localDateParts(jd,tz);
      const weekday=day ? new Date(Date.UTC(day.year,day.month-1,day.day)).getUTCDay() : null;
      const target = remedies.find(r => r.weekday===weekday) || remedies[0];
      if (!target) continue;
      const sunriseLocal = ss?.sunrise != null ? jdToDate(ss.sunrise + tz/24) : null;
      const sunsetLocal = ss?.sunset != null ? jdToDate(ss.sunset + tz/24) : null;
      const addMinutes = (x, mins) => {
        if (!x) return null;
        const total = x.hour * 60 + x.min + mins;
        return { hour: Math.floor((total / 60) % 24), min: total % 60 };
      };
      const fmt = x => x ? `${String(x.hour).padStart(2,'0')}:${String(x.min).padStart(2,'0')}` : null;
      const rahu = p.rahuKaal;
      const sunriseEnd = addMinutes(sunriseLocal, 48);
      const sunsetEnd = addMinutes(sunsetLocal, 48);
      rows.push({
        date:`${day.year}-${String(day.month).padStart(2,'0')}-${String(day.day).padStart(2,'0')}`,
        weekday:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][weekday],
        planet:target.planet, practice:target.practice,
        japaWindow: sunriseLocal && sunriseEnd ? `${fmt(sunriseLocal)}–${fmt(sunriseEnd)} (first 48 min after sunrise)` : 'NOT_AVAILABLE',
        daanWindow: sunsetLocal && sunsetEnd ? `${fmt(sunsetLocal)}–${fmt(sunsetEnd)} (first 48 min after sunset; avoid Rahu Kaal if it overlaps)` : 'NOT_AVAILABLE',
        rahuKaal: rahu || null,
        status:'TRADITIONAL_TIMING_GUIDANCE',
      });
    } catch {}
  }
  return {status:rows.length?'AVAILABLE':'NOT_AVAILABLE', rows, note:'Muhurtas are calculated from the selected birthplace/date. Timing is traditional guidance, not a guaranteed outcome.'};
}
