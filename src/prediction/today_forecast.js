/**
 * today_forecast.js — "What will happen today" prediction.
 *
 * Single responsibility: combine today's real Panchanga, today's transiting
 * Moon/planets, and the person's currently-running dasha period into one
 * concrete, dated forecast — the kind of "does this app actually know what's
 * happening right now" proof-point users check first.
 *
 * Every number here is freshly calculated for "now" (not cached from birth).
 */
import { getAllPlanetPositions } from '../astronomy/vsop87.js';
import { julianDay, deltaT, signOf, getAyanamsa, mod360, formatDMS, jdToDate } from '../astronomy/utils.js';
import { calcPanchanga } from '../panchanga/panchanga.js';
import { SIGNS } from '../astronomy/constants.js';

// Some entries in dasha_meanings.json fold a Mahadasha-duration fact into
// the "advice" text (e.g. Saturn's "Longest dasha — 19 years..."). That's
// only true when the ruling period IS that planet's own Mahadasha — shown
// for a much shorter Antardasha/Pratyantardasha, the duration is wrong and
// misleading, so it's stripped whenever the ruling lord isn't the current
// Mahadasha lord itself.
function contextualAdvice(advice, isMahadashaLevel) {
  if (!advice) return advice;
  if (isMahadashaLevel) return advice;
  return advice.replace(/^[A-Za-z\s]+dasha\s*—\s*\d+\s*years?\.\s*/i, '');
}

export function buildTodayForecast(natalPlanets, natalAsc, moonSignIdx, dashaCurrent, lat, lon, tz, AYANAMSA, dashaMeaningsData, canonicalTransitSnapshot = null) {
  const lines = [];
  const push = (s = '') => lines.push(s);

  let now, nowJD, sunSid, moonSid, pos;
  if (canonicalTransitSnapshot?.jd != null && canonicalTransitSnapshot?.planets) {
    nowJD = canonicalTransitSnapshot.jd;
    const d = jdToDate(nowJD);
    now = new Date(Date.UTC(d.year, d.month - 1, d.day, d.hour || 0, d.minute || 0, d.second || 0));
    sunSid = mod360(canonicalTransitSnapshot.planets.Sun?.siderealLon ?? 0);
    moonSid = mod360(canonicalTransitSnapshot.planets.Moon?.siderealLon ?? 0);
    pos = canonicalTransitSnapshot.planets;
  } else {
    now = new Date();
    const nowUTC_H = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
    nowJD = julianDay(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), nowUTC_H);
    const dT = deltaT(now.getUTCFullYear());
    const jdt = nowJD + dT / 86400;
    const ay = getAyanamsa(AYANAMSA, jdt);
    pos = getAllPlanetPositions(jdt, 0);
    sunSid = mod360(pos.Sun.longitude);
    moonSid = mod360(pos.Moon.longitude);
  }

  let pg;
  try {
    pg = calcPanchanga(nowJD, sunSid, moonSid, lat, lon, tz, pos.Moon?.speed, pos.Sun?.speed);
  } catch (e) { pg = null; }

  push(`  Date: ${now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
  push('');

  if (pg) {
    push(`  Tithi: ${pg.tithi.name} (${pg.tithi.paksha})   Nakshatra: ${pg.nakshatra.name} Pada ${pg.nakshatra.pada}   Yoga: ${pg.yoga.name}   Karana: ${pg.karana.name}`);
    push('');
  }

  // Transiting Moon vs natal Moon — house-from-Moon (the classical daily indicator)
  const transMoonSign = signOf(moonSid);
  const houseFromMoon = ((transMoonSign - moonSignIdx + 12) % 12) + 1;
  const houseFromAsc = ((transMoonSign - signOf(natalAsc) + 12) % 12) + 1;
  const GOOD_HOUSES_FROM_MOON = [1, 3, 6, 7, 10, 11];
  const moonFavorable = GOOD_HOUSES_FROM_MOON.includes(houseFromMoon);

  push(`  Moon is transiting ${SIGNS[transMoonSign]} today — ${houseFromMoon}${ordinal(houseFromMoon)} house from your natal Moon, ${houseFromAsc}${ordinal(houseFromAsc)} house from your Ascendant.`);
  push(`  General mood today: ${moonFavorable ? 'Favorable — good for starting tasks, communication, meeting people.' : 'Introspective/low-key — better for rest, planning, and finishing pending work than starting new things.'}`);
  push('');

  // Running dasha right now
  if (dashaCurrent) {
    push(`  Currently running: ${dashaCurrent.mahadasha} Mahadasha → ${dashaCurrent.antardasha} Antardasha → ${dashaCurrent.pratyantar} Pratyantardasha`);
    const meaning = dashaMeaningsData?.[dashaCurrent.pratyantar];
    if (meaning) {
      push(`  Today's ruling energy (${dashaCurrent.pratyantar}): ${meaning.keywords_positive?.slice(0, 3).join(', ')}`);
      if (meaning.advice) push(`  Guidance: ${contextualAdvice(meaning.advice, dashaCurrent.pratyantar === dashaCurrent.mahadasha)}`);
    }
    push('');
  }

  push(`  ${moonFavorable && dashaCurrent ? '✓ Overall, today leans favorable for action.' : '➜ Take today at a measured pace — consolidate rather than launch.'}`);

  return lines;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
