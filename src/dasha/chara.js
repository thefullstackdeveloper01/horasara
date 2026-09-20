// ============================================================
// VEDIC JYOTISH ENGINE v10.3 — JAIMINI CHARA DASHA
// FIXED D-02: Antardasha proportional calc — uses actual sign totals not fixed 144
// FIX (Chara Dasha audit): Scorpio/Aquarius co-lordship (Mars/Ketu,
// Saturn/Rahu) narrowly scoped to just those two signs, replacing a
// previous rule that wrongly fired for any sign containing a node.
// Plus Chara Karakas (7 planet system)
// ============================================================

import { SIGNS, SIGN_LORDS, VIMSHOTTARI_CYCLE_YEARS } from '../astronomy/constants.js';
import { mod360, signOf, formatDate, jdToDate } from '../astronomy/utils.js';

// Matches the 365.25-day convention used elsewhere in this codebase's
// Vimshottari Dasha (see dasha/vimshottari.js for the sourcing rationale —
// modern reference software uses 365.25, not the astronomical sidereal year).
import moduleData from '../../dataset/used/core/chara.json' with { type: 'json' };
const SIDEREAL_YEAR = moduleData.SIDEREAL_YEAR;

// Chara Karakas — 7 planet system (Sun through Saturn + Rahu)
export function calcCharaKarakas(planets) {
  const karaka_planets = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
  
  const planetDegs = karaka_planets.map(name => {
    const p = planets.find(pl => pl.name === name);
    if (!p) return { name, degInSign: 0 };
    const lon = p.siderealLon !== undefined ? p.siderealLon : (p.lon || 0);
    return { name, degInSign: mod360(lon) % 30 };
  });
  
  // Sort descending by degree in sign — highest = Atmakaraka
  planetDegs.sort((a, b) => b.degInSign - a.degInSign);
  
  const karakaNames = [
    'Atmakaraka (AK) — Soul',
    'Amatyakaraka (AmK) — Minister/Career',
    'Bhratrukaraka (BK) — Siblings',
    'Matrukaraka (MK) — Mother',
    'Pitrukaraka (PK) — Father',
    'Putrakaraka (PuK) — Children',
    'Gnatikaraka (GK) — Relatives'
  ];
  
  return planetDegs.map((p, i) => ({
    planet: p.name,
    degInSign: p.degInSign.toFixed(2),
    karaka: karakaNames[i],
    karakaShort: ['AK','AmK','BK','MK','PK','PuK','GK'][i]
  }));
}

// FIX (Jaimini Chara Dasha audit, sourced from 5 independent references
// that all agree, including a direct algorithmic breakdown): the previous
// "D-04" substitution rule fired for ANY sign that happened to contain
// Rahu or Ketu, always substituting Rahu's position — but the actual
// classical rule is narrowly scoped to exactly two signs, Scorpio and
// Aquarius, because only they have a genuine dual-lordship in this
// tradition (Scorpio: Mars & Ketu; Aquarius: Saturn & Rahu). Every other
// sign uses its single ordinary lord with no node substitution at all —
// the old code would have wrongly perturbed e.g. Leo's Dasha length
// whenever Rahu or Ketu simply transited through Leo, which has nothing
// to do with the Sun's sole lordship there.
// Rule for Scorpio/Aquarius specifically (co-lords A=classical lord, B=node):
//   - If A is in the sign itself: count using B's position instead.
//   - If B is in the sign itself: count using A's position instead.
//   - If BOTH are in the sign: full 12 years, no deduction.
//   - If NEITHER is in the sign: count using whichever of A/B sits at the
//     higher degree within its own sign (the commonly-cited "stronger by
//     degree" tie-break for this exact case).
function coLordSignIndex(signIdx, planets) {
  const CO_LORDS = { 7: ['Mars', 'Ketu'], 10: ['Saturn', 'Rahu'] }; // Scorpio, Aquarius
  const pair = CO_LORDS[signIdx];
  if (!pair) return null; // not one of the two special signs

  const getLon = (name) => {
    const p = planets.find(pl => pl.name === name);
    if (!p) return null;
    return p.siderealLon !== undefined ? p.siderealLon : (p.lon || 0);
  };
  const [aLon, bLon] = [getLon(pair[0]), getLon(pair[1])];
  if (aLon === null || bLon === null) return null;

  const aInSign = signOf(aLon) === signIdx;
  const bInSign = signOf(bLon) === signIdx;

  if (aInSign && bInSign) return { fullTwelve: true };
  if (aInSign) return { signIdx: signOf(bLon) };
  if (bInSign) return { signIdx: signOf(aLon) };
  // Neither in the sign: use whichever sits at the higher degree within its own sign
  const aDeg = aLon % 30, bDeg = bLon % 30;
  return { signIdx: signOf(aDeg >= bDeg ? aLon : bLon) };
}

