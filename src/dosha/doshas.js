// ============================================================
// VEDIC JYOTISH ENGINE v10.3 — DOSHAS
// FIXED DO-02: Kalsarpa uses degree-level (not sign-level) check
// FIXED DO-01: Mangal Dosha checks 2nd house (some schools), Moon & Venus reference
// FIXED DO-03: Sade Sati uses real Saturn ephemeris position from vsop87
// FIXED DO-04: Grahan Dosha uses precise degree proximity (17°/13° threshold)
// FIXED DO-06: Pitru Dosha checks all 5 classical conditions
// ============================================================

import { SIGNS, SIGN_LORDS, NAKSHATRAS } from '../astronomy/constants.js';
import { signOf, nakshatraOf, formatDate, mod360 } from '../astronomy/utils.js';

// ===================== KALSARPA DOSHA =====================
// FIX DO-02: Use exact degree longitude, not sign index
export function calcKalsarpaDosha(planets) {
  const rahu = planets.find(p => p.name === 'Rahu');
  const ketu = planets.find(p => p.name === 'Ketu');
  if (!rahu || !ketu) return { hasDosha: false };

  const rahuLon = mod360(rahu.siderealLon);
  const ketuLon = mod360(ketu.siderealLon);

  const mainPlanets = planets.filter(p => !['Rahu','Ketu'].includes(p.name));

  let allOnRahuSide = true;
  let allOnKetuSide = true;

  for (const p of mainPlanets) {
    const pLon = mod360(p.siderealLon);
    // Degree-level arc from Rahu going forward (in direction of natural zodiac)
    const fromRahu = mod360(pLon - rahuLon);
    const fromKetu = mod360(pLon - ketuLon);
    const rahuToKetu = mod360(ketuLon - rahuLon); // arc from Rahu to Ketu going forward

    // Planet is on Rahu's side if it lies within the arc from Rahu → Ketu
    if (fromRahu >= rahuToKetu) allOnRahuSide = false;
    // Planet is on Ketu's side if it lies within arc from Ketu → Rahu
    if (fromKetu >= mod360(rahuLon - ketuLon)) allOnKetuSide = false;
  }

  const hasDosha = allOnRahuSide || allOnKetuSide;

  const KALSARPA_NAMES = [
    'Ananta','Kulika','Vasuki','Shankhapala','Padma','Mahapadma',
    'Takshaka','Karkotaka','Shankhachuda','Ghatak','Vishdhar','Sheshnaga'
  ];

  const typeIdx = signOf(rahuLon);
  const isAnuloma = allOnRahuSide;

  return {
    hasDosha,
    type: hasDosha ? KALSARPA_NAMES[typeIdx % 12] : null,
    isAnuloma,
    isViloma: allOnKetuSide,
    rahuSign: SIGNS[signOf(rahuLon)],
    ketuSign: SIGNS[signOf(ketuLon)],
    rahuLon: rahuLon.toFixed(2),
    ketuLon: ketuLon.toFixed(2),
    severity: hasDosha ? (isAnuloma ? 'Partial (Anuloma)' : 'Full (Viloma)') : 'None',
    effects: hasDosha ? getKalsarpaEffects(typeIdx) : 'No Kalsarpa Dosha',
    remedies: hasDosha ? ['Rahu-Ketu puja','Nagpanchami fasting','Trimbakeshwar Shanti'] : []
  };
}

function getKalsarpaEffects(idx) {
  const effects = [
    'Ananta: Obstacles in self, health, and progress',
    'Kulika: Financial instability, family troubles',
    'Vasuki: Sibling issues, communication challenges',
    'Shankhapala: Delays in education, mental confusion',
    'Padma: Obstacles in romance and creativity',
    'Mahapadma: Health issues, enemies, service delays',
    'Takshaka: Relationship/marriage difficulties',
    'Karkotaka: Chronic ailments, inheritance issues',
    'Shankhachuda: Religious/foreign travel problems',
    'Ghatak: Career obstacles, professional setbacks',
    'Vishdhar: Social difficulties, networking problems',
    'Sheshnaga: Spiritual growth blocked, hidden losses'
  ];
  return effects[idx % 12];
}

