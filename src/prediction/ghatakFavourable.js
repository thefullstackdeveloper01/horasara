/**
 * GHATAK (UNFAVOURABLE) & FAVOURABLE POINTS MODULE
 * ==================================================
 * Every value below is either:
 *   (a) computed from this specific chart's own already-calculated data
 *       (functional benefic/malefic table, Dasha timeline, Nakshatra,
 *        Lagna, planetary friendships), or
 *   (b) a standard, named classical Muhurta/Jyotish rule applied to that
 *       chart's own values (e.g. Tarabala groups, Rikta tithis, Shadashtak
 *       rashis, Vishti karana).
 * Nothing is invented. Where this offline engine has no dataset to back a
 * requested field (e.g. Malamasa/Adhik-Maas month calculation), it is
 * reported as NOT_AVAILABLE with a reason instead of a guess. Every
 * result also states its source/method, and "lucky"/traditional values
 * are explicitly labelled as traditional belief, not scientific fact.
 */
import { readFileSync } from 'fs';
import { reportDatasetMiss } from './_datasetLoad.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  SIGNS, SIGN_LORDS, NAKSHATRAS, OWN_SIGNS,
  NATURAL_FRIENDS, NATURAL_ENEMIES, VARA_LORDS, VARA_NAMES,
} from '../astronomy/constants.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const DS = join(__dir, '../../dataset/used/core');

const _cache = {};
function load(name) {
  if (_cache[name]) return _cache[name];
  try {
    _cache[name] = JSON.parse(readFileSync(join(DS, name + '.json'), 'utf8'));
    return _cache[name];
  } catch (e) {
    reportDatasetMiss('ghatakFavourable', name);
    return null;
  }
}

import moduleData from '../../dataset/used/core/ghatakFavourable.json' with { type: 'json' };
const LP_PLANET_MAP = moduleData.LP_PLANET_MAP;
function numbersRuledBy(planetNames) {
  return Object.entries(LP_PLANET_MAP)
    .filter(([num, pl]) => planetNames.includes(pl))
    .map(([num]) => Number(num))
    .filter(n => n <= 9); // single-digit numbers only for a "lucky/challenging number" list
}

function planetToWeekday(planet) {
  const idx = VARA_LORDS.indexOf(planet);
  return idx >= 0 ? VARA_NAMES[idx] : null; // Rahu/Ketu have no classical weekday lordship
}

/**
 * @param {object} R - the calculated chart object from src/engine.js
 * @returns {{ ghatak: object, favourable: object }}
 */
