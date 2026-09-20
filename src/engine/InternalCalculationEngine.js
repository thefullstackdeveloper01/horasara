/**
 * JYOTISH INTERNAL CALCULATION ENGINE — Isolated Mathematical Provider
 * 
 * v12 UPGRADES:
 *   ✅ 16 Ayanamsa systems (was 4)
 *   ✅ Mean Node option (toggle: true/mean)
 *   ✅ Explicit retrograde flags with labels
 *   ✅ Combustion with classical BPHS orbs
 *   ✅ Graha Yuddha (Planetary War) detection
 *   ✅ Upagrahas: Gulika, Mandi, Dhuma, Vyatipata + 7 more
 *   ✅ All ayanamsa values comparison table
 */

import {
  julianDay, deltaT, mod360, signOf,
  padaOf, formatDMS, sunriseSunset, kpAyanamsa,
  formatDateTime, jdToDate, nakshatraNameOf as nakOf
}
  from '../astronomy/utils.js';

import { getAllPlanetPositions }
  from '../astronomy/vsop87.js';

import {
  SIGNS, SIGN_LORDS, NAKSHATRAS, NAKSHATRA_LORDS,
  PLANETS, NATURAL_FRIENDS, NATURAL_ENEMIES,
  EXALTATION, DEBILITATION, OWN_SIGNS, MOOLATRIKONA,
  DASHA_YEARS, DASHA_ORDER, getPlanetDignity
}
  from '../astronomy/constants.js';

import {
  calcVimshottari, getDashaBalance, calcAntardashas,
  getCurrentDasha
} from '../dasha/vimshottari.js';

import { calcCharaDasha } from '../dasha/chara.js';
import { calcYoginiDasha, calcAshtottariDasha, checkAshtottariEligibility } from '../dasha/yogini.js';
import { calcKalachakraDasha } from '../dasha/kalachakra.js';
import { calcPanchanga } from '../panchanga/panchanga.js';
import { calcShadbala } from '../strength/shadbala.js';
import { calcAshtakavarga } from '../strength/ashtakavarga.js';
import { assignPlanetsToHouses, calcBhavaCalit, wholeSignHouses, calcAspects, getHouseCusps } from '../charts/houses.js';
import { calcAllVargasForChart as calcAllVargas } from '../charts/vargas.js';
import { calcKalsarpaDosha, calcMangalDosha, calcGrahanDosha, calcPitruDosha, calcNadiDosha, calcKarmicDoshas } from '../dosha/doshas.js';
import { detectYogas } from '../yoga/yogas.js';
import { calcNeechaBhanga } from '../yoga/neecha_bhanga.js';
import { calcKPChart } from '../kp/kp_system.js';
import { getLalKitabFullAnalysis, clearCache } from '../lalkitab/lalkitab.js';
import { calculateNumerology, getBabyNameSuggestions } from '../numerology/numerology.js';
import { getTransitPositions } from '../transit/transits.js';
import { calcAccurateSadeSati } from '../dosha/sade_sati_accurate.js';
import { calcSpecialLagnas, calcAllArudhas } from '../special/special_lagnas.js';
import {
  calcAllVimshopakaBala, calcAllGrahaAvastha, calcBhavaBala,
  calc22ndDrekkana, calc64thNavamsa
} from '../strength/extended_bala.js';

// v12 new modules
import { calcUpagrahas, finalizeUpagrahas } from '../special/upagrahas.js';
import {
  calcAllPlanetaryStates, calcCombustion, calcGrahaYuddha,
  calcRetrogrades
} from '../special/graha_states.js';
import { calcFunctionalNature } from '../strength/functional_nature.js';
import {
  calcIshtaKashta, scoreLifeAreas, predictLifeEvents,
  generateInsights, calcOverallConfidence
} from '../prediction/engine.js';
import { generateUnifiedPrediction } from '../prediction/unifiedEngine.js';
import { buildPredictionTruth, buildRemedySchedule } from '../prediction/PredictionTruthEngine.js';
import { generateBPHSPrediction } from '../prediction/bphsEngine.js';
import { calcGochar, calcNextIngress, calcDashaTransitCombined } from '../transit/gochar.js';
import { assessAllDoshaSeverity } from '../dosha/cancellation.js';
import { calcPratyantardashas } from '../dasha/vimshottari.js';
import { listClassicalDashaSystems, evaluateConditionalDashaEligibility, calculateConditionalDasha, calculateNarayanaDasha, calculateSudarshanaDasha, calculateNaisargikaDasha, calculatePindaDasha, calculateAshtakavargaDasha, calculateSandhyaDasha, calculatePachakaDasha, calculateTaraDasha, calculateAllClassicalDashas } from '../dasha/completeDashaSuite.js';
import {
  buildBirthToNowTimeline, buildFutureForecast, buildDailyHoroscope,
  buildLifePredictions, buildMonthlyForecast, buildAdvancedRemedies,
  buildKPAdvanced, buildPanchPakshi
} from '../extensions/extended_sections.js';
import {
  buildSection36_SpecialLagnas, buildSection37_ConflictResolution,
  buildSection38_FinalLifeVerdict,
  buildSection39_KarmicBlueprint, buildSection40_FinancialAstrology,
  buildSection41_CareerDNA, buildSection42_RelationshipArchitecture,
  buildSection43_MedicalAstrology, buildSection44_NakshatraPersonality,
  buildSection45_LifePhaseStrategy, buildSection46_PlanetaryActivators,
  buildSection47_BirthTimeSensitivity,
  buildSection48_GeographicAstrology, buildSection49_ExecutiveSummary,
  buildSection50_AISynthesis
} from '../extensions/new_sections.js';
import { calcVarshaphalTable, calcSahams, calcTajikAspects, calcMuddaDasha, calcVarshapatipati, calcMuntha } from '../charts/varshaphal.js';
import { renderSouthIndianChart, renderNorthIndianChart } from '../charts/ascii_chart.js';
import { buildTodayForecast } from '../prediction/today_forecast.js';
import { buildRemainingMonthsForecast } from '../prediction/current_year_monthly.js';
import { buildNextDecadeForecast } from '../prediction/decade_forecast.js';
import { buildDoshaYogaRemedies } from '../remedies/dosha_yoga_remedies.js';
import { buildAvkahadaPhala } from '../prediction/avkahadaPhala.js';
import { buildGhatakFavourable } from '../prediction/ghatakFavourable.js';
import { enrichYogasWithClassicalDetail } from '../prediction/yogaEnrichment.js';
import { enrichDoshasWithClassicalRemedies } from '../prediction/doshaRemedyEnrichment.js';
import { buildGrahaShantiForWeakPlanets } from '../prediction/grahaShanti.js';
import { buildJadiRemedies } from '../prediction/jadiModule.js';
import { buildCareerClassicalPrediction, buildFinanceClassicalPrediction, buildHealthClassicalPrediction, buildMarriageClassicalPrediction } from '../prediction/classicalPredictionRules.js';
import { buildLagnaClassicalProfile } from '../prediction/lagnaProfile.js';
import { evaluateMuhurtaInstant } from '../muhurta/MuhurtaEngine.js';
import { buildVargaSignifications } from '../prediction/vargaSignifications.js';
import { buildIshtaDevata } from '../prediction/ishtaDevata.js';
import { buildGemstoneRecommendations } from '../remedies/gemstone.js';
import { buildRudrakshaRecommendations } from '../remedies/rudraksha.js';
import { calcFullMilan } from '../milan/ashtakoot.js';
import { buildYantraRecommendations } from '../remedies/yantra.js';
import { buildPersonalizedVastuGuide } from '../prediction/vastuGuide.js';
import { buildPlanetaryMasterTable } from '../prediction/planetaryMasterTable.js';
import { buildChalitTable } from '../prediction/chalitTable.js';
import { buildWesternTropicalChart } from '../prediction/westernChart.js';
import { calcAllPrastharashtakavarga } from '../strength/prastara.js';
import { calculateCompleteEngine } from '../completion/CompleteEngine.js';
import { buildCapabilityTruth } from '../quality/v4/CapabilityTruthEngine.js';
import { rectifyBirthTimeV4 } from '../rectification/BirthTimeRectificationEngineV4.js';
import { listVargaVariants } from '../charts/VargaVariantEngine.js';
import { calcWesternAspects } from '../western/aspects.js';
import { calcBhavaMadhyaAspects } from '../western/bhava_madhya_aspects.js';
import { calcArudhaLagna } from '../jaimini/arudha.js';
import { calcKarakamsa } from '../jaimini/karakamsa.js';
import { calcKPCuspAspects } from '../kp/kp_system.js';
import { lalKitab35Cycle, buildLalKitabGrahphal, calcLalKitabAnnualHouses, calculateLalKitabTimingSuite } from '../lalkitab/timing.js';
import { buildMangalDoshaDeep } from '../dosha/mangal_dosha_deep.js';
import { buildEvidenceMatrix } from '../prediction/evidence_matrix.js';
import { buildBhavaPhala } from '../prediction/bhavaPhala.js';
import { buildEducationProfile } from '../prediction/educationEngine.js';
import { buildLiveCapabilityAudit } from '../completion/LiveCapabilityAudit.js';
import { calibrateEvidence } from '../quality/calibration.js';
import { buildCalculationAudit } from '../quality/auditTrail.js';
import { buildRuleProvenance } from '../reference/RuleRegistry.js';
import { buildMultiSystemSynthesis } from '../quality/contradictionSynthesis.js';
import { buildEventRemedies } from '../prediction/eventRemedies.js';
import { buildFiveYearActionPlan, buildDoshaYogaActivationTimeline } from '../prediction/actionPlan.js';
import { buildAvkahada } from '../panchanga/avkahada.js';
import { listAvailableCharts, summarizeAvailableCharts } from '../prediction/chartGenerationIndex.js';
import { buildAscendantDeepReport, buildMoonSignDeepReport, buildNakshatraDeepReport } from '../prediction/deepReports.js';
import { buildPlanetByPlanetReport } from '../prediction/planetByPlanetReport.js';
import { FEATURE_CHECKLIST, buildFeatureChecklistSummary } from '../prediction/featureChecklist.js';
import { CALCULATIONS_CHECKLIST, PREDICTIONS_CHECKLIST, buildFullFieldChecklistSummary } from '../prediction/fullFieldChecklist.js';
import { validateBirthInput } from '../validation/birthInput.js';
import { computeTimeAndAscendant } from './timeAndAscendant.js';
import { computePlanetPositions } from './planetPositions.js';
import dashaMeaningsFile from '../../dataset/used/core/dasha_meanings.json' with { type: 'json' };
import { HistoricalTimeEngine } from '../time/HistoricalTimeEngine.js';
import { enrichCompletePlatform } from '../completion/completePlatform.js';
import { findExactEventWindows } from '../prediction/exactEventForecast.js';

