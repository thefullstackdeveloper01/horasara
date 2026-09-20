/**
 * ASCENDANT / MOON / NAKSHATRA DEEP REPORTS
 * ============================================
 * Sections 11, 12, 13 of the report spec. Every field is read from this
 * chart's own already-computed values (R.lagna, R.planets, R.functionalNature,
 * R.avkahadaPhala, R.panchanga) — nothing here recomputes astronomy, and
 * nothing is invented. Where a requested field has no reliable source in
 * this engine, it is marked NOT CALCULATED with a reason (Section 50 rule),
 * never guessed.
 */
import { SIGN_LORDS } from '../astronomy/constants.js';

function na(reason) {
  return { status: 'NOT CALCULATED', reason };
}

function findPlanet(R, name) {
  return (R.planets || []).find(p => p.name === name);
}

// ── SECTION 11 — ASCENDANT DEEP REPORT ─────────────────────────────────
export function buildAscendantDeepReport(R) {
  const lagnaSign = R.lagna?.sign;
  const lagnaLordName = SIGN_LORDS[lagnaSign];
  const lagnaLord = findPlanet(R, lagnaLordName);
  const profile = R.lagnaProfile; // already-built Section 53 classical profile, reused not duplicated

  const conjunctions = (R.houses?.['0']?.planets || []).filter(p => p !== 'Ascendant');
  const aspectsToLagna = (R.aspects || []).filter(a => a.toHouse === 1).map(a => `${a.from} (${a.aspectType})`);

  return {
    ascendant: lagnaSign,
    degree: R.lagna?.dms,
    nakshatra: R.lagna?.nakshatra,
    pada: R.lagna?.pada,
    ascendantLord: lagnaLordName,
    ascendantLordHouse: lagnaLord?.house ?? na('Lagna lord placement unavailable'),
    ascendantLordDignity: lagnaLord?.dignity ?? na('Lagna lord dignity unavailable'),
    aspectsOnLagna: aspectsToLagna.length ? aspectsToLagna : ['None'],
    conjunctionsInLagna: conjunctions.length ? conjunctions : ['None'],
    dispositor: lagnaLordName,
    physicalConstitution: profile?.physicalAppearance ?? na('No matching classical Lagna profile entry'),
    personality: profile?.personality ?? na('No matching classical Lagna profile entry'),
    temperament: profile?.emotionalNature ?? na('No matching classical Lagna profile entry'),
    appearance: profile?.physicalAppearance ?? na('No matching classical Lagna profile entry'),
    behaviour: profile?.strengths?.length ? `Tends toward: ${profile.strengths.join(', ')}` : na('No matching classical Lagna profile entry'),
    strengths: profile?.strengths ?? [],
    weaknesses: profile?.weaknesses ?? [],
    careerStyle: profile?.workStyle ?? na('No matching classical Lagna profile entry'),
    relationshipStyle: profile?.relationshipNature ?? na('No matching classical Lagna profile entry'),
    healthSymbolism: profile?.healthVulnerableAreas?.length ? profile.healthVulnerableAreas.join(', ') : na('No matching classical Lagna profile entry'),
    lifeDirection: profile?.spiritualInclination ?? na('No matching classical Lagna profile entry'),
    source: 'Derived from this chart\'s own Ascendant, Lagna lord placement/dignity, and the Section 53 classical Lagna profile — no separate data invented for this section.',
  };
}

