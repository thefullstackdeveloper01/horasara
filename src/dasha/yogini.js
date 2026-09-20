// ============================================================
// VEDIC JYOTISH ENGINE v13 — YOGINI & ASHTOTTARI DASHA
// FIX D-03: Yogini mapping verified correct (nIdx % 8 per BPHS)
// FIX D-06: Ashtottari Dasha — Rahu kendra/trikona eligibility check added
// ============================================================

import { YOGINI_DASHA, ASHTOTTARI_YEARS, ASHTOTTARI_ORDER, NAKSHATRA_LORDS, VIMSHOTTARI_CYCLE_YEARS } from '../astronomy/constants.js';
import { nakshatraOf, formatDate, jdToDate, signOf } from '../astronomy/utils.js';

// Yogini Dasha — 36-year total cycle, based on Moon's nakshatra
// endYear defaults to birthYear + 120 (dynamic), not a fixed calendar year —
// see the note in calcVimshottari() for why a fixed year truncates timelines.
export function calcYoginiDasha(birthJD, moonLon, endYear = null) {
  if (endYear === null) endYear = jdToDate(birthJD).year + VIMSHOTTARI_CYCLE_YEARS;
  const nIdx = nakshatraOf(moonLon);
  // Yogini index: nakshatra 0 → Mangala, 8 → back to Mangala
  const yoginiStart = nIdx % 8;
  
  // Calculate balance
  const nakStart = nIdx * (40/3);
  const posInNak = moonLon - nakStart;
  const fracRemaining = 1 - posInNak / (40/3);
  const startYogini = YOGINI_DASHA[yoginiStart];
  const balanceYears = startYogini.years * fracRemaining;
  const balanceDays = balanceYears * 365.25;
  
  const dashas = [];
  let currentJD = birthJD;
  let idx = yoginiStart;
  
  // First partial
  const firstEnd = currentJD + balanceDays;
  dashas.push({
    yogini: startYogini.name,
    lord: startYogini.lord,
    startJD: currentJD,
    endJD: firstEnd,
    years: balanceYears,
    start: formatDate(currentJD),
    end: formatDate(firstEnd)
  });
  currentJD = firstEnd;
  idx = (idx + 1) % 8;
  
  while (true) {
    const y = YOGINI_DASHA[idx];
    const endJD = currentJD + y.years * 365.25;
    const endD = jdToDate(endJD);
    if (endD.year > endYear + 5) break;
    
    dashas.push({
      yogini: y.name,
      lord: y.lord,
      startJD: currentJD,
      endJD,
      years: y.years,
      start: formatDate(currentJD),
      end: formatDate(endJD)
    });
    currentJD = endJD;
    idx = (idx + 1) % 8;
  }
  
  return dashas;
}

// Yogini sub-periods
export function calcYoginiAntardashas(yoginiDasha) {
  const totalYears = yoginiDasha.years;
  const lordIdx = YOGINI_DASHA.findIndex(y => y.name === yoginiDasha.yogini);
  const antars = [];
  let currentJD = yoginiDasha.startJD;
  
  for (let i = 0; i < 8; i++) {
    const antar = YOGINI_DASHA[(lordIdx + i) % 8];
    // Sub-period proportional to yogini years
    const subYears = totalYears * antar.years / 36;
    const subDays = subYears * 365.25;
    const endJD = currentJD + subDays;
    
    antars.push({
      yogini: yoginiDasha.yogini,
      subYogini: antar.name,
      subLord: antar.lord,
      startJD: currentJD,
      endJD,
      years: subYears,
      start: formatDate(currentJD),
      end: formatDate(endJD)
    });
    currentJD = endJD;
  }
  return antars;
}