// ===================== MANGAL DOSHA =====================
// FIX DO-01: Check from Lagna, Moon AND Venus; include 2nd house; check cancellations
export function calcMangalDosha(planets, ascLon, moonLon, venusLon) {
  const mars = planets.find(p => p.name === 'Mars');
  if (!mars) return { hasDosha: false };

  const marsSign = signOf(mod360(mars.siderealLon));
  const lagnaSign = signOf(mod360(ascLon));
  const moonSign  = signOf(mod360(moonLon));
  const venSign   = signOf(mod360(venusLon || 0));

  // Classical houses causing Mangal Dosha: 1,2,4,7,8,12
  // (Some schools omit 2; included here per majority tradition)
  const badHouses = [1, 2, 4, 7, 8, 12];
  const checks = [];

  for (const [label, refSign] of [['Lagna', lagnaSign], ['Moon', moonSign], ['Venus', venSign]]) {
    const houseNum = ((marsSign - refSign) + 12) % 12 + 1;
    const has = badHouses.includes(houseNum);
    checks.push({ from: label, houseNum, hasDosha: has });
  }

  const doshaCount = checks.filter(c => c.hasDosha).length;

  // Cancellation rules (BPHS Ch.73 Mangal Dosha Nivaran)
  const cancellations = [];
  const marsSignName = SIGNS[marsSign];
  const marsLon = mod360(mars.siderealLon);

  if (['Aries','Scorpio'].includes(marsSignName))
    cancellations.push('Mars in own sign (Aries/Scorpio) — dosha nullified');
  if (marsSignName === 'Capricorn')
    cancellations.push('Mars exalted in Capricorn — dosha nullified');
  if (marsSignName === 'Cancer')
    cancellations.push('Mars debilitated — reduced severity');
  if (['Leo','Aquarius'].includes(marsSignName))
    cancellations.push('Mars in Leo/Aquarius — mitigated by sign strength');

  const jupiter = planets.find(p => p.name === 'Jupiter');
  if (jupiter) {
    const jSignIdx = signOf(jupiter.siderealLon);
    const jDiff = ((jSignIdx - marsSign) + 12) % 12;
    if (jDiff === 0) cancellations.push('Jupiter conjunct Mars — dosha cancelled');
    else if ([4,8].includes(jDiff)) cancellations.push('Jupiter trine Mars — dosha reduced');
  }

  // If groom also has Mangal Dosha, it cancels (Papa Samya)
  const isCancelled = cancellations.length > 0;
  const effectiveDosha = doshaCount > 0 && !isCancelled;

  return {
    // Canonical semantics: formation is a factual pattern; hasDosha means
    // effective/active dosha after cancellation. Downstream report sections
    // must not treat a cancelled formation as an active dosha.
    formation: doshaCount > 0,
    hasDosha: effectiveDosha,
    effectiveDosha,
    doshaCount,
    checks,
    cancellations,
    marsSign: marsSignName,
    severity: doshaCount === 0 ? 'No Dosha'
            : isCancelled ? 'Cancelled'
            : doshaCount === 1 ? 'Mild' : doshaCount === 2 ? 'Moderate' : 'High',
    isCancelled,
    remedy: effectiveDosha
      ? 'Partner with Mangal Dosha preferred. Kumbh Vivah ritual, Mangal Shanti homa on Tuesdays'
      : doshaCount > 0 ? `Dosha present but cancelled. ${cancellations.join('; ')}`
      : 'No Mangal Dosha',
    effects: effectiveDosha ? 'Possible conflicts in marriage, delays, accidents' : doshaCount > 0 ? 'Formation present but cancelled/mitigated' : 'Favorable'
  };
}

