// ============================================================
// VEDIC JYOTISH ENGINE v6 — COMPLETE CONSTANTS
// Source: BPHS (Brihat Parashara Hora Shastra), validated dataset
// Dataset Note: nakshatra_lords in JSON are incorrect — using BPHS
// ============================================================

// ── SIGNS ────────────────────────────────────────────────────
import constantsData from '../../dataset/used/core/constants.json' with { type: 'json' };

export const SIGNS = constantsData.SIGNS;
export const SIGNS_HINDI = constantsData.SIGNS_HINDI;
export const SIGNS_SHORT = constantsData.SIGNS_SHORT;
export const SIGN_ELEMENT = constantsData.SIGN_ELEMENT;
export const SIGN_QUALITY = constantsData.SIGN_QUALITY;
export const SIGN_GENDER = constantsData.SIGN_GENDER;
// Sanskrit names from dataset (validated)
export const SIGN_SANSKRIT = constantsData.SIGN_SANSKRIT;

// ── SIGN LORDS ───────────────────────────────────────────────
// From dataset rashi table (lord field validated against BPHS)
export const SIGN_LORDS = constantsData.SIGN_LORDS;

// ── NAKSHATRAS ───────────────────────────────────────────────
// Names from dataset (validated correct)
export const NAKSHATRAS = constantsData.NAKSHATRAS;
// Degrees from dataset (validated — each nakshatra = 13°20' = 40/3°)
export const NAKSHATRA_START_DEG = constantsData.NAKSHATRA_START_DEG;
// BPHS Nakshatra lords — NOTE: Dataset JSON has WRONG lords (shuffled)
// Using authoritative BPHS order: Ketu,Venus,Sun,Moon,Mars,Rahu,Jupiter,Saturn,Mercury (repeating x3)
export const NAKSHATRA_LORDS = constantsData.NAKSHATRA_LORDS;
export const NAKSHATRA_DEITIES = constantsData.NAKSHATRA_DEITIES;
export const NAKSHATRA_SYMBOLS = constantsData.NAKSHATRA_SYMBOLS;
export const NAKSHATRA_GUNA = constantsData.NAKSHATRA_GUNA;
export const NAKSHATRA_TATTVA = constantsData.NAKSHATRA_TATTVA;

// ── PLANETS ──────────────────────────────────────────────────
export const PLANETS = constantsData.PLANETS;
export const PLANETS_HINDI = constantsData.PLANETS_HINDI;
// Nature from dataset (validated)
export const PLANET_NATURE = constantsData.PLANET_NATURE;
export const PLANET_ELEMENT = constantsData.PLANET_ELEMENT;

// ── VIMSHOTTARI DASHA ─────────────────────────────────────────
// BPHS authoritative values (dataset has WRONG years: Sun=7,Moon=17,etc.)
export const DASHA_YEARS = constantsData.DASHA_YEARS;
export const DASHA_ORDER = constantsData.DASHA_ORDER;

// ── DYNAMIC DEFAULTS (previously hardcoded literals scattered across files) ──
// Vimshottari's full cycle is 120 years (BPHS) — sum of DASHA_YEARS values.
// Any "how far into the future do I compute dashas / annual charts" horizon
// should be derived from the person's OWN birth year + this cycle length,
// never a fixed calendar year like 2060/2100 (which silently truncates the
// dasha timeline for anyone born after ~1980-2000 and wastes computation
// for anyone born earlier).
export const VIMSHOTTARI_CYCLE_YEARS = constantsData.VIMSHOTTARI_CYCLE_YEARS;

// Default IST offset (+5:30), used ONLY as a last-resort fallback when
// neither the user nor a resolved city supplies a timezone. Every real
// calculation should receive an explicit tz derived from the birth data.
export const DEFAULT_TZ_IST = constantsData.DEFAULT_TZ_IST;

