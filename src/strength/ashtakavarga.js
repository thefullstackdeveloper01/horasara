// ============================================================
// VEDIC JYOTISH ENGINE v6 — ASHTAKAVARGA (Complete System)
// Uses dataset planet_bindu_tables (108 validated entries)
// Includes: Bhinnashtakavarga, Sarvashtakavarga,
//           Trikona Shodhana, Ekadhipatya Shodhana, Shodhana Pinda
// ============================================================

import { SIGNS, SIGN_LORDS, ASHTAK_CONTRIBUTIONS, BINDU_TABLE } from '../astronomy/constants.js';
import { signOf } from '../astronomy/utils.js';

// ─── BHINNASHTAKAVARGA (Individual planet's 12-house bindu count) ─
export function calcBhinnashtakavarga(planet, planets, ascLon) {
  const contributions = ASHTAK_CONTRIBUTIONS[planet];
  if (!contributions) return Array(12).fill(0);

  const bindus = Array(12).fill(0);
  const planetMap = {};
  for (const p of planets) planetMap[p.name] = signOf(p.siderealLon);
  planetMap['Lagna'] = signOf(ascLon);

  const planetLonIdx = planetMap[planet];
  if (planetLonIdx === undefined) return bindus;

  for (const [source, houses] of Object.entries(contributions)) {
    const sourceLon = planetMap[source];
    if (sourceLon === undefined) continue;
    for (const h of houses) {
      const targetSign = (sourceLon + h - 1) % 12;
      bindus[targetSign]++;
    }
  }
  return bindus;
}

// ─── SARVASHTAKAVARGA ─────────────────────────────────────────
export function calcSarvashtakavarga(planets, ascLon) {
  const planetNames = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
  const sarva = Array(12).fill(0);
  const individual = {};

  for (const pName of planetNames) {
    const b = calcBhinnashtakavarga(pName, planets, ascLon);
    individual[pName] = b;
    for (let i = 0; i < 12; i++) sarva[i] += b[i];
  }

  return { sarva, individual, total: sarva.reduce((a,b)=>a+b,0) };
}

// ─── TRIKONA SHODHANA ─────────────────────────────────────────
// Subtract minimum of each trikona group: [1,5,9], [2,6,10], [3,7,11], [4,8,12]
export function trikonaShodhana(bindus) {
  const reduced = [...bindus];
  const trikonas = [[0,4,8],[1,5,9],[2,6,10],[3,7,11]];
  for (const group of trikonas) {
    const minVal = Math.min(...group.map(i => reduced[i]));
    for (const i of group) reduced[i] = Math.max(0, reduced[i] - minVal);
  }
  return reduced;
}

// ─── EKADHIPATYA SHODHANA ─────────────────────────────────────
// For planets owning 2 signs: reduce lesser of the two
export function ekadhipatyaShodhana(bindus) {
  const reduced = [...bindus];
  const dualOwners = [
    [9,10],   // Saturn: Capricorn(9),Aquarius(10)
    [8,11],   // Jupiter: Sagittarius(8),Pisces(11)
    [0,7],    // Mars: Aries(0),Scorpio(7)
    [1,6],    // Venus: Taurus(1),Libra(6)
    [2,5]     // Mercury: Gemini(2),Virgo(5)
  ];
  for (const [s1, s2] of dualOwners) {
    const b1 = reduced[s1], b2 = reduced[s2];
    if (b1 === 0 && b2 === 0) continue;
    const lesser = Math.min(b1, b2);
    if (lesser > 0 && b1 !== b2) {
      reduced[s1] = Math.max(0, b1 - lesser);
      reduced[s2] = Math.max(0, b2 - lesser);
    }
  }
  return reduced;
}

// ─── SHODHANA PINDA (Event Prediction) ───────────────────────
// Planet's Shodhana value × degree in sign = timing indicator
// Predicted age of event ≈ Pinda ÷ 7
export function calcShodhanaPinda(reducedBindus, planet, planetLon) {
  const signIdx = signOf(planetLon);
  const degInSign = planetLon % 30;
  const pinda = reducedBindus[signIdx] * degInSign;
  const predictedAge = Math.round(pinda / 7);
  return {
    pinda: pinda.toFixed(1),
    sign: SIGNS[signIdx],
    bindusInSign: reducedBindus[signIdx],
    degInSign: degInSign.toFixed(2),
    predictedEventAge: predictedAge,
    desc: `Shodhana Pinda=${pinda.toFixed(0)} → events related to ${planet} manifest ~age ${predictedAge}`
  };
}

// ─── HOUSE QUALITY ────────────────────────────────────────────
function houseGrade(pts) {
  if (pts >= 35) return 'Excellent';
  if (pts >= 28) return 'Good';
  if (pts >= 22) return 'Average';
  if (pts >= 18) return 'Weak';
  return 'Very Weak';
}

function housePrediction(house, pts) {
  const good = pts >= 28;
  const map = {
    1:good?'Strong health and vitality':'Health needs attention',
    2:good?'Financial prosperity ahead':'Financial caution required',
    3:good?'Courageous, good for siblings':'Communication/sibling challenges',
    4:good?'Happy home, mother blessed':'Domestic challenges possible',
    5:good?'Intelligent children, good luck':'Creative/child challenges',
    6:good?'Overcomes enemies, good health':'Health issues, be cautious',
    7:good?'Favorable for marriage/partnership':'Relationship challenges',
    8:good?'Longevity, possible inheritance':'Health and longevity concerns',
    9:good?'Fortune and spiritual growth':'Reduced luck this period',
    10:good?'Career success and fame':'Career obstacles to overcome',
    11:good?'Strong income and gains':'Income growth constrained',
    12:good?'Spiritual growth, favorable travel':'Losses/expenses to watch'
  };
  return map[house] || '';
}

// ─── MASTER ASHTAKAVARGA ──────────────────────────────────────
export function calcAshtakavarga(planets, ascLon) {
  const sv = calcSarvashtakavarga(planets, ascLon);
  const shodhana = {};
  const planetNames = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];

  for (const pName of planetNames) {
    if (!sv.individual[pName]) continue;
    const step1 = trikonaShodhana(sv.individual[pName]);
    const step2 = ekadhipatyaShodhana(step1);
    const planet = planets.find(p => p.name === pName);
    shodhana[pName] = {
      raw: sv.individual[pName],
      afterTrikona: step1,
      afterEkadhipatya: step2,
      pinda: planet ? calcShodhanaPinda(step2, pName, planet.siderealLon) : null
    };
  }

  const sarvaTrikona = trikonaShodhana(sv.sarva);
  const sarvaFinal = ekadhipatyaShodhana(sarvaTrikona);

  const houseStrength = sv.sarva.map((pts, i) => ({
    house: i+1, sign: SIGNS[i],
    rawPoints: pts,
    reducedPoints: sarvaFinal[i],
    grade: houseGrade(pts),
    prediction: housePrediction(i+1, pts)
  }));

  return {
    individual: sv.individual,
    sarva: sv.sarva,
    sarvaTotal: sv.total,
    avgPerHouse: (sv.total / 12).toFixed(1),
    shodhana,
    sarvaReduced: sarvaFinal,
    houseStrength
  };
}