// ===================== SADE SATI =====================
// REMOVED (dead code): this file used to contain its own calcSadeSati(),
// findSaturnSignIngress(), and getSadeSatiEffects(). They were never
// imported anywhere in the live app — engine.js exclusively uses
// calcAccurateSadeSati() from dosha/sade_sati_accurate.js, which is the
// single real-ephemeris source of truth (see that file's header comment
// for why the old duplicate calculators were replaced). Keeping the old,
// less-accurate versions around as unused exports was a landmine: if
// anything ever imported calcSadeSati() again, it would silently produce
// different Saturn phase dates/effects than every other Sade Sati section
// in the report, reintroducing the exact bug that prompted this rewrite.
// ===================== GRAHAN DOSHA =====================
// FIX DO-04: Use precise degree thresholds (solar eclipse ≤17°, lunar ≤13°)
export function calcGrahanDosha(planets) {
  const sun  = planets.find(p => p.name === 'Sun');
  const moon = planets.find(p => p.name === 'Moon');
  const rahu = planets.find(p => p.name === 'Rahu');
  const ketu = planets.find(p => p.name === 'Ketu');
  if (!sun || !moon || !rahu || !ketu) return { hasDosha: false };

  const results = [];

  // Solar Grahan: Sun within 17° of Rahu or Ketu
  // Lunar Grahan: Moon within 13° of Rahu or Ketu
  const thresholds = { Sun: 17, Moon: 13 };

  for (const [bodyName, planet] of [['Sun', sun], ['Moon', moon]]) {
    const thresh = thresholds[bodyName];
    const bodyLon = mod360(planet.siderealLon);

    for (const [nodeName, node] of [['Rahu', rahu], ['Ketu', ketu]]) {
      const nodeLon = mod360(node.siderealLon);
      const diff = Math.abs(bodyLon - nodeLon);
      const orb = Math.min(diff, 360 - diff);

      if (orb <= thresh) {
        results.push({
          type: `${bodyName}-${nodeName} Grahan`,
          body: bodyName, node: nodeName,
          orb: orb.toFixed(2),
          threshold: thresh,
          hasDosha: true,
          severity: orb <= thresh / 2 ? 'Strong' : 'Mild',
          effects: bodyName === 'Sun'
            ? (nodeName === 'Rahu' ? 'Pitru dosha, authority conflicts, ego problems'
                                   : 'Self-doubt, spiritual confusion, government troubles')
            : (nodeName === 'Rahu' ? 'Mother health issues, mental instability, emotional challenges'
                                   : 'Psychic sensitivity, emotional withdrawal, past-life karmas')
        });
      }
    }
  }

  return {
    hasDosha: results.length > 0,
    doshas: results,
    count: results.length,
    remedies: results.length > 0
      ? ['Surya/Chandra puja on eclipse days', 'Rahu-Ketu Shanti homa',
         'Donate according to afflicted planet', 'Nakshatra shanti for birth nakshatra']
      : []
  };
}

