/**
 * FULL MASTER-SPEC FIELD CHECKLIST — one consolidated listing of every
 * calculation and prediction field named in the 60-Section Master Prompt,
 * checked against what this engine build actually computes.
 *
 * This is intentionally static engine-capability metadata (like
 * featureChecklist.js) — it describes what the BUILD supports, not any one
 * person's chart, so it is identical across every generated report.
 *
 * Statuses: AVAILABLE | PARTIAL | NOT_AVAILABLE
 * (kept distinct from featureChecklist.js's IMPLEMENTED/PARTIAL/NOT_SUPPORTED
 * so neither file has to change to add the other — additive only.)
 */

export const CALCULATIONS_CHECKLIST = [
  { group: 'A1. Basic Details', items: [
    { field: 'Name', status: 'AVAILABLE' },
    { field: 'Gender', status: 'AVAILABLE' },
    { field: 'Date of Birth', status: 'AVAILABLE' },
    { field: 'Day of Birth', status: 'AVAILABLE' },
    { field: 'Exact Birth Time', status: 'AVAILABLE' },
    { field: 'Birth Place', status: 'AVAILABLE' },
    { field: 'Latitude / Longitude', status: 'AVAILABLE' },
    { field: 'Timezone', status: 'AVAILABLE' },
    { field: 'UTC/GMT at Birth', status: 'AVAILABLE' },
    { field: 'Local Mean Time', status: 'AVAILABLE' },
    { field: 'Local Time Correction', status: 'AVAILABLE' },
    { field: 'DST Correction', status: 'AVAILABLE', reason: 'Historical IANA timezone resolution is applied when an IANA timeZone is supplied; numeric-only input remains explicit.' },
    { field: 'War Time Correction', status: 'AVAILABLE', reason: 'Historical IANA timezone resolution captures documented wartime offset changes when timeZone is supplied; explicit warTimeCorrection remains supported for numeric-only historical input.' },
    { field: 'Ishtkaal', status: 'AVAILABLE' },
    { field: 'Julian Day', status: 'AVAILABLE' },
    { field: 'Ayanamsa (system + value)', status: 'AVAILABLE' },
    { field: 'Obliquity of Ecliptic', status: 'AVAILABLE' },
    { field: 'Sidereal Time', status: 'AVAILABLE' },
    { field: 'Calendar System (input + Panchang)', status: 'AVAILABLE' },
    { field: 'Vikram/Shaka Samvat Year', status: 'AVAILABLE', reason: 'Indian National Calendar civil-era Shaka conversion with Vikram = Shaka + 57; regional lunar Vikram month/date is not claimed.' },
    { field: 'Sunrise / Sunset', status: 'AVAILABLE' },
    { field: 'Birth-Time Confidence', status: 'AVAILABLE', reason: 'Explicit input field with honest NOT_AVAILABLE when omitted.' },
    { field: 'Source/Input Quality', status: 'AVAILABLE', reason: 'Explicit input field with honest NOT_AVAILABLE when omitted.' },
  ]},
  { group: 'A2. Avkahada / Panchanga (calculated values)', items: [
    { field: 'Tithi / Paksha', status: 'AVAILABLE' },
    { field: 'Vara (weekday + lord)', status: 'AVAILABLE' },
    { field: 'Nakshatra / Pada', status: 'AVAILABLE' },
    { field: 'Yoga (Panchanga)', status: 'AVAILABLE' },
    { field: 'Karana', status: 'AVAILABLE' },
    { field: 'Paya', status: 'AVAILABLE' },
    { field: 'Varna', status: 'AVAILABLE' },
    { field: 'Yoni', status: 'AVAILABLE' },
    { field: 'Gana', status: 'AVAILABLE' },
    { field: 'Vasya/Vashya', status: 'AVAILABLE' },
    { field: 'Nadi', status: 'AVAILABLE' },
  ]},
  { group: 'A3. Charts', items: [
    { field: 'D1 / Rashi Chart', status: 'AVAILABLE' },
    { field: 'Chalit Chart', status: 'AVAILABLE', note: 'Real Sripati unequal-Bhava.' },
    { field: 'Chalit Table', status: 'AVAILABLE' },
    { field: 'Navamsha D9', status: 'AVAILABLE' },
    { field: 'All 16 Shodashvarga charts', status: 'AVAILABLE' },
    { field: 'KP Chart', status: 'AVAILABLE' },
    { field: 'Jaimini charts (Karakamsha/Arudha)', status: 'AVAILABLE' },
    { field: 'Western Tropical Chart', status: 'AVAILABLE' },
    { field: 'Western House/Cusp chart', status: 'AVAILABLE' },
  ]},
  { group: 'A4. Chalit Table & Chart detail', items: [
    { field: 'Bhava number/sign/beginning/middle/ending, house lord, occupants, exact degrees, Rashi-house vs Chalit-house', status: 'AVAILABLE' },
    { field: 'Dedicated narrative explaining Rashi vs Chalit difference per house', status: 'AVAILABLE', note: 'Per-house Bhava Phala now exposes sign/lord/occupants/aspects/Bala and interpretation.' },
  ]},
  { group: 'A5. Planetary Position Master Table', items: [
    { field: 'Sidereal longitude, sign, degree, nakshatra, pada, house, bhava', status: 'AVAILABLE' },
    { field: 'Sign lord, nakshatra lord, sub lord (KP)', status: 'AVAILABLE' },
    { field: 'Retrograde/direct, combust status, eclipse status, planetary war', status: 'AVAILABLE' },
    { field: 'Dignity, exaltation/debilitation, own sign, Moolatrikona', status: 'AVAILABLE' },
    { field: 'Natural / temporary / compound relationship, dispositor', status: 'AVAILABLE' },
    { field: 'Functional nature', status: 'AVAILABLE' },
    { field: 'Tropical longitude in the same table', status: 'NOT_AVAILABLE', reason: "By design — spec itself says don't mix Vedic/Western; tropical values live in the separate Western module." },
  ]},
  { group: 'A6. Ascendant — factual data', items: [
    { field: 'Sign/degree/Nakshatra/Pada, lord, lord house & dignity, aspects, conjunctions, dispositor', status: 'AVAILABLE' },
  ]},
  { group: 'A7. Moon Sign — factual data', items: [
    { field: 'Sign, degree, Nakshatra, Pada, Moon lord, dignity, house, aspects, conjunctions', status: 'AVAILABLE' },
  ]},
  { group: 'A8. Nakshatra — factual data', items: [
    { field: 'Name, Pada, lord, deity, symbol, Gana, Yoni, Nadi, Varna, Vasya', status: 'AVAILABLE' },
  ]},
  { group: 'A9. Bhava (House) — factual data', items: [
    { field: 'House meaning, sign, sign lord, house lord, lord placement, occupants, aspects, Bhava Madhya', status: 'AVAILABLE' },
    { field: 'Bhava Bala as a distinct per-house number', status: 'AVAILABLE', note: 'Computed in the Strength module; not yet folded into one dedicated per-house Phala block (see B9).' },
  ]},
  { group: 'A10. Friendship Table', items: [
    { field: 'Natural / temporary / compound / functional relationships', status: 'AVAILABLE', note: 'Folded into the Planetary Position Master Table.' },
  ]},
  { group: 'A11. Shodashvarga — 16 Divisional Charts', items: [
    { field: 'D1, D2, D3, D4, D7, D9, D10, D12, D16, D20, D24, D27, D30, D40, D45, D60', status: 'AVAILABLE' },
    { field: 'Each with Ascendant, all planets, sign, house, lord', status: 'AVAILABLE' },
  ]},
  { group: 'A12. Strength Module — raw scores', items: [
    { field: 'Shadbala', status: 'AVAILABLE' },
    { field: 'Bhavabala', status: 'AVAILABLE' },
    { field: 'Vimshopaka Bala', status: 'AVAILABLE' },
    { field: 'Ashtakavarga / Sarvashtakavarga', status: 'AVAILABLE' },
    { field: 'Prastharashtakavarga', status: 'AVAILABLE', reason: 'Sign-wise contributor matrices are calculated from the canonical Ashtakavarga contribution tables.' },
  ]},
  { group: 'A13. KP Astrology — raw data', items: [
    { field: 'House cusps, cusp degree, sign lord, star lord, sub lord, sub-sub lord', status: 'AVAILABLE' },
    { field: 'Planet significators, house significators, ruling planets', status: 'AVAILABLE' },
    { field: 'Aspect on KP Cusp (exact angular distance/orb per cusp)', status: 'AVAILABLE', reason: 'Exact-angle planet-to-cusp aspect calculation is now available.' },
  ]},
  { group: 'A14. Western / Tropical — raw positions', items: [
    { field: 'Tropical Ascendant, planets/signs/houses, cusps (Sun–Saturn)', status: 'AVAILABLE' },
    { field: 'Uranus, Neptune, Pluto', status: 'AVAILABLE', reason: "Outer-planet longitudes are included in the tropical and sidereal planetary position pipeline using the repository abridged Meeus/VSOP87 model; precision is lower than a full Swiss Ephemeris." },
  ]},
  { group: 'A15. Western Aspect Engine — raw angles', items: [
    { field: 'Vedic whole-sign Rashi Drishti', status: 'AVAILABLE' },
    { field: 'True Western exact-degree aspects with orb (conjunction/opposition/trine/square/sextile)', status: 'AVAILABLE', note: 'Exact separation/orb plus applying/separating phase from relative motion.' },
    { field: 'Minor aspects (quincunx, semi-square, sesquiquadrate, semi-sextile, sesquiquadrate)', status: 'AVAILABLE' },
  ]},
  { group: 'A16. Aspect on Bhava Madhya', items: [
    { field: 'Planet-to-cusp angular distance/orb/aspect type per Bhava Madhya', status: 'AVAILABLE', reason: 'Uses the exact-angle aspect engine against each computed Bhava Madhya cusp.' },
  ]},
  { group: 'A17. Vimshottari Dasha — raw periods', items: [
    { field: 'Mahadasha/Antardasha/Pratyantardasha with start/end/age/duration, current + next', status: 'AVAILABLE' },
  ]},
  { group: 'A18. Yogini Dasha — raw periods', items: [
    { field: 'Yogini, ruling planet, start/end/duration/age, current status', status: 'AVAILABLE' },
  ]},
  { group: 'A19. Jaimini — raw data', items: [
    { field: 'Chara Karakas (Atmakaraka through 7th/8th Karaka)', status: 'AVAILABLE' },
    { field: 'Karakamsha, Arudha Lagna, other Arudhas (A2–A12)', status: 'AVAILABLE' },
    { field: 'Chara Dasha years/table', status: 'AVAILABLE' },
    { field: 'Swamsha as a value distinct from Karakamsha', status: 'AVAILABLE', note: 'Exposed separately as D9 Ascendant sign; lineage terminology is disclosed.' },
  ]},
  { group: 'A20. Varshaphal / Solar Return — raw calculation', items: [
    { field: 'Exact return time, Varsha Lagna, Muntha, Munthesha, Varshesha, annual houses/planets', status: 'AVAILABLE' },
    { field: 'Sahams, Tajika aspects, Mudda Dasha', status: 'AVAILABLE', note: 'Core catalogue, Tajika aspects and Mudda Dasha are calculated in the annual chart.' },
  ]},
  { group: 'A21. Numerology — raw numbers', items: [
    { field: 'Life Path, Destiny/Expression, Soul Urge, Personality, Birthday, Root, Missing/Repeating, Lucky Numbers', status: 'AVAILABLE' },
    { field: 'Driver Number as a field distinct from Birthday Number', status: 'AVAILABLE' },
  ]},
  { group: 'A22. Lal Kitab — raw chart data', items: [
    { field: 'Lal Kitab planetary-house chart', status: 'AVAILABLE' },
    { field: 'Rin/Debts (Pitru, Matru, Stri, etc.) with formation/severity/trigger', status: 'AVAILABLE' },
    { field: 'Lal Kitab Dasha periods', status: 'AVAILABLE', note: '35-year Lal Kitab cycle implemented with explicit edition-default anchor metadata; alternate anchors are not silently mixed.' },
    { field: 'Lal Kitab Teva calculation', status: 'AVAILABLE', note: 'Natal house-based Lal Kitab chart and debt logic are calculated separately from sign-based Parashari interpretation.' },
    { field: 'Lal Kitab Annual chart', status: 'AVAILABLE', note: 'Age-based annual house rotation is exposed as a separate Lal Kitab timing layer.' },
  ]},
  { group: 'A23. Special Lagnas (raw)', items: [
    { field: 'Hora, Ghati, Bhava, Varnada, Sree, Upapada, Prana, Vighati, Indu Lagna', status: 'AVAILABLE' },
  ]},
  { group: 'A24. Upagrahas / Graha States', items: [
    { field: 'Upagraha positions', status: 'AVAILABLE' },
    { field: 'Graha Avastha (planetary states)', status: 'AVAILABLE' },
  ]},
];

