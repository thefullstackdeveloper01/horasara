// ============================================================
// VEDIC JYOTISH v10 — SPECIAL LAGNAS (UPAGRAHAS & LAGNAS)
// Hora Lagna, Ghati Lagna, Bhava Lagna, Varnada Lagna, Sree Lagna
// Verified formula sources: BPHS, Jaimini Sutras
// ============================================================

import { mod360 } from '../astronomy/utils.js';

/**
 * HORA LAGNA — Wealth timing indicator
 * Formula: Sun's position + elapsed ghatikas since sunrise × 30°
 * HL moves at 60° per hour (one sign per 2 ghatikas)
 */
export function calcHoraLagna(birthJD, sunriseJD, sunLon) {
  const elapsedHours = (birthJD - sunriseJD) * 24;
  return mod360(sunLon + elapsedHours * 30);
}

/**
 * GHATI LAGNA — Power, fame, authority
 * FIX (Special Lagnas audit): previously based on the natal Ascendant.
 * Sourced classical worked example (Jaimini special-lagnas reference,
 * cross-checked against the same source's Hora Lagna example) shows Ghati
 * Lagna, like Hora Lagna, starts from the SUN's longitude AT SUNRISE, not
 * the Ascendant — the two Lagnas share the same starting point and differ
 * only in their rate of motion.
 * Formula: Sun's longitude at sunrise + elapsed time since sunrise x 75°/hr
 * GL moves at one sign every 24 minutes (2.5 signs = 75° per hour)
 */
export function calcGhatiLagna(birthJD, sunriseJD, sunLon) {
  const elapsedHours = (birthJD - sunriseJD) * 24;
  return mod360(sunLon + elapsedHours * 2.5 * 30);
}

/**
 * BHAVA LAGNA — Prosperity and rising momentum
 * FIX (Special Lagnas audit): previously an exact duplicate of Hora Lagna's
 * formula (same 30°/hour rate) — but the sourced classical definition
 * ("each Bhava/house lasts 5 Ghatikas, roughly 2 hours") gives a rate of
 * 30° per 2 hours = 15° per hour, HALF of Hora Lagna's rate, not the same.
 * Formula: Sun's longitude at sunrise + elapsed time since sunrise x 15°/hr
 */
export function calcBhavaLagna(birthJD, sunriseJD, sunLon) {
  const elapsedHours = (birthJD - sunriseJD) * 24;
  return mod360(sunLon + elapsedHours * 15);
}

/**
 * VARNADA LAGNA — Professional direction, career path
 * Jaimini formula:
 * - Count from Aries to Hora Lagna (odd count if Hora in odd sign)
 * - Count from Pisces to Hora Lagna (even count if Hora in even sign)
 * - Add to Ascendant position
 */
export function calcVarnadaLagna(ascLon, horaLon) {
  const ascSign  = Math.floor(ascLon  / 30); // 0-indexed
  const horaSign = Math.floor(horaLon / 30);

  const ascIsOdd  = ascSign  % 2 === 0; // Aries=0(odd), Taurus=1(even)...
  const horaIsOdd = horaSign % 2 === 0;

  // Count from Aries (if odd) or Pisces (if even) to lagna/hora
  const countAsc  = ascIsOdd  ? ascSign  + 1 : 12 - ascSign;
  const countHora = horaIsOdd ? horaSign + 1 : 12 - horaSign;

  // FIX (Special Lagnas audit): previously always summed the two counts
  // regardless of oddity. Sourced from 5 independent references (Sri
  // Garuda/Visti Larsen, Saptarishis' survey of Santhanam/Raman/GC
  // Sharma, and 2 more) that all agree on the same rule, and verified
  // against two full worked numerical examples from those sources
  // (Cancer+Virgo -> 4; Leo+Scorpio -> 12) which this reimplementation
  // reproduces exactly:
  //   - If Lagna and Hora Lagna are the SAME oddity (both counted from
  //     Aries, or both from Pisces): ADD the two counts.
  //   - If DIFFERENT oddity: take the DIFFERENCE (larger minus smaller).
  //     If that difference is exactly 0, treat it as 12 (a full cycle),
  //     not 0.
  let sum;
  if (ascIsOdd === horaIsOdd) {
    sum = countAsc + countHora;
    if (sum > 12) sum -= 12;
  } else {
    sum = Math.abs(countAsc - countHora);
    if (sum === 0) sum = 12;
  }

  // Final count direction: this codebase follows Santhanam's convention
  // (the FINAL sum's own odd/even parity decides forward-from-Aries vs
  // reverse-from-Pisces counting) rather than Raman's convention (which
  // instead uses the original Janma Lagna's own parity for this last
  // step) -- both are cited as legitimate views among classical
  // commentators with no clear consensus, so this is disclosed variance,
  // not a bug, and Santhanam's convention (already what was implemented)
  // is kept.
  let varnadaSign;
  if (sum % 2 !== 0) {
    varnadaSign = sum - 1; // Count from Aries
  } else {
    varnadaSign = 12 - sum; // Count from Pisces backwards
  }

  return mod360(((varnadaSign % 12) + 12) % 12 * 30 + (ascLon % 30));
}