// ===================== PITRU DOSHA =====================
// FIX DO-06: All 5 classical conditions checked per BPHS
export function calcPitruDosha(planets, ascLon) {
  const sun    = planets.find(p => p.name === 'Sun');
  const moon   = planets.find(p => p.name === 'Moon');
  const saturn = planets.find(p => p.name === 'Saturn');
  const rahu   = planets.find(p => p.name === 'Rahu');
  const ketu   = planets.find(p => p.name === 'Ketu');
  if (!sun) return { hasDosha: false };

  const indicators = [];
  const ascSign = signOf(mod360(ascLon));
  const sunSign = signOf(mod360(sun.siderealLon));
  const sunHouse = ((sunSign - ascSign) + 12) % 12 + 1;

  // Condition 1: Sun in 9H afflicted by Saturn/Rahu/Ketu
  // BPHS: Sun in own sign (Leo) or exaltation (Aries) in 9H is AUSPICIOUS, NOT Pitru Dosha
  if (sunHouse === 9) {
    const sunSignName = SIGNS[sunSign];
    const sunInOwnSign = ['Leo'].includes(sunSignName); // Sun owns Leo
    const sunExalted   = sunSignName === 'Aries';       // Sun exalted in Aries
    if (!sunInOwnSign && !sunExalted) {
      const malefics = ['Saturn','Rahu','Ketu'];
      const afflicting = planets.filter(p => malefics.includes(p.name)).filter(p => {
        const pSign = signOf(mod360(p.siderealLon));
        const diff  = ((pSign - sunSign) + 12) % 12;
        return diff === 0 || diff === 6; // conjunction or 7th aspect only
      });
      if (afflicting.length > 0)
        indicators.push(`Condition 1: Sun in 9H afflicted by ${afflicting.map(p=>p.name).join(', ')}`);
    }
    // Sun in own/exalted sign in 9H = strong dharma, pitru pleased — NOT a dosha
  }

  // Condition 2: Moon in 4H with Saturn
  if (moon && saturn) {
    const moonHouse = ((signOf(mod360(moon.siderealLon)) - ascSign) + 12) % 12 + 1;
    const satHouse  = ((signOf(mod360(saturn.siderealLon)) - ascSign) + 12) % 12 + 1;
    if (moonHouse === 4 && satHouse === 4)
      indicators.push('Condition 2: Moon conjunct Saturn in 4th house');
  }

  // Condition 3: Rahu/Ketu conjunct Sun or Moon
  for (const [nodeName, node] of [['Rahu', rahu], ['Ketu', ketu]]) {
    if (!node) continue;
    const nodeSign = signOf(mod360(node.siderealLon));
    if (nodeSign === sunSign)
      indicators.push(`Condition 3: ${nodeName} conjunct Sun`);
    if (moon && nodeSign === signOf(mod360(moon.siderealLon)))
      indicators.push(`Condition 3: ${nodeName} conjunct Moon`);
  }

  // Condition 4: 9th lord debilitated or combust
  const ninthHouseSign = (ascSign + 8) % 12;
  const ninthLord = SIGN_LORDS[SIGNS[ninthHouseSign]];
  const ninthLordPlanet = planets.find(p => p.name === ninthLord);
  if (ninthLordPlanet) {
    const DEBILITATION_SIGNS = {
      Sun:'Libra', Moon:'Scorpio', Mars:'Cancer', Mercury:'Pisces',
      Jupiter:'Capricorn', Venus:'Virgo', Saturn:'Aries'
    };
    const nlSign = SIGNS[signOf(mod360(ninthLordPlanet.siderealLon))];
    if (DEBILITATION_SIGNS[ninthLord] === nlSign)
      indicators.push(`Condition 4: 9th lord ${ninthLord} debilitated in ${nlSign}`);
    // Check if combust (within 8° of Sun for most planets)
    const sunLon = mod360(sun.siderealLon);
    const nlLon  = mod360(ninthLordPlanet.siderealLon);
    const diff   = Math.abs(sunLon - nlLon);
    const orb    = Math.min(diff, 360 - diff);
    if (orb <= 8 && ninthLord !== 'Moon')
      indicators.push(`Condition 4: 9th lord ${ninthLord} combust (${orb.toFixed(1)}° from Sun)`);
  }

  // Condition 5: Ketu in 2H or 12H with Sun afflicted
  if (ketu) {
    const ketuHouse = ((signOf(mod360(ketu.siderealLon)) - ascSign) + 12) % 12 + 1;
    if ([2, 12].includes(ketuHouse)) {
      const sunAfflicted = saturn && signOf(mod360(saturn.siderealLon)) === sunSign;
      if (sunAfflicted)
        indicators.push(`Condition 5: Ketu in ${ketuHouse}H with Sun afflicted by Saturn`);
      // Removed: Ketu 12H + Sun 9H alone is NOT sufficient for Pitru Dosha (too common, often benefic)
    }
  }

  // Born on Amavasya
  if (moon) {
    const moonSunDiff = Math.min(
      Math.abs(mod360(moon.siderealLon) - mod360(sun.siderealLon)),
      360 - Math.abs(mod360(moon.siderealLon) - mod360(sun.siderealLon))
    );
    if (moonSunDiff < 12) indicators.push('Born near Amavasya (New Moon) — ancestral debts');
  }

  // BPHS: require at minimum 2 genuine affliction conditions for Pitru Dosha
  // Single condition = "mild indicator" but not a confirmed dosha
  const hasDosha = indicators.length >= 2;
  const hasMild  = indicators.length === 1;

  return {
    hasDosha,
    present: hasDosha,
    indicators,
    conditionsMet: indicators.length,
    severity: indicators.length === 0 ? 'None' : indicators.length === 1 ? 'Mild Indicator' : 'Present',
    effects: hasDosha ? [
      'Ancestral karmic debts affecting life progress',
      'Issues with father or father-figures',
      'Delays in life milestones',
      'Family legacy challenges'
    ] : [],
    remedies: hasDosha ? [
      'Pitru Paksha Shradha rituals annually',
      'Gaya Shraddha pilgrimage',
      'Feeding crows and Brahmins on Amavasya',
      'Recitation of Pitru Stotra and Pind Daan',
      'Tripindi Shraddha if 3+ generations not performed'
    ] : ['No significant Pitru Dosha indicators']
  };
}


// ===================== KARMIC / COMBINATION YOGAS =====================
// These are kept separate from generic Yoga detection because traditions
// differ on names, orbs and whether an effect is a "dosha" at all.
// The report therefore exposes the exact formation rule and geometry.
function sameSign(a, b) {
  return a && b && signOf(mod360(a.siderealLon)) === signOf(mod360(b.siderealLon));
}
function separation(a, b) {
  if (!a || !b) return null;
  const d = Math.abs(mod360(a.siderealLon) - mod360(b.siderealLon));
  return Math.min(d, 360 - d);
}