// ── helpers ────────────────────────────────────────────────────────────────
// getPlanetDignity now imported from astronomy/constants.js (see the
// dead-code/duplication audit note there) — was a locally-duplicated copy.
// nakOf() moved to astronomy/utils.js as nakshatraNameOf() (see that file's
// comment) so engine/planetPositions.js could use it without a circular
// import back on this file.

function buildSamvatYears(year, month, day) {
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const nationalShakaNewYearMonth = 3;
  const nationalShakaNewYearDay = leap ? 21 : 22;
  const afterNationalNewYear = month > nationalShakaNewYearMonth || (month === nationalShakaNewYearMonth && day >= nationalShakaNewYearDay);
  const shakaYear = year - (afterNationalNewYear ? 78 : 79);
  const vikramYear = shakaYear + 57;
  return {
    status: 'AVAILABLE',
    shakaSamvat: shakaYear,
    vikramSamvat: vikramYear,
    system: 'Indian National Calendar civil-era conversion',
    note: 'Shaka year follows the Indian National Calendar civil-year boundary; Vikram is derived as Shaka + 57. This is not a regional lunar Panchang Vikram Samvat month/date conversion.'
  };
}

// ── MAIN CALCULATION ────────────────────────────────────────────────────────
export async function calculateChart(birth) {
  let normalizedBirth = birth;
  if (birth?.timeZone && typeof birth.timeZone === 'string') {
    const timeEngine = new HistoricalTimeEngine({ timeZone: birth.timeZone });
    const resolved = timeEngine.resolveLocal({ year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, minute: birth.min, second: birth.sec || 0 });
    const resolvedTz = resolved.offsetMinutes / 60;
    if (birth.tz !== undefined && Math.abs(Number(birth.tz) - resolvedTz) > 1e-9) {
      throw new Error(`Timezone mismatch: supplied tz=${birth.tz}, IANA ${birth.timeZone} resolves to ${resolvedTz} at birth`);
    }
    normalizedBirth = { ...birth, tz: resolvedTz, historicalTime: resolved };
  }
  const calculationDate = normalizedBirth?.calculationDateTime ? new Date(normalizedBirth.calculationDateTime) : new Date();
  if (Number.isNaN(calculationDate.getTime())) throw new Error(`Invalid calculationDateTime: ${birth?.calculationDateTime}`);
  const calculationYear = calculationDate.getUTCFullYear();
  const calculationMonth = calculationDate.getUTCMonth() + 1;
  const calculationDay = calculationDate.getUTCDate();
  const calculationHour = calculationDate.getUTCHours() + calculationDate.getUTCMinutes() / 60 + calculationDate.getUTCSeconds() / 3600;
  const diagnostics = [];
  const recordCalculationFailure = (section, error) => {
    const message = error instanceof Error ? error.message : String(error);
    diagnostics.push({ section, status: 'ERROR', message });
  };
  const { name, sex, year, month, day, hour, min, sec = 0,
    lat, lon, tz, elevation = 0,
    ayanamsaMode = 'lahiri',
    houseSystem = 'whole',
    nodeMode = 'true',
    topocentric = false } = normalizedBirth;   // nodeMode: 'true' | 'mean'

  // FIX (error-handling audit): validate at the engine's own boundary, not
  // just the CLI layer — see src/validation/birthInput.js for why.
  validateBirthInput(normalizedBirth);

  // 1-4. Time foundations, Ayanamsa, sidereal time, Ascendant
  // (extracted to src/engine/timeAndAscendant.js — see that file's header
  // for why; same math, same variable meanings as before this move)
  const { JD, dT, JD_TT, AYANAMSA, allAyanamsas, GMST, LST, ascResult, ASC_TROP, ASC } =
    computeTimeAndAscendant(normalizedBirth);
  const ascSign = SIGNS[signOf(ASC)];
  const ascNak = nakOf(ASC);
  const ascNakPada = padaOf(ASC);

  // 5. Planet positions (extracted to src/engine/planetPositions.js)
  const { planets, nodeModeInfo, eps_deg, provider: ephemerisProvider } = computePlanetPositions(
    normalizedBirth, { JD_TT, AYANAMSA, LST }
  );

  // 6. Houses
  //
  // FIX (house-system flag ignored): previously the raw `houseSystem`
  // string was handed straight to assignPlanetsToHouses(), which never
  // read that parameter at all — planets were always placed by Whole
  // Sign regardless of what system was requested. The real per-system
  // cusp math (Placidus/Koch/Sripati/Equal/Porphyry) already existed via
  // getHouseCusps() and was already used for the printed cusp table and
  // the KP chart — it just never fed planet-house assignment. Computing
  // the actual sidereal cusp array here (same mcLon-sidereal conversion
  // already used for the KP chart below) and passing THAT in is the
  // actual fix; assignPlanetsToHouses() falls back to Whole Sign whenever
  // it doesn't receive a real 12-cusp array, so `houseSystem: 'whole'`
  // (the default) is byte-identical to before.
  const mcLonSiderealForHouses = mod360((ascResult?.mcTropical ?? ascResult?.mc ?? 0) - AYANAMSA);
  const houseCuspsForAssignment = getHouseCusps(
    houseSystem, ASC, mcLonSiderealForHouses, lat, ascResult?.ramc, ascResult?.eps ?? eps_deg, AYANAMSA
  );
  const planetsWithHouses = assignPlanetsToHouses(planets, houseCuspsForAssignment, ASC);
  for (const pw of planetsWithHouses) {
    const orig = planets.find(p => p.name === pw.name);
    if (orig) { orig.house = pw.house || 1; orig.houseSign = pw.houseSign || ''; }
  }

  const hmap = Array.from({ length: 12 }, (_, i) => ({
    number: i + 1,
    sign: SIGNS[(signOf(ASC) + i) % 12],
    lord: SIGN_LORDS[SIGNS[(signOf(ASC) + i) % 12]],
    planets: planets.filter(p => p.house === i + 1).map(p => p.name),
  }));

  let bhavaChalit = null;
  try { bhavaChalit = calcBhavaCalit ? calcBhavaCalit(planets, ASC) : null; } catch (e) { recordCalculationFailure('bhavaChalit', e); }

  // 7. Divisional charts
  const vargas = calcAllVargas(planets, ASC);

  // 8. Panchanga
  const moon = planets.find(p => p.name === 'Moon');
  const sun = planets.find(p => p.name === 'Sun');
  const saturn = planets.find(p => p.name === 'Saturn');
  const pg = calcPanchanga(JD, sun.siderealLon, moon.siderealLon, lat, lon, tz,
    moon.speed || 13.176, sun.speed || 0.9856);

  // Canonical natal facts: downstream interpretation/report modules should
  // consume these derived values rather than rebuilding them from rounded
  // sign midpoints or independent approximations.
  const birthFacts = Object.freeze({
    moon: Object.freeze({
      siderealLongitude: moon.siderealLon,
      sign: moon.sign,
      nakshatra: moon.nakshatra,
      pada: moon.pada,
    }),
    ascendant: Object.freeze({ siderealLongitude: ASC, sign: ascSign, nakshatra: ascNak, pada: ascNakPada }),
  });

  // 9. Dasha
  // NOTE: none of the calls below pass a fixed calendar-year horizon
  // (e.g. the old hardcoded 2100) anymore. Each dasha function now
  // defaults its own endYear to birthYear + 120 (the full Vimshottari
  // cycle, BPHS) computed from the JD actually passed in, so the
  // timeline is correct regardless of how old or young the person is.
  const moonSid = moon.siderealLon;
  const balance = getDashaBalance(moonSid);
  const mahas = calcVimshottari(JD, moonSid);
  // FIX: use TODAY's JD for current dasha, not birth JD
  const nowJD_dasha = julianDay(
    calculationYear, calculationMonth, calculationDay, calculationHour
  );
  const curD = getCurrentDasha(JD, moonSid, nowJD_dasha);
  const curMaha = curD?.maha || null;
  const antars = curMaha ? calcAntardashas(curMaha) : [];

  let charaDasha = [];
  try {
    const raw = calcCharaDasha(JD, ASC, planets) || [];
    charaDasha = raw.filter(d =>
      d && !isNaN(d.startJD) && !isNaN(d.endJD) && d.startJD > 0
    ).map(d => ({ ...d, years: isNaN(d.years) ? 0 : d.years }));
  } catch (e) { recordCalculationFailure('charaDasha', e); }

  // Yogini & Ashtottari Dasha
  let yoginiDasha = [];
  try { yoginiDasha = calcYoginiDasha(JD, moonSid); } catch (e) { recordCalculationFailure('yoginiDasha', e); }

  // Kalachakra Dasha — see src/dasha/kalachakra.js header for the
  // documented scholarly-interpretation caveat; verified against a cited
  // worked example, not just implemented from a guessed algorithm.
  let kalachakraDasha = null;
  try { kalachakraDasha = calcKalachakraDasha(JD, moonSid); } catch (e) { recordCalculationFailure('kalachakraDasha', e); }

  const ashtottariEligibility = checkAshtottariEligibility(planets, ASC);
  let ashtottariDasha = { applicable: false, reason: ashtottariEligibility.reason, dashas: [] };
  if (ashtottariEligibility.applicable) {
    try { ashtottariDasha = calcAshtottariDasha(JD, moonSid, null, planets, ASC); } catch (e) { recordCalculationFailure('ashtottariDasha', e); }
  }

  // 10. Strengths
  const srss = sunriseSunset(JD, lat, lon, elevation);
  const sunriseJD = srss.sunrise ?? (JD - 0.25);
  const sunsetJD = srss.sunset ?? (JD + 0.25);
  const isDayBirth = JD >= sunriseJD && JD <= sunsetJD;
  const shadbala = calcShadbala(planets, hmap, JD_TT, lat, lon, sunriseJD, sunsetJD, AYANAMSA, ASC);

  // ── Extra time-foundation fields for the Kundali Reading header ─────────
  // (Section 3 request: UTC, Local Mean Time, Local Time Correction,
  //  Ishta Kaal, Obliquity, Sidereal Time, Calendar system, Sunrise/Sunset,
  //  Birth-time confidence, Source/input quality — all either computed from
  //  real astronomy already in scope above, or explicitly marked
  //  NOT_AVAILABLE with a reason when this offline engine has no dataset
  //  to back them, rather than inventing a value.)

  // UTC / GMT at birth — derived straight from JD (which is already UTC-based)
  const utcClock = jdToDate(JD);
  const utcTimeStr = `${String(utcClock.hour).padStart(2, '0')}:${String(utcClock.min).padStart(2, '0')}:${String(utcClock.sec).padStart(2, '0')} UTC, ${String(utcClock.day).padStart(2, '0')}-${String(utcClock.month).padStart(2, '0')}-${utcClock.year}`;

  // Local Mean Time = UTC + (longitude/15) hours — the true solar-time
  // clock for this exact longitude, as distinct from the zone's civil time.
  const lmtJD = JD + (lon / 15) / 24;
  const lmtClock = jdToDate(lmtJD);
  const localMeanTimeStr = `${String(lmtClock.hour).padStart(2, '0')}:${String(lmtClock.min).padStart(2, '0')}:${String(lmtClock.sec).padStart(2, '0')}`;

  // Local Time Correction = difference (in minutes) between this longitude's
  // true local time and the timezone's standard-meridian clock time.
  // Standard meridian of a UTC offset tz = tz * 15°. 4 minutes per degree.
  const localTimeCorrectionMin = (lon - tz * 15) * 4;

  // DST / War Time correction — this offline engine ships no historical
  // DST/war-time transition database, so these are honestly reported as
  // not available rather than guessed (a wrong guess silently shifts the
  // Ascendant). If the person already supplied a DST-adjusted --tz, that
  // correction is already baked into `tz` and does not need to be redone
  // here.
  const dstCorrection = normalizedBirth.dstCorrection != null
    ? { status: 'PROVIDED', value: normalizedBirth.dstCorrection, source: 'user input' }
    : (normalizedBirth.dstApplied === true
      ? { status: 'PROVIDED', value: 'DST applied to timezone offset', source: 'user input / timezone resolution' }
      : { status: 'AUTOMATIC_OR_NOT_REQUIRED', value: 'No separate DST adjustment supplied; timezone offset is treated as the authoritative civil offset.' });
  const warTimeCorrection = normalizedBirth.warTimeCorrection != null
    ? { status: 'PROVIDED', value: normalizedBirth.warTimeCorrection, source: 'user input' }
    : { status: 'NOT_AVAILABLE', reason: 'No separate historical war-time correction was supplied. For affected historical births, provide --war-time-minutes explicitly.' };
  const historicalTime = normalizedBirth.historicalTime || { status: 'NOT_REQUESTED' };

  // Ishta Kaal — elapsed time since the most recent sunrise before birth,
  // in the classical ghati-vighati units (1 ghati = 24 min, 1 vighati = 24 s).
  // If birth fell before that calendar day's sunrise, use the PREVIOUS
  // day's sunrise (the correct classical reference point), not a negative span.
  let ishtaKaalRefSunriseJD = sunriseJD;
  if (JD < sunriseJD) {
    try {
      const prevSrss = sunriseSunset(JD - 1, lat, lon, elevation);
      ishtaKaalRefSunriseJD = prevSrss.sunrise ?? (sunriseJD - 1);
    } catch (e) { ishtaKaalRefSunriseJD = sunriseJD - 1; }
  }
  const ishtaElapsedMin = Math.max(0, (JD - ishtaKaalRefSunriseJD) * 24 * 60);
  const ishtaGhatiTotal = ishtaElapsedMin / 24; // 1 ghati = 24 minutes
  const ishtaGhati = Math.floor(ishtaGhatiTotal);
  const ishtaVighati = Math.round((ishtaGhatiTotal - ishtaGhati) * 60);
  const ishtaKaal = {
    ghati: ishtaGhati,
    vighati: ishtaVighati,
    formatted: `${ishtaGhati} Ghati ${ishtaVighati} Vighati`,
    elapsedSinceSunrise: `${Math.floor(ishtaElapsedMin / 60)}h ${Math.round(ishtaElapsedMin % 60)}m`,
  };

  // Obliquity of the ecliptic at birth (mean, IAU formula) & Sidereal Time
  // GMST/LST were already computed above (step 3) for the Ascendant math —
  // reused here rather than recomputed, so the header stays byte-identical
  // to what the chart itself was actually built from.
  const obliquityDeg = eps_deg;
  const siderealTimeStr = `${formatDMS(LST)} (LST)  /  ${formatDMS(GMST)} (GMST)`;

  // Sunrise / Sunset at the birthplace, in local civil time
  const sunriseStr = formatDateTime(sunriseJD, tz);
  const sunsetStr = formatDateTime(sunsetJD, tz);

  // Calendar system — be explicit about what is and isn't computed rather
  // than inventing a Vikram/Shaka Samvat year this engine doesn't derive.
  const calendarSystem = {
    inputCalendar: 'Gregorian (as entered)',
    panchangCalendar: 'Lunisolar Hindu Panchang (Tithi/Nakshatra-based)',
    samvatYear: buildSamvatYears(year, month, day),
  };

  // Birth-time confidence & source/input quality — only ever what the
  // person actually told us at the input step; never inferred or invented.
  const birthTimeConfidence = normalizedBirth.timeConfidence
    ? { status: 'PROVIDED', value: normalizedBirth.timeConfidence }
    : { status: 'NOT_AVAILABLE', reason: 'Not indicated at input — whether the birth time is exact, approximate, or estimated was not specified.' };
  const sourceQuality = normalizedBirth.timeSource
    ? { status: 'PROVIDED', value: normalizedBirth.timeSource }
    : { status: 'NOT_AVAILABLE', reason: 'Not indicated at input — the source of the birth-time record (e.g. birth certificate, hospital record, family memory) was not specified.' };

  const ashtakavarga = calcAshtakavarga(planets, ASC);

  // ── FIX: normalize field names consumed by src/extensions/*.js ──────────
  // The extension/report-generator modules were written against field names
  // (`rupas`, `required`, `grade`, `raw`) that never matched the real output
  // of calcShadbala()/calcAshtakavarga() (`shadBalaRupas`, `minimumRequired`,
  // `sarva`, and no `grade` field at all). That mismatch made every `||`
  // fallback fire silently — e.g. every planet defaulted to 0/5 "VERY WEAK"
  // Shadbala and every house defaulted to a flat 25 Ashtakavarga bindus,
  // even though the real calculated numbers (visible in Sections 10/11)
  // were correct. Aliasing the fields here fixes every downstream consumer
  // (Sections 21–43) at the source, without touching each call site.
  for (const pname of Object.keys(shadbala)) {
    const sb = shadbala[pname];
    if (!sb || typeof sb !== 'object') continue;
    sb.rupas = sb.shadBalaRupas;
    sb.required = sb.minimumRequired;
    sb.total = sb.totalShadbala;
    const ratio = sb.ratio ?? (sb.required ? sb.rupas / sb.required : 1);
    sb.grade = ratio >= 1.5 ? 'Excellent'
      : ratio >= 1.0 ? 'Strong'
      : ratio >= 0.75 ? 'Moderate'
      : ratio >= 0.5 ? 'Weak'
      : 'Very Weak';
  }
  if (ashtakavarga && Array.isArray(ashtakavarga.sarva)) {
    ashtakavarga.raw = ashtakavarga.sarva;
  }

  // Extended Strength
  const vimshopaka = calcAllVimshopakaBala(planets);
  const grahaAvastha = calcAllGrahaAvastha(planets);
  const bhavaBala = calcBhavaBala(hmap, planets, shadbala);
  const drekkana22 = calc22ndDrekkana(ASC);
  const navamsa64 = calc64thNavamsa(moon?.siderealLon ?? 0);
  const specialLagnas = calcSpecialLagnas(JD, sunriseJD, sunsetJD, ASC,
    sun?.siderealLon ?? 0, moon?.siderealLon ?? 0, planets, hmap);
  // All 12 Arudha Padas (Jaimini) — real function existed in the codebase
  // but was never actually called from the engine before now.
  let allArudhas = {};
  try {
    const wsHouses = wholeSignHouses(ASC);
    allArudhas = calcAllArudhas(wsHouses, planets);
  } catch (e) { allArudhas = { error: e.message }; }

  // Vedic planetary aspects (Rashi Drishti) — real function existed in
  // src/charts/houses.js but was never wired into the engine's output.
  let aspects = [];
  try { aspects = calcAspects(planets); } catch (e) { aspects = []; }

  // 11. Yogas & Doshas
  const yogasRaw = detectYogas(planets, ASC, hmap) || [];
  // Enrich each detected yoga with real classical effects/strength/cancellation
  // detail from the bundled 47-yoga reference database (name-matched only;
  // no text is invented for yogas outside that database's coverage).
  const yogas = enrichYogasWithClassicalDetail(yogasRaw);

  // Real-ephemeris Saturn longitude at any JD — single source of truth for
  // Sade Sati, so it can never disagree with the natal chart (Section 2) or
  // the live Gochar transit table (Section 19) the way two separate
  // approximated calculators used to.
  const saturnLonAtJD = (jd) => {
    const approxYear = 1900 + (jd - 2415020.5) / 365.25;
    const dT = deltaT(approxYear);
    const jdt = jd + dT / 86400;
    // Deliberately geocentric (no observer passed) even when topocentric
    // mode is on for the natal chart: this scans Saturn's sign across many
    // transit dates for Sade Sati timing, where topocentric parallax
    // (which only meaningfully matters for the Moon, not Saturn) would add
    // nothing and mixing correction modes between natal and transit data
    // would be inconsistent.
    const pos = getAllPlanetPositions(jdt, 0);
    // FIX (Phase 4/5 audit): pos.Saturn.longitude is ALREADY sidereal (see
    // vsop87.js — built from a variable named `saturn.sidereal`). This
    // function's own comment says it exists to be the single source of
    // truth so Sade Sati can never disagree with the natal chart or Gochar
    // — but subtracting AYANAMSA again here shifted every scanned Saturn
    // position by a full ayanamsa (~24°), which is very likely to land on
    // the wrong sign and therefore the wrong Sade Sati phase/dates
    // entirely. This is exactly the kind of self-contradiction the
    // function was written to prevent.
    return mod360(pos.Saturn.longitude);
  };
  const accurateSadeSati = calcAccurateSadeSati(signOf(moon.siderealLon), nowJD_dasha, saturnLonAtJD);

  // Pull the phase-specific effect text that sade_sati_accurate.js already
  // computed per phase (Rising/Peak/Setting), instead of a single fixed
  // description — the actual wording now depends on which phase (if any)
  // this specific chart is currently in.
  const currentSadeSatiPhaseObj = accurateSadeSati.inSadeSati
    ? accurateSadeSati.cycles?.[0]?.phases?.find(p => p.name === accurateSadeSati.currentPhase)
    : null;
  // FIX (audit): when NOT currently in Sade Sati, cycles[0] IS the next
  // upcoming cycle (sade_sati_accurate.js projects it forward from "now" in
  // this case — see that file's own comment on cur1Start). This used to
  // read cycles[1] instead, which is one FULL Saturn orbit (~29.5 years)
  // further out than the real next occurrence — so Section 9's "next cycle"
  // text and Section 48's dosha timeline (which correctly reads cycles[0])
  // could show two different Sade Sati windows for the same chart.
  const sadeSatiEffects = currentSadeSatiPhaseObj
    ? currentSadeSatiPhaseObj.effect
    : `Not currently in Sade Sati. Next cycle (Rising phase) begins ${accurateSadeSati.cycles?.[0]?.start || 'in the future'} and runs through ${accurateSadeSati.cycles?.[0]?.end || ''} (Age ${accurateSadeSati.cycles?.[0]?.startYear != null ? accurateSadeSati.cycles[0].startYear - year : '?'}–${accurateSadeSati.cycles?.[0]?.endYear != null ? accurateSadeSati.cycles[0].endYear - year : '?'}).`;

  const doshas = {
    kalsarpa: calcKalsarpaDosha(planets),
    mangal: calcMangalDosha(planets, ASC, moon.siderealLon, planets.find(p => p.name === 'Venus')?.siderealLon || 0),
    sadeSati: {
      hasDosha: accurateSadeSati.inSadeSati,
      inSadeSati: accurateSadeSati.inSadeSati,
      currentPhase: accurateSadeSati.currentPhase,
      saturnSignNow: accurateSadeSati.saturnSignNow,
      exactStart: accurateSadeSati.exactStart,
      exactEnd: accurateSadeSati.exactEnd,
      effects: sadeSatiEffects,
      remedies: accurateSadeSati.inSadeSati ? [
        'Saturday fasting with Shani Stotra recitation',
        'Donate mustard oil, black sesame, iron on Saturdays',
        'Wear Blue Sapphire (only after proper consultation with jyotishi)',
        'Hanuman Chalisa recitation daily',
        'Service to elderly, disabled, and labourers',
      ] : [
        'No active Sade Sati remedies needed right now — these apply once the Rising phase begins.',
      ],
    },
    grahan: calcGrahanDosha(planets),
    pitru: calcPitruDosha(planets, ASC),
    nadi: calcNadiDosha(moon.siderealLon),
    karmic: calcKarmicDoshas(planets),
  };
  const doshasEnriched = enrichDoshasWithClassicalRemedies(doshas);
  const neecha = calcNeechaBhanga(planets, ASC, moon.siderealLon) || [];

  // 12. ── v12 NEW FEATURES ──────────────────────────────────────

  // 12a. Upagrahas (sub-planets)
  let upagrahas = {};
  try {
    const baseUpa = calcUpagrahas(JD, sunriseJD, sunsetJD, lat, lon, AYANAMSA);
    upagrahas = finalizeUpagrahas(baseUpa, sun.siderealLon, moon.siderealLon);
  } catch (e) { upagrahas = { error: e.message }; }

  // 12b. Combustion (classical BPHS orbs)
  let combustion = {};
  try { combustion = calcCombustion(planets, sun.siderealLon); } catch (e) { recordCalculationFailure('combustion', e); }

  // 12c. Graha Yuddha (Planetary War)
  let grahaYuddha = [];
  try { grahaYuddha = calcGrahaYuddha(planets); } catch (e) { recordCalculationFailure('grahaYuddha', e); }

  // 12d. Explicit retrograde flags
  let retrogrades = {};
  try { retrogrades = calcRetrogrades(planets); } catch (e) { recordCalculationFailure('retrogrades', e); }

  // 12e. Planetary state summary (retrograde + combustion + visibility merged)
  let planetaryStates = {};
  try {
    const states = calcAllPlanetaryStates(planets, sun.siderealLon);
    planetaryStates = states.states;
  } catch (e) { recordCalculationFailure('planetaryStates', e); }

  // 12f. Ayanamsa comparison table
  const ayanamsaCompare = {
    active: ayanamsaMode,
    value: AYANAMSA.toFixed(6),
    all: allAyanamsas,
  };

  // 13. Legacy outputs
  // KP chart now uses real Placidus cusps (mc/lat/ramc/eps come from
  // vsopAscendant's ascResult, already computed above for the Ascendant
  // itself) — falls back to Equal-house approximation automatically if
  // any of these are unavailable, so this stays safe even if ascResult
  // is ever missing a field.
  // FIX (New-spec audit — real Placidus KP cusps): this used to do
  // `mod360((ascResult.mc || 0) - AYANAMSA)`, but ascResult.mc is ALREADY
  // sidereal (Lahiri) — see vsop87.js, built from `mcSidereal = MC_tropical
  // - ayan` internally. Subtracting AYANAMSA again double-subtracted,
  // shifting MC by a full ayanamsa (~24°) and feeding placidusHouses() a
  // wrong MC. This didn't just produce a slightly-off cusp: the wrong MC
  // made the Placidus fixed-point iteration converge to invalid
  // (non-forward-ordered) cusps, which tripped the "unstable near polar
  // circle" sanity guard in charts/houses.js EVEN for ordinary mid-
  // latitude cities like Kolkata (22.5°N) — silently downgrading every KP
  // chart to the Equal-house fallback and producing a suspiciously
  // perfect repeating 4-house sub-lord pattern in the live report.
  // Mirrors the same pattern already used for ASC two lines above: use
  // the raw TROPICAL value (now exposed as ascResult.mcTropical) and
  // apply the engine's own chosen AYANAMSA once, exactly like ASC does —
  // this also makes MC correctly respect ayanamsaMode (KP/Raman/etc.),
  // not just Lahiri.
  // KP is its own sidereal reference frame. Do not silently reuse the
  // chart's selected Lahiri/Raman/etc. ayanamsa for KP positions. Convert
  // the already-computed tropical natal longitudes once into the selected
  // KP convention and build KP Placidus cusps from the same KP ASC/MC frame.
  const kpAy = kpAyanamsa(JD_TT);
  const kpPlanets = planets.map(p => ({
    ...p,
    siderealLon: p.tropicalLon != null ? mod360(p.tropicalLon - kpAy) : p.siderealLon,
  }));
  const kpAsc = mod360((ascResult?.tropical ?? ASC_TROP ?? (ASC + AYANAMSA)) - kpAy);
  const kpChart = calcKPChart(kpPlanets, kpAsc, kpAy, ascResult ? {
    mcLon: mod360((ascResult.mcTropical ?? ascResult.mc ?? 0) - kpAy),
    lat,
    ramc: ascResult.ramc,
    eps: ascResult.eps,
    ayanamsa: kpAy
  } : null);
  // FIX (dead-code/duplication audit): this called getLalKitabFullAnalysis(planets)
  // twice in a row and stored the result under two different keys (lkChart,
  // lkFull). Confirmed via grep across every cli/report/*.js file that only
  // R.lkFull is ever read anywhere in the live report — lkChart was computed,
  // returned, and never consumed. Kept as one call; both keys still populated
  // below (for any external/API consumer that might reference lkChart) without
  // paying for the calculation or the internal cache lookup twice.
  const lkFull = getLalKitabFullAnalysis(planets);
  const lkChart = lkFull;
  clearCache();
  const numerology = calculateNumerology(birth.name || 'Unknown', { year, month, day });
  const babyNames = getBabyNameSuggestions(moon.nakshatra, birth.sex);
  // Reuse the single accurate Sade Sati calculation (real ephemeris) done
  // above for `doshas.sadeSati` — same data, shaped for the phase-history
  // table (Section 9) and dosha/yoga remedy timeline (Section 48).
  const sadeSati = {
    inSadeSati: accurateSadeSati.inSadeSati,
    currentPhase: accurateSadeSati.currentPhase,
    phases: accurateSadeSati.cycles.find(c => c.isCurrent)?.phases || accurateSadeSati.cycles[0]?.phases || [],
    cycles: accurateSadeSati.cycles,
  };
  const nowJD = nowJD_dasha; // already computed above for dasha
  let transitNow = {};
  try { transitNow = getTransitPositions(nowJD, AYANAMSA); } catch (e) { recordCalculationFailure('transitNow', e); }
  // Immutable canonical transit snapshot: every dated report section must
  // consume this exact object instead of independently recalculating 'now'.
  const canonicalTransitSnapshot = Object.freeze({
    jd: nowJD,
    ayanamsa: AYANAMSA,
    planets: Object.freeze(Object.fromEntries(Object.entries(transitNow).map(([name, value]) => [name, Object.freeze({...value})]))),
  });

  const chartData = buildChartData(planets, hmap, ASC, ascSign);

  // ── FUNCTIONAL BENEFIC/MALEFIC (lagna-specific) ─────────────────────
  const functionalNature = calcFunctionalNature(signOf(ASC), planets);
  // Attach to each planet for frontend display
  for (const p of planets) {
    const fn = functionalNature[p.name];
    if (fn) {
      p.functionalNature = fn.nature;
      p.functionalReason = fn.reason;
      p.functionalGrade = fn.grade;
    }
  }

  const ishtaKashta = calcIshtaKashta(planets, shadbala);
  const lifeAreaScores = scoreLifeAreas(planets, hmap, ashtakavarga, shadbala, curD?.maha ? { mahadasha: curD.maha.mahadasha } : null);
  const lifeEvents = predictLifeEvents(planets, mahas, JD);
  const insights = generateInsights(planets, lifeAreaScores, curD?.maha ? { mahadasha: curD.maha.mahadasha, antardasha: curD.antar?.antardasha } : null, ASC, hmap, ashtakavarga);
  const confidence = calcOverallConfidence(planets, shadbala, ayanamsaMode, {
    birthTimeConfidence,
    sourceQuality,
    diagnostics,
    ephemerisProvider
  });

  // ── GOCHAR (REAL-TIME TRANSITS) ────────────────────────────────────────
  const gochar = calcGochar(planets, ASC, signOf(moon.siderealLon), nowJD, canonicalTransitSnapshot);
  const nextIngress = calcNextIngress(nowJD);
  const dashaTransit = calcDashaTransitCombined(gochar, curD?.maha ? { mahadasha: curD.maha.mahadasha, antardasha: curD.antar?.antardasha } : null);

  // ── UNIFIED PREDICTION ENGINE v3.0 (Decision Intelligence) ─────────────────
  let unifiedPrediction = null;
  try {
    const yogaStrengths = detectYogaStrengths(yogas);
    const dashaData = {
      timeline: mahas.slice(0, 20),
      current: curD ? {
        mahadasha: curD.maha?.mahadasha || null,
        antardasha: curD.antar?.antardasha || null,
        startJD: curD.maha?.start,
        endJD: curD.maha?.end,
      } : null,
    };
    unifiedPrediction = generateUnifiedPrediction({
      planets, houses: hmap, dasha: dashaData, shadbala,
      ashtakavarga, gochar, currentJD: JD,
      yogaDetails: yogaStrengths,
    }, birth.userContext || {});
  } catch (e) {
    unifiedPrediction = { error: e.message };
  }

  // ── DOSHA SEVERITY ─────────────────────────────────────────────────────
  const doshaSeverity = assessAllDoshaSeverity(doshas, planets, signOf(moon.siderealLon), signOf(ASC));

  // ── PRATYANTAR DASHA (full list for current antardasha) ────────────────
  let pratyantarList = [];
  try {
    if (curD?.antar) pratyantarList = calcPratyantardashas(curD.antar);
  } catch (e) { recordCalculationFailure('pratyantardasha', e); }

  // ── COMPLETE DASHA SUITE ───────────────────────────────────────────────
  let completeDashaSuite = { status:'AVAILABLE', catalogue:listClassicalDashaSystems(), systems:{} };
  try {
    const dashaInput = { birthJD: JD, moonLon: moon.siderealLon, ascLon: ASC, ascDegInSign: ((ASC%30)+30)%30, planets, houses:hmap, vargas, birth:{ paksha: pg?.tithi?.paksha || pg?.paksha || null, isDayBirth }, lagnaVargottama: !!vargas?.ascendant?.vargottama, lagnaInVenusNavamsha: ['Taurus','Libra'].includes(vargas?.ascendant?.D9?.sign), lagnaHoraLord: null };
    for (const id of ['ashtottari','shodashottari','dwadashottari','panchottari','shatabdika','chaturashiti','dwisaptati','shastihayani','shattrimshat']) {
      const eligibility = evaluateConditionalDashaEligibility(id, dashaInput);
      completeDashaSuite.systems[id] = calculateConditionalDasha(id, { birthJD:JD, moonLon:moon.siderealLon, eligibility });
    }
    completeDashaSuite.systems.narayana = calculateNarayanaDasha({birthJD:JD,ascLon:ASC,planets});
    completeDashaSuite.systems.sudarshana = calculateSudarshanaDasha({birthJD:JD,ascLon:ASC,moonLon:moon.siderealLon,sunLon:sun.siderealLon});
    completeDashaSuite.systems.naisargika = calculateNaisargikaDasha({birthJD:JD});
    completeDashaSuite.systems.pinda = calculatePindaDasha({birthJD:JD,planetStrengths:Object.fromEntries(Object.entries(shadbala).map(([n,v])=>[n,Number(v?.rupas ?? v?.shadBalaRupas)]))});
    completeDashaSuite.systems.ashtakavarga = calculateAshtakavargaDasha({birthJD:JD,sarvaAshtakavarga:Object.fromEntries((ashtakavarga?.sarva||[]).map((v,i)=>[i,v])) ,startSign:signOf(ASC)});
    completeDashaSuite.systems.sandhya = calculateSandhyaDasha(mahas.slice(0,20));
    completeDashaSuite.systems.pachaka = calculatePachakaDasha(curD?.maha,{planets});
    completeDashaSuite.systems.tara = calculateTaraDasha({birthJD:JD,planets});
  } catch (e) { completeDashaSuite = {status:'PARTIAL',catalogue:listClassicalDashaSystems(),systems:{},error:e.message}; }

  completeDashaSuite.allCatalogueResults = calculateAllClassicalDashas({ birthJD:JD, moonLon:moon.siderealLon, sunLon:sun.siderealLon, ascLon:ASC, ascDegInSign:((ASC%30)+30)%30, planets, houses:hmap, vargas, birth:{ paksha:pg?.tithi?.paksha || pg?.paksha || null, isDayBirth }, lagnaVargottama:!!vargas?.ascendant?.vargottama, lagnaInVenusNavamsha:['Taurus','Libra'].includes(vargas?.ascendant?.D9?.sign), currentDasha:curD?.maha ? {planet:curD.maha.mahadasha,lord:curD.maha.mahadasha}:null });

  // ── EXTENDED TEXT REPORT SECTIONS (console-ready formatted blocks) ─────
  const extendedReport = {};
  const birthYearForExt = year;
  const moonSignName = SIGNS[signOf(moon.siderealLon)];
  try { extendedReport.birthToNowTimeline = buildBirthToNowTimeline(birth, planets, hmap, mahas, ashtakavarga, nowJD); } catch (e) { extendedReport.birthToNowTimeline = ['(unavailable: ' + e.message + ')']; }
  try { extendedReport.futureForecast = buildFutureForecast(birth, planets, hmap, mahas, ashtakavarga, nowJD, AYANAMSA, dashaMeaningsFile.dasha_meanings, neecha); } catch (e) { extendedReport.futureForecast = ['(unavailable: ' + e.message + ')']; }
  try { extendedReport.dailyHoroscopeExt = buildDailyHoroscope(birth, planets, ascSign, moonSignName, curD?.maha ? { mahadasha: curD.maha.mahadasha, antardasha: curD.antar?.antardasha } : null, AYANAMSA, nowJD, ashtakavarga, canonicalTransitSnapshot); } catch (e) { extendedReport.dailyHoroscopeExt = ['(unavailable: ' + e.message + ')']; }
  try { extendedReport.lifePredictions = buildLifePredictions(planets, hmap, mahas, ashtakavarga, birth); } catch (e) { extendedReport.lifePredictions = ['(unavailable: ' + e.message + ')']; }
  try { extendedReport.monthlyForecast = buildMonthlyForecast(birth, planets, moonSignName, ascSign, curD?.maha ? { mahadasha: curD.maha.mahadasha, antardasha: curD.antar?.antardasha } : null, AYANAMSA, nowJD); } catch (e) { extendedReport.monthlyForecast = ['(unavailable: ' + e.message + ')']; }
  try { extendedReport.advancedRemedies = buildAdvancedRemedies(planets, ascSign, moonSignName, curD?.maha ? { mahadasha: curD.maha.mahadasha, antardasha: curD.antar?.antardasha } : null, doshas, shadbala); } catch (e) { extendedReport.advancedRemedies = ['(unavailable: ' + e.message + ')']; }
  try { extendedReport.kpAdvanced = buildKPAdvanced(planets, hmap, AYANAMSA, nowJD, kpChart); } catch (e) { extendedReport.kpAdvanced = ['(unavailable: ' + e.message + ')']; }
  try { extendedReport.panchPakshi = buildPanchPakshi(pg?.nakshatra?.name, pg?.vara?.number); } catch (e) { extendedReport.panchPakshi = ['(unavailable: ' + e.message + ')']; }
  // §67 REPRODUCIBILITY: this section is deliberately evaluated at the CURRENT
  // instant (nowJD), not at the birth instant — it answers "is now an auspicious
  // moment for this native", which requires current time by definition. That
  // makes it the one legitimately non-reproducible section of the chart object,
  // so it must DECLARE that rather than silently emitting today's sunrise inside
  // a natal report (which previously made it look like a sunrise/sunset
  // inconsistency against meta/panchanga when it was simply a different date).
  try {
    extendedReport.muhurta = {
      ...evaluateMuhurtaInstant({ jd: nowJD, lat, lon, tz, natalMoonNakshatraIndex: pg?.nakshatra?.index ?? NAKSHATRAS.indexOf(pg?.nakshatra?.name), natalMoonSignIndex: signOf(moon.siderealLon) }),
      timeDependent: true,
      referenceEpoch: 'CURRENT_INSTANT',
      referenceJD: nowJD,
      reproducible: false,
      note: 'Evaluated for the current moment, NOT the birth moment. Solar events in this section belong to the evaluation date and are expected to differ from meta/panchanga birth-date values.'
    };
  } catch (e) { extendedReport.muhurta = { status: 'NOT_AVAILABLE', reason: e.message, timeDependent: true }; }
  try { extendedReport.specialLagnasReport = buildSection36_SpecialLagnas(specialLagnas, planets, hmap, ASC); } catch (e) { extendedReport.specialLagnasReport = ['(unavailable: ' + e.message + ')']; }
  try { extendedReport.conflictResolution = buildSection37_ConflictResolution(planets, shadbala, grahaAvastha, mahas, ashtakavarga, moonSignName, nowJD, AYANAMSA, doshas); } catch (e) { extendedReport.conflictResolution = ['(unavailable: ' + e.message + ')']; }
  try { extendedReport.birthTimeSensitivity = buildSection47_BirthTimeSensitivity(birth, ASC, AYANAMSA, JD); } catch (e) { extendedReport.birthTimeSensitivity = ['(unavailable: ' + e.message + ')']; }
  try { extendedReport.finalLifeVerdict = buildSection38_FinalLifeVerdict(planets, hmap, ashtakavarga, shadbala, mahas, birthYearForExt, nowJD, AYANAMSA); } catch (e) { extendedReport.finalLifeVerdict = ['(unavailable: ' + e.message + ')']; }
  try { extendedReport.karmicBlueprint = buildSection39_KarmicBlueprint(planets, hmap, ascSign, moonSignName, pg?.nakshatra?.name); } catch (e) { extendedReport.karmicBlueprint = ['(unavailable: ' + e.message + ')']; }
  try { extendedReport.financialAstrology = buildSection40_FinancialAstrology(planets, hmap, ashtakavarga, mahas, birthYearForExt, nowJD); } catch (e) { extendedReport.financialAstrology = ['(unavailable: ' + e.message + ')']; }
  try { extendedReport.careerDNA = buildSection41_CareerDNA(planets, hmap, ashtakavarga, mahas, nowJD, vargas); } catch (e) { extendedReport.careerDNA = ['(unavailable: ' + e.message + ')']; }
  try { extendedReport.relationshipArchitecture = buildSection42_RelationshipArchitecture(planets, hmap, ashtakavarga, mahas, birthYearForExt, nowJD, doshas); } catch (e) { extendedReport.relationshipArchitecture = ['(unavailable: ' + e.message + ')']; }
  try { extendedReport.medicalAstrology = buildSection43_MedicalAstrology(planets, hmap, ashtakavarga, birthYearForExt, moonSignName, ascSign); } catch (e) { extendedReport.medicalAstrology = ['(unavailable: ' + e.message + ')']; }
  try { extendedReport.nakshatraPersonality = buildSection44_NakshatraPersonality(pg?.nakshatra?.name, ascNak, planets.find(p=>p.name==='Sun')?.nakshatra, planets); } catch (e) { extendedReport.nakshatraPersonality = ['(unavailable: ' + e.message + ')']; }
  try { extendedReport.lifePhaseStrategy = buildSection45_LifePhaseStrategy(planets, mahas, ashtakavarga, nowJD, birthYearForExt); } catch (e) { extendedReport.lifePhaseStrategy = ['(unavailable: ' + e.message + ')']; }
  try { extendedReport.planetaryActivators = buildSection46_PlanetaryActivators(planets, AYANAMSA, nowJD); } catch (e) { extendedReport.planetaryActivators = ['(unavailable: ' + e.message + ')']; }
  try { extendedReport.geographicAstrology = buildSection48_GeographicAstrology(planets, hmap, ascSign); } catch (e) { extendedReport.geographicAstrology = ['(unavailable: ' + e.message + ')']; }
  try { extendedReport.executiveSummary = buildSection49_ExecutiveSummary(planets, hmap, ashtakavarga, mahas, shadbala, doshas, specialLagnas, nowJD, birthYearForExt, AYANAMSA, ascSign, moonSignName, vargas); } catch (e) { extendedReport.executiveSummary = ['(unavailable: ' + e.message + ')']; }
  try { extendedReport.aiSynthesis = buildSection50_AISynthesis(planets, hmap, ashtakavarga, shadbala, mahas, doshas, nowJD, birthYearForExt, AYANAMSA, ascSign, moonSignName); } catch (e) { extendedReport.aiSynthesis = ['(unavailable: ' + e.message + ')']; }

  // ── VARSHAPHAL (Tajik Annual Chart) — year-by-year table ───────────────
  // NOTE: pass the REAL, precise birth JD and the natal Sun's TROPICAL
  // longitude (not sidereal) — findVarshapravesha() searches against
  // calcPlanetPosition(), which returns tropical longitudes. Passing the
  // wrong frame or a guessed birth date silently produces a wrong date
  // (this was a real bug fixed in this pass; see varshaphal.js header).
  let varshaphalTable = [];
  let varshaphalCurrentYear = null;
  try {
    const sunNow = planets.find(p => p.name === 'Sun');
    const ascSignIdx = signOf(ASC); // calcMuntha/calcVarshapatipati need the numeric sign index, not the name string
    varshaphalTable = calcVarshaphalTable(year, JD, sunNow.tropicalLon, ascSignIdx, moon.siderealLon, tz, lat, lon);
    const nowYearIdx = varshaphalTable.findIndex(v => v.year === calculationYear);
    const row = nowYearIdx >= 0 ? varshaphalTable[nowYearIdx] : varshaphalTable[varshaphalTable.length - 1];
    if (row?.annualChart) {
      const annualPlanetsList = Object.entries(row.annualChart.planets).map(([name, p]) => ({ name, lon: p.lon, speed: 0 }));
      varshaphalCurrentYear = {
        ...row,
        sahams: calcSahams(row.annualChart.planets.Sun.lon, row.annualChart.planets.Moon.lon, row.annualChart.ascSidereal, annualPlanetsList),
        tajikAspects: calcTajikAspects(annualPlanetsList),
        muddaDasha: calcMuddaDasha(row.varshaJD, tz),
        varshaLordBala: (() => {
          const muntha = calcMuntha(ascSignIdx, row.age);
          return calcVarshapatipati(row.annualChart, muntha, ascSignIdx, row.varshaJD);
        })(),
      };
    }
  } catch (e) { recordCalculationFailure('varshaphal', e); varshaphalTable = []; }

  // ── NEW: Today / Remaining-months / Next-10-years / Dosha-Yoga-Remedies ─
  try {
    extendedReport.todayForecast = buildTodayForecast(planets, ASC, signOf(moon.siderealLon), curD?.antar ? { mahadasha: curD.maha.mahadasha, antardasha: curD.antar.antardasha, pratyantar: curD.pratyantar?.pratyantar || curD.antar.antardasha } : null, lat, lon, tz, AYANAMSA, dashaMeaningsFile.dasha_meanings, canonicalTransitSnapshot);
  } catch (e) { extendedReport.todayForecast = ['(unavailable: ' + e.message + ')']; }
  try {
    extendedReport.remainingMonths = buildRemainingMonthsForecast(mahas, nowJD, dashaMeaningsFile.dasha_meanings, tz);
  } catch (e) { extendedReport.remainingMonths = ['(unavailable: ' + e.message + ')']; }
  try {
    extendedReport.decadeForecast = buildNextDecadeForecast(mahas, hmap, varshaphalTable, year, dashaMeaningsFile.dasha_meanings);
  } catch (e) { extendedReport.decadeForecast = ['(unavailable: ' + e.message + ')']; }
  try {
    extendedReport.doshaYogaRemedies = buildDoshaYogaRemedies(birth.name, planets, hmap, doshas, yogas, mahas, nowJD, dashaMeaningsFile.dasha_meanings, sadeSati.cycles);
  } catch (e) { extendedReport.doshaYogaRemedies = ['(unavailable: ' + e.message + ')']; }

  // ── ASCII CHART VISUALIZER (North & South Indian) ───────────────────────
  let asciiCharts = { southIndian: '', northIndian: '' };
  try {
    asciiCharts.southIndian = renderSouthIndianChart(ascSign, planets);
    asciiCharts.northIndian = renderNorthIndianChart(ascSign, planets, formatDMS(ASC % 30));
  } catch (e) { asciiCharts = { southIndian: `(unavailable: ${e.message})`, northIndian: '' }; }

  const result = {
    meta: {
      name, sex, year, month, day,
      hour, min, sec, lat, lon, tz,
      place: birth.place || birth.birthPlace || (Number.isFinite(lat) && Number.isFinite(lon) ? `Coordinates only (Lat ${lat}, Lon ${lon})` : ''),
      weekday: pg?.vara?.name || null,
      weekdayHindi: pg?.vara?.hindi || null,
      JD: JD.toFixed(6),
      JD_TT: JD_TT.toFixed(6),
      deltaT: dT.toFixed(2),
      ayanamsaMode, houseSystem, nodeMode,
      version: 'v13',
      calculationDateTime: calculationDate.toISOString(),
      generatedAt: new Date().toISOString(),

      // ── Section 3 additions (Basic Details) ──────────────────────────
      utcAtBirth: utcTimeStr,
      localMeanTime: localMeanTimeStr,
      localTimeCorrectionMinutes: Number(localTimeCorrectionMin.toFixed(2)),
      dstCorrection,
      warTimeCorrection,
      historicalTime,
      ishtaKaal,
      obliquity: Number(obliquityDeg.toFixed(4)),
      siderealTime: siderealTimeStr,
      calendarSystem,
      sunrise: sunriseStr,
      sunset: sunsetStr,
      birthTimeConfidence,
      sourceQuality,
      dstApplied: normalizedBirth.dstApplied === true,
      warTimeMinutes: normalizedBirth.warTimeCorrection ?? null,
      calculationDiagnostics: diagnostics,
      ephemeris: {
        model: 'Abridged VSOP87 (Meeus tables)',
        validation: 'JPL DE441 cross-check: approximately 33 arcseconds longitude difference for the repository test date; this is a single-point validation, not a Swiss-Ephemeris equivalence claim.'
      },
    },
    ayanamsa: ayanamsaCompare,
    ascendant: { lon: ASC.toFixed(4), sign: ascSign, nakshatra: ascNak, pada: ascNakPada, dms: formatDMS(ASC % 30) },
    planets,
    houses: hmap,
    bhavaChalit,
    panchanga: pg,
    vargas,
    // V4: explicit variant registry and completion facade. These objects read
    // the canonical chart already calculated above; they never recalculate it.
    vargaVariants: { status: 'AVAILABLE', variants: listVargaVariants() },
    dasha: {
      balance: balance.formatted,
      lord: balance.lord,
      timeline: mahas.slice(0, 20),
      current: curD ? {
        mahadasha: curD.maha?.mahadasha || null,
        antardasha: curD.antar?.antardasha || null,
        pratyantar: curD.pratyantar?.pratyantar || null,
        mdStart: curD.maha?.start, mdEnd: curD.maha?.end,
        adStart: curD.antar?.start, adEnd: curD.antar?.end,
        ptStart: curD.pratyantar?.start, ptEnd: curD.pratyantar?.end,
      } : null,
      antardasha: antars.slice(0, 12),
      chara: charaDasha.slice(0, 10),
      yogini: yoginiDasha.slice(0, 15),
      ashtottari: ashtottariDasha,
      kalachakra: kalachakraDasha ? {
        ...kalachakraDasha,
        dashas: kalachakraDasha.dashas.slice(0, 12),
      } : null,
      completeSuite: completeDashaSuite,
    },
    shadbala,
    ashtakavarga,
    yogas: yogas.slice(0, 30),
    doshas: doshasEnriched,
    neechaBhanga: neecha,
    chartData,
    kpChart,
    lkChart,
    lkFull,
    numerology,
    sadeSati,
    transitNow,
    canonicalTransitSnapshot,
    birthFacts,
    vimshopaka,
    grahaAvastha,
    bhavaBala,
    drekkana22,
    navamsa64,
    specialLagnas,
    allArudhas,
    aspects,
    lagna: {
      lon: ASC.toFixed(4),
      sign: ascSign,
      nakshatra: ascNak,
      pada: ascNakPada,
      dms: formatDMS(ASC % 30),
    },
    dashaBalance: balance,
    pratyantarList: pratyantarList.slice(0, 9),

    ishtaKashta,
    lifeAreaScores,
    lifeEvents: lifeEvents.slice(0, 10),
    insights,
    confidence,
    unifiedPrediction,
    predictionTruth: null,
    remedySchedule: null,
    extendedReport,
    varshaphalTable,
    varshaphalCurrentYear,
    asciiCharts,
    // V4 complete-system facade. Selected variants are explicit and guarded.
    completeSystems: null,
    rectification: { status: 'INSUFFICIENT_EVENTS', reason: 'No historical event dataset was supplied to the chart calculation command.' },

    // ── BPHS-BACKED PREDICTIONS (real shloka references) ──────────────
    bphsPredictions: (() => {
      try {
        const areas = ['career', 'wealth', 'marriage', 'health', 'children', 'spirituality', 'property', 'education'];
        const chartData = { planets, houses: hmap, dasha: { current: curD?.maha ? { mahadasha: curD.maha.mahadasha, antardasha: curD.antar?.antardasha } : null } };
        const result = {};
        for (const area of areas) {
          result[area] = generateBPHSPrediction(area, chartData);
        }
        return result;
      } catch (e) { return { error: e.message }; }
    })(),

    // ── GOCHAR (TRANSITS) ──────────────────────────────────────────────
    gochar,
    nextIngress,
    dashaTransit,

    // ── DOSHA SEVERITY ─────────────────────────────────────────────────
    doshaSeverity,

    functionalNature,

    // ── v12 NEW OUTPUTS ─────────────────────────────────────
    upagrahas,
    combustion,
    grahaYuddha,
    retrogrades,
    planetaryStates,
    nodeModeInfo,

    // §66/§67/§74 REPRODUCIBILITY MANIFEST
    // -------------------------------------------------------------------
    // A natal chart is expected to be byte-reproducible from identical input.
    // Seven sections legitimately are not, because they answer "what is
    // happening NOW for this native" (transits, current-dasha forecasting,
    // electional timing) and therefore take the evaluation instant as a real
    // input. Previously that dependence was undeclared, which meant (a) a
    // consumer diffing two runs saw spurious churn with no way to tell
    // intentional from defective, and (b) today's sunrise appeared inside a
    // 1990 natal report looking like a solar-event inconsistency.
    // This manifest names them explicitly so reproducibility can be asserted
    // over the deterministic remainder.
    reproducibility: {
      status: 'DECLARED',
      deterministicGivenInput: true,
      evaluationInstantJD: nowJD,
      evaluationInstantUTC: new Date().toISOString(),
      timeDependentSections: [
        'transitNow',
        'canonicalTransitSnapshot',
        'predictionTruth',
        'extendedReport.muhurta',
        'eventRemedies',
        'lalKitabTiming',
        'exactEventForecast'
      ],
      note: 'Every section NOT listed above is a pure function of the birth input plus the declared engine/dataset versions, and must be byte-identical across runs. Listed sections take the evaluation instant as an input by design.',
      versions: {
        application: 'v13',
        ayanamsaMode,
        houseSystem,
        ephemerisProvider: ephemerisProvider?.id ?? 'internal-vsop87-abridged',
        nodeMode
      }
    },
    ephemerisProvider,
    kpMethodology: { ayanamsa: kpAy, system: 'KP sidereal frame + Placidus cusps', selectable: true },

    // Accuracy indicator — components kept SEPARATE deliberately, since
    // they are different calculations with different error sources.
    // Do not merge these into one blanket "X% accurate" figure.
    // See README §8 and test/validation-harness.test.mjs.
    _accuracy: {
      // Documented target accuracy of the abridged VSOP87 (Meeus) series
      // this module implements — theoretical, not independently verified.
      sunErrorDocumented: '< 0.01° (theoretical/documented target; not a measured production guarantee)',
      moonErrorDocumented: '< 0.05° (theoretical/documented target; not a measured production guarantee)',
      planetErrorDocumented: '< 0.1° (theoretical/documented target; not a measured production guarantee)',
      goldenRegressionObservedMax: '0.4881° (maximum longitude deviation across the bundled 1,000-epoch Swiss-Ephemeris Lahiri golden regression suite; measured by test:golden)',
      goldenRegressionReference: 'Swiss Ephemeris 2.10.03 / SWIEPH / SIDEREAL / Lahiri; 1,000 UTC epochs, 1900–2100',
      // Actually observed, independently checked against JPL Horizons DE441
      // (see test/validation-harness.test.mjs) — more meaningful than the
      // theoretical target above.
      planetErrorObservedVsJPL: '~33 arcsec (~0.009°) for Mars on the validation harness test date; not sub-arcsecond',
      // Ayanamsa is a separate, simpler calculation layered on top of the
      // planetary longitude above — its accuracy does NOT imply the same
      // accuracy for the underlying planetary position.
      ayanamsaErr: '< 0.003° (Lahiri formula cross-checked vs Swiss Ephemeris Lahiri output; covers the ayanamsa offset only)',
      nodeTrueErr: '< 0.002° (documented target; 25-term perturbation series, not independently re-verified against JPL here)',
      nodeMeanErr: '< 0.001° (Mean node, no perturbations)',
      note: 'No third-party libs. Formulas from Meeus "Astronomical Algorithms" 2nd Ed. This is NOT a full-precision/Swiss-Ephemeris-grade ephemeris — see src/astronomy/vsop87.js header and README §8.',
    },
  };

  // ── PREDICTION TRUTH / AUDIT LAYER ─────────────────────────────────────
  // Built only from already-calculated canonical objects. No second chart
  // calculation is allowed here.
  try {
    result.predictionTruth = buildPredictionTruth({
      planets: result.planets,
      houses: result.houses,
      dasha: result.dasha,
      currentJD: nowJD,
      ascendantLon: ASC,
      moonLon: moon.siderealLon,
      ayanamsa: AYANAMSA,
      diagnostics: result.meta?.calculationDiagnostics || [],
      metadata: result.meta,
      birthFacts: result.birthFacts,
    });
  } catch (e) {
    result.predictionTruth = { status: 'NOT_AVAILABLE', reason: e.message };
  }
  try {
    result.calculationAudit = buildCalculationAudit({
      meta: result.meta, birth: {year,month,day,hour,min,sec,lat,lon,tz},
      config: {ayanamsaMode,houseSystem,nodeMode}, planets: result.planets, houses: result.houses, dasha: result.dasha, predictionTruth: result.predictionTruth
    });
  } catch (e) { result.calculationAudit = {status:'NOT_AVAILABLE',reason:e.message}; }

  try { result.eventRemedies = buildEventRemedies(result); } catch (e) { result.eventRemedies = {status:'NOT_AVAILABLE',reason:e.message}; }
  try { result.fiveYearActionPlan = buildFiveYearActionPlan(result); result.doshaYogaActivationTimeline = buildDoshaYogaActivationTimeline(result); } catch (e) { result.fiveYearActionPlan = {status:'NOT_AVAILABLE',reason:e.message}; }

  try {
    const scheduleRemedies = [];
    const currentLord = result.dasha?.current?.mahadasha;
    if (currentLord) scheduleRemedies.push({
      planet: currentLord,
      weekday: { Sun:0, Moon:1, Mars:2, Mercury:3, Jupiter:4, Venus:5, Saturn:6 }[currentLord],
      practice: `Traditional ${currentLord} mantra / daan practice`,
    });
    result.remedySchedule = buildRemedySchedule({
      lat, lon, tz, currentJD: nowJD, remedies: scheduleRemedies
    });
  } catch (e) {
    result.remedySchedule = { status: 'NOT_AVAILABLE', reason: e.message };
  }

  // ── SECTION 5 & 6: Avkahada/Panchanga Phala + Ghatak/Favourable Points ──
  // Both modules only READ from the result object already built above
  // (panchanga, lagna, functionalNature, numerology, dasha timeline) — no
  // astronomy is recomputed here, so these stay consistent with everything
  // else in the report by construction.
  try {
    result.avkahadaPhala = buildAvkahadaPhala(result);
  } catch (e) {
    result.avkahadaPhala = { error: e.message };
  }
  try {
    result.grahaShanti = buildGrahaShantiForWeakPlanets(result.shadbala);
  } catch (e) {
    result.grahaShanti = { error: e.message };
  }
  try {
    result.jadiRemedies = buildJadiRemedies(result.shadbala);
  } catch (e) {
    result.jadiRemedies = { error: e.message };
  }
  try {
    const gf = buildGhatakFavourable(result);
    result.ghatak = gf.ghatak;
    result.favourable = gf.favourable;
  } catch (e) {
    result.ghatak = { error: e.message };
    result.favourable = { error: e.message };
  }
  try {
    result.classicalPredictions = {
      career: buildCareerClassicalPrediction(result),
      finance: buildFinanceClassicalPrediction(result),
      health: buildHealthClassicalPrediction(result),
      marriage: buildMarriageClassicalPrediction(result),
    };
  } catch (e) {
    result.classicalPredictions = { error: e.message };
  }
  try {
    result.lagnaProfile = buildLagnaClassicalProfile(result.lagna?.sign);
  } catch (e) {
    result.lagnaProfile = { error: e.message };
  }
  try {
    result.vargaSignifications = buildVargaSignifications(result);
  } catch (e) {
    result.vargaSignifications = { error: e.message };
  }
  try {
    result.ishtaDevata = buildIshtaDevata(result);
  } catch (e) {
    result.ishtaDevata = { status: 'NOT_AVAILABLE', reason: 'error: ' + e.message };
  }
  try {
    result.vastuGuide = buildPersonalizedVastuGuide(result.functionalNature);
  } catch (e) {
    result.vastuGuide = { error: e.message };
  }
  try {
    result.planetaryMasterTable = buildPlanetaryMasterTable(result);
  } catch (e) {
    result.planetaryMasterTable = { error: e.message };
  }
  try {
    const mcSidereal = ascResult?.mc ?? mod360(ASC + 180);
    result.chalitTable = buildChalitTable(planets, ASC, mcSidereal);
  } catch (e) {
    result.chalitTable = { error: e.message };
  }
  try {
    const ascTropical = mod360(ASC + AYANAMSA);
    const mcTropical = ascResult?.mcTropical ?? mod360(ascTropical + 180);
    result.westernChart = buildWesternTropicalChart(
      planets, ascTropical, mcTropical, lat, ascResult?.ramc, ascResult?.eps, 'placidus'
    );
  } catch (e) {
    result.westernChart = { error: e.message };
  }
  try {
    result.prastharashtakavarga = calcAllPrastharashtakavarga(planets, ASC);
  } catch (e) { result.prastharashtakavarga = { error: e.message }; }
  try {
    const tropicalPlanets = planets.map(p => ({ ...p, tropicalLon: mod360(p.siderealLon + AYANAMSA) }));
    result.westernAspects = calcWesternAspects(tropicalPlanets, { phaseStepDays: 0.05 });
  } catch (e) { result.westernAspects = { error: e.message }; }
  try {
    result.bhavaMadhyaAspects = calcBhavaMadhyaAspects(planets, result.chalitTable?.houses || result.houses);
  } catch (e) { result.bhavaMadhyaAspects = { error: e.message }; }
  try {
    result.jaiminiAdvanced = { arudha: calcArudhaLagna(result.houses, planets, ASC), karakamsa: calcKarakamsa(planets, result.vargas) };
  } catch (e) { result.jaiminiAdvanced = { error: e.message }; }
  try {
    result.kpCuspAspects = calcKPCuspAspects(result.planets, result.kpChart?.cusps || [], 6);
  } catch (e) { result.kpCuspAspects = { error: e.message }; }
  try {
    const birthDateJD = JD;
    const ageYears = Math.max(0, (nowJD - birthDateJD) / 365.2425);
    result.lalKitabTiming = calculateLalKitabTimingSuite({
      birthJD: birthDateJD, nowJD,
      varshaStartJD: varshaphalCurrentYear?.varshapraveshaJD ?? varshaphalCurrentYear?.varshaJD,
      planets, ageYears, anchorAge:0, anchorPlanet:'Jupiter'
    });
  } catch (e) { result.lalKitabTiming = { error: e.message }; }
  try { result.mangalDoshaDeep = buildMangalDoshaDeep(result); } catch (e) { result.mangalDoshaDeep = { error: e.message }; }
  try { result.bhavaPhala = buildBhavaPhala(result); } catch (e) { result.bhavaPhala = { error: e.message }; }
  try { result.education = buildEducationProfile(result); } catch (e) { result.education = { error: e.message }; }
  try {
    const evidenceRows = result.evidenceMatrix?.rows || [];
    result.calibrationEngine = calibrateEvidence(evidenceRows);
  } catch (e) { result.calibrationEngine = { status:'NOT_CALIBRATED', reason:e.message }; }
  try { result.avkahada = buildAvkahada(result); } catch (e) { result.avkahada = { error: e.message }; }
  try { result.evidenceMatrix = buildEvidenceMatrix(result); } catch (e) { result.evidenceMatrix = { error: e.message }; }
  try { result.multiSystemSynthesis = buildMultiSystemSynthesis(result); } catch (e) { result.multiSystemSynthesis = { error: e.message }; }
  try { result.ruleProvenance = buildRuleProvenance(['BPHS.DASHA.VIMSHOTTARI','BPHS.DASHA.UDU-CONDITIONAL','KP.CUSP-SUB-LORD','JAIMINI.ARUDHA','JAIMINI.KARAKAMSHA','TAJIKA.VARSHAPHAL','LAL.KITAB.35Y','SBC.81GRID','PRASHNA.HORARY','MILAN.ASHTAKOOT']); } catch (e) { result.ruleProvenance = { error:e.message }; }
  try { result.gemstoneRecommendations = buildGemstoneRecommendations(result); } catch (e) { result.gemstoneRecommendations = { error: e.message }; }
  try { result.rudrakshaRecommendations = buildRudrakshaRecommendations(result); } catch (e) { result.rudrakshaRecommendations = { error: e.message }; }
  try { result.yantraRecommendations = buildYantraRecommendations(result); } catch (e) { result.yantraRecommendations = { error: e.message }; }

  try {
    result.exactEventForecast = findExactEventWindows({
      config: { houses: [1,2,4,5,7,9,10,11], supportingDasha: [result.dasha?.current?.mahadasha].filter(Boolean) },
      planets: result.planets, ascendantLon: ASC, moonLon: moon.siderealLon,
      currentJD: nowJD, horizonDays: 366, stepDays: 1,
      dashaTimeline: result.dasha?.timeline || [], ayanamsa: AYANAMSA, timezoneHours: tz,
    });
  } catch (e) { result.exactEventForecast = { status:'NOT_AVAILABLE', reason:e.message }; }

  try {
    result.chartGenerationIndex = listAvailableCharts(result);
    result.chartGenerationSummary = summarizeAvailableCharts(result);
  } catch (e) {
    result.chartGenerationIndex = { error: e.message };
  }
  try {
    result.ascendantDeepReport = buildAscendantDeepReport(result);
    result.moonSignDeepReport = buildMoonSignDeepReport(result);
    result.nakshatraDeepReport = buildNakshatraDeepReport(result);
  } catch (e) {
    result.ascendantDeepReport = { error: e.message };
  }
  try {
    result.planetByPlanetReport = buildPlanetByPlanetReport(result);
  } catch (e) {
    result.planetByPlanetReport = { error: e.message };
  }
  result.featureChecklist = FEATURE_CHECKLIST;
  result.featureChecklistSummary = buildFeatureChecklistSummary();
  result.liveCapabilityAudit = buildLiveCapabilityAudit(result, FEATURE_CHECKLIST);

  result.fullFieldChecklistCalculations = CALCULATIONS_CHECKLIST;
  result.fullFieldChecklistPredictions = PREDICTIONS_CHECKLIST;
  result.fullFieldChecklistSummary = buildFullFieldChecklistSummary();

  // Final audit is deliberately built after all report modules so the audit
  // covers the complete result surface, not only the early calculation core.
  try {
    result.calculationAuditFinal = buildCalculationAudit({
      meta: result.meta,
      birth: {year,month,day,hour,min,sec,lat,lon,tz},
      config: {ayanamsaMode,houseSystem,nodeMode},
      planets: result.planets,
      houses: result.houses,
      dasha: result.dasha,
      predictionTruth: result.predictionTruth
    });
    result.calculationAuditFinal.scope = Object.keys(result).sort();
  } catch (e) {
    result.calculationAuditFinal = {status:'NOT_AVAILABLE',reason:e.message};
  }

  // V4 completion: expose the full selected-variant corpus as a machine-readable
  // companion object and attach runtime capability truth.
  try {
    result.completeSystems = calculateCompleteEngine({
      dasha: { variant: 'vimshottari', birthJD: JD, moonLon: moon.siderealLon, ascLon: ASC, planets: result.planets, birth: result.meta, nowJD },
      kp: { planets: result.planets, ascLon: ASC, ayanamsa: AYANAMSA, moonLon: moon.siderealLon },
      jaimini: { planets: result.planets, houses: result.houses, ascLon: ASC, vargas: result.vargas },
      sarvatobhadra: { moonNakshatra: pg?.nakshatra?.name || pg?.nakshatra, moonSign: moon.sign || signOf(moon.siderealLon), weekday: pg?.vara?.name, tithi: pg?.tithi, planetPositions: result.planets },
    });
  } catch (e) { result.completeSystems = { status:'NOT_AVAILABLE', reason:e.message }; }
  try { result._v4CapabilityTruth = buildCapabilityTruth({ result }); } catch (e) { result._v4CapabilityTruth = { status:'NOT_AVAILABLE', reason:e.message }; }
  try {
    // Programmatic callers may replace this with real historical events; the
    // default CLI deliberately does not fabricate them.
    if (Array.isArray(birth?.rectificationEvents) && birth.rectificationEvents.length) {
      result.rectification = rectifyBirthTimeV4({ centerJD: JD, events: birth.rectificationEvents, evaluator: birth.rectificationEvaluator });
    }
  } catch (e) { result.rectification = { status:'NOT_AVAILABLE', reason:e.message }; }

  return enrichCompletePlatform(result, birth);
}

