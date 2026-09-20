/**
 * current_year_monthly.js — Remaining-months-of-this-year forecast.
 *
 * Single responsibility: for every month from "now" through December of the
 * current year, work out which Antardasha/Pratyantardasha actually rules
 * that month (real dasha-timeline lookup, not guesswork), pull that
 * planet's real classical significations from dasha_meanings.json, and
 * present it as "this month's likely challenge → this month's remedy" —
 * concrete and actionable, not generic.
 */
import { calcAntardashas, calcPratyantardashas } from '../dasha/vimshottari.js';
import { julianDay, jdToDate } from '../astronomy/utils.js';

import moduleData from '../../dataset/used/core/current_year_monthly.json' with { type: 'json' };
const MONTH_NAMES = moduleData.MONTH_NAMES;

function findPeriodCovering(periods, jd, startKey = 'startJD', endKey = 'endJD') {
  return periods.find(p => jd >= p[startKey] && jd < p[endKey]);
}

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

export function buildRemainingMonthsForecast(mahas, nowJD, dashaMeaningsData, timezoneHours = 0) {
  const lines = [];
  const push = (s = '') => lines.push(s);

  if (!Number.isFinite(Number(nowJD))) throw new TypeError('nowJD must be a finite Julian Day');
  const now = jdToDate(Number(nowJD) + Number(timezoneHours || 0) / 24);
  const year = now.year;
  const startMonth = now.month; // 1-12, derived from calculation JD rather than host clock

  push(`  Remaining months of ${year} — month-by-month outlook, based on your real running Dasha periods:`);
  push('');

  for (let m = startMonth; m <= 12; m++) {
    const midJD = julianDay(year, m, 15, 12, 0, 0, 0);

    const maha = findPeriodCovering(mahas, midJD);
    if (!maha) continue;

    let antar = null, pratyantar = null;
    try {
      const antars = calcAntardashas(maha);
      antar = findPeriodCovering(antars, midJD);
      if (antar) {
        const pratyantars = calcPratyantardashas(antar);
        pratyantar = findPeriodCovering(pratyantars, midJD);
      }
    } catch (e) { /* fall back to maha-level only */ }

    const rulingLord = pratyantar?.pratyantar || antar?.antardasha || maha.mahadasha;
    const meaning = dashaMeaningsData?.[rulingLord];

    push(`  ── ${MONTH_NAMES[m - 1]} ${year} ${m === startMonth ? '(current month)' : ''} `.trimEnd());
    push(`     Ruling period: ${maha.mahadasha} → ${antar?.antardasha || '-'} → ${pratyantar?.pratyantar || '-'}`);

    if (meaning) {
      const positives = (meaning.keywords_positive || []).slice(0, 3).join(', ');
      const negatives = (meaning.keywords_negative || []).slice(0, 2).join(', ');
      push(`     Likely theme: ${positives || '-'}`);
      if (negatives) push(`     Watch out for: ${negatives}`);
      if (meaning.advice) push(`     This month's guidance: ${contextualAdvice(meaning.advice, rulingLord === maha.mahadasha)}`);
      if (meaning.mantra) push(`     Remedy mantra for ${rulingLord}: ${meaning.mantra}`);
      if (meaning.gemstone) push(`     Supporting gemstone (consult astrologer first): ${meaning.gemstone}`);
    } else {
      push('     (detailed theme unavailable for this period)');
    }
    push('');
  }

  return lines;
}