export const PREDICTIONS_CHECKLIST = [
  { group: 'B1. Panchanga Phala', items: [
    { field: 'Personality/behavioural effect tied to Tithi, Vara, Nakshatra, Yoga, Karana, Gana, Yoni, Nadi, Varna, Vasya', status: 'AVAILABLE' },
  ]},
  { group: 'B2. Ghatak / Favourable Points', items: [
    { field: 'Bad Day/Karan/Lagna/Month/Nakshatra/Tithi/Yoga', status: 'AVAILABLE' },
    { field: 'Lucky Numbers, Good Years, Lucky Days, Lucky Metal/Stone', status: 'AVAILABLE' },
  ]},
  { group: 'B3. Ascendant Deep Report — interpretation', items: [
    { field: 'Physical constitution, personality, temperament, career/relationship style, health symbolism', status: 'AVAILABLE' },
  ]},
  { group: 'B4. Moon Sign Deep Report — interpretation', items: [
    { field: 'Emotional nature, mental tendencies, stress response, relationship pattern', status: 'AVAILABLE' },
  ]},
  { group: 'B5. Nakshatra Deep Report — interpretation', items: [
    { field: 'Personality, career, income, family, marriage tendencies', status: 'AVAILABLE' },
  ]},
  { group: 'B6. Key Points for Your Kundli', items: [
    { field: 'Greatest Desire, Driving Force, Life Motive, Core Talent, Main Strength/Weakness, Life Statement', status: 'AVAILABLE' },
  ]},
  { group: 'B7. General Prediction', items: [
    { field: 'Character, career, health tendency, love, marriage, finance, family, spirituality — integrated narrative', status: 'AVAILABLE' },
  ]},
  { group: 'B8. Planet-by-Planet Full Consideration Report', items: [
    { field: 'Dignity, conjunctions, aspects, dasha/transit activation, life-area impact, classical + modern interpretation, strength/weakness/timing/confidence for all 9 grahas', status: 'AVAILABLE' },
  ]},
  { group: 'B9. Bhava Phala — interpretation', items: [
    { field: 'House meaning/lord/occupant/aspect interpretation', status: 'AVAILABLE' },
    { field: 'Bhava Bala + per-house Yoga/Dosha unified into one dedicated block', status: 'AVAILABLE', note: 'Unified bhavaPhala structure is generated from canonical objects.' },
  ]},
  { group: 'B10. Varga-specific Interpretation', items: [
    { field: 'D9 (marriage/dharma)', status: 'AVAILABLE' },
    { field: 'D10 (career/status)', status: 'AVAILABLE' },
    { field: 'D2, D3, D4, D7, D12, D16, D20, D24, D27, D30, D40, D45, D60', status: 'AVAILABLE', reason: 'Concise classical signification guidance is bundled in dataset/used/core/varga_interpretations.json and rendered from the calculated chart.' },
  ]},
  { group: 'B11. Yoga Engine — effects', items: [
    { field: 'Detected Yogas with participating planets, houses, effects, timing', status: 'AVAILABLE' },
    { field: 'Neecha Bhanga cancellation logic', status: 'AVAILABLE' },
    { field: 'Uniform Confirmed/Partial/Conditional/Cancelled/Not-formed classification across every Yoga', status: 'AVAILABLE', note: 'Yoga records are normalized at report synthesis; where a source module lacks a status, the result remains explicit rather than guessed.' },
  ]},
  { group: 'B12. Dosha Engine — effects', items: [
    { field: 'Mangal Dosha (Lagna/Moon/Venus, cancellation, severity)', status: 'AVAILABLE' },
    { field: 'Kalsarpa Dosha (12 types + cancellation + partial formation)', status: 'AVAILABLE' },
    { field: 'Sade Sati (rising/peak/setting, past & future cycles)', status: 'AVAILABLE' },
    { field: 'Pitru-related indicators', status: 'AVAILABLE' },
    { field: 'Nadi Dosha / Grahan Dosha', status: 'AVAILABLE' },
    { field: 'No remedy prescribed for a cancelled Dosha (rule check)', status: 'AVAILABLE' },
  ]},
  { group: 'B12A. Named Karmic Combination Checks', items: [
    { field: 'Shrapit Yoga (Saturn-Rahu) with exact separation and rule disclosure', status: 'AVAILABLE' },
    { field: 'Guru Chandal Yoga (Jupiter-Rahu/Ketu) with exact separation and rule disclosure', status: 'AVAILABLE' },
    { field: 'Vish Yoga (Moon-Saturn) with exact separation and rule disclosure', status: 'AVAILABLE' },
    { field: 'Nakshatra Nadi deep profile; Nadi Dosha only determined when a second chart is supplied', status: 'AVAILABLE' },
  ]},
  { group: 'B13. KP Event Analysis', items: [
    { field: 'Significator-based event reasoning', status: 'AVAILABLE' },
    { field: 'Dedicated "Aspect on KP Cusp" event table', status: 'AVAILABLE' },
  ]},
  { group: 'B14. Jaimini — predictions', items: [
    { field: 'Chara Dasha predictions per period, Jaimini Yogas', status: 'AVAILABLE' },
  ]},
  { group: 'B15. Ishta Devata', items: [
    { field: 'Atmakaraka → Karakamsha → deity mapping, calculation explanation, traditional practice', status: 'AVAILABLE', note: 'Real dynamic lookup covers all 7 classical graha Atmakaraka keys in the bundled dataset; the method and lineage limitations are disclosed.' },
  ]},
  { group: 'B16. Varshaphal Predictions', items: [
    { field: 'Annual Yogas/Doshas, annual event themes, favourable/challenging monthly windows', status: 'AVAILABLE', note: 'Annual chart, Sahams, Tajika aspects and Mudda Dasha provide the annual timing base; monthly windows remain evidence-led.' },
  ]},
  { group: 'B17. Favourable Period Engine', items: [
    { field: 'Dasha-based favourable-year detection', status: 'AVAILABLE' },
    { field: 'Dedicated per-event (Marriage/Career/Property/Travel) windowing engine with start/end + counter-indications', status: 'AVAILABLE', note: 'Prediction Truth Layer scans event-specific transit houses over the next 365 days and combines them with Dasha support.' },
  ]},
  { group: 'B18. Lal Kitab Predictions', items: [
    { field: 'Planet-wise / house-wise Lal Kitab results', status: 'AVAILABLE' },
    { field: 'Rin (debt) remedy narrative', status: 'AVAILABLE' },
    { field: 'Lal Kitab Dasha predictions, Lal Kitab Annual predictions', status: 'AVAILABLE', note: '35-year period ruler + age-rotated annual houses + annual Grahphal timing are exposed separately from Tajika.' },
  ]},
  { group: 'B19. Gemstone Module', items: [
    { field: 'Gemstone, planet, functional lordship reasoning, alternate stone, metal, finger, day, wearing procedure, contraindications', status: 'AVAILABLE' },
  ]},
  { group: 'B20. Rudraksha Module', items: [
    { field: 'Recommended Mukhi per planet, deity, wearing method/day', status: 'AVAILABLE', note: 'Standalone Lagna-aware module with functional nature + activation reasons and exclusions.' },
  ]},
  { group: 'B21. Yantra Module', items: [
    { field: 'Recommended Yantra, associated planet/deity, install direction, day', status: 'AVAILABLE', note: 'Standalone dynamic chart-linked module.' },
  ]},
  { group: 'B22. Jadi (herbal remedy) Module', items: [
    { field: 'Herb per planet (e.g. Shatavari/Ashwagandha for Sun)', status: 'AVAILABLE', note: 'Chart-linked traditional Jadi mapping exposes purpose, usage, precautions and confidence.' },
    { field: 'Dedicated Jadi module keyed to this chart\'s own weak planets, with reason/traditional-usage/wearing-method/precautions/confidence', status: 'AVAILABLE', note: 'Nine-graha dataset is bundled; low-confidence folk mappings remain labelled as such.' },
  ]},
  { group: 'B23. Numerology — predictions', items: [
    { field: 'Career/relationship/finance tendencies from numbers, traditional remedies', status: 'AVAILABLE' },
  ]},
  { group: 'B24. Remedy Engine', items: [
    { field: 'Planetary remedies (mantra/puja/daan/fasting/colour/deity)', status: 'AVAILABLE' },
    { field: 'Dosha remedies', status: 'AVAILABLE' },
    { field: 'Dasha-specific remedy category as its own distinct structure', status: 'AVAILABLE', note: 'Dynamic remedy timing schedule is calculated from the current Mahadasha lord, weekday and local sunrise/sunset.' },
    { field: 'Event-specific remedy category as its own distinct structure', status: 'AVAILABLE' },
  ]},
  { group: 'B25. Existing Advanced Modules (Spec §43 — preserved)', items: [
    { field: 'Financial Astrology', status: 'AVAILABLE' },
    { field: 'Wealth DNA', status: 'AVAILABLE', note: 'Exposed as a dedicated alias/synthesis over the canonical financial factors.' },
    { field: 'Job vs Business Verdict', status: 'AVAILABLE' },
    { field: 'Relationship Architecture', status: 'AVAILABLE' },
    { field: 'Love vs Arranged Marriage', status: 'AVAILABLE', note: 'Derived from the relationship architecture factors with explicit evidence.' },
    { field: 'Medical Astrology / Tridosha', status: 'AVAILABLE' },
    { field: 'Nakshatra Personality', status: 'AVAILABLE' },
    { field: 'Karmic Blueprint', status: 'AVAILABLE' },
    { field: 'Planetary Activators', status: 'AVAILABLE' },
    { field: 'Natal Degree Activation', status: 'AVAILABLE', note: 'Exposed through the canonical planetary activator layer.' },
    { field: 'Eclipse Sensitivity', status: 'AVAILABLE' },
    { field: 'Geographic Astrology / Location Recommendations', status: 'AVAILABLE' },
    { field: 'Birth Time Sensitivity', status: 'AVAILABLE' },
    { field: 'Special Lagnas', status: 'AVAILABLE' },
    { field: 'Conflict Resolution Engine', status: 'AVAILABLE', note: 'Narrow yoga-vs-score check; see B28.' },
    { field: 'Final Life Verdict', status: 'AVAILABLE' },
    { field: 'Composite / AI Synthesis', status: 'AVAILABLE' },
    { field: 'Chart Trust / Prediction Evidence', status: 'AVAILABLE' },
    { field: '25-Year Forecast', status: 'AVAILABLE' },
    { field: 'Life Phase Strategy', status: 'AVAILABLE' },
    { field: '5-Year Action Plan', status: 'AVAILABLE' },
    { field: 'Birth-to-Now Timeline', status: 'AVAILABLE' },
    { field: "Today's Horoscope", status: 'AVAILABLE' },
    { field: 'Remaining Months Forecast', status: 'AVAILABLE' },
    { field: 'Next 10 Years Summary', status: 'AVAILABLE' },
    { field: 'Dosha & Yoga Activation Timeline (consolidated)', status: 'AVAILABLE' },
    { field: 'Backtesting', status: 'AVAILABLE', note: 'Deterministic backtest + Brier score + calibration utilities are exposed; empirical results require labeled outcomes.' },
    { field: 'Confidence Calibration (unified)', status: 'AVAILABLE', note: 'Deterministic calibration engine is exposed; it returns NOT_CALIBRATED until labeled outcomes are supplied.' },
    { field: 'Contradiction Detection', status: 'AVAILABLE' },
    { field: 'Calculation Audit Trail (unified)', status: 'AVAILABLE' },
  ]},
  { group: 'B26. Bonus modules present (beyond core spec list)', items: [
    { field: 'Vastu Guide', status: 'AVAILABLE' },
    { field: 'Muhurta Engine', status: 'AVAILABLE' },
    { field: 'Panch Pakshi', status: 'AVAILABLE' },
    { field: 'Compatibility Preview / Milan (Ashtakoot)', status: 'AVAILABLE' },
  ]},
  { group: 'B27. Dynamic Event Engine (user-defined events)', items: [
    { field: 'Fixed events (Marriage/Career/Finance/Health) via house-lord cross-reference', status: 'AVAILABLE' },
    { field: 'Generalized "any custom event → houses/dasha/transit/confidence" engine', status: 'AVAILABLE', note: 'Structured custom events accept explicit houses, transit planets and supporting Dashas; natural-language ambiguity is rejected rather than guessed.' },
  ]},
  { group: 'B28. Contradiction Resolution Engine', items: [
    { field: 'Narrow yoga-strength vs. current-period-score check', status: 'AVAILABLE' },
    { field: 'Full multi-system (Parashara/KP/Jaimini/Transit) agreement/disagreement synthesis', status: 'AVAILABLE', note: 'Independent systems are retained and convergence/divergence is explicitly reported; no forced averaging.' },
  ]},
  { group: 'B29. Evidence Matrix', items: [
    { field: 'Unified per-prediction Factor/System/Result/Direction/Strength table', status: 'AVAILABLE', reason: 'Evidence Matrix is generated directly from the canonical unified prediction breakdown.' },
  ]},
  { group: 'B30. Confidence Engine', items: [
    { field: 'Qualitative confidence in individual sections (Graha Shanti, Planet-by-Planet)', status: 'AVAILABLE' },
    { field: 'Single unified confidence-calibration engine spanning every section', status: 'AVAILABLE', note: 'Unified deterministic evidence layer plus empirical calibration utility; no probability is emitted without outcome labels.' },
  ]},
  { group: 'B31. Birth-Time Sensitivity Analysis', items: [
    { field: 'Ascendant/house/Dasha-balance stability check across a time window', status: 'AVAILABLE' },
  ]},
  { group: 'B32. Calculation Audit Trail', items: [
    { field: 'Each module documents its own source/method inline', status: 'AVAILABLE' },
    { field: 'Single formal INPUT→FORMULA→PARAMETERS→RESULT object exposed uniformly', status: 'AVAILABLE', note: 'Canonical calculationAudit manifest is exposed alongside local module audit metadata.' },
  ]},
  { group: 'B33. Final Synthesis', items: [
    { field: 'Top themes/strengths/challenges, Best/Caution periods, priority Yogas/Doshas, priority remedies, Career/Relationship/Financial verdict, final life strategy', status: 'AVAILABLE' },
  ]},
];

export function buildFullFieldChecklistSummary() {
  const count = { AVAILABLE: 0, PARTIAL: 0, NOT_AVAILABLE: 0 };
  for (const part of [CALCULATIONS_CHECKLIST, PREDICTIONS_CHECKLIST]) {
    for (const g of part) {
      for (const it of g.items) count[it.status] = (count[it.status] || 0) + 1;
    }
  }
  return count;
}

export default { CALCULATIONS_CHECKLIST, PREDICTIONS_CHECKLIST, buildFullFieldChecklistSummary };
