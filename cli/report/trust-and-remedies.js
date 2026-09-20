/**
 * trust-and-remedies.js — Section 45 (Today), Section 46 (remaining months
 * of this year), Section 47 (next 10 years summary), and Section 48 (final
 * section: your Doshas & Yogas timeline with conditional remedies).
 *
 * These are the "prove the engine actually works right now" sections:
 * concrete, dated, and personalized rather than generic astrology text.
 */
import { section, printLines } from '../console-ui.js';

export function printToday(R) {
  section("45. TODAY — आज क्या होगा (calculated fresh, right now)");
  printLines(R.extendedReport?.todayForecast);
}

export function printRemainingMonths(R) {
  section('46. REMAINING MONTHS OF THIS YEAR — महीना दर महीना समस्या व समाधान');
  printLines(R.extendedReport?.remainingMonths);
}

export function printDecadeForecast(R) {
  section('47. NEXT 10 YEARS SUMMARY — अगले 10 वर्ष का सारांश');
  printLines(R.extendedReport?.decadeForecast);
}

export function printDoshaYogaRemedies(R) {
  section("48. YOUR KUNDALI'S DOSHAS & YOGAS — TIMELINE & PERSONALIZED REMEDIES");
  printLines(R.extendedReport?.doshaYogaRemedies);
}
