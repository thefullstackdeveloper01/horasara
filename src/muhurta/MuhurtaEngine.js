import { calcPanchanga } from '../panchanga/panchanga.js';
import { calcPlanetPosition } from '../astronomy/vsop87.js';
import { sunriseSunset } from '../astronomy/utils.js';
import { NAKSHATRAS } from '../astronomy/constants.js';

const BAD_TITHIS = new Set([4, 9, 14]);
const PANCHAKA = new Set(['Dhanishtha', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati']);
const ACTIVITY_NAKSHATRAS = Object.freeze({
  Marriage: new Set(['Rohini','Mrigashira','Magha','Uttara Phalguni','Hasta','Swati','Anuradha','Mula','Uttara Ashadha','Uttara Bhadrapada','Revati']),
  'Business Start': new Set(['Ashwini','Rohini','Mrigashira','Punarvasu','Pushya','Hasta','Chitra','Swati','Anuradha','Shravana']),
  Travel: new Set(['Ashwini','Mrigashira','Punarvasu','Pushya','Hasta','Anuradha','Shravana','Dhanishtha','Revati']),
  Education: new Set(['Ashwini','Mrigashira','Punarvasu','Pushya','Hasta','Chitra','Swati','Shravana','Revati']),
  Medical: new Set(['Ashwini','Pushya','Hasta','Chitra','Swati','Anuradha']),
  'Property Buy': new Set(['Rohini','Uttara Phalguni','Hasta','Swati','Uttara Ashadha','Uttara Bhadrapada'])
});

function taraFromNakshatra(natalIndex, currentIndex) {
  const count = ((currentIndex - natalIndex + 27) % 27) + 1;
  return ((count - 1) % 9) + 1;
}

function chandrabalaFromSigns(natalSign, currentSign) {
  return ((currentSign - natalSign + 12) % 12) + 1;
}

function evaluateMuhurtaFactors({ panchanga, natalMoonNakshatraIndex, natalMoonSignIndex, activity }) {
  const nakIndex = NAKSHATRAS.indexOf(panchanga.nakshatra?.name || panchanga.nakshatra);
  const natalNak = Number(natalMoonNakshatraIndex);
  const natalSign = Number(natalMoonSignIndex);
  const tara = Number.isInteger(natalNak) && Number.isInteger(nakIndex) ? taraFromNakshatra(natalNak, nakIndex) : null;
  const currentSign = Number.isInteger(panchanga.moon?.signIndex) ? panchanga.moon.signIndex : null;
  const chandra = Number.isInteger(natalSign) && Number.isInteger(currentSign) ? chandrabalaFromSigns(natalSign, currentSign) : null;
  const nakName = NAKSHATRAS[nakIndex] || null;
  const tithi = panchanga.tithi?.number ?? panchanga.tithiNum ?? null;
  const panchaka = nakName ? PANCHAKA.has(nakName) : false;
  const activityGood = activity && nakName ? Boolean(ACTIVITY_NAKSHATRAS[activity]?.has(nakName)) : null;

  const factors = [];
  let score = 50;
  if (tara !== null) {
    const favorable = ![3,5,7].includes(tara);
    score += favorable ? 15 : -20;
    factors.push({ name: 'Tarabala', value: tara, status: favorable ? 'FAVORABLE' : 'UNFAVORABLE', rule: 'Vipata/Pratyari/Vadha (3/5/7) are avoided' });
  } else factors.push({ name: 'Tarabala', status: 'NOT_CALCULATED', reason: 'Natal Moon nakshatra is required' });
  if (chandra !== null) {
    const favorable = [1,3,6,7,10,11].includes(chandra);
    score += favorable ? 15 : -15;
    factors.push({ name: 'Chandrabala', value: chandra, status: favorable ? 'FAVORABLE' : 'UNFAVORABLE', rule: '1/3/6/7/10/11 from natal Moon sign are treated as supportive' });
  } else factors.push({ name: 'Chandrabala', status: 'NOT_CALCULATED', reason: 'Natal Moon sign is required' });
  if (panchaka) { score -= 20; factors.push({ name: 'Panchaka', status: 'CAUTION', nakshatra: nakName }); }
  else factors.push({ name: 'Panchaka', status: 'CLEAR', nakshatra: nakName });
  if (Number.isInteger(tithi)) {
    const favorable = !BAD_TITHIS.has(tithi);
    score += favorable ? 5 : -10;
    factors.push({ name: 'Tithi', value: tithi, status: favorable ? 'SUPPORTIVE' : 'CAUTION', rule: 'Rikta tithis 4/9/14 are excluded from the generic score' });
  }
  if (activity) {
    if (activityGood === null) factors.push({ name: 'Activity Nakshatra', status: 'NOT_CALCULATED', reason: `Unknown activity: ${activity}` });
    else { score += activityGood ? 15 : -15; factors.push({ name: 'Activity Nakshatra', activity, status: activityGood ? 'FAVORABLE' : 'UNFAVORABLE', nakshatra: nakName }); }
  }
  return { score: Math.max(0, Math.min(100, score)), factors, nakshatra: nakName, tara, chandrabala: chandra };
}

export function evaluateMuhurtaInstant({ jd, lat, lon, tz, natalMoonNakshatraIndex = null, natalMoonSignIndex = null, activity = null }) {
  if (![jd, lat, lon, tz].every(Number.isFinite)) throw new RangeError('jd, lat, lon and tz are required');
  const sun = calcPlanetPosition('Sun', jd);
  const moon = calcPlanetPosition('Moon', jd);
  if (!sun || !moon) throw new Error('Unable to calculate Sun/Moon positions for Muhurta');
  const p = calcPanchanga(jd, sun.lon, moon.lon, lat, lon, tz, moon.speed, sun.speed);
  p.moon = { signIndex: Math.floor(((moon.lon % 360) + 360) % 360 / 30), longitude: moon.lon };
  const factors = evaluateMuhurtaFactors({ panchanga: p, natalMoonNakshatraIndex, natalMoonSignIndex, activity });
  return Object.freeze({ jd, panchanga: p, sunriseSunset: sunriseSunset(jd, lat, lon), ...factors });
}

export function scanMuhurtaWindows({ startJD, endJD, stepMinutes = 15, lat, lon, tz = 0, natalMoonNakshatraIndex = null, natalMoonSignIndex = null, activity = null }) {
  if (![startJD, endJD, lat, lon, tz].every(Number.isFinite) || endJD < startJD) throw new RangeError('Invalid Muhurta range/location');
  if (!Number.isInteger(stepMinutes) || stepMinutes < 1) throw new RangeError('stepMinutes must be positive');
  const windows = [];
  for (let jd = startJD; jd <= endJD + 1e-10; jd += stepMinutes / 1440) {
    windows.push(evaluateMuhurtaInstant({ jd, lat, lon, tz, natalMoonNakshatraIndex, natalMoonSignIndex, activity }));
  }
  return windows;
}
