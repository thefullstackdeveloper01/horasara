/**
 * Full report orchestrator.
 *
 * The report is deliberately organized by PURPOSE rather than by the order in
 * which individual modules were historically added:
 *
 *   1. ORIENTATION — birth data + key chart anchors
 *   2. CALCULATIONS — canonical raw calculations (one authoritative table per domain)
 *   3. CHARTS — visual/tabular chart representations
 *   4. INTERPRETATION — yogas, doshas, classical rules and life-area analysis
 *   5. FORECASTS & GUIDANCE — dated forecasts and remedies
 *   6. DEEP ANALYSIS — interpretation-heavy reports that intentionally do not repeat
 *      raw planetary tables already printed in CALCULATIONS
 *   7. ENGINE AUDIT — one consolidated capability/field audit
 *
 * Important: duplicate *presentation* is removed here without deleting the
 * underlying calculation data. A calculation is performed once and reused by
 * downstream report sections.
 */
import { MASTER_REPORT_OUTLINE } from '../../src/reporting/MasterReportOutline.js';
import { resetSectionNumbering, partBanner, C } from '../console-ui.js';
import { reportFeatureEnabled } from '../../config/ReportFeatures.js';
import { printHeader, printFooter } from './header.js';
import { printLagna, printRashifal } from './lagna-rashi.js';
import { printPanchanga } from './panchanga.js';
import { printHouses, printVargas } from './planets-houses.js';
import { printDasha } from './dasha.js';
import { printYogas, printDoshas } from './yogas-doshas.js';
import { printShadbala, printAshtakavarga, printSpecialLagnas } from './strength.js';
import { printKP, printLalKitab } from './kp-lalkitab.js';
import { printNumerology, printLifeAreaInsights } from './numerology-insights.js';
import { printBphsPredictions, printLifeEvents, printGochar, printVarshaphal } from './predictions.js';
import { printExtendedSections } from './extended-sections.js';
import { printConfidence } from './confidence.js';
import { printRemainingMonths, printDoshaYogaRemedies } from './trust-and-remedies.js';
import { printAvkahadaPhala } from './avkahada.js';
import { printGhatakFavourable } from './ghatak.js';
import { printGrahaShanti } from './grahaShanti.js';
import { printClassicalPredictions, printLagnaProfile } from './classicalPredictions.js';
import { printVargaSignifications } from './vargaSignifications.js';
import { printIshtaDevata } from './ishtaDevata.js';
import { printJadiRemedies } from './jadiModule.js';
import { printVastuGuide } from './vastuGuide.js';
import { printChartGenerationIndex, printChalitTable, printPlanetaryMasterTable, printWesternChart } from './chartsAndMasterTable.js';
import { printPlanetByPlanetReport, printAscendantDeepReport, printMoonSignDeepReport, printNakshatraDeepReport } from './deepReportsAndChecklist.js';
import { printFullFieldChecklist } from './fullFieldChecklist.js';
import { printAdvancedCalculations, printEvidenceMatrix } from './advanced-calculations.js';
import { printDetailedRemedies } from './remedies-detailed.js';
import { printMuhurta } from './muhurta.js';
import { printBasicReport } from './basic.js';

// The 23 "extended" modules (src/extensions/*.js) are split across
// PART 2 (KP Advanced is raw significator data) and PART 4 (everything
// else is interpretation/forecast) — see extended-sections.js for the
// full title/key list.
import moduleData from '../../dataset/used/core/index.json' with { type: 'json' };
const EXTENDED_CALCULATION_KEYS = moduleData.EXTENDED_CALCULATION_KEYS;
const EXTENDED_PREDICTION_KEYS = moduleData.EXTENDED_PREDICTION_KEYS;
const EXTENDED_FEATURES = Object.freeze({
  dailyHoroscopeExt: 'DAILY_HOROSCOPE',
  monthlyForecast: 'MONTHLY_FORECAST',
  futureForecast: 'FUTURE_FORECAST',
  advancedRemedies: 'ADVANCED_REMEDIES',
  executiveSummary: 'EXECUTIVE_SUMMARY',
  aiSynthesis: 'AI_SYNTHESIS',
});

