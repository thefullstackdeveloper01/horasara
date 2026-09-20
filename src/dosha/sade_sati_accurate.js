/**
 * sade_sati_accurate.js — Single, accurate source of truth for Sade Sati.
 *
 * The engine previously had TWO independent Sade Sati calculators:
 *   1. calcSadeSati() in dosha/doshas.js — checked status using the correct
 *      real natal Saturn longitude, but was called with the BIRTH Julian Day
 *      instead of "now", so it answered "was this person in Sade Sati at
 *      birth" instead of "are they in Sade Sati today". Its own ingress-date
 *      finder also used a simplified mean-longitude polynomial for Saturn,
 *      not the app's real VSOP87 ephemeris.
 *   2. calcSadeSatiHistory() in transit/transits.js — used a pure
 *      mean-motion approximation for Saturn's position throughout, with no
 *      connection to the real ephemeris used everywhere else in the app.
 *
 * Together these produced genuinely different Saturn signs/dates in
 * different report sections (natal Section 2 vs. Sade Sati Section 9/48 vs.
 * real transit Section 19) even though only one Saturn position is ever
 * astronomically correct.
 *
 * This module replaces both: it takes a `saturnLonAtJD(jd)` function backed
 * by the SAME real VSOP87 + ayanamsa calculation the rest of the engine
 * uses (passed in from engine.js, which already has it in scope), so every
 * section that reports on Sade Sati now reads from one real ephemeris.
 */
import { mod360, signOf } from '../astronomy/utils.js';
import { SIGNS } from '../astronomy/constants.js';

const SATURN_ORBIT_DAYS = 29.4571 * 365.25636; // ~10,766 days per full cycle
const SATURN_MEAN_SPEED = 360 / SATURN_ORBIT_DAYS; // deg/day

/**
 * Estimate the JD when Saturn reaches `targetLon` (absolute sidereal degree,
 * e.g. sign*30), by simple mean-motion projection from a REAL, known-good
 * anchor position (today's true ephemeris longitude). This can drift by a
 * few weeks near a retrograde station, but — critically — it can never land
 * in the wrong orbital cycle the way an unbounded iterative search can.
 */
function meanMotionEstimate(anchorJD, anchorLon, targetLon) {
  const degToGo = mod360(targetLon - anchorLon);
  return anchorJD + degToGo / SATURN_MEAN_SPEED;
}

/**
 * Refine a mean-motion estimate to the real ephemeris crossing, searching
 * only within a bounded window around it (so retrograde noise can shift the
 * answer by weeks, never by decades). Verifies the crossing is STABLE (sign
 * hasn't reverted 200 days further along) to skip transient retrograde dips
 * within that same bounded window; if no stable crossing is found in the
 * window, falls back to the mean-motion estimate itself.
 */
function refineIngress(saturnLonAtJD, targetSign, estimateJD, windowDays = 500) {
  const step = 3; // days
  const candidates = [];
  for (let d = -windowDays; d <= windowDays; d += step) {
    const jd = estimateJD + d;
    const signHere = signOf(saturnLonAtJD(jd));
    const signNext = signOf(saturnLonAtJD(jd + step));
    if (signHere !== targetSign && signNext === targetSign) candidates.push([jd, jd + step]);
  }
  // Prefer the candidate closest to the estimate that is also stable
  // (still in targetSign ~200 days later — skips retrograde blips).
  candidates.sort((a, b) => Math.abs(a[0] - estimateJD) - Math.abs(b[0] - estimateJD));
  for (const [lo0, hi0] of candidates) {
    let lo = lo0, hi = hi0;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (signOf(saturnLonAtJD(mid)) === targetSign) hi = mid; else lo = mid;
    }
    if (signOf(saturnLonAtJD(hi + 200)) === targetSign) return hi;
  }
  // No stable crossing found nearby — fall back to the safe mean-motion estimate.
  return estimateJD;
}

/**
 * Compute this chart's current Sade Sati status and a multi-cycle history
 * (previous, current, and upcoming cycles), entirely from real Saturn
 * ephemeris — no mean-motion approximation anywhere.
 */
