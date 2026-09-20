/**
 * Exact calendar-date event forecasting.
 *
 * Purpose: convert a classical event rule + real natal factors into dated
 * transit activation windows. This module never invents a date from a
 * fixed "planet spends N days in a sign" multiplier. Every boundary is
 * bracketed against the same transit ephemeris used by the chart and then
 * refined numerically.
 *
 * Important: a date is a calculated astronomical activation date, not a
 * guaranteed real-world event date. Jyotish rules are interpretive and are
 * not empirically proven to predict outcomes with 100% accuracy.
 */
import { getTransitPositions } from '../transit/transits.js';
import { jdToDate, signOf, mod360 } from '../astronomy/utils.js';
import { SIGNS } from '../astronomy/constants.js';

const TRACKED = Object.freeze(['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu']);

function angularDifference(a, b) {
  let d = mod360(a - b);
  if (d > 180) d -= 360;
  return d;
}

function aspectAngles(planet) {
  // Sign-based Vedic graha drishti expressed as ecliptic angles:
  // all -> 7th (180°); Mars -> 4th/8th (90°/210°);
  // Jupiter -> 5th/9th (120°/240°); Saturn -> 3rd/10th (60°/270°).
  const special = {
    Mars: [90, 210],
    Jupiter: [120, 240],
    Saturn: [60, 270],
  };
  return [180, ...(special[planet] || [])];
}

function houseFromSign(transitSign, natalSign) {
  return ((transitSign - natalSign + 12) % 12) + 1;
}

function localDateParts(jd, timezoneHours = 0) {
  return jdToDate(jd + timezoneHours / 24);
}

function localIso(jd, timezoneHours = 0) {
  // §40: a non-finite JD is missing data, not a date. Never emit "0NaN-NaN-NaN".
  if (!Number.isFinite(jd)) return 'NOT_CALCULATED';
  const d = localDateParts(jd, timezoneHours);
  if (!Number.isFinite(d?.year)) return 'NOT_CALCULATED';
  return `${String(d.year).padStart(4,'0')}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}`;
}

function localDateTime(jd, timezoneHours = 0) {
  if (!Number.isFinite(jd)) return 'NOT_CALCULATED';
  const d = localDateParts(jd, timezoneHours);
  if (!Number.isFinite(d?.year)) return 'NOT_CALCULATED';
  return `${String(d.year).padStart(4,'0')}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}T${String(d.hour).padStart(2,'0')}:${String(d.min).padStart(2,'0')}:${String(d.sec).padStart(2,'0')}`;
}

function refineBooleanBoundary(jd0, jd1, stateFn) {
  let a = jd0, b = jd1, sa = Boolean(stateFn(a));
  for (let i = 0; i < 34; i++) {
    const m = (a + b) / 2;
    const sm = Boolean(stateFn(m));
    if (sm === sa) a = m; else b = m;
  }
  return (a + b) / 2;
}

function refineRoot(jd0, jd1, rootFn) {
  let a = jd0, b = jd1, fa = rootFn(a), fb = rootFn(b);
  if (!Number.isFinite(fa) || !Number.isFinite(fb)) return (a+b)/2;
  if (Math.abs(fa) < 1e-9) return a;
  if (Math.abs(fb) < 1e-9) return b;
  if (fa * fb > 0) return Math.abs(fa) < Math.abs(fb) ? a : b;
  for (let i = 0; i < 40; i++) {
    const m = (a+b)/2, fm = rootFn(m);
    if (!Number.isFinite(fm)) return (a+b)/2;
    if (fa * fm <= 0) { b=m; fb=fm; } else { a=m; fa=fm; }
  }
  return (a+b)/2;
}

function makePositionGetter(ayanamsa) {
  const cache = new Map();
  return jd => {
    // 1e-7 day (~0.009 s) keying prevents duplicate ephemeris calls during
    // numerical refinement without materially changing the astronomical input.
    const key = Math.round(jd * 1e7);
    if (!cache.has(key)) cache.set(key, getTransitPositions(jd, ayanamsa));
    return cache.get(key);
  };
}

function houseActivation(getPositions, jd, planet, natalAscSign, natalMoonSign, relevantHouses) {
  const t = getPositions(jd)?.[planet];
  if (!t) return { active:false, hAsc:null, hMoon:null, sign:null };
  const sign = signOf(Number(t.siderealLon));
  const hAsc = houseFromSign(sign, natalAscSign);
  const hMoon = houseFromSign(sign, natalMoonSign);
  return {
    active: relevantHouses.includes(hAsc) || relevantHouses.includes(hMoon),
    hAsc, hMoon, sign,
  };
}