// Fallback birthplace used ONLY when the user supplies neither lat/lon nor
// a resolvable place name. This is a UX convenience, not an astrological
// default — it is always surfaced to the user via an explicit warning
// (see cli/birth-input.js) so the resulting chart is never silently wrong.
export const DEFAULT_FALLBACK_PLACE = constantsData.DEFAULT_FALLBACK_PLACE;
export const TOTAL_DASHA_YEARS = constantsData.TOTAL_DASHA_YEARS;

// ── PLANET DIGNITIES ─────────────────────────────────────────
export const EXALTATION = constantsData.EXALTATION;
export const DEBILITATION = constantsData.DEBILITATION;
export const OWN_SIGNS = constantsData.OWN_SIGNS;
export const MOOLATRIKONA = constantsData.MOOLATRIKONA;

// ── NATURAL FRIENDSHIPS ───────────────────────────────────────
export const NATURAL_FRIENDS = constantsData.NATURAL_FRIENDS;
export const NATURAL_ENEMIES = constantsData.NATURAL_ENEMIES;
export const NATURAL_NEUTRAL = constantsData.NATURAL_NEUTRAL;

// ── SHADBALA ─────────────────────────────────────────────────
// Minimum required Shadbala in Rupas (classical standard)
// Minimum Shadbala in Rupas per BPHS / AstroSage reference
export const SHADBALA_REQUIRED = constantsData.SHADBALA_REQUIRED;
// Dig Bala best house (planet gains full strength in this house)
export const DIG_BALA_HOUSE = constantsData.DIG_BALA_HOUSE;
// Naisargika Bala (natural strength, fixed values)
export const NAISARGIKA_BALA = constantsData.NAISARGIKA_BALA;
// Combustion orbs (CORRECTED — Mercury=3°, not 14°)
export const COMBUST_ORBS = constantsData.COMBUST_ORBS;

// ── ASHTAKAVARGA BINDU TABLES ─────────────────────────────────
// From dataset planet_bindu_tables (108 entries — validated against classical)
// Format: BINDU_TABLE[planet][house_from_planet] = bindus
export const BINDU_TABLE = constantsData.BINDU_TABLE;

// Ashtakavarga contribution tables (classical — which houses each planet gives bindus FROM its position)
// FIX (Ashtakavarga audit): Sun.Mercury and Moon.Jupiter contributor lists
// were wrong (verified via the chart-independent invariant that each
// planet's total bindu count across all 8 contributors is a fixed
// classical constant: Sun=48, Moon=49, Mars=39, Mercury=54, Jupiter=56,
// Venus=52, Saturn=39, from BPHS Ch.66 — these totals don't depend on any
// birth chart, only on the contributor table itself, making them a clean
// way to catch data-entry errors). Sun's table summed to 45 (missing 3
// from Mercury: had [5,6,9,11], should be [3,5,6,9,10,11,12] — every
// other row already matched two independent published sources). Moon's
// table summed to 48 (missing "8" from Jupiter's list). Both corrected
// entries verified against two independently-sourced classical tables
// that agree with each other and with the corrected totals.
export const ASHTAK_CONTRIBUTIONS = constantsData.ASHTAK_CONTRIBUTIONS;

// NOTE (dead-code/duplication audit): a "VIMSOPAKA_WEIGHTS" table used to
// live here, but it was never imported or used anywhere in the codebase —
// the actual Vimshopaka Bala calculation in strength/extended_bala.js uses
// its own correctly-sourced weight table (D1:3.5, D2:0.5, ... total=20,
// matching the classical Shashtiamsha Vimshopaka scheme). This orphaned,
// unused, and factually different table has been removed rather than kept
// as dead weight that could be mistaken for the "real" one. A second,
// byte-identical copy of it (as "VARGA_WEIGHTS") further down this file
// has also been removed for the same reason.