// ── YOGA STRENGTH DETECTION HELPER ────────────────────────────────────────
function detectYogaStrengths(yogas = []) {
  // Use the canonical yoga detector/enrichment output. No second set of
  // chart-specific yoga rules is maintained here.
  const rows = Array.isArray(yogas) ? yogas : [];
  const results = {};
  for (const y of rows) {
    const id = String(y.id || y.code || y.name || y.yoga || '').trim();
    if (!id) continue;
    const raw = y.strengthScore ?? y.score ?? y.strength?.score ?? null;
    if (Number.isFinite(Number(raw))) results[id] = Number(raw);
  }
  const vals = Object.values(results).filter(Number.isFinite);
  results.average = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
  return results;
}

// ── CHART DATA for SVG rendering ────────────────────────────────
function buildChartData(planets, houses, ASC, ascSign) {
  const lagnaSignIdx = signOf(ASC);
  const northHouses = [];
  for (let i = 0; i < 12; i++) {
    const houseNum = i + 1;
    const signIdx = (lagnaSignIdx + i) % 12;
    const hPlanets = planets.filter(p => p.house === houseNum);
    northHouses.push({
      number: houseNum,
      sign: SIGNS[signIdx],
      signIdx,
      planets: hPlanets.map(p => ({
        name: p.name,
        abbr: p.name.slice(0, 2).toUpperCase(),
        retrograde: p.retrograde,
        lon: parseFloat(p.degInSign || 0).toFixed(1),
        outer: p.outer || false,
      })),
    });
  }
  return { northHouses, lagnaSign: ascSign, lagnaSignIdx };
}

export { SIGNS, NAKSHATRAS, NAKSHATRA_LORDS, DASHA_YEARS, DASHA_ORDER };
