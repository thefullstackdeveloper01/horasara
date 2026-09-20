/**
 * PLANETARY POSITION MASTER TABLE
 * ==================================
 * One row per supported planet (Sun..Saturn, Rahu, Ketu — and Uranus/
 * Neptune/Pluto where the engine tracks them), with every field requested:
 * sidereal longitude, tropical longitude, sign, degree, nakshatra, pada,
 * house, bhava (chalit), sign lord, nakshatra lord, KP sub lord (where
 * applicable), retrograde/direct, combust status, eclipse status (Sun/Moon
 * only — the only bodies eclipses apply to), planetary war (where
 * applicable — true grahas only), speed, dignity, exaltation/debilitation,
 * own sign, moolatrikona, functional nature, natural relationship,
 * temporary relationship, compound (Panchadha Maitri) relationship, and
 * dispositor.
 *
 * Every field is read from a value this chart's own engine already
 * computed (planets[], combustion, kpChart, functionalNature, doshas.grahan)
 * EXCEPT temporary relationship and compound relationship, which are
 * classical BPHS Ch.4 house-distance/table computations applied fresh
 * here (they were never wired into the engine's planet objects before).
 * Sidereal (Vedic) and tropical (Western) longitudes are kept in
 * separate, clearly labelled fields — never combined into one value.
 */
import {
  SIGN_LORDS, NAKSHATRA_LORDS, NAKSHATRAS, OWN_SIGNS, MOOLATRIKONA,
  EXALTATION, DEBILITATION, NATURAL_FRIENDS, NATURAL_ENEMIES, NATURAL_NEUTRAL,
} from '../astronomy/constants.js';
import { calcGrahaYuddha } from '../special/graha_states.js';

import moduleData from '../../dataset/used/core/planetaryMasterTable.json' with { type: 'json' };
const TRUE_GRAHAS = moduleData.TRUE_GRAHAS; // planetary war applies only to these classically
const ECLIPSE_APPLICABLE = moduleData.ECLIPSE_APPLICABLE; // eclipses are Sun/Moon phenomena only
// Classical Panchadha Maitri (5-fold friendship) is a 9-graha system
// (Sun..Saturn, Rahu, Ketu) — modern outer planets (Uranus/Neptune/Pluto)
// have no classical friendship table and are excluded from relationship
// comparisons below, though they still get their own row in the master
// table with the relationship fields marked N/A.
const CLASSICAL_GRAHAS = moduleData.CLASSICAL_GRAHAS;

// ── Temporary (Tatkalika) friendship — BPHS Ch.4 ────────────────────────
// Planets in houses 2,3,4,10,11,12 counted from a given planet's own
// house are its temporary friends; all others (1,5,6,7,8,9) are temporary
// enemies. (House 1 = the planet's own house, not counted as friend or
// enemy — excluded from both lists by construction below.)
const TEMP_FRIEND_OFFSETS = new Set([1, 2, 3, 9, 10, 11]); // 0-indexed offsets for houses 2,3,4,10,11,12

function computeTemporaryRelationships(planets) {
  const out = {};
  const classical = planets.filter(p => CLASSICAL_GRAHAS.includes(p.name));
  for (const p1 of classical) {
    if (p1.house == null) continue;
    const friends = [];
    for (const p2 of classical) {
      if (p1.name === p2.name || p2.house == null) continue;
      const offset = ((p2.house - p1.house) + 12) % 12;
      if (TEMP_FRIEND_OFFSETS.has(offset)) friends.push(p2.name);
    }
    out[p1.name] = friends;
  }
  return out;
}

// ── Compound (Panchadha Maitri, "5-fold friendship") — BPHS Ch.4 ───────
// Combines Natural + Temporary relationship into 5 grades:
//   Natural Friend + Temp Friend  → Adhi Mitra (Great Friend)
//   Natural Friend + Temp Enemy, or Natural Neutral + Temp Friend → Mitra (Friend)
//   Natural Neutral + Temp Neutral → Sama (Neutral)
//   Natural Enemy + Temp Friend, or Natural Neutral + Temp Enemy → Shatru (Enemy)
//   Natural Enemy + Temp Enemy → Adhi Shatru (Great Enemy)
function naturalRelation(p1, p2) {
  if (p1 === p2) return 'Self';
  if (NATURAL_FRIENDS[p1]?.includes(p2)) return 'Friend';
  if (NATURAL_ENEMIES[p1]?.includes(p2)) return 'Enemy';
  return 'Neutral';
}

function compoundRelation(natural, temporary) {
  if (natural === 'Friend' && temporary === 'Friend') return 'Adhi Mitra (Great Friend)';
  if (natural === 'Enemy' && temporary === 'Enemy') return 'Adhi Shatru (Great Enemy)';
  if ((natural === 'Friend' && temporary === 'Enemy') || (natural === 'Neutral' && temporary === 'Friend')) return 'Mitra (Friend)';
  if ((natural === 'Enemy' && temporary === 'Friend') || (natural === 'Neutral' && temporary === 'Enemy')) return 'Shatru (Enemy)';
  return 'Sama (Neutral)';
}