/**
 * SREE LAGNA — Fortune, Lakshmi, prosperity and abundance
 * FIX (Special Lagnas audit): the previous formula ("Moon + (Moon-Sun)")
 * was structurally wrong — it never involved the Ascendant at all, which
 * is suspicious for anything called a "Lagna." Sourced from 3 independent
 * references (including a full worked numerical example that this
 * reimplementation reproduces exactly: Moon at 3°20' Aries [=25% through
 * Ashwini], Ascendant at 15° Cancer -> Sree Lagna = 15° Libra):
 *   1. Find how far the Moon has progressed through its current
 *      Nakshatra, as a fraction (0 to 1) of the Nakshatra's 13°20' span.
 *   2. Scale that fraction across the full 360° zodiac.
 *   3. Add the resulting arc to the birth Ascendant.
 * Sree Lagna = Ascendant + (Moon's fractional progress through its
 * Nakshatra) x 360°
 */
export function calcSreeLagna(moonLon, ascLon) {
  const NAK_SPAN = 360 / 27; // 13°20'
  const fractionInNakshatra = (mod360(moonLon) % NAK_SPAN) / NAK_SPAN;
  const arc = fractionInNakshatra * 360;
  return mod360(ascLon + arc);
}

/**
 * UPAPADA LAGNA — Spouse and marriage quality
 * UL = 12th lord position + its distance from 12th house
 */
export function calcUpapadaLagna(twelfthHouseCusp, twelfthLordLon) {
  const dist = mod360(twelfthLordLon - twelfthHouseCusp);
  return mod360(twelfthHouseCusp + dist);
}

/**
 * ARUDHA LAGNA (A1) — Public image, how the world sees you
 * AL = Mirror reflection of Lagna Lord from Lagna
 */
export function calcArudhaLagna(ascLon, lagnaLordLon) {
  const dist = mod360(lagnaLordLon - ascLon);
  let al = mod360(lagnaLordLon + dist);
  // If AL falls in Lagna or 7th from it, move 10 signs forward
  const alSign  = Math.floor(al / 30);
  const ascSign = Math.floor(ascLon / 30);
  if (alSign === ascSign || alSign === (ascSign + 6) % 12) {
    al = mod360(al + 10 * 30);
  }
  return al;
}

/**
 * ALL ARUDHA PADAS (A1-A12)
 * For each house, find its lord's position, then mirror from house
 */
export function calcAllArudhas(houses, planets) {
  const arudhas = {};
  for (let h = 1; h <= 12; h++) {
    const house = houses[h - 1];
    if (!house) continue;
    const lord = house.lord;
    const lordPlanet = planets.find(p => p.name === lord);
    if (!lordPlanet) continue;

    const houseCusp = house.startDeg ?? ((Math.floor(houses[0].startDeg / 30) + h - 1) % 12) * 30;
    const lordLon   = lordPlanet.siderealLon;
    const dist      = mod360(lordLon - houseCusp);
    let arudha      = mod360(lordLon + dist);

    const aSign = Math.floor(arudha / 30);
    const hSign = Math.floor(houseCusp / 30);
    if (aSign === hSign || aSign === (hSign + 6) % 12) {
      arudha = mod360(arudha + 10 * 30);
    }

    arudhas[`A${h}`] = {
      lon:  arudha,
      sign: Math.floor(arudha / 30),
      deg:  arudha % 30,
    };
  }
  return arudhas;
}

