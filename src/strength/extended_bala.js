// ============================================================
// VEDIC JYOTISH v10 — EXTENDED PLANETARY STRENGTH
// Vimshopaka Bala, Bhava Bala, Graha Avastha
// ============================================================

import { SIGNS, SIGN_LORDS, EXALTATION, DEBILITATION, OWN_SIGNS, MOOLATRIKONA,
         NATURAL_FRIENDS, NATURAL_ENEMIES } from '../astronomy/constants.js';
import { mod360, signOf } from '../astronomy/utils.js';
import { calcD1, calcD2, calcD3, calcD7, calcD9, calcD10, calcD12,
         calcD16, calcD20, calcD24, calcD27, calcD30, calcD40, calcD45, calcD60 } from '../charts/vargas.js';

// ── VIMSHOPAKA BALA (20-point strength) ──────────────────────
// Based on planet's dignity across 16 divisional charts
// Each chart has a weight; total possible = 20 points
import moduleData from '../../dataset/used/core/extended_bala.json' with { type: 'json' };
const VIMSHOPAKA_WEIGHTS = moduleData.VIMSHOPAKA_WEIGHTS;
// Dignity points per varga:
const VIMSHOPAKA_DIGNITY = moduleData.VIMSHOPAKA_DIGNITY;

function getDigForVimshopaka(planet, signIdx) {
  const sign = SIGNS[signIdx];
  if (EXALTATION[planet]?.sign === sign)   return 'Exalted';
  if (DEBILITATION[planet]?.sign === sign) return 'Debilitated';
  const mt = MOOLATRIKONA[planet];
  if (mt?.sign === sign) return 'Moolatrikona';
  if (OWN_SIGNS[planet]?.includes(sign))  return 'Own';
  const lord = SIGN_LORDS[sign];
  if (!lord) return 'Neutral';
  const pFriend = NATURAL_FRIENDS[planet]?.includes(lord) ?? false;
  const lFriend = NATURAL_FRIENDS[lord]?.includes(planet) ?? false;
  const pEnemy  = NATURAL_ENEMIES[planet]?.includes(lord) ?? false;
  const lEnemy  = NATURAL_ENEMIES[lord]?.includes(planet) ?? false;
  if (pFriend && lFriend) return 'GreatFriend';
  if (pEnemy  && lEnemy)  return 'GreatEnemy';
  if (pFriend || lFriend) return 'Friend';
  if (pEnemy)              return 'Enemy';
  return 'Neutral';
}

export function calcVimshopakaBala(planet, siderealLon) {
  const vargas = {
    D1: calcD1(siderealLon),  D2: calcD2(siderealLon),  D3: calcD3(siderealLon),
    D7: calcD7(siderealLon),  D9: calcD9(siderealLon),  D10: calcD10(siderealLon),
    D12: calcD12(siderealLon), D16: calcD16(siderealLon), D20: calcD20(siderealLon),
    D24: calcD24(siderealLon), D27: calcD27(siderealLon), D30: calcD30(siderealLon),
    D40: calcD40(siderealLon), D45: calcD45(siderealLon), D60: calcD60(siderealLon),
  };

  let total = 0;
  const breakdown = {};
  for (const [varga, signIdx] of Object.entries(vargas)) {
    const weight  = VIMSHOPAKA_WEIGHTS[varga] ?? 0.5;
    const dignity = getDigForVimshopaka(planet, signIdx);
    const pts     = (VIMSHOPAKA_DIGNITY[dignity] / 20) * weight;
    total += pts;
    breakdown[varga] = { sign: SIGNS[signIdx], dignity, pts: Math.round(pts * 100) / 100 };
  }

  return {
    total: Math.round(total * 100) / 100,
    max: 20,
    percent: Math.round((total / 20) * 100),
    grade: total >= 15 ? 'Excellent' : total >= 12 ? 'Good' : total >= 8 ? 'Average' : 'Weak',
    breakdown
  };
}

// ── BHAVA BALA (House Strength) ───────────────────────────────
// Three components: Bhava Adhipati Bala, Bhava Digbala, Bhava Drishti Bala