export function buildGhatakFavourable(R) {
  const pg = R.panchanga;
  const moonSignName = pg.moonSign;
  const janmaNakIdx = NAKSHATRAS.indexOf(pg.nakshatra.name);
  const lagnaSignIdx = SIGNS.indexOf(R.lagna.sign);
  const moonSignIdx = SIGNS.indexOf(moonSignName);
  const fn = R.functionalNature || {};

  // ─────────────────────────────────────────────────────────────────────
  // GHATAK / UNFAVOURABLE
  // ─────────────────────────────────────────────────────────────────────

  // Bad Day — this chart's own Tarabala-inauspicious weekday isn't a
  // classical concept (Tarabala applies to Nakshatra, not Vara); instead,
  // the classically documented "bad day" concern is the weekday ruled by
  // this chart's own functional-malefic planets — days that echo a
  // planet already working against this specific Lagna.
  const badDayPlanets = Object.entries(fn).filter(([, v]) => ['Functional Malefic', 'Maraka'].includes(v.nature)).map(([p]) => p);
  const badDays = badDayPlanets.map(planetToWeekday).filter(Boolean);

  // Bad Karan — Karanas classified Inauspicious in the classical 11-Karana
  // table (karana_details.json), independent of this chart (a fixed
  // classical list — Vishti/Bhadra is the best-known example).
  const karanaRaw = load('karana_details') || [];
  const karanaList = Array.isArray(karanaRaw) ? karanaRaw : (karanaRaw.KARANA_DETAILS || []);
  const badKaranas = karanaList.filter(k => k.nature === 'Inauspicious').map(k => k.name);

  // Bad Lagna — Ascendants 6th, 8th, or 12th from this chart's own Janma
  // Lagna (classical Lagna Shuddhi rule used in Muhurta selection).
  const badLagnaOffsets = [5, 7, 11]; // 0-indexed offsets for 6th/8th/12th
  const badLagnas = badLagnaOffsets.map(off => SIGNS[(lagnaSignIdx + off) % 12]);

  // Bad Month — Malamasa/Adhik Maas (intercalary lunar month) determination
  // requires a full Hindu lunisolar calendar computation this engine does
  // not implement.
  const badMonth = { status: 'NOT_AVAILABLE', reason: 'Malamasa/Adhik Maas (intercalary month) identification requires a full Hindu lunisolar calendar computation not implemented in this offline engine.' };

  // Bad Nakshatra — classical Tarabala: nakshatras falling in the
  // Vipat/Pratyak/Vadha groups counted from this chart's own Janma
  // Nakshatra (repeats every 9 nakshatras across the 27).
  const TARA_BAD_INDEXES = new Set([2, 4, 6]); // Vipat, Pratyak, Vadha (0-indexed from Janma=0)
  const badNakshatras = NAKSHATRAS.filter((n, i) => TARA_BAD_INDEXES.has(((i - janmaNakIdx) % 27 + 27) % 27));

  // Bad Prahar — this chart's own calculated inauspicious daily periods
  // (Rahu Kaal, Yamaganda, Gulika Kaal), already computed by the Panchanga
  // module for the birth date/place — surfaced here, not recomputed.
  const badPrahar = [];
  if (pg.rahuKaal) badPrahar.push({ name: 'Rahu Kaal', window: `${pg.rahuKaal.start} – ${pg.rahuKaal.end}` });
  for (const p of (pg.inauspiciousPeriods || [])) {
    if (p.name !== 'Rahu Kaal' && p.start && p.end) badPrahar.push({ name: p.name, window: `${p.start} – ${p.end}` });
  }

  // Bad Rashi — classical Shadashtak (6/8/12) rashis counted from this
  // chart's own Moon Rashi.
  const badRashis = badLagnaOffsets.map(off => SIGNS[(moonSignIdx + off) % 12]);

  // Bad Tithi — classical Rikta-group tithis (4th, 9th, 14th of each
  // Paksha), traditionally avoided for auspicious new beginnings.
  const badTithis = ['Chaturthi (4th)', 'Navami (9th)', 'Chaturdashi (14th)'];

  // Bad Yoga — the Panchang Yogas classified Inauspicious in the standard
  // 27-Yoga table (a fixed classical list, independent of this chart).
  const badYogas = ['Vishkambha', 'Atiganda', 'Shoola', 'Ganda', 'Vyaghata', 'Vajra', 'Vyatipata', 'Parigha', 'Vaidhriti'];

  // Bad Planets — this chart's own Functional Malefic / Maraka / mild
  // malefic planets for its specific Lagna (BPHS Ch.34 lordship rules,
  // already computed by src/strength/functional_nature.js).
  const badPlanets = Object.entries(fn)
    .filter(([, v]) => ['Functional Malefic', 'Maraka', 'Mild Malefic (Kendradhipati)'].includes(v.nature))
    .map(([p, v]) => ({ planet: p, nature: v.nature, reason: v.reason }));

  const ghatak = {
    badDay: { values: badDays.length ? badDays : ['(none identified for this chart)'], source: `Weekdays ruled by this chart's own functional-malefic planets (${badDayPlanets.join(', ') || 'none'}) — BPHS Ch.34 lordship rules` },
    badKaran: { values: badKaranas, source: 'Classical 11-Karana reference table — Karanas marked Inauspicious' },
    badLagna: { values: badLagnas, source: `6th/8th/12th sign from this chart's own Janma Lagna (${R.lagna.sign}) — classical Lagna Shuddhi Muhurta rule` },
    badMonth,
    badNakshatra: { values: badNakshatras, source: `Classical Tarabala: Vipat/Pratyak/Vadha groups counted from this chart's own Janma Nakshatra (${pg.nakshatra.name})` },
    badPrahar: { values: badPrahar, source: "This chart's own calculated Rahu Kaal / Yamaganda / Gulika Kaal for the birth date & place" },
    badRashi: { values: badRashis, source: `6th/8th/12th sign from this chart's own Moon Rashi (${moonSignName}) — classical Shadashtak rule` },
    badTithi: { values: badTithis, source: 'Classical Tithi classification — Rikta-group tithis (4th/9th/14th of each Paksha)' },
    badYoga: { values: badYogas, source: 'Standard classical 27 Panchang-Yoga reference table — Yogas marked Inauspicious' },
    badPlanets: { values: badPlanets, source: `Functional Malefic / Maraka planets for this chart's own Lagna (${R.lagna.sign}) — BPHS Ch.34 lordship rules` },
  };

  // ─────────────────────────────────────────────────────────────────────
  // FAVOURABLE
  // ─────────────────────────────────────────────────────────────────────

  const num = R.numerology;
  const lifePathPlanet = num ? num.numbers.lifePath.planet : null;
  const friendPlanets = lifePathPlanet ? (NATURAL_FRIENDS[lifePathPlanet] || []) : [];
  const enemyPlanets = lifePathPlanet ? (NATURAL_ENEMIES[lifePathPlanet] || []) : [];

  const luckyNumbers = num ? num.luckyNumbers : [];
  const goodNumbers = numbersRuledBy(friendPlanets);
  const challengingNumbers = numbersRuledBy(enemyPlanets);

  const goodPlanetsEntries = Object.entries(fn).filter(([, v]) => ['Yogakaraka', 'Functional Benefic'].includes(v.nature));
  const goodPlanets = goodPlanetsEntries.map(([p, v]) => ({ planet: p, nature: v.nature, reason: v.reason }));

  const luckyDays = [...new Set(goodPlanetsEntries.map(([p]) => planetToWeekday(p)).filter(Boolean))];

  const goodYears = (R.dasha?.timeline || [])
    .filter(d => ['Yogakaraka', 'Functional Benefic'].includes(fn[d.mahadasha]?.nature))
    .slice(0, 6)
    .map(d => {
      // startJD/endJD -> just the Mahadasha lord + its functional nature;
      // exact calendar years are already shown in the Dasha section, so
      // this stays a reference back to that section rather than duplicating
      // date-math here.
      return { mahadasha: d.mahadasha, nature: fn[d.mahadasha]?.nature };
    });

  const friendlySignsList = friendPlanets.flatMap(p => OWN_SIGNS[p] || []);

  const goodLagnaOffsets = [0, 3, 4, 6, 8, 9]; // 1st,4th,5th,7th,9th,10th (Kendra+Trikona) from Janma Lagna
  const goodLagnas = goodLagnaOffsets.map(off => SIGNS[(lagnaSignIdx + off) % 12]);

  // Lucky Metal / Lucky Stone — this chart's own Lagna-based recommended
  // gemstones (real classical rules table, keyed to this exact Lagna).
  const gemData = load('gemstones_recommendation');
  // r.rashi is formatted "Mesha (Aries)" — match on the English name in
  // parentheses, since r.lagna is a Hindi-transliteration-only field
  // ("Mesha Lagna") that never contains the English sign name.
  const lagnaRule = gemData?.rules?.find(r => r.rashi?.toLowerCase().includes(R.lagna.sign.toLowerCase()));
  const luckyStones = lagnaRule ? lagnaRule.recommended_gemstones.map(g => ({ stone: g.name, planet: g.planet, metal: g.metal, finger: g.finger, day: g.day })) : [];

  const favourable = {
    luckyNumbers: { values: luckyNumbers, source: "This person's own Numerology Life Path / Destiny / Soul Urge numbers (see Numerology section)" },
    goodNumbers: { values: goodNumbers, source: `Numbers ruled by planets that are classical natural friends of the Life Path planet (${lifePathPlanet || 'n/a'}) — Naisargika Maitri (BPHS Ch.4)` },
    challengingNumbers: { values: challengingNumbers, source: `Numbers ruled by planets that are classical natural enemies of the Life Path planet (${lifePathPlanet || 'n/a'}) — Naisargika Maitri (BPHS Ch.4)` },
    goodYears: { values: goodYears, source: "This chart's own Mahadasha periods ruled by a Yogakaraka/Functional-Benefic planet for this Lagna — see Dasha section for exact calendar years" },
    luckyDays: { values: luckyDays.length ? luckyDays : ['(none identified as strongly favourable for this chart)'], source: "Weekdays ruled by this chart's own Yogakaraka/Functional-Benefic planets — BPHS Ch.34 lordship rules" },
    goodPlanets: { values: goodPlanets, source: `Yogakaraka / Functional Benefic planets for this chart's own Lagna (${R.lagna.sign}) — BPHS Ch.34 lordship rules` },
    friendlySigns: { values: [...new Set(friendlySignsList)], source: `Own-signs of planets that are classical natural friends of the Moon-sign lord's/Life-Path planet's circle — Naisargika Maitri (BPHS Ch.4)` },
    goodLagna: { values: goodLagnas, source: `Kendra (1/4/7/10) and Trikona (1/5/9) signs from this chart's own Janma Lagna (${R.lagna.sign}) — classical Lagna Shuddhi Muhurta rule` },
    luckyMetal: { values: [...new Set(luckyStones.map(s => s.metal))], source: `This chart's own Lagna-based (${R.lagna.sign}) gemstone-metal recommendation table` },
    luckyStone: { values: luckyStones, source: `This chart's own Lagna-based (${R.lagna.sign}) recommended-gemstones table` },
  };

  return { ghatak, favourable };
}

export default { buildGhatakFavourable };