function printIfEnabled(id, renderer, R) {
  if (reportFeatureEnabled(id)) renderer(R);
}

function printExtendedIfEnabled(R, keys) {
  const enabledKeys = keys.filter(key => reportFeatureEnabled(EXTENDED_FEATURES[key] || 'EXTENDED_CALCULATIONS'));
  if (enabledKeys.length) printExtendedSections(R, enabledKeys);
}

export function printFullReport(R, elapsedMs) {
  resetSectionNumbering();
  console.log('  ' + C.dim + 'Customer-facing section numbers are contiguous. Internal feature IDs remain unchanged; consolidated/overlapping sections are intentionally presented once.' + C.reset);
  printHeader(R, elapsedMs);

  partBanner('MASTER REPORT ORGANIZATION — 80 SECTIONS');
  for (const [n, title, items] of MASTER_REPORT_OUTLINE) {
    console.log(`  ${n}. ${title}`);
    for (const item of items) console.log(`     • ${item}`);
  }

  // ── 1. ORIENTATION ──────────────────────────────────────────────────────
  partBanner('PART 1 — ORIENTATION (Birth Details & Chart Anchors)');
  printIfEnabled('LAGNA', printLagna, R);
  printIfEnabled('RASHIFAL', printRashifal, R);

  // ── 2. CALCULATIONS ─────────────────────────────────────────────────────
  // Each domain has one canonical raw-data presentation. Interpretation
  // sections later consume these same objects instead of printing them again.
  partBanner('PART 2 — CALCULATIONS (Canonical Raw Data)');
  printIfEnabled('PANCHANGA_BIRTH', printPanchanga, R);
  printIfEnabled('VARGAS', printVargas, R);
  printIfEnabled('PLANETARY_MASTER_TABLE', printPlanetaryMasterTable, R);
  printIfEnabled('VIMSHOTTARI_DASHA', printDasha, R);
  printIfEnabled('SHADBALA', printShadbala, R);
  printIfEnabled('ASHTAKAVARGA', printAshtakavarga, R);
  printIfEnabled('SPECIAL_LAGNAS', printSpecialLagnas, R);
  printIfEnabled('KP_SYSTEM', printKP, R);
  printExtendedIfEnabled(R, EXTENDED_CALCULATION_KEYS);
  printIfEnabled('LAL_KITAB', printLalKitab, R);
  printIfEnabled('NUMEROLOGY', printNumerology, R);
  printIfEnabled('AVKAHADA', printAvkahadaPhala, R);
  printIfEnabled('GHATAK', printGhatakFavourable, R);
  printIfEnabled('GRAHA_SHANTI', printGrahaShanti, R);
  printIfEnabled('JADI', printJadiRemedies, R);
  printIfEnabled('VARGA_SIGNIFICATIONS', printVargaSignifications, R);
  printIfEnabled('GOCHAR', printGochar, R);
  printIfEnabled('MUHURTA', printMuhurta, R);
  printIfEnabled('VARSHAPHAL', printVarshaphal, R);
  printIfEnabled('CONFIDENCE', printConfidence, R);

  // ── 3. CHARTS ───────────────────────────────────────────────────────────
  partBanner('PART 3 — CHARTS (Visual & House Representations)');
  printIfEnabled('CHART_GENERATION_INDEX', printChartGenerationIndex, R);
  printIfEnabled('HOUSES', printHouses, R);
  printIfEnabled('CHALIT', printChalitTable, R);
  printIfEnabled('WESTERN_CHART', printWesternChart, R);
  printIfEnabled('ADVANCED_CALCULATIONS', printAdvancedCalculations, R);

  // ── 4. INTERPRETATION ────────────────────────────────────────────────────
  partBanner('PART 4 — INTERPRETATION (What the Calculations Mean)');
  printIfEnabled('YOGAS', printYogas, R);
  printIfEnabled('DOSHAS', printDoshas, R);
  printIfEnabled('BPHS_PREDICTIONS', printBphsPredictions, R);
  printIfEnabled('LIFE_EVENTS', printLifeEvents, R);
  printIfEnabled('LIFE_AREA_INSIGHTS', printLifeAreaInsights, R);
  printExtendedIfEnabled(R, EXTENDED_PREDICTION_KEYS.filter(k =>
    !['dailyHoroscopeExt', 'monthlyForecast', 'futureForecast', 'lifePredictions', 'advancedRemedies', 'executiveSummary', 'aiSynthesis'].includes(k)
  ));
  printIfEnabled('CLASSICAL_PREDICTIONS', printClassicalPredictions, R);
  printIfEnabled('LAGNA_PROFILE', printLagnaProfile, R);
  printIfEnabled('ISHTA_DEVATA', printIshtaDevata, R);
  printIfEnabled('VASTU', printVastuGuide, R);

  // ── 5. FORECASTS & GUIDANCE ─────────────────────────────────────────────
  partBanner('PART 5 — FORECASTS & GUIDANCE (Dated Outlook + Remedies)');
  printExtendedIfEnabled(R, ['futureForecast', 'dailyHoroscopeExt', 'monthlyForecast']);
  printIfEnabled('REMAINING_MONTHS', printRemainingMonths, R);
  printIfEnabled('DOSHA_YOGA_REMEDIES', printDoshaYogaRemedies, R);
  printIfEnabled('DETAILED_REMEDIES', printDetailedRemedies, R);
  printExtendedIfEnabled(R, ['advancedRemedies']);
  printExtendedIfEnabled(R, ['executiveSummary', 'aiSynthesis']);

  // ── 6. DEEP ANALYSIS ────────────────────────────────────────────────────
  // These sections intentionally focus on interpretation/evidence. Their raw
  // placement fields are already available in the canonical master table.
  partBanner('PART 6 — DEEP ANALYSIS (Interpretation Without Raw-Data Duplication)');
  printIfEnabled('PLANET_BY_PLANET', printPlanetByPlanetReport, R);
  printIfEnabled('ASCENDANT_DEEP_REPORT', printAscendantDeepReport, R);
  printIfEnabled('MOON_SIGN_DEEP_REPORT', printMoonSignDeepReport, R);
  printIfEnabled('NAKSHATRA_DEEP_REPORT', printNakshatraDeepReport, R);
  printIfEnabled('EVIDENCE_MATRIX', printEvidenceMatrix, R);

  // ── 7. ENGINE AUDIT ─────────────────────────────────────────────────────
  partBanner('APPENDIX — ENGINE CAPABILITY & FIELD AUDIT');
  printIfEnabled('FIELD_CHECKLIST', printFullFieldChecklist, R);

  printFooter();
}

/** Render only the user-selected dated report scope. */
export function printScopedReport(R, elapsedMs, scope) {
  resetSectionNumbering();
  printHeader(R, elapsedMs);
  const label = { today: "TODAY'S REPORT", monthly: 'MONTHLY REPORT', yearly: 'YEARLY REPORT' }[scope] || 'REPORT';
  partBanner(`REPORT SCOPE — ${label}`);
  const lines = scope === 'today' ? R.extendedReport?.todayForecast
    : scope === 'monthly' ? R.extendedReport?.monthlyForecast
    : R.extendedReport?.futureForecast;
  if (Array.isArray(lines)) lines.forEach(line => console.log(line));
  else if (lines && typeof lines === 'object') console.dir(lines, { depth: 8 });
  else console.log('  STATUS: NOT_AVAILABLE — this scope has no generated data.');
  if (scope === 'yearly') {
    console.log('');
    console.log('  Yearly solar-return table:');
    if (Array.isArray(R.varshaphalCurrentYear)) R.varshaphalCurrentYear.forEach(x => console.log('  ' + JSON.stringify(x)));
    else if (R.varshaphalCurrentYear) console.dir(R.varshaphalCurrentYear, { depth: 6 });
  }
  printFooter();
}