export function calcBhavaBala(houses, planets, shadbala) {
  const SIGNS_ARR = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const results = {};

  for (let h = 1; h <= 12; h++) {
    const house = houses[h-1];
    if (!house) continue;

    // 1. Bhava Adhipati Bala — lord's Shadbala
    const lord = house.lord;
    const lordBala = shadbala?.[lord]?.totalShadbala ?? 300;
    const adhipatiBala = lordBala / 10; // Scale to ~30

    // 2. Bhava Digbala — based on house position
    // Angular houses (1,4,7,10) strongest
    const kendra = [1,4,7,10].includes(h) ? 60 : [2,5,8,11].includes(h) ? 30 : 15;

    // 3. Bhava Drishti Bala — from planets aspecting this house
    const houseSign = house.signIndex ?? (h - 1);
    let drishti = 0;
    for (const p of (planets || [])) {
      const pSign = signOf(p.siderealLon ?? 0);
      const diff  = Math.abs(pSign - houseSign);
      const minDiff = Math.min(diff, 12 - diff);
      // Aspects from 7th (full), 4th/8th (3/4), 5th/9th (1/2)
      if (minDiff === 6) drishti += 60; // 7th aspect
      else if (minDiff === 3 || minDiff === 9) drishti += 45; // 4th/10th from planet
      else if ([2, 5, 4, 8].includes(minDiff)) drishti += 30;
      // Special aspects: Mars also aspects 4th,7th,8th; Jupiter aspects 5th,7th,9th; Saturn aspects 3rd,7th,10th
    }
    drishti = Math.min(drishti, 60);

    const total = adhipatiBala + kendra + drishti;
    results[h] = {
      house: h,
      lord,
      adhipatiBala: Math.round(adhipatiBala),
      digbala: kendra,
      drishtiBala: Math.round(drishti),
      total: Math.round(total),
      grade: total >= 120 ? 'Strong' : total >= 80 ? 'Average' : 'Weak'
    };
  }
  return results;
}

// ── GRAHA AVASTHA (Planet States) ────────────────────────────
// Describes the delivery capacity of each planet based on its state

const BALADI_AVASTHA = moduleData.BALADI_AVASTHA;

const JAGRADADI_AVASTHA = moduleData.JAGRADADI_AVASTHA;

export function calcGrahaAvastha(planet, siderealLon, isRetrograde, isCombust) {
  const degInSign = siderealLon % 30;
  const signIdx   = signOf(siderealLon);

  // Baladi Avastha (age state by degree in sign)
  const baladi = BALADI_AVASTHA.find(a => degInSign >= a.from && degInSign < a.to)
               || BALADI_AVASTHA[4];

  // Jagradadi Avastha (alertness based on sign + navamsha)
  // Odd sign + own/friendly navamsha = Jagrat
  // Mixed = Swapna; Enemy + even sign = Sushupti
  const isOddSign = signIdx % 2 === 0;
  const jagradadi = isOddSign
    ? (isCombust ? JAGRADADI_AVASTHA.Sushupti : JAGRADADI_AVASTHA.Jagrat)
    : (isRetrograde ? JAGRADADI_AVASTHA.Swapna : JAGRADADI_AVASTHA.Sushupti);

  // Deeptadi Avastha (brightness state)
  const deeptadi = (() => {
    if (isCombust) return { name: 'Vikala (Combust)',  delivery: 0   };
    if (EXALTATION[planet] && SIGNS[signIdx] === EXALTATION[planet].sign)
      return { name: 'Deepta (Exalted)',   delivery: 100 };
    if (isRetrograde) return { name: 'Sthira (Retrograde)', delivery: 75 };
    if (OWN_SIGNS[planet]?.includes(SIGNS[signIdx]))
      return { name: 'Swastha (Own sign)', delivery: 100 };
    if (MOOLATRIKONA[planet]?.sign === SIGNS[signIdx])
      return { name: 'Mudita (MT)',        delivery: 100 };
    if (DEBILITATION[planet] && SIGNS[signIdx] === DEBILITATION[planet].sign)
      return { name: 'Dukhita (Debil)',    delivery: 0   };
    return { name: 'Shanta (Normal)',     delivery: 50  };
  })();

  // Net delivery capacity
  const netDelivery = Math.round(
    (baladi.delivery * 0.4 + jagradadi.delivery * 0.3 + deeptadi.delivery * 0.3)
  );

  return {
    planet,
    degInSign: degInSign.toFixed(2),
    baladiAvastha:  { ...baladi,   delivery: baladi.delivery },
    jagradadi:      { name: Object.keys(JAGRADADI_AVASTHA).find(k => JAGRADADI_AVASTHA[k] === jagradadi) || 'Jagrat', ...jagradadi },
    deeptadi,
    netDelivery,
    grade: netDelivery >= 75 ? 'Excellent' : netDelivery >= 50 ? 'Good' : netDelivery >= 25 ? 'Average' : 'Very Weak',
    isCombust,
    isRetrograde,
    criticalWarning: netDelivery === 0 ? `${planet} has ZERO delivery capacity — its significations will not manifest` : null,
  };
}