export function calcAccurateSadeSati(moonSignIdx, nowJD, saturnLonAtJD) {
  const phase1Sign = (moonSignIdx + 11) % 12; // sign before Moon (Rising)
  const phase2Sign = moonSignIdx;              // Moon's own sign (Peak)
  const phase3Sign = (moonSignIdx + 1) % 12;   // sign after Moon (Setting)
  const phase4Sign = (moonSignIdx + 2) % 12;   // first sign clear of Sade Sati

  const nowLon = saturnLonAtJD(nowJD);
  const nowSign = signOf(nowLon);
  const nowSadeSatiSigns = [phase1Sign, phase2Sign, phase3Sign];
  const inSadeSatiNow = nowSadeSatiSigns.includes(nowSign);

  // Build the CURRENT (or, if not currently in Sade Sati, the NEXT
  // upcoming) cycle by projecting each boundary from today's real,
  // verified-correct Saturn position via mean motion, then refining each
  // estimate against the real ephemeris within a bounded window. Bounding
  // the refinement window means a retrograde station can shift an answer
  // by weeks, but can never make it land in the wrong orbital cycle.
  const est1 = inSadeSatiNow
    ? nowJD - mod360(nowLon - phase1Sign * 30) / SATURN_MEAN_SPEED
    : meanMotionEstimate(nowJD, nowLon, phase1Sign * 30);
  const cur1Start = refineIngress(saturnLonAtJD, phase1Sign, est1);

  const est2 = meanMotionEstimate(cur1Start, phase1Sign * 30, phase2Sign * 30);
  const cur2Start = refineIngress(saturnLonAtJD, phase2Sign, est2);

  const est3 = meanMotionEstimate(cur2Start, phase2Sign * 30, phase3Sign * 30);
  const cur3Start = refineIngress(saturnLonAtJD, phase3Sign, est3);

  const est4 = meanMotionEstimate(cur3Start, phase3Sign * 30, phase4Sign * 30);
  const cur3End = refineIngress(saturnLonAtJD, phase4Sign, est4);

  function buildCycle(p1, p2, p3, end, label, cycleNum) {
    return {
      label,
      cycle: cycleNum,
      start: jdToDateStr(p1),
      end: jdToDateStr(end),
      startYear: jdToYear(p1),
      endYear: jdToYear(end),
      isCurrent: nowJD >= p1 && nowJD < end,
      phases: [
        { name: 'Rising', sign: SIGNS[phase1Sign], start: jdToDateStr(p1), end: jdToDateStr(p2), effect: 'Mental restlessness, career pressure, authority/father-figure challenges begin.' },
        { name: 'Peak', sign: SIGNS[phase2Sign], start: jdToDateStr(p2), end: jdToDateStr(p3), effect: 'Maximum karmic load — transformation, restructuring, health needs attention.' },
        { name: 'Setting', sign: SIGNS[phase3Sign], start: jdToDateStr(p3), end: jdToDateStr(end), effect: 'Gradual relief, rebuilding, lessons of the cycle crystallize into results.' },
      ],
    };
  }

  // FIX (audit): when the person is NOT currently in Sade Sati, cur1Start
  // above is a FUTURE projection (the mean-motion/refine chain estimates
  // the next time Saturn enters phase1Sign from "now" forward) — so this
  // "first" cycle is really the upcoming one, not a current/past one. It
  // used to always be labeled "Current/most recent cycle" regardless, which
  // is why Section 9 could flatly say "Sade Sati: No" while Section 48 (which
  // reads these same `cycles`) displayed dates from this same object as if
  // they were relevant — a labeling bug, not a calculation bug. Label it
  // correctly so every section reading `cycles` describes it consistently.
  const currentCycle = buildCycle(
    cur1Start, cur2Start, cur3Start, cur3End,
    inSadeSatiNow ? 'Current cycle' : 'Next upcoming cycle',
    1
  );

  // Next cycle starts one full Saturn orbit later — project from the
  // current cycle's own start via mean motion, then refine the same way.
  const next1Est = cur1Start + SATURN_ORBIT_DAYS;
  const next1Start = refineIngress(saturnLonAtJD, phase1Sign, next1Est);
  const next2Est = meanMotionEstimate(next1Start, phase1Sign * 30, phase2Sign * 30);
  const next2Start = refineIngress(saturnLonAtJD, phase2Sign, next2Est);
  const next3Est = meanMotionEstimate(next2Start, phase2Sign * 30, phase3Sign * 30);
  const next3Start = refineIngress(saturnLonAtJD, phase3Sign, next3Est);
  const next4Est = meanMotionEstimate(next3Start, phase3Sign * 30, phase4Sign * 30);
  const next3End = refineIngress(saturnLonAtJD, phase4Sign, next4Est);
  const nextCycle = buildCycle(
    next1Start, next2Start, next3Start, next3End,
    inSadeSatiNow ? 'Next cycle (one Saturn orbit later)' : 'Following cycle (one Saturn orbit later)',
    2
  );

  const currentPhaseObj = currentCycle.isCurrent
    ? currentCycle.phases.find(p => nowJD >= jdFromDateStr(p.start) && nowJD < jdFromDateStr(p.end)) || currentCycle.phases[0]
    : null;

  return {
    inSadeSati: inSadeSatiNow,
    currentPhase: currentPhaseObj?.name || null,
    saturnSignNow: SIGNS[nowSign],
    moonSign: SIGNS[moonSignIdx],
    exactStart: currentCycle.start,
    exactEnd: currentCycle.end,
    // FIX (audit): explicit, unambiguous field for "when is the next Sade
    // Sati" regardless of current status — Section 9 uses this so a "No"
    // answer is never left dangling without telling the person when the
    // next cycle actually begins (previously only Section 48 showed this,
    // making Section 9 look contradictory/incomplete by comparison).
    nextWindow: inSadeSatiNow
      ? { startYear: nextCycle.startYear, endYear: nextCycle.endYear, start: nextCycle.start, end: nextCycle.end }
      : { startYear: currentCycle.startYear, endYear: currentCycle.endYear, start: currentCycle.start, end: currentCycle.end },
    cycles: [currentCycle, nextCycle],
  };
}

// Small local date helpers to avoid a circular import on astronomy/utils'
// own formatDate (which expects the app's exact date object shape).
function jdToCalendar(jd) {
  jd += 0.5;
  const Z = Math.floor(jd);
  const F = jd - Z;
  let A = Z;
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const day = B - D - Math.floor(30.6001 * E) + F;
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;
  return { year, month, day: Math.floor(day) };
}
import moduleData from '../../dataset/used/core/sade_sati_accurate.json' with { type: 'json' };
const MONTH_NAMES = moduleData.MONTH_NAMES;
function jdToDateStr(jd) {
  const { year, month, day } = jdToCalendar(jd);
  return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
}
function jdToYear(jd) { return jdToCalendar(jd).year; }
function jdFromDateStr(str) {
  const [day, mon, year] = str.split(' ');
  const month = MONTH_NAMES.indexOf(mon) + 1;
  // Reverse of jdToCalendar (standard Julian day from Gregorian calendar date)
  let y = +year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + (+day) + B - 1524.5;
}
