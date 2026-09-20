/**
 * CENTRAL REPORT FEATURE SWITCHBOARD
 * ==================================
 *
 * THIS IS THE ONE FILE TO EDIT when deciding what appears in the customer
 * report.
 *
 * ENABLE a feature  -> leave its line uncommented.
 * DISABLE a feature -> put // in front of its line.
 *
 * Example:
 *   'ASHTAKAVARGA',          // included
 *   // 'ASHTAKAVARGA',       // excluded
 *
 * Do NOT edit cli/report/index.js just to hide a report section.
 * Internal calculation code remains available even when presentation is off.
 * This file controls REPORT PRESENTATION, not mathematical calculation.
 *
 * IMPORTANT:
 * - A feature is listed here only when the current release has a report
 *   renderer for it.
 * - Planned/unverified features are listed at the bottom as comments. They
 *   must not be enabled until their mathematics/rules are implemented and
 *   verified. This prevents a commented/uncommented switch from creating a
 *   fake result.
 */

export const REPORT_FEATURES = Object.freeze([
  // ────────────────────────────────────────────────────────────────────────
  // PART 1 — ORIENTATION
  // ────────────────────────────────────────────────────────────────────────
  'LAGNA',
  'RASHIFAL',
  'PANCHANGA_BIRTH',

  // ────────────────────────────────────────────────────────────────────────
  // PART 2 — CALCULATIONS
  // ────────────────────────────────────────────────────────────────────────
  'VARGAS',
  'PLANETARY_MASTER_TABLE',
  'VIMSHOTTARI_DASHA',
  'SHADBALA',
  'ASHTAKAVARGA',
  'SPECIAL_LAGNAS',
  'KP_SYSTEM',
  'EXTENDED_CALCULATIONS',
  'LAL_KITAB',
  'NUMEROLOGY',
  'AVKAHADA',
  'GHATAK',
  'GRAHA_SHANTI',
  'JADI',
  'VARGA_SIGNIFICATIONS',
  'GOCHAR',
  'MUHURTA',
  'VARSHAPHAL',
  'CONFIDENCE',

  // ────────────────────────────────────────────────────────────────────────
  // PART 3 — CHARTS
  // ────────────────────────────────────────────────────────────────────────
  'CHART_GENERATION_INDEX',
  'HOUSES',
  'CHALIT',
  'WESTERN_CHART',
  'ADVANCED_CALCULATIONS',

  // ────────────────────────────────────────────────────────────────────────
  // PART 4 — INTERPRETATION
  // ────────────────────────────────────────────────────────────────────────
  'YOGAS',
  'DOSHAS',
  'BPHS_PREDICTIONS',
  'LIFE_EVENTS',
  'LIFE_AREA_INSIGHTS',
  'EXTENDED_PREDICTIONS',
  'CLASSICAL_PREDICTIONS',
  'LAGNA_PROFILE',
  'ISHTA_DEVATA',
  'VASTU',

  // ────────────────────────────────────────────────────────────────────────
  // PART 5 — FORECASTS & GUIDANCE
  // ────────────────────────────────────────────────────────────────────────
  'FUTURE_FORECAST',
  'DAILY_HOROSCOPE',
  'MONTHLY_FORECAST',
  'REMAINING_MONTHS',
  'DOSHA_YOGA_REMEDIES',
  'DETAILED_REMEDIES',
  'ADVANCED_REMEDIES',
  'EXECUTIVE_SUMMARY',
  'AI_SYNTHESIS',

  // ────────────────────────────────────────────────────────────────────────
  // PART 6 — DEEP ANALYSIS
  // ────────────────────────────────────────────────────────────────────────
  'PLANET_BY_PLANET',
  'ASCENDANT_DEEP_REPORT',
  'MOON_SIGN_DEEP_REPORT',
  'NAKSHATRA_DEEP_REPORT',
  'EVIDENCE_MATRIX',

  // ────────────────────────────────────────────────────────────────────────
  // APPENDIX
  // ────────────────────────────────────────────────────────────────────────
  'FIELD_CHECKLIST',
  'EXACT_EVENT_FORECAST',
  'KARMIC_PROFILE',
  'REMEDY_PLANNER',
  'BUSINESS_VERDICT',
  'PRAKRITI_QUESTIONNAIRE',
  'SVG_CHARTS',
  'INTERACTIVE_WEB_UI',
  'LOCALIZATION',
]);

const ENABLED = new Set(REPORT_FEATURES);

/** Returns true when a customer-facing report feature is enabled. */
export function reportFeatureEnabled(id) {
  return ENABLED.has(String(id));
}

/** Useful for diagnostics/UI/admin tooling. */
export function listEnabledReportFeatures() {
  return [...REPORT_FEATURES];
}