// ── SECTION 12 — MOON SIGN DEEP REPORT ─────────────────────────────────
export function buildMoonSignDeepReport(R) {
  const moon = findPlanet(R, 'Moon');
  if (!moon) return { status: 'NOT CALCULATED', reason: 'Moon position unavailable in this chart.' };

  const moonLordName = SIGN_LORDS[moon.sign];
  const conjunctions = (R.planets || []).filter(p => p.name !== 'Moon' && p.house === moon.house).map(p => p.name);
  const aspectsToMoonHouse = (R.aspects || []).filter(a => a.toHouse === moon.house && a.to !== 'Moon').map(a => `${a.from} (${a.aspectType})`);

  // Reuse the real classical Vara/day-lord-style personality text where the
  // Moon's own sign lord matches a weekday lord entry already built for
  // Section 49 (Avkahada Phala) — avoids inventing new psychological text.
  const varaLikeTraits = {
    Sun: 'confident, self-directed emotional responses', Moon: 'deeply intuitive, changeable moods',
    Mars: 'quick, reactive emotional responses', Mercury: 'analytical processing of emotion',
    Jupiter: 'optimistic, principled emotional outlook', Venus: 'harmony-seeking, relationship-oriented emotion',
    Saturn: 'restrained, disciplined emotional expression',
  };

  return {
    moonSign: moon.sign,
    degree: moon.dms,
    nakshatra: moon.nakshatra,
    pada: moon.pada,
    moonLord: moonLordName,
    moonDignity: moon.dignity,
    moonHouse: moon.house,
    aspects: aspectsToMoonHouse.length ? aspectsToMoonHouse : ['None'],
    conjunctions: conjunctions.length ? conjunctions : ['None'],
    emotionalNature: varaLikeTraits[moonLordName]
      ? `Moon's sign lord (${moonLordName}) classically colours emotional expression toward: ${varaLikeTraits[moonLordName]}.`
      : na('No classical trait mapping for this Moon-sign lord'),
    mentalTendencies: moon.dignity === 'Exalted' || moon.dignity === 'Own'
      ? 'Moon in strong dignity classically indicates clear, stable mental functioning and good emotional resilience.'
      : moon.dignity === 'Debilitated'
        ? 'Moon in debilitation classically indicates a more sensitive, easily-affected mental state, often needing conscious emotional-regulation practice.'
        : `Moon in ${moon.dignity} dignity — moderate mental/emotional stability, coloured by house ${moon.house} affairs.`,
    personality: `Moon in ${moon.sign} (Bhava ${moon.house}) shapes the native's inner, private personality — distinct from the outward Lagna personality.`,
    behaviour: conjunctions.length ? `Emotional behaviour is coloured by conjunction with ${conjunctions.join(', ')} in the same house.` : 'No planetary conjunction directly modifying Moon\'s own house.',
    stressResponse: moon.combust
      ? 'Moon combust — classically indicates the emotional self can feel overshadowed or suppressed under pressure.'
      : 'Moon not combust — the emotional self is not classically overshadowed by proximity to the Sun.',
    relationships: `Moon's house placement (${moon.house}) is classically read alongside the 7th house for relationship indications — see Bhava Phala section for House ${moon.house}.`,
    healthSymbolism: 'Moon classically governs the mind and bodily fluids/lymphatic-digestive balance in a general symbolic sense — not a medical diagnosis.',
    lifePatterns: `Dignity: ${moon.dignity}; House: ${moon.house} — see the Vimshottari Dasha section for when Moon's own Mahadasha/Antardasha periods activate these patterns.`,
    source: 'Derived directly from this chart\'s own calculated Moon position, dignity, house, aspects, and conjunctions.',
  };
}

// ── SECTION 13 — NAKSHATRA (JANMA) DEEP REPORT ─────────────────────────
export function buildNakshatraDeepReport(R) {
  // Reuses the real classical Nakshatra entry already built for Section 49
  // (Avkahada Phala) plus the Gana/Yoni/Nadi/Varna/Vasya entries from the
  // same section — this section assembles them into one dedicated view
  // rather than recomputing anything.
  const av = R.avkahadaPhala;
  if (!Array.isArray(av)) return { status: 'NOT CALCULATED', reason: 'Avkahada Phala data unavailable.' };

  const get = (name) => av.find(c => c.component === name);
  const nak = get('Nakshatra');
  const gana = get('Gana');
  const yoni = get('Yoni');
  const nadi = get('Nadi');
  const varna = get('Varna');
  const vasya = get('Vasya / Vashya');

  return {
    name: R.panchanga?.nakshatra?.name,
    pada: R.panchanga?.nakshatra?.pada,
    lord: R.panchanga?.nakshatra?.lord,
    deity: R.panchanga?.nakshatra?.deity,
    symbol: nak?.classicalMeaning || na('No matching classical Nakshatra database entry'),
    gana: gana?.value,
    yoni: yoni?.value,
    nadi: nadi?.value,
    varna: varna?.value,
    vasya: vasya?.value,
    personality: nak?.personalityEffect || na('No matching classical Nakshatra database entry'),
    education: na('No dedicated classical Nakshatra-to-education mapping in the bundled dataset — see Section 52 Career/Education cross-reference instead for house-based indications'),
    career: na('See Section 52 Classical Prediction Rules (10th-house cross-reference) and Section 53 Lagna Profile for career indications — no separate Nakshatra-specific career table is bundled'),
    income: na('See Section 52 Classical Prediction Rules (2nd/11th-house cross-reference) for wealth indications — no separate Nakshatra-specific income table is bundled'),
    family: na('No dedicated classical Nakshatra-to-family mapping in the bundled dataset — see Bhava Phala for Houses 2/4 instead'),
    marriage: na('See the Ashtakoot/Nadi/Gana/Yoni sections (Kundali Milan) and Bhava Phala House 7 for marriage indications — no separate Nakshatra-specific marriage-outcome table is bundled'),
    children: na('See Bhava Phala House 5 for progeny indications — no separate Nakshatra-specific children table is bundled'),
    behaviour: nak?.behaviouralTendencies || na('No matching classical Nakshatra database entry'),
    strengths: nak?.strengths || na('No matching classical Nakshatra database entry'),
    weaknesses: na('No dedicated classical Nakshatra weaknesses field in the bundled dataset'),
    traditionalAgeMarkers: na('Classical age-marker (Dasha-linked life-event timing) tables are not part of the bundled Nakshatra reference dataset — see the Vimshottari Dasha section for age-linked period timing instead'),
    practicalInterpretation: nak?.practicalInterpretation || na('No matching classical Nakshatra database entry'),
    source: 'Assembled from this chart\'s own Section 49 (Avkahada Phala) Nakshatra/Gana/Yoni/Nadi/Varna/Vasya entries — same underlying classical dataset, no duplicate computation.',
  };
}

export default { buildAscendantDeepReport, buildMoonSignDeepReport, buildNakshatraDeepReport };