/**
 * PRANAPADA LAGNA (Prana Lagna) — Vitality, health momentum, immediate life-force
 * FIX (Special Lagnas audit): sourced directly from BPHS Ch.6 verses 71-73
 * (via Santanam's translation, cross-verified against 4 independent
 * commentaries — all agree, and all give the same 3 worked numerical
 * examples used to verify this implementation below). The previous
 * implementation ("Ascendant + elapsed x 5 x 30°") was wrong on every
 * count — wrong base point (should be the Sun, not the Ascendant), wrong
 * rate, and entirely missing the movable/fixed/dual-sign correction that
 * is the defining feature of this technique:
 *   1. Ishta Kala = elapsed vighatis since sunrise (1 vighati = 24 sec)
 *   2. A = (Ishta Kala / 15) signs, i.e. 1 sign (30°) per 15 vighatis
 *      ("20x faster than the Lagna" — matches independently)
 *   3. B = Sun's longitude + A
 *   4. Sun in a MOVABLE sign (Ar/Cn/Li/Cp): Pranapada = B
 *      Sun in a FIXED sign (Ta/Le/Sc/Aq):   Pranapada = B + 240°
 *      Sun in a DUAL sign (Ge/Vi/Sg/Pi):    Pranapada = B + 120°
 * Verified against all 3 of BPHS's own worked examples (16gh25vi elapsed,
 * Sun at Aries/Taurus/Gemini 15° -> Libra5°/Cancer5°/Aries5° respectively)
 * — this implementation reproduces all three exactly.
 * Uses birth-time Sun longitude as a stand-in for sunrise-time Sun
 * longitude (the Sun moves under ~0.3° across a few hours — a small,
 * disclosed simplification; the sign-correction logic above is the fix's
 * main impact, not this).
 */
export function calcPranaLagna(birthJD, sunriseJD, sunLon) {
  const elapsedMinutes = (birthJD - sunriseJD) * 24 * 60;
  const vighatis = elapsedMinutes * 2.5; // 1 minute = 2.5 vighatis (1 vighati = 24s)
  const A = mod360((vighatis / 15) * 30); // 1 sign (30°) per 15 vighatis
  const B = mod360(sunLon + A);

  const sunSign = Math.floor(mod360(sunLon) / 30);
  const fixed = [1, 4, 7, 10]; // Taurus, Leo, Scorpio, Aquarius
  const dual  = [2, 5, 8, 11]; // Gemini, Virgo, Sagittarius, Pisces

  if (fixed.includes(sunSign)) return mod360(B + 240);
  if (dual.includes(sunSign))  return mod360(B + 120);
  return B; // movable sign: Aries, Cancer, Libra, Capricorn
}

/**
 * VIGHATI LAGNA — Fate, destiny and sudden events
 * FIX H-04: Previously missing. Formula: Ascendant + elapsed vighatis × 1°
 * 1 vighati = 24 seconds; Vighati Lagna moves 1° per vighati = 60°/hour
 * Completes one full zodiac in 6 hours (extremely fast)
 */
export function calcVighatiLagna(birthJD, sunriseJD, ascLon) {
  const elapsedHours = (birthJD - sunriseJD) * 24;
  return mod360(ascLon + elapsedHours * 60); // 60° per hour
}

/**
 * INDU LAGNA — Wealth potential and financial longevity
 * FIX H-04: Previously missing. Jaimini/BPHS formula:
 * Each planet contributes a specific number to the calculation:
 * Sun=30, Moon=16, Mars=6, Mercury=8, Jupiter=10, Venus=12, Saturn=1
 * Indu Lagna = 9th lord from Lagna + 9th lord from Moon → sum their Indu numbers
 * Then count that many signs from Moon
 */
import moduleData from '../../dataset/used/core/special_lagnas.json' with { type: 'json' };
const INDU_VALUES = moduleData.INDU_VALUES;

export function calcInduLagna(moonLon, ascLon, planets) {
  if (!planets || !planets.length) return null;
  const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const SIGN_LORDS_MAP = { Aries:'Mars',Taurus:'Venus',Gemini:'Mercury',Cancer:'Moon',Leo:'Sun',Virgo:'Mercury',Libra:'Venus',Scorpio:'Mars',Sagittarius:'Jupiter',Capricorn:'Saturn',Aquarius:'Saturn',Pisces:'Jupiter' };

  const ascSign  = Math.floor(mod360(ascLon) / 30);
  const moonSign = Math.floor(mod360(moonLon) / 30);

  // 9th from Lagna (count 8 signs forward from ascendant sign)
  const ninthFromLagna = (ascSign + 8) % 12;
  // 9th from Moon
  const ninthFromMoon  = (moonSign + 8) % 12;

  const lord9Lagna = SIGN_LORDS_MAP[SIGNS[ninthFromLagna]];
  const lord9Moon  = SIGN_LORDS_MAP[SIGNS[ninthFromMoon]];

  const val1 = INDU_VALUES[lord9Lagna] || 0;
  const val2 = INDU_VALUES[lord9Moon]  || 0;
  const sum  = ((val1 + val2) % 12) || 12; // 1-12 range

  // Count 'sum' signs from Moon's sign
  const induSign = (moonSign + sum - 1) % 12;
  return induSign * 30 + 15; // midpoint of the sign
}