/**
 * @param {object} R - the calculated chart object (needs R.planets,
 *   R.combustion, R.kpChart, R.doshas.grahan)
 * @returns {Array<object>} one master-table row per planet
 */
export function buildPlanetaryMasterTable(R) {
  const planets = R.planets || [];
  const combustSet = new Set(Object.entries(R.combustion || {}).filter(([, v]) => v?.combust).map(([k]) => k));
  const grahanResult = R.doshas?.grahan;
  const eclipsedBodies = new Set((grahanResult?.doshas || []).map(r => r.body));
  const wars = (() => { try { return calcGrahaYuddha(planets); } catch (e) { return []; } })();
  const warSet = new Set(wars.flatMap(w => w.planets || []));
  const tempRel = computeTemporaryRelationships(planets);

  // KP sub-lord per planet, if the KP chart exposes per-planet sub lords
  const kpPlanetSubLords = {};
  for (const entry of (R.kpChart?.planets || [])) {
    if (entry?.name) kpPlanetSubLords[entry.name] = entry.subLord ?? null;
  }

  return planets.map(p => {
    const isClassical = CLASSICAL_GRAHAS.includes(p.name);
    const natRel = {};
    const compRel = {};
    if (isClassical) {
      for (const other of planets) {
        if (other.name === p.name || !CLASSICAL_GRAHAS.includes(other.name)) continue;
        const n = naturalRelation(p.name, other.name);
        natRel[other.name] = n;
        const t = tempRel[p.name]?.includes(other.name) ? 'Friend' : 'Enemy';
        compRel[other.name] = compoundRelation(n, t);
      }
    }

    const ownSign = OWN_SIGNS[p.name]?.includes(p.sign) || false;
    const mt = MOOLATRIKONA[p.name];
    const inMoolatrikona = mt && mt.sign === p.sign && Number(p.degInSign) >= mt.from && Number(p.degInSign) <= mt.to;

    return {
      planet: p.name,
      // Vedic (sidereal) values — kept separate from Western/tropical
      vedic: {
        siderealLongitude: Number(p.siderealLon?.toFixed(4)),
        sign: p.sign,
        degreeInSign: p.degInSign,
        dms: p.dms,
        nakshatra: p.nakshatra,
        pada: p.pada,
        house: p.house,
        bhava: R.bhavaChalit?.planets?.find(b => b.planet === p.name)?.bhavaHouse ?? p.house,
        signLord: SIGN_LORDS[p.sign],
        nakshatraLord: NAKSHATRA_LORDS[NAKSHATRAS.indexOf(p.nakshatra)],
        dignity: p.dignity,
        exalted: EXALTATION[p.name]?.sign === p.sign,
        debilitated: DEBILITATION[p.name]?.sign === p.sign,
        ownSign,
        moolatrikona: !!inMoolatrikona,
        functionalNature: p.functionalNature || null,
        dispositor: SIGN_LORDS[p.sign],
      },
      // Western (tropical) value — reported separately, never merged with the sidereal fields above
      western: {
        tropicalLongitude: Number(p.tropicalLon?.toFixed(4)),
      },
      kpSubLord: kpPlanetSubLords[p.name] ?? null,
      retrograde: p.retrograde,
      retrogradeLabel: p.retrogradeLabel,
      speed: p.speed,
      combust: combustSet.has(p.name),
      eclipseStatus: ECLIPSE_APPLICABLE.includes(p.name)
        ? (eclipsedBodies.has(p.name) ? 'Within eclipse-causing proximity to a node' : 'Not applicable — no eclipse condition active')
        : 'N/A (eclipses only apply to Sun/Moon)',
      planetaryWar: TRUE_GRAHAS.includes(p.name)
        ? (warSet.has(p.name) ? 'In Graha Yuddha (planetary war)' : 'Not in planetary war')
        : 'N/A (planetary war only applies to Mars/Mercury/Jupiter/Venus/Saturn)',
      naturalRelationship: isClassical ? natRel : 'N/A (classical Panchadha Maitri applies only to the 9 traditional grahas)',
      temporaryRelationship: isClassical ? Object.fromEntries(planets.filter(o => o.name !== p.name && CLASSICAL_GRAHAS.includes(o.name)).map(o => [o.name, tempRel[p.name]?.includes(o.name) ? 'Friend' : 'Enemy'])) : 'N/A (classical Panchadha Maitri applies only to the 9 traditional grahas)',
      compoundRelationship: isClassical ? compRel : 'N/A (classical Panchadha Maitri applies only to the 9 traditional grahas)',
      source: 'Computed directly from this chart\'s own planetary positions (BPHS Ch.4 for temporary/compound friendship)',
    };
  });
}

export default { buildPlanetaryMasterTable };