function findHouseIntervals({
  getPositions, planet, currentJD, horizonDays, stepDays,
  natalAscSign, natalMoonSign, relevantHouses,
}) {
  const intervals = [];
  const stateAt = jd => houseActivation(getPositions, jd, planet, natalAscSign, natalMoonSign, relevantHouses).active;
  let prevJD = currentJD;
  let prevState = stateAt(prevJD);
  let start = prevState ? currentJD : null;

  for (let offset = stepDays; offset <= horizonDays + 1e-9; offset += stepDays) {
    const jd = Math.min(currentJD + offset, currentJD + horizonDays);
    const state = stateAt(jd);
    if (state !== prevState) {
      const boundary = refineBooleanBoundary(prevJD, jd, stateAt);
      if (state) start = boundary;
      else if (start != null) {
        intervals.push({ startJD:start, endJD:boundary, planet });
        start = null;
      }
    }
    prevJD = jd;
    prevState = state;
    if (jd >= currentJD + horizonDays) break;
  }
  if (start != null) intervals.push({ startJD:start, endJD:currentJD+horizonDays, planet });
  return intervals;
}

function findDegreeAspects({
  getPositions, planet, natalTargets, currentJD, horizonDays, stepDays,
}) {
  const hits = [];
  if (!natalTargets.length) return hits;
  const stateStep = Math.max(0.25, Math.min(stepDays, 1));
  for (const target of natalTargets) {
    for (const angle of aspectAngles(planet)) {
      const rootFn = jd => {
        const lon = getPositions(jd)?.[planet]?.siderealLon;
        if (!Number.isFinite(lon)) return NaN;
        // One signed root for angle and its 360° representation.
        return angularDifference(Number(lon) - Number(target.lon), angle);
      };
      let prevJD = currentJD;
      let prevF = rootFn(prevJD);
      if (!Number.isFinite(prevF)) continue;
      for (let offset=stateStep; offset<=horizonDays+1e-9; offset+=stateStep) {
        const jd=Math.min(currentJD+offset,currentJD+horizonDays);
        const f=rootFn(jd);
        if (Number.isFinite(f) && prevF*f <= 0 && Math.abs(prevF-f) < 180) {
          const hitJD=refineRoot(prevJD,jd,rootFn);
          hits.push({
            planet,target:target.planet,house:target.house,angle,
            jd:hitJD, orb:0, type:'EXACT_DEGREE_ASPECT'
          });
        }
        prevJD=jd; prevF=f;
        if (jd>=currentJD+horizonDays) break;
      }
    }
  }
  // Deduplicate numerical double-hits around the same root.
  return [...new Map(hits.map(h=>[
    `${h.planet}|${h.target}|${h.angle}|${Math.round(h.jd*1e5)}`,h
  ])).values()];
}

function activeDashaAt(timeline, jd) {
  return timeline.find(p => p.startJD <= jd && jd < p.endJD) || null;
}

function scoreWindow({ houseCount, aspectCount, dashaSupport }) {
  return Math.min(95, 50 + houseCount*5 + aspectCount*8 + (dashaSupport ? 12 : 0));
}