/**
 * ISHTKAAL — Elapsed time from sunrise in ghatikas (for Panchanga)
 * 1 day = 60 ghatikas
 */
export function calcIshtkaal(birthJD, sunriseJD, sunsetJD) {
  const dayLength  = sunsetJD - sunriseJD;
  const elapsed    = birthJD  - sunriseJD;
  return (elapsed / dayLength) * 30; // 30 ghatikas in daytime
}

/**
 * CALCULATE ALL SPECIAL LAGNAS AT ONCE
 */
export function calcSpecialLagnas(birthJD, sunriseJD, sunsetJD, ascLon, sunLon, moonLon, planets, houses) {
  const horaL    = calcHoraLagna(birthJD, sunriseJD, sunLon);
  const ghatiL   = calcGhatiLagna(birthJD, sunriseJD, sunLon);
  const bhavaL   = calcBhavaLagna(birthJD, sunriseJD, sunLon);
  const pranaL   = calcPranaLagna(birthJD, sunriseJD, sunLon);
  const vighatiL = calcVighatiLagna(birthJD, sunriseJD, ascLon);
  const induL    = calcInduLagna(moonLon, ascLon, planets);
  const varnadaL = calcVarnadaLagna(ascLon, horaL);
  const sreeL   = calcSreeLagna(moonLon, ascLon);
  const ishtkaal = calcIshtkaal(birthJD, sunriseJD, sunsetJD ?? sunriseJD + 0.5);

  // Arudha Lagnas
  const lagnaLord = planets?.find(p => p.name === houses?.[0]?.lord);
  const arudhaL   = lagnaLord ? calcArudhaLagna(ascLon, lagnaLord.siderealLon) : null;

  const formatLagna = (lon) => {
    if (lon == null || isNaN(lon)) return null;
    const sign = Math.floor(mod360(lon) / 30);
    const deg  = mod360(lon) % 30;
    const d = Math.floor(deg), m = Math.floor((deg-d)*60), s = Math.round(((deg-d)*60-m)*60);
    const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
    return {
      lon: mod360(lon),
      sign: SIGNS[sign],
      signIndex: sign,
      dms: `${d}°${String(m).padStart(2,'0')}'${String(s).padStart(2,'0')}"`,
      house: ((sign - Math.floor(mod360(ascLon)/30) + 12) % 12) + 1
    };
  };

  return {
    horaLagna:    { ...formatLagna(horaL),    name:'Hora Lagna (HL)',    purpose:'Wealth timing, financial opportunities' },
    ghatiLagna:   { ...formatLagna(ghatiL),   name:'Ghati Lagna (GL)',   purpose:'Power, fame, authority & recognition' },
    bhavaLagna:   { ...formatLagna(bhavaL),   name:'Bhava Lagna (BL)',   purpose:'Prosperity rising momentum' },
    pranaLagna:   { ...formatLagna(pranaL),   name:'Prana Lagna (PL)',   purpose:'Vitality, health momentum, life-force' },
    vighatiLagna: { ...formatLagna(vighatiL), name:'Vighati Lagna (ViL)',purpose:'Destiny, fate, sudden life events' },
    induLagna:    induL != null ? { ...formatLagna(induL), name:'Indu Lagna (IL)', purpose:'Wealth potential, financial longevity' } : null,
    varnadaLagna: { ...formatLagna(varnadaL), name:'Varnada Lagna (VL)', purpose:'Professional direction, career path' },
    sreeLagna:    { ...formatLagna(sreeL),    name:'Sree Lagna (SL)',    purpose:'Fortune, Lakshmi, abundance' },
    arudhaLagna:  arudhaL ? { ...formatLagna(arudhaL), name:'Arudha Lagna (AL)', purpose:'Public image, social mask' } : null,
    ishtkaal:     { value: ishtkaal.toFixed(2), unit: 'ghatikas', desc: 'Elapsed time from sunrise' },
  };
}