// Chara Dasha period lengths (in years) per sign
function charaDashaYears(signIdx, planets) {
  const coLord = coLordSignIndex(signIdx, planets);
  if (coLord && coLord.fullTwelve) return 12;

  let lordSignIdx;
  if (coLord) {
    lordSignIdx = coLord.signIdx;
  } else {
    const sign = SIGNS[signIdx];
    const lord = SIGN_LORDS[sign];
    const lordPlanet = planets.find(p => p.name === lord);
    if (!lord || !lordPlanet) return 9;
    const lordLon = lordPlanet.siderealLon !== undefined ? lordPlanet.siderealLon : (lordPlanet.lon || 0);
    lordSignIdx = signOf(lordLon);
  }
  
  // Movable signs (0,3,6,9)
  const movable = [0,3,6,9];
  // Fixed signs (1,4,7,10)
  const fixed_ = [1,4,7,10];
  
  let years;
  if (movable.includes(signIdx)) {
    years = ((lordSignIdx - signIdx + 12) % 12);
    if (years === 0) years = 12;
  } else if (fixed_.includes(signIdx)) {
    years = ((signIdx - lordSignIdx + 12) % 12);
    if (years === 0) years = 12;
  } else {
    years = 9;
  }
  
  return years;
}

// endYear defaults to birthYear + 120 (dynamic Vimshottari cycle length),
// not a fixed calendar year — see note in calcVimshottari().
export function calcCharaDasha(birthJD, ascLon, planets, endYear = null) {
  if (endYear === null) endYear = jdToDate(birthJD).year + VIMSHOTTARI_CYCLE_YEARS;
  const ascSignIdx = signOf(ascLon);
  const dashas = [];
  let currentJD = birthJD;
  let cycle = 0;
  
  while (true) {
    for (let i = 0; i < 12; i++) {
      const signIdx = (ascSignIdx + (cycle * 12) + i) % 12;
      const years = charaDashaYears(signIdx, planets);
      const endJD = currentJD + years * SIDEREAL_YEAR;
      const endD = jdToDate(endJD);
      
      if (endD.year > endYear + 2) return dashas;
      
      dashas.push({
        sign: SIGNS[signIdx],
        signLord: SIGN_LORDS[SIGNS[signIdx]],
        startJD: currentJD,
        endJD,
        years,
        start: formatDate(currentJD),
        end: formatDate(endJD)
      });
      currentJD = endJD;
    }
    cycle++;
    if (cycle > 10) break;
  }
  
  return dashas;
}

// FIX D-02: Chara Antardasha — proportional to actual sign total, not fixed 144
export function calcCharaAntardashas(charaDasha, allCharaDashas) {
  const signIdx = SIGNS.indexOf(charaDasha.sign);
  const totalYears = charaDasha.years;
  const antars = [];
  let currentJD = charaDasha.startJD;
  
  // FIX D-02: Sum actual years of all 12 signs in the dasha sequence
  // Use the actual durations rather than assuming total = 144
  const actualTotal = allCharaDashas
    .slice(0, 12)
    .reduce((sum, d) => sum + (d.years || 1), 0);
  const denominator = actualTotal > 0 ? actualTotal : 144;
  
  for (let i = 0; i < 12; i++) {
    const subSignIdx = (signIdx + i) % 12;
    const mainDasha = allCharaDashas.find(d => d.sign === SIGNS[subSignIdx]);
    // FIX: proportion = subSign.years / actualTotal (not fixed 144)
    const subYears = mainDasha ? totalYears * mainDasha.years / denominator : totalYears / 12;
    const subDays = subYears * SIDEREAL_YEAR;
    const endJD = currentJD + subDays;
    
    antars.push({
      mainSign: charaDasha.sign,
      subSign: SIGNS[subSignIdx],
      startJD: currentJD,
      endJD,
      years: subYears,
      start: formatDate(currentJD),
      end: formatDate(endJD)
    });
    currentJD = endJD;
    if (currentJD >= charaDasha.endJD) break;
  }
  return antars;
}