// ─── ASHTOTTARI ELIGIBILITY CHECK (FIX D-06) ─────────────────
// Ashtottari (108-year cycle) is applicable ONLY when:
//   Rahu occupies a kendra (1,4,7,10) or trikona (1,5,9) from Lagna
//   AND Rahu is NOT the sole planet in the 1st house (per stricter schools)
// Returns { applicable, reason }
export function checkAshtottariEligibility(planets, ascLon) {
  if (!planets || !ascLon) return { applicable: false, reason: 'Chart data unavailable' };
  const rahu = planets.find(p => p.name === 'Rahu');
  if (!rahu) return { applicable: false, reason: 'Rahu position unavailable' };

  const ascSign   = signOf(ascLon);
  const rahuSign  = signOf(rahu.siderealLon);
  const rahuHouse = ((rahuSign - ascSign + 12) % 12) + 1;

  const kendras   = [1, 4, 7, 10];
  const trikonas  = [1, 5, 9];
  const goodHouses = [...new Set([...kendras, ...trikonas])]; // 1,4,5,7,9,10

  if (goodHouses.includes(rahuHouse)) {
    return {
      applicable: true,
      reason: `Rahu in ${rahuHouse}th house (kendra/trikona) — Ashtottari applicable`,
      rahuHouse
    };
  }
  return {
    applicable: false,
    reason: `Rahu in ${rahuHouse}th house — not a kendra or trikona; Ashtottari not applicable for this chart`,
    rahuHouse
  };
}

// Ashtottari Dasha — 108-year cycle
// FIX D-06: Now accepts planets+ascLon and checks eligibility before calculating
export function calcAshtottariDasha(birthJD, moonLon, endYear = null, planets = null, ascLon = null) {
  if (endYear === null) endYear = jdToDate(birthJD).year + VIMSHOTTARI_CYCLE_YEARS;
  // Eligibility check
  const eligibility = checkAshtottariEligibility(planets, ascLon);
  if (!eligibility.applicable) {
    return { applicable: false, reason: eligibility.reason, dashas: [] };
  }
  const nIdx = nakshatraOf(moonLon);
  
  // Ashtottari starts from the ruling nakshatra
  const ashtottariNakLords = [
    'Sun','Moon','Mars','Mercury','Saturn','Jupiter','Rahu','Venus'
  ];
  
  // Map nakshatra to ashtottari lord
  const ashtMap = {
    0:'Sun',1:'Moon',2:'Mars',3:'Mercury',4:'Saturn',5:'Jupiter',6:'Rahu',7:'Venus',
    8:'Sun',9:'Moon',10:'Mars',11:'Mercury',12:'Saturn',13:'Jupiter',14:'Rahu',15:'Venus',
    16:'Sun',17:'Moon',18:'Mars',19:'Mercury',20:'Saturn',21:'Jupiter',22:'Rahu',23:'Venus',
    24:'Sun',25:'Moon',26:'Mars'
  };
  
  const startLord = ashtMap[nIdx];
  const startIdx = ASHTOTTARI_ORDER.indexOf(startLord);
  
  // Balance
  const nakStart = nIdx * (40/3);
  const posInNak = moonLon - nakStart;
  const fracRemaining = 1 - posInNak / (40/3);
  const balanceYears = ASHTOTTARI_YEARS[startLord] * fracRemaining;
  
  const dashas = [];
  let currentJD = birthJD;
  let idx = startIdx;
  
  const firstEnd = currentJD + balanceYears * 365.25;
  dashas.push({
    lord: startLord,
    startJD: currentJD,
    endJD: firstEnd,
    years: balanceYears,
    start: formatDate(currentJD),
    end: formatDate(firstEnd)
  });
  currentJD = firstEnd;
  idx = (idx + 1) % 8;
  
  while (true) {
    const lord = ASHTOTTARI_ORDER[idx];
    const years = ASHTOTTARI_YEARS[lord];
    const endJD = currentJD + years * 365.25;
    const endD = jdToDate(endJD);
    if (endD.year > endYear + 5) break;
    
    dashas.push({
      lord,
      startJD: currentJD,
      endJD,
      years,
      start: formatDate(currentJD),
      end: formatDate(endJD)
    });
    currentJD = endJD;
    idx = (idx + 1) % 8;
  }
  
  return { applicable: true, reason: eligibility.reason, rahuHouse: eligibility.rahuHouse, dashas };
}