export function findExactEventWindows({
  config,
  planets=[],
  ascendantLon=0,
  moonLon=0,
  currentJD,
  horizonDays=365,
  stepDays=1,
  dashaTimeline=[],
  ayanamsa=0,
  timezoneHours=0,
}={}) {
  if (!config || !Number.isFinite(currentJD)) return [];
  const getPositions=makePositionGetter(ayanamsa);
  const natalAscSign=signOf(ascendantLon);
  const natalMoonSign=signOf(moonLon);
  const houses=[...(config.houses || [])];
  if (!houses.length) return [];

  const transitPlanets=(config.transitPlanets?.length ? config.transitPlanets : TRACKED)
    .filter(p=>TRACKED.includes(p));
  const targetPlanets=(planets||[])
    .filter(p=>p && Number.isFinite(Number(p.siderealLon)) && houses.includes(Number(p.house)))
    .map(p=>({planet:p.name,house:Number(p.house),lon:Number(p.siderealLon)}));

  const allIntervals=[];
  const allAspects=[];
  const perPlanetStep={
    Moon:0.25, Sun:0.5, Mercury:0.5, Venus:0.5, Mars:1,
    Jupiter:1, Saturn:1, Rahu:1, Ketu:1,
  };

  for (const planet of transitPlanets) {
    const step=Math.min(stepDays, perPlanetStep[planet] || 1);
    allIntervals.push(...findHouseIntervals({
      getPositions,planet,currentJD,horizonDays,step,
      natalAscSign,natalMoonSign,relevantHouses:houses,
    }).map(x=>({...x, kind:'HOUSE_ACTIVATION'})));
    allAspects.push(...findDegreeAspects({
      getPositions,planet,natalTargets:targetPlanets,
      currentJD,horizonDays,stepDays:step,
    }));
  }

  // Convert intervals + exact aspect roots into event windows. A house
  // activation is a real ingress/egress interval; an exact aspect is a
  // point trigger. Merge overlapping/nearby evidence rather than inventing
  // a fixed +/-15 day window.
  // BUG FIX (§4 NaN): these point-items previously carried only startJD/endJD,
  // but the trigger builder below reads `x.jd` — which was therefore undefined,
  // so jdToDate(NaN) produced the literal dates "0NaN-NaN-NaN" and
  // "0NaN-NaN-NaNTNaN:NaN:NaN" on every exact aspect in the forecast.
  const points=allAspects.map(a=>({
    jd:a.jd,startJD:a.jd,endJD:a.jd,kind:'EXACT_DEGREE_ASPECT',planet:a.planet,
    target:a.target,house:a.house,angle:a.angle
  }));
  const candidates=[...allIntervals,...points].sort((a,b)=>a.startJD-b.startJD);
  const windows=[];

  for (const c of candidates) {
    const last=windows[windows.length-1];
    const gap=last ? c.startJD-last.endJD : Infinity;
    if (last && gap <= 2) {
      last.endJD=Math.max(last.endJD,c.endJD);
      last.items.push(c);
    } else {
      windows.push({startJD:c.startJD,endJD:c.endJD,items:[c]});
    }
  }

  return windows.map(w=>{
    const planetsSeen=[...new Set(w.items.map(x=>x.planet))];
    const aspectItems=w.items.filter(x=>x.kind==='EXACT_DEGREE_ASPECT');
    const dasha=activeDashaAt(dashaTimeline,w.startJD);
    const dashaSupport=Boolean(dasha && (config.supportingDasha||[]).includes(dasha.mahadasha));
    const score=scoreWindow({
      houseCount:w.items.filter(x=>x.kind==='HOUSE_ACTIVATION').length,
      aspectCount:aspectItems.length,
      dashaSupport,
    });
    return {
      start:localIso(w.startJD,timezoneHours),
      end:localIso(w.endJD,timezoneHours),
      startDateTime:localDateTime(w.startJD,timezoneHours),
      endDateTime:localDateTime(w.endJD,timezoneHours),
      startJD:w.startJD,
      endJD:w.endJD,
      evidenceScore:score,
      confidenceLabel:score>=75?'High evidence':score>=60?'Moderate evidence':'Indicative evidence',
      dasha:dasha?.mahadasha || null,
      dashaSupport,
      durationDays:Math.max(1,Math.ceil(w.endJD-w.startJD)),
      activationType:aspectItems.length && w.items.some(x=>x.kind==='HOUSE_ACTIVATION')
        ? 'HOUSE_INGRESS_PLUS_EXACT_NATAL_ASPECT'
        : aspectItems.length ? 'EXACT_TRANSIT_TO_NATAL_EVENT_FACTOR'
        : 'HOUSE_INGRESS_ACTIVATION',
      triggers:planetsSeen.map(planet=>{
        const hs=w.items.filter(x=>x.planet===planet && x.kind==='HOUSE_ACTIVATION');
        const ex=w.items.filter(x=>x.planet===planet && x.kind==='EXACT_DEGREE_ASPECT');
        return {
          planet,
          houseFromAsc:[...new Set(hs.map(x=>houseActivation(getPositions,x.startJD,planet,natalAscSign,natalMoonSign,houses).hAsc).filter(Boolean))],
          houseFromMoon:[...new Set(hs.map(x=>houseActivation(getPositions,x.startJD,planet,natalAscSign,natalMoonSign,houses).hMoon).filter(Boolean))],
          exactAspects:ex.map(x=>({target:x.target,house:x.house,angle:x.angle,orb:0,date:localIso(x.jd,timezoneHours),dateTime:localDateTime(x.jd,timezoneHours)})),
          signs:[...new Set(hs.map(x=>SIGNS[houseActivation(getPositions,x.startJD,planet,natalAscSign,natalMoonSign,houses).sign]).filter(Boolean))]
        };
      }),
      exactTriggers:aspectItems.map(x=>({
        planet:x.planet,target:x.target,house:x.house,angle:x.angle,
        date:localIso(x.startJD,timezoneHours),dateTime:localDateTime(x.startJD,timezoneHours),orb:0
      })).slice(0,12),
    };
  }).filter(w=>w.endJD>=currentJD && w.startJD<=currentJD+horizonDays)
    .sort((a,b)=>b.evidenceScore-a.evidenceScore || a.start.localeCompare(b.start))
    .slice(0,48);
}