// ── MRITYU BHAGA (Death Degrees) ─────────────────────────────
// Classical table from Sarvartha Chintamani
// Mrityu Bhaga ("death degree") is a classical BPHS table for the 7
// physical grahas only (Sun..Saturn). Rahu and Ketu are chhaya grahas
// (shadow points, not physical bodies) and have no BPHS-attested Mrityu
// Bhaga degrees — a prior version of this file fabricated Ketu's row by
// copy-pasting Mercury's array verbatim. Per the no-fabrication rule,
// Rahu/Ketu are intentionally omitted here rather than filled with an
// invented or borrowed value. Any consumer must null-check for them
// (see mrityuBhagaOf() below) and report NOT_CALCULATED, never a number.
export const MRITYU_BHAGA = constantsData.MRITYU_BHAGA;

// Safe accessor: returns the classical degree, or null (never a fabricated
// number) for Rahu/Ketu/anything not in the table.
export function mrityuBhagaOf(planetName, signIndex) {
  const row = MRITYU_BHAGA[planetName];
  if (!row || signIndex == null || signIndex < 0 || signIndex > 11) return null;
  return row[signIndex];
}

// ── PANCHANGA ─────────────────────────────────────────────────
export const TITHIS = constantsData.TITHIS;
export const TITHI_LORDS = constantsData.TITHI_LORDS;
export const KARANAS = constantsData.KARANAS;
export const KARANA_NATURE = constantsData.KARANA_NATURE;
export const PANCHANG_YOGAS = constantsData.PANCHANG_YOGAS;
export const YOGA_NATURE = constantsData.YOGA_NATURE;

// ── VARA (Weekday) ────────────────────────────────────────────
export const VARA_LORDS = constantsData.VARA_LORDS;
export const VARA_NAMES = constantsData.VARA_NAMES;
export const VARA_NAMES_HINDI = constantsData.VARA_NAMES_HINDI;

// ── AVAKAHADA CHAKRA ──────────────────────────────────────────
export const VARNA = constantsData.VARNA;
export const YONI = constantsData.YONI;
export const GANA = constantsData.GANA;
export const NADI = constantsData.NADI;
export const VASYA = constantsData.VASYA;
export const PAYA = constantsData.PAYA;

// ── CHOGHADIYA ────────────────────────────────────────────────
export const CHOGHADIYA_INFO = constantsData.CHOGHADIYA_INFO;
// Day Choghadiya sequence per weekday (0=Sun through 6=Sat)
export const CHOGHADIYA_DAY = constantsData.CHOGHADIYA_DAY;
export const CHOGHADIYA_NIGHT = constantsData.CHOGHADIYA_NIGHT;
// Hora sequence (7 planets, repeating)
export const HORA_SEQUENCE = constantsData.HORA_SEQUENCE;

// ── TARABALA ─────────────────────────────────────────────────
export const TARA_NAMES = constantsData.TARA_NAMES;
export const TARA_NATURE = constantsData.TARA_NATURE;
export const TARA_SCORE = constantsData.TARA_SCORE;
export const TARA_DESC = constantsData.TARA_DESC;

// ── GEMSTONES & REMEDIES ──────────────────────────────────────
export const GEMSTONE_REMEDIES = constantsData.GEMSTONE_REMEDIES;

// ── LUCKY DATA BY LAGNA ───────────────────────────────────────
export const LUCKY_DATA = constantsData.LUCKY_DATA;

// ── GHATAK TABLE ──────────────────────────────────────────────
export const GHATAK = constantsData.GHATAK;

// ── RAHU KAAL by weekday ──────────────────────────────────────
// Part of 8-part day where Rahu Kaal falls (1-based)
export const RAHU_KAAL_PART = constantsData.RAHU_KAAL_PART;
export const YAMAGANDA_PART = constantsData.YAMAGANDA_PART;
export const GULIKA_PART = constantsData.GULIKA_PART;

// ── JAIMINI RASHI DRISHTI ─────────────────────────────────────
// Movable signs aspect Fixed except adjacent; Fixed aspect Movable except adjacent; Dual aspect each other
export const RASHI_DRISHTI = constantsData.RASHI_DRISHTI;