export function calcKarmicDoshas(planets) {
  const p = Object.fromEntries((planets || []).map(p => [p.name, p]));
  const sat = p.Saturn, rahu = p.Rahu, ketu = p.Ketu, jup = p.Jupiter, moon = p.Moon;
  const shrapit = Boolean(sat && rahu && sameSign(sat, rahu));
  const guruChandalRahu = Boolean(jup && rahu && sameSign(jup, rahu));
  const guruChandalKetu = Boolean(jup && ketu && sameSign(jup, ketu));
  const vish = Boolean(sat && moon && sameSign(sat, moon));

  return {
    shrapit: {
      name: 'Shrapit Yoga',
      formed: shrapit,
      definition: 'Saturn and Rahu occupy the same sidereal sign/house in this implementation.',
      planets: ['Saturn','Rahu'],
      separationDegrees: separation(sat, rahu),
      status: shrapit ? 'FORMED' : 'NOT_FORMED',
      note: 'Some traditions use additional/orb-based variants; the exact rule used here is shown for auditability.',
    },
    chandal: {
      name: 'Guru Chandal Yoga',
      formed: guruChandalRahu || guruChandalKetu,
      definition: 'Jupiter is conjunct Rahu or Ketu by sidereal sign/house.',
      planets: guruChandalRahu ? ['Jupiter','Rahu'] : guruChandalKetu ? ['Jupiter','Ketu'] : ['Jupiter','Rahu/Ketu'],
      separationDegrees: guruChandalRahu ? separation(jup, rahu) : guruChandalKetu ? separation(jup, ketu) : null,
      node: guruChandalRahu ? 'Rahu' : guruChandalKetu ? 'Ketu' : null,
      status: (guruChandalRahu || guruChandalKetu) ? 'FORMED' : 'NOT_FORMED',
    },
    vish: {
      name: 'Vish Yoga',
      formed: vish,
      definition: 'Moon and Saturn occupy the same sidereal sign/house in this implementation.',
      planets: ['Moon','Saturn'],
      separationDegrees: separation(moon, sat),
      status: vish ? 'FORMED' : 'NOT_FORMED',
      note: 'Traditional schools differ on whether conjunction alone or additional aspect/orb conditions are required.',
    },
  };
}

// ===================== NADI DOSHA (Natal) =====================
// FIX DO-05: Nadi Dosha added as standalone natal dosha
// Nadi = the vital energy channel (Vata/Pitta/Kapha) determined by Moon's nakshatra
// Nadi Dosha affects progeny health and family harmony
// Classical 27 nakshatras split: Vata(9), Pitta(9), Kapha(9)
import moduleData from '../../dataset/used/core/doshas.json' with { type: 'json' };
const NADI_MAP = moduleData.NADI_MAP;

// FIX (dead-code/duplication audit): removed a locally re-declared copy of
// the 27 nakshatra names — identical data is already exported as
// NAKSHATRAS from astronomy/constants.js (imported above). Using the
// shared constant means there is only one place to correct a name/order
// if the classical dataset is ever revised, instead of two that could drift.

export function calcNadiDosha(moonLon) {
  const nakIdx  = Math.floor(mod360(moonLon) * 27 / 360);
  const nakName = NAKSHATRAS[nakIdx] || 'Unknown';
  const nadi    = NADI_MAP[nakName] || 'Unknown';

  const nadiEffects = {
    Vata:  { element: 'Air/Ether', constitution: 'Vata (Vayu Nadi)', health: 'Neurological, respiratory, skin and movement disorders if imbalanced' },
    Pitta: { element: 'Fire/Water', constitution: 'Pitta (Agni Nadi)', health: 'Digestive, liver, blood and inflammatory conditions if imbalanced' },
    Kapha: { element: 'Water/Earth', constitution: 'Kapha (Soma Nadi)', health: 'Respiratory mucus, obesity, lethargy and lymphatic issues if imbalanced' },
  };

  const info = nadiEffects[nadi] || {};

  return {
    nakshatra: nakName,
    nadi,
    element: info.element || nadi,
    constitution: info.constitution || nadi,
    healthIndicators: info.health || '',
    nadiStrength: getNadiStrength(nakIdx),
    compatibility: {
      note: 'For marriage: Nadi Dosha occurs when both partners share the same Nadi. See Kundali Milan for compatibility check.',
      remedy: 'Nadi Shanti puja, Nakshatra homa, Mrityunjaya japa (108 times daily) can mitigate Nadi-related health issues'
    },
    remedies: [
      `${nadi} Nadi balancing: maintain ${nadi === 'Vata' ? 'warmth, oil massage, grounding routine' : nadi === 'Pitta' ? 'cooling diet, avoid excessive heat and spice' : 'light diet, regular exercise, avoid dampness'}`,
      'Moon mantra (Om Som Somaya Namaha) — 108 times on Mondays',
      'Observe Ekadashi fasting for strengthening Nadi',
      'Nakshatra deity puja on birth star day monthly'
    ]
  };
}

function getNadiStrength(nakIdx) {
  // Nakshatras of the same group share elemental energy
  // Middle nakshatras of each group (5th of 9) are strongest
  const posInGroup = nakIdx % 9;
  if (posInGroup === 4) return 'Peak (5th nakshatra of Nadi group — maximum elemental force)';
  if (posInGroup <= 1 || posInGroup >= 7) return 'Transitional (beginning/end of Nadi — flux period)';
  return 'Stable (mid-range of Nadi group)';
}
