// ============================================================
// KALACHAKRA DASHA ("Wheel of Time")
// ------------------------------------------------------------
// IMPORTANT — read before trusting this module's output at face value:
//
// Kalachakra Dasha is, by wide acknowledgment among Vedic astrologers,
// one of the most genuinely DISPUTED classical dasha systems — not
// merely "hard to code" but subject to real, documented disagreement
// among scholars about its correct calculation. Specifically:
//
//   - Parasara gives, for each of the 108 nakshatra-padas, an elaborate
//     9-sign sequence. Classical commentators have long debated whether
//     these 108 sequences ARE the Mahadasha sequences themselves, or
//     (per a more recent, well-argued reinterpretation by P.V.R.
//     Narasimha Rao, citing a specific verse most translators pass over)
//     are actually Antardasha/Bhukti sequences, with the true Mahadasha
//     sequence being the much simpler "9 consecutive nakshatra-pada
//     Navamsa signs starting from the Moon's own pada."
//   - Separately, there is a documented dispute about whether the
//     birth-Dasha balance applies to just the first sign of a sequence
//     (like Vimshottari) or to an entire 9-sign cycle.
//
// This module implements ONE specific, cited interpretation — the
// Narasimha Rao "demystified" reading — because it is internally
// consistent, resolves the ambiguity via an explicit classical verse
// rather than an arbitrary choice, and (unlike the alternatives) comes
// with a fully worked example that this implementation is verified
// against exactly (see test/consistency.test.mjs). It is NOT presented
// as the single settled truth of Kalachakra Dasha — the report labels it
// as one documented interpretation, and a different, equally classical
// piece of software may legitimately show different Kalachakra periods.
//
// Source: "Kalachakra Dasa Demystified (Part 1)", Modern Astrology
// (P.V.R. Narasimha Rao), courtesy Astro-Vision blog. Worked example used
// for verification: a Bharani-3rd-pada birth Moon yields the sequence
// Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces, Scorpio,
// Libra, Virgo.
// ============================================================

import { NAKSHATRAS } from '../astronomy/constants.js';
import { nakshatraOf, padaOf, formatDate, jdToDate } from '../astronomy/utils.js';

// Undisputed: sign dasha-years always equal the classical planetary
// dasha years of that sign's ruling planet (this part of Kalachakra Dasha
// has no scholarly disagreement — see B.V. Raman and others).
import moduleData from '../../dataset/used/core/kalachakra.json' with { type: 'json' };
const SIGN_DASHA_YEARS = moduleData.SIGN_DASHA_YEARS;

// The 12-sign Navamsa progression used within a "Savya" (direct) nakshatra
// triad, in pada order.
const SAVYA_SEQUENCE = moduleData.SAVYA_SEQUENCE;
// The mirrored 12-sign progression used within an "Apasavya" (reverse)
// nakshatra triad.
const APASAVYA_SEQUENCE = moduleData.APASAVYA_SEQUENCE;

/**
 * Returns the Kalachakra Navamsa sign for a given absolute nakshatra-pada
 * slot (0..107, where slot = nakIdx*4 + (pada-1)).
 * Nakshatras group into 9 consecutive triads of 3, alternating
 * Savya/Apasavya starting with Savya (Ashwini-Bharani-Krittika = Savya).
 */
function kalachakraSignForSlot(slot) {
  const triadIndex = Math.floor(slot / 12);        // which triad of 3 nakshatras (0-8)
  const posInTriad = slot % 12;                     // 0-11 position within that triad
  const isSavya = triadIndex % 2 === 0;              // triad 0,2,4,6,8 = Savya; 1,3,5,7 = Apasavya
  return isSavya ? SAVYA_SEQUENCE[posInTriad] : APASAVYA_SEQUENCE[posInTriad];
}

/**
 * Calculate Kalachakra Dasha from the natal Moon's sidereal longitude.
 * @param {number} birthJD
 * @param {number} moonLon - sidereal longitude of Moon at birth
 * @param {number} [endYear] - defaults to birth year + 100 (traditional Paramayu)
 */
export function calcKalachakraDasha(birthJD, moonLon, endYear = null) {
  const nakIdx = nakshatraOf(moonLon);
  const pada = padaOf(moonLon); // 1-4
  const startSlot = nakIdx * 4 + (pada - 1);

  if (endYear === null) endYear = jdToDate(birthJD).year + 100; // traditional Paramayu

  // Balance of the first Dasha: fraction of the current PADA remaining,
  // the same style of birth-balance calculation used for every other
  // dasha system in this codebase (Vimshottari, Yogini) applied to
  // Kalachakra's own natural time unit (a pada = 40/3/4 = 10/3 degrees).
  const PADA_WIDTH = 40 / 3 / 4;
  const nakStart = nakIdx * (40 / 3);
  const padaStart = nakStart + (pada - 1) * PADA_WIDTH;
  const posInPada = moonLon - padaStart;
  const fracRemaining = Math.max(0, Math.min(1, 1 - posInPada / PADA_WIDTH));

  const dashas = [];
  let currentJD = birthJD;
  let slot = startSlot;
  let first = true;

  while (true) {
    const sign = kalachakraSignForSlot(slot % 108);
    const fullYears = SIGN_DASHA_YEARS[sign];
    const years = first ? fullYears * fracRemaining : fullYears;
    const endJD = currentJD + years * 365.25;
    const endD = jdToDate(endJD);

    dashas.push({
      sign,
      years: parseFloat(years.toFixed(4)),
      startJD: currentJD,
      endJD,
      start: formatDate(currentJD),
      end: formatDate(endJD),
      isBalance: first,
    });

    if (endD.year > endYear + 5) break;
    currentJD = endJD;
    slot++;
    first = false;
    if (dashas.length > 400) break; // safety guard against any runaway loop
  }

  return {
    natalNakshatra: NAKSHATRAS[nakIdx],
    natalPada: pada,
    startSlot,
    dashas,
    interpretation: 'Narasimha Rao "demystified" reading (see module header) — one of several documented scholarly interpretations of this classically disputed system.',
    source: 'Modern Astrology (P.V.R. Narasimha Rao), "Kalachakra Dasa Demystified Part 1"',
  };
}