/*
 * ========================================================================
 * REQUESTED FEATURE CATALOG — KEEP THESE AS DOCUMENTED SWITCH TARGETS
 * ========================================================================
 *
 * These are deliberately comments until their calculation/report renderer is
 * verified. When a future feature is implemented, move its ID into the active
 * list above. Do NOT simply uncomment a planned feature here and claim it is
 * calculated.
 *
 * CORE / ASTRONOMY
 * // 'PLANETARY_LONGITUDES'
 * // 'AYANAMSA_LAHIRI'
 * // 'AYANAMSA_RAMAN'
 * // 'AYANAMSA_KP'
 * // 'CUSTOM_AYANAMSA'
 * // 'TRUE_MEAN_NODES'
 * // 'TOPOCENTRIC'
 * // 'DST_HISTORICAL'
 * // 'HISTORICAL_TIMEZONE'
 * // 'CITY_DATABASE'
 * // 'ELEVATION_GEOCODING'
 * // 'SWISS_EPHEMERIS'
 * // 'URANUS_NEPTUNE_PLUTO_VEDIC'
 * // 'WESTERN_OUTER_PLANETS'
 *
 * HOUSES / CHARTS
 * // 'PLACIDUS'
 * // 'KOCH'
 * // 'EQUAL_HOUSES'
 * // 'PORPHYRY'
 * // 'SRIPATI'
 * // 'WHOLE_SIGN'
 * // 'BHAVA_MADHYA'
 * // 'CHALIT'
 *
 * VARGAS
 * // 'D1_TO_D300_CUSTOM'
 * // 'D2_PARASHARI'
 * // 'D2_KASHINATHA'
 * // 'D2_EQUATOR_MOON'
 * // 'D3_PARASHARI'
 * // 'D3_SOMNATH'
 * // 'D3_JAGANNATH'
 * // 'D3_SREEPATHI'
 * // 'D4_STANDARD'
 * // 'D4_NON_CYCLICAL'
 * // 'D7_VARIANTS'
 * // 'D9_VARIANTS'
 * // 'D10_VARIANTS'
 * // 'D12_INTERPRETATION'
 * // 'D16_INTERPRETATION'
 * // 'D20_INTERPRETATION'
 * // 'D24_INTERPRETATION'
 * // 'D27_INTERPRETATION'
 * // 'D30_INTERPRETATION'
 * // 'D40_INTERPRETATION'
 * // 'D45_INTERPRETATION'
 * // 'D60_INTERPRETATION'
 * // 'ALL_VARGAS_MATRIX'
 *
 * DASHA / STRENGTH
 * // 'VIMSHOTTARI_5_LEVEL'
 * // 'ASHTOTTARI'
 * // 'SHODASHOTTARI'
 * // 'DWADASHOTTARI'
 * // 'PANCHOTTARI'
 * // 'SHATABDHAKA'
 * // 'CHATURASEETI_SAMA'
 * // 'DVISAPTATI_SAMA'
 * // 'SAPTARSHI'
 * // 'KALACHAKRA'
 * // 'CHARA_DASHA'
 * // 'NARAYANA_DASHA'
 * // 'DRIG_DASHA'
 * // 'LAGNAMSHAKA_DASHA'
 * // 'BRAHMA_DASHA'
 * // 'PADANADHAMSAKA_DASHA'
 * // 'SHOOLA_DASHA'
 * // 'MANDOOK_DASHA'
 * // 'CONDITIONAL_DASHA_SELECTION'
 * // 'VIMSHOPAKA_BALA'
 * // 'SHADBALA_FULL_BREAKDOWN'
 * // 'ASHTAKAVARGA_SHODHANA'
 * // 'PRASTHARA_ASHTAKAVARGA'
 * // 'SAMUDAYA_ASHTAKAVARGA'
 * // 'SODHYA_PINDA'
 *
 * SPECIAL / JAIMINI / KP
 * // 'UPAGRAHAS'
 * // 'SPECIAL_LAGNAS_COMPLETE'
 * // 'ARUDHA_A1_A12'
 * // 'GRAHA_ARUDHAS'
 * // 'JAIMINI_7_KARAKA'
 * // 'JAIMINI_8_KARAKA'
 * // 'JAIMINI_RASHI_DRISHTI'
 * // 'KARAKAMSHA'
 * // 'SWAMSHA'
 * // 'KP_CUSPS'
 * // 'KP_SUBLORD'
 * // 'KP_SUB_SUB_LORD'
 * // 'KP_FOUR_LEVEL_SIGNIFICATORS'
 * // 'WESTERN_ASPECTS'
 * // 'BHAVA_MADHYA_ASPECTS'
 *
 * TRANSITS / PANCHANGA / TAJIKA
 * // 'TRANSIT_INGRESS_EXACT'
 * // 'RETROGRADE_EXACT'
 * // 'TRANSIT_CALENDAR'
 * // 'TRANSIT_FROM_NAVAMSA'
 * // 'TARA_VEDHA_MURTHI'
 * // 'NAKSHATRA_TRANSIT_ASPECTS'
 * // 'LATTA'
 * // 'FULL_TAJIKA'
 * // 'FULL_SAHAMS'
 * // 'MUDDA_DASHA'
 * // 'SAMVAT_VIKRAM_LUNAR'
 * // 'SAMVAT_SHAKA_FULL'
 * // 'ADHIK_MAAS'
 *
 * LAL KITAB / PRASNA / MATCHING
 * // 'LAL_KITAB_DASHA'
 * // 'LAL_KITAB_TEVA'
 * // 'LAL_KITAB_ANNUAL_CHART'
 * // 'PRASNA_HORARY'
 * // 'DASHAKOOT_10_KUTA'
 * // 'ASHTAKOOT_DEEP'
 * // 'MANGAL_DOSHA_DEEP'
 * // 'NADI_EXCEPTION_ENGINE'
 *
 * PREDICTION / QUALITY
 * // 'UNIFIED_CONFIDENCE_CALIBRATION'
 * // 'CONTRADICTION_RESOLUTION'
 * // 'BACKTESTING'
 * // 'BIRTH_TIME_RECTIFICATION'
 * // 'VARGA_BOUNDARY_SENSITIVITY'
 *
 * REMEDIES / DATA
 * // 'ISHTA_DEVATA_FULL_CLASSICAL'
 * // 'JADI_FULL_DATASET'
 * // 'RUDRAKSHA_RULE_ENGINE'
 * // 'YANTRA_RULE_ENGINE'
 * // 'GEMSTONE_RULE_ENGINE'
 */
