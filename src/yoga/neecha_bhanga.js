// ============================================================
// VEDIC JYOTISH ENGINE v5.2 — NEECHA BHANGA RAJA YOGA
// "Cancellation of Debilitation" = Hidden Strength / Secret Raj Yoga
// Per BPHS Ch.25-26 and Phala Deepika
// ============================================================

import { SIGNS, SIGN_LORDS } from '../astronomy/constants.js';
import { signOf } from '../astronomy/utils.js';

// Classical Neecha Bhanga conditions (per BPHS)
// A debilitated planet's weakness is cancelled if ANY of these apply:
import moduleData from '../../dataset/used/core/neecha_bhanga.json' with { type: 'json' };
const NEECHA_BHANGA_RULES = moduleData.NEECHA_BHANGA_RULES;

// Which planet exalts in each sign (for rule 2)
const EXALTS_IN = moduleData.EXALTS_IN;

const EXALTATION_SIGN = moduleData.EXALTATION_SIGN;
const DEBILITATION_SIGN = moduleData.DEBILITATION_SIGN;

export function calcNeechaBhanga(planets, ascLon, moonLon) {
  const results = [];
  const pMap = {};
  for (const p of planets) pMap[p.name] = p;

  const ascSignIdx = signOf(ascLon);
  const moonSignIdx = signOf(moonLon);
  const kendras = [1,4,7,10];

  function getHouseFromLagna(signIdx) {
    return ((signIdx - ascSignIdx + 12) % 12) + 1;
  }
  function getHouseFromMoon(signIdx) {
    return ((signIdx - moonSignIdx + 12) % 12) + 1;
  }
  function isInKendra(signIdx) {
    return kendras.includes(getHouseFromLagna(signIdx)) || kendras.includes(getHouseFromMoon(signIdx));
  }
  function aspects7th(planet1, planet2) {
    if (!planet1 || !planet2) return false;
    const diff = ((signOf(planet1.siderealLon) - signOf(planet2.siderealLon)) + 12) % 12;
    return diff === 6; // 7th aspect (opposition)
  }
  function isExalted(pName, lon) {
    return SIGNS[signOf(lon)] === EXALTATION_SIGN[pName];
  }
  function isDebilitated(pName, lon) {
    return SIGNS[signOf(lon)] === DEBILITATION_SIGN[pName];
  }

  for (const p of planets) {
    if (!DEBILITATION_SIGN[p.name]) continue;
    if (!isDebilitated(p.name, p.siderealLon)) continue;

    const debilSign = DEBILITATION_SIGN[p.name];
    const debilSignIdx = SIGNS.indexOf(debilSign);
    const debilSignLord = SIGN_LORDS[debilSign];
    const debilSignLordPlanet = pMap[debilSignLord];
    const exaltSign = EXALTATION_SIGN[p.name];
    const exaltSignLord = SIGN_LORDS[exaltSign];
    const exaltSignLordPlanet = pMap[exaltSignLord];
    const planetThatExaltsInDebilSign = EXALTS_IN[debilSign];
    const exaltingPlanet = pMap[planetThatExaltsInDebilSign];

    const cancellations = [];
    let isCancelled = false;

    // Rule 1: Lord of debilitation sign in Kendra
    if (debilSignLordPlanet && isInKendra(signOf(debilSignLordPlanet.siderealLon))) {
      cancellations.push({
        rule: 1,
        desc: `${debilSignLord} (lord of ${debilSign}) is in Kendra from Lagna/Moon`
      });
      isCancelled = true;
    }

    // Rule 2: Planet that exalts in debilitation sign is in Kendra
    if (exaltingPlanet && isInKendra(signOf(exaltingPlanet.siderealLon))) {
      cancellations.push({
        rule: 2,
        desc: `${planetThatExaltsInDebilSign} (exalts in ${debilSign}) is in Kendra`
      });
      isCancelled = true;
    }

    // Rule 3: Lord of debilitation is itself exalted
    if (debilSignLordPlanet && isExalted(debilSignLord, debilSignLordPlanet.siderealLon)) {
      cancellations.push({
        rule: 3,
        desc: `${debilSignLord} (debilitation sign lord) is itself exalted in ${EXALTATION_SIGN[debilSignLord]}`
      });
      isCancelled = true;
    }

    // Rule 4: Debilitation sign lord aspects the debilitated planet
    if (debilSignLordPlanet && aspects7th(debilSignLordPlanet, p)) {
      cancellations.push({
        rule: 4,
        desc: `${debilSignLord} aspects debilitated ${p.name} (7th aspect) — weakness overridden`
      });
      isCancelled = true;
    }

    // Rule 5: Debilitated planet itself is in Kendra
    if (isInKendra(signOf(p.siderealLon))) {
      cancellations.push({
        rule: 5,
        desc: `${p.name} debilitated but in Kendra from Lagna/Moon — self-Neecha Bhanga`
      });
      isCancelled = true;
    }

    // Rule 6: Exaltation sign lord conjuncts or aspects the debilitated planet
    if (exaltSignLordPlanet) {
      const conjunct = signOf(exaltSignLordPlanet.siderealLon) === signOf(p.siderealLon);
      const aspect = aspects7th(exaltSignLordPlanet, p);
      if (conjunct || aspect) {
        cancellations.push({
          rule: 6,
          desc: `${exaltSignLord} (lord of ${p.name}'s exaltation sign ${exaltSign}) ${conjunct ? 'conjoins' : 'aspects'} ${p.name}`
        });
        isCancelled = true;
      }
    }

    // Determine Raj Yoga potential
    let rajYogaLevel = '';
    if (isCancelled) {
      if (cancellations.length >= 3) rajYogaLevel = 'Exceptional Raj Yoga (3+ cancellations)';
      else if (cancellations.length === 2) rajYogaLevel = 'Strong Raj Yoga (double cancellation)';
      else rajYogaLevel = 'Neecha Bhanga (single cancellation)';
    }

    results.push({
      planet: p.name,
      debilitationSign: debilSign,
      currentSign: SIGNS[signOf(p.siderealLon)],
      isDebilitated: true,
      isCancelled,
      cancellationCount: cancellations.length,
      cancellations,
      rajYogaLevel,
      effect: isCancelled
        ? `${p.name} debilitation CANCELLED → ${rajYogaLevel}. Planet gives ABOVE-NORMAL results especially during its Dasha.`
        : `${p.name} is debilitated with NO cancellation — weak results, especially in Dasha.`,
      dashaPrediction: isCancelled
        ? `During ${p.name} Mahadasha/Antardasha: Initial obstacles but extraordinary rise, rise from fallen/ordinary status to prominence`
        : `During ${p.name} Mahadasha/Antardasha: Likely challenges, health/career difficulties, requires extra effort`
    });
  }

  return results;
}

// ============================================================
// REMOVED (dead code + astrological accuracy bug):
// this file used to also contain calcDashaTransitOverlay() and
// generateMonthlyOutlook(), a "Dasha-Transit Combined" engine. It was
// never imported anywhere in the live app — engine.js only ever used
// calcNeechaBhanga() from this file.
//
// It also had a real accuracy bug worth recording: it labeled Saturn's
// transit house-from-Moon using [4, 8, 12, 1] as "Sade Sati phases".
// Classical Sade Sati is only houses 12 (Rising), 1 (Peak), 2 (Setting)
// from Moon — houses 4 and 8 from Moon are separate, distinct doshas
// (Kantaka Shani and Ashtama Shani respectively), not Sade Sati at all.
// Even the two correct-looking entries had their phase names swapped
// (12th-from-Moon was labeled "Phase 3 — concluding" when it's actually
// the Rising/opening phase). Since Sade Sati is already handled
// correctly and consistently elsewhere (dosha/sade_sati_accurate.js) and
// Saturn's per-house transit effects are already handled correctly in
// transit/gochar.js, this duplicate — and its bug — was removed rather
// than fixed in place, to avoid a second, conflicting Sade Sati source.
// ============================================================