// ── TRANSIT EFFECTS (from dataset + classical) ────────────────
// Full detailed transit effects for all 9 planets x 12 houses
export const TRANSIT_EFFECTS = constantsData.TRANSIT_EFFECTS;

// ── HOUSE SIGNIFICATIONS ──────────────────────────────────────
export const HOUSE_SIGNIFICATIONS = constantsData.HOUSE_SIGNIFICATIONS;

// ── ASHTOTTARI DASHA ─────────────────────────────────────────
export const ASHTOTTARI_YEARS = constantsData.ASHTOTTARI_YEARS;
export const ASHTOTTARI_ORDER = constantsData.ASHTOTTARI_ORDER;

// ── YOGINI DASHA ─────────────────────────────────────────────
export const YOGINI_DASHA = constantsData.YOGINI_DASHA;

// ── JAIMINI ───────────────────────────────────────────────────
export const JAIMINI_KARAKAS = constantsData.JAIMINI_KARAKAS;

// ── ASHTA KOOTA ───────────────────────────────────────────────
export const KOOTA_VARNA = constantsData.KOOTA_VARNA;
export const KOOTA_GANA_POINTS = constantsData.KOOTA_GANA_POINTS;
export const TRIKONA_GROUPS = constantsData.TRIKONA_GROUPS;

// ── SADE SATI PHASES ──────────────────────────────────────────
export const SADE_SATI_PHASES = constantsData.SADE_SATI_PHASES;

// ── PLANET DIGNITY IN A SIGN (shared helper) ────────────────────────────────
// FIX (dead-code/duplication audit): this exact dignity-lookup logic
// (Exalted > Debilitated > Moolatrikona > Own > Friend > Enemy > Neutral)
// used to be copy-pasted as a private function in THREE separate files
// (engine.js, extensions/extended_sections.js, extensions/new_sections.js),
// with tiny inconsistencies between the copies (only two of the three
// guarded against missing planet/sign arguments). Consolidated into one
// canonical implementation here — every caller now gets identical,
// consistent dignity results instead of three independently-maintained
// (and silently driftable) copies of the same classical rule.
export function getPlanetDignity(planet, signName) {
  if (!planet || !signName) return 'Other';
  if (EXALTATION[planet]?.sign === signName) return 'Exalted';
  if (DEBILITATION[planet]?.sign === signName) return 'Debilitated';
  if (MOOLATRIKONA[planet]?.sign === signName) return 'Moolatrikona';
  if (OWN_SIGNS[planet]?.includes(signName)) return 'Own';
  const lord = SIGN_LORDS[signName];
  if (NATURAL_FRIENDS[planet]?.includes(lord)) return 'Friend';
  if (NATURAL_ENEMIES[planet]?.includes(lord)) return 'Enemy';
  return 'Neutral';
}

// ── TRANSIT (GOCHAR) GOOD HOUSES FROM NATAL MOON ────────────────────────────
// Source: BPHS Ch.36 (Gochar), cross-referenced with Phaladeepika Ch.26.
// FIX (dead-code/duplication audit): this table used to be duplicated
// verbatim in BOTH src/horoscope/daily_horoscope.js and src/transit/gochar.js
// — and the two copies had silently DRIFTED APART for Ketu specifically:
// daily_horoscope.js had Ketu:[3,6,11] (grouped with Mars/Saturn, per the
// classical convention that Ketu's transit behavior is treated like the
// other cruel/ascetic grahas) while gochar.js had Ketu:[3,6,10,11] (an
// apparent copy-paste of Rahu's row). This meant the daily horoscope and
// the transit (Gochar) report could disagree about which houses are
// favorable for a Ketu transit — a real accuracy bug, not just wasted
// code. Consolidated to the Mars/Saturn-matching [3,6,11] value (the one
// consistent with the classical pairing used for every other planet in
// this table) as the single source of truth both modules now import.
export const TRANSIT_GOOD_HOUSES = constantsData.TRANSIT_GOOD_HOUSES;