// ── 22ND DREKKANA & 64TH NAVAMSA ─────────────────────────────
// Critical sensitive points for health and longevity

export function calc22ndDrekkana(ascLon) {
  // 22nd drekkana from Lagna = 7th house's 2nd drekkana
  const ascSign = signOf(ascLon);
  const seventhSign = (ascSign + 6) % 12;
  // 22nd drekkana = sign ruler of 2nd drekkana of 7th house
  // 2nd drekkana = 10-20° of 7th sign
  // Lord = planet ruling the drekkana chart for 10-20° of 7th sign
  // Using standard drekkana lords:
  const sign22 = (seventhSign + 4) % 12; // 5th sign from 7th
  const SIGNS_LOC = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const SL = {'Aries':'Mars','Taurus':'Venus','Gemini':'Mercury','Cancer':'Moon',
              'Leo':'Sun','Virgo':'Mercury','Libra':'Venus','Scorpio':'Mars',
              'Sagittarius':'Jupiter','Capricorn':'Saturn','Aquarius':'Saturn','Pisces':'Jupiter'};
  const signName = SIGNS_LOC[sign22];
  return {
    signIndex: sign22,
    sign:  signName,
    lord:  SL[signName],
    desc:  '22nd Drekkana indicates health vulnerabilities and critical life events'
  };
}

export function calc64thNavamsa(moonLon) {
  // 64th navamsha from Moon = 8th house of 8th navamsha from Moon
  // Each navamsha = 3°20' = 3.3333°
  const moonSign = signOf(moonLon);
  const moonDeg  = moonLon % 30;
  const moonNavIdx = Math.floor(moonDeg / (30/9));
  // 64th navamsha = 8th navamsha from 8th sign from Moon
  const eighthSign = (moonSign + 7) % 12;
  // Fire/Earth/Air/Water start of navamsha
  const starts = [0,9,6,3];
  const navStart = starts[eighthSign % 4];
  // 8th navamsha within that sign
  const nav64Sign = (navStart + 7) % 12;
  const SIGNS_LOC = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const SL = {'Aries':'Mars','Taurus':'Venus','Gemini':'Mercury','Cancer':'Moon',
              'Leo':'Sun','Virgo':'Mercury','Libra':'Venus','Scorpio':'Mars',
              'Sagittarius':'Jupiter','Capricorn':'Saturn','Aquarius':'Saturn','Pisces':'Jupiter'};
  const signName = SIGNS_LOC[nav64Sign];
  return {
    signIndex: nav64Sign,
    sign:  signName,
    lord:  SL[signName],
    desc:  '64th Navamsha from Moon indicates danger periods and transformative events'
  };
}

// ── VIMSHOPAKA FOR ALL PLANETS ───────────────────────────────
export function calcAllVimshopakaBala(planets) {
  const results = {};
  const PLANET_NAMES = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
  for (const pname of PLANET_NAMES) {
    const p = planets?.find(x => x.name === pname);
    if (!p) continue;
    results[pname] = calcVimshopakaBala(pname, p.siderealLon ?? 0);
  }
  return results;
}

// ── GRAHA AVASTHA FOR ALL ────────────────────────────────────
export function calcAllGrahaAvastha(planets) {
  const results = {};
  for (const p of (planets || [])) {
    if (['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'].includes(p.name)) {
      results[p.name] = calcGrahaAvastha(
        p.name, p.siderealLon ?? 0, p.isRetrograde ?? false, p.isCombust ?? false
      );
    }
  }
  return results;
}
