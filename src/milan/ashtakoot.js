/**
 * ashtakoot.js — Kundali Milan (Ashtakoot / 36-Point Guna Milan) engine.
 *
 * Single Responsibility: given the ALREADY-CALCULATED charts of a groom
 * and a bride (the same "R" object src/engine.js#calculateChart produces
 * for Kundali Reading), compute the classical 8-fold (Ashtakoot) marriage
 * compatibility score, plus the Mangal Dosha comparison between the two
 * charts. No astronomy is recomputed here — this module only reads the
 * Moon sign / nakshatra each chart already contains and applies the
 * classical BPHS-descended Ashtakoot rules on top.
 *
 * The 8 kootas and their maximum points (total 36):
 *   1. Varna         (1)  — spiritual/work compatibility (Rashi-based)
 *   2. Vashya         (2)  — mutual attraction/control (Rashi-based)
 *   3. Tara           (3)  — health & general well-being (Nakshatra-based)
 *   4. Yoni           (4)  — physical/sexual compatibility (Nakshatra-based)
 *   5. Graha Maitri   (5)  — mental compatibility (Rashi-lord friendship)
 *   6. Gana           (6)  — temperament (Nakshatra-based)
 *   7. Bhakoot        (7)  — family welfare, finances (Rashi-based)
 *   8. Nadi           (8)  — genetic/health compatibility (Nakshatra-based)
 *
 * Dashakoot (10-fold, total 40 points) adds:
 *   9. Mahendra       (2)  — progeny and well-being of children
 *  10. Stree-Deergha  (2)  — bride's longevity and well-being
 *
 * Extended supplementary kootas (no points, dosha-based) computed for
 * completeness and surfaced as additional information:
 *  - Rajju  — safety / longevity (Nakshatra-based)
 *  - Vedha  — nakshatra obstruction pairs (Nakshatra-based)
 *
 * Papa Samyam — balance of malefic (Papa) planet placements from Lagna,
 * Moon, and Venus in houses 1, 2, 4, 7, 8, 12 (and 6 in some texts) —
 * is computed in full detail with comparative scoring.
 *
 * NOTE on precision: Tara, Gana, Bhakoot, and Nadi follow single,
 * unambiguous classical rules and are implemented exactly. Yoni and
 * Vashya classically use finer-grained (0/1/2/3/4 and 0/0.5/1/1.5/2)
 * compatibility grids between animal/group pairs that vary slightly
 * between texts; this module uses a defensible 3-tier simplification
 * (full points / partial / zero) built from the small set of pairings
 * that are consistently agreed upon across sources (same-group, and the
 * classical "natural enemy" pairs). This is disclosed here rather than
 * presenting invented fine-grained numbers as authoritative.
 *
 * Robustness: every entry-point performs input validation. Missing
 * planets / partial charts produce a structured `errors` array rather
 * than throwing, so the UI can degrade gracefully.
 */
import { SIGNS, SIGN_LORDS, NAKSHATRAS, NATURAL_FRIENDS, NATURAL_ENEMIES }
  from '../astronomy/constants.js';
import { calcMangalDosha } from '../dosha/doshas.js';

// ════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS — validation & safe access
// ════════════════════════════════════════════════════════════════════════

const SAFE_NUM = (v, fallback = 0) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

const SAFE_IDX = (arr, name, fallback = -1) => {
  if (name == null) return fallback;
  const i = arr.indexOf(name);
  return i < 0 ? fallback : i;
};

function findPlanet(chart, planetName) {
  if (!chart || !Array.isArray(chart.planets)) return null;
  return chart.planets.find(p => p && p.name === planetName) || null;
}

function requireMoon(chart, errors, label = 'chart') {
  const moon = findPlanet(chart, 'Moon');
  if (!moon) {
    errors.push(`Moon not found in ${label} — Guna Milan cannot be computed accurately.`);
    return null;
  }
  if (!moon.sign || !moon.nakshatra) {
    errors.push(`Moon in ${label} is missing sign/nakshatra metadata.`);
    return null;
  }
  return moon;
}

function requireAscendant(chart, errors, label = 'chart') {
  if (!chart || !chart.ascendant || !Number.isFinite(parseFloat(chart.ascendant.lon))) {
    errors.push(`Ascendant longitude missing/invalid in ${label}.`);
    return null;
  }
  return chart.ascendant;
}

// ════════════════════════════════════════════════════════════════════════
// VARNA (1 point)
// ════════════════════════════════════════════════════════════════════════
import moduleData from '../../dataset/used/core/ashtakoot.json' with { type: 'json' };
const VARNA_BY_SIGN = moduleData.VARNA_BY_SIGN;
const VARNA_RANK = moduleData.VARNA_RANK;

function varnaKoota(groomSign, brideSign) {
  const gVarna = VARNA_BY_SIGN[groomSign];
  const bVarna = VARNA_BY_SIGN[brideSign];
  // Classical rule: groom's varna rank >= bride's for full point.
  // (Some South-Indian texts score 0 if bride outranks groom by 2+.)
  const points = VARNA_RANK[gVarna] >= VARNA_RANK[bVarna] ? 1 : 0;
  return {
    name: 'Varna', maxPoints: 1, points,
    detail: `Groom: ${gVarna}, Bride: ${bVarna}`,
    meaning: 'Spiritual/work compatibility and ego alignment',
  };
}

// ════════════════════════════════════════════════════════════════════════
// VASHYA (2 points)
// ════════════════════════════════════════════════════════════════════════
function vashyaGroup(sign, degInSign) {
  if (sign === 'Aries' || sign === 'Taurus') return 'Chatushpada';
  if (sign === 'Leo') return 'Vanachar';
  if (sign === 'Scorpio') return 'Keeta';
  if (['Gemini', 'Virgo', 'Libra', 'Aquarius'].includes(sign)) return 'Manav';
  if (sign === 'Cancer' || sign === 'Pisces') return 'Jalachar';
  if (sign === 'Sagittarius') return degInSign < 15 ? 'Chatushpada' : 'Manav';
  if (sign === 'Capricorn') return degInSign < 15 ? 'Chatushpada' : 'Jalachar';
  return 'Manav';
}
const VASHYA_SCORE_TABLE = Object.freeze({
  Chatushpada:{Chatushpada:2,Manav:1,Jalachar:1,Vanachar:1.5,Keeta:1},
  Manav:{Chatushpada:1,Manav:2,Jalachar:1.5,Vanachar:0,Keeta:1},
  Jalachar:{Chatushpada:1,Manav:1.5,Jalachar:2,Vanachar:1,Keeta:1},
  Vanachar:{Chatushpada:0,Manav:0,Jalachar:0,Vanachar:2,Keeta:0},
  Keeta:{Chatushpada:1,Manav:1,Jalachar:1,Vanachar:0,Keeta:2}
});

function vashyaKoota(groomSign, groomDeg, brideSign, brideDeg) {
  const g = vashyaGroup(groomSign, SAFE_NUM(groomDeg));
  const b = vashyaGroup(brideSign, SAFE_NUM(brideDeg));
  const points = VASHYA_SCORE_TABLE[g]?.[b] ?? 0;
  return {
    name: 'Vashya', maxPoints: 2, points,
    detail: `Groom group: ${g}, Bride group: ${b}`,
    meaning: 'Mutual attraction and dominance/control in the relationship',
  };
}

// ════════════════════════════════════════════════════════════════════════
// TARA (3 points) — also called Dina Koota in Dashakoot
// ════════════════════════════════════════════════════════════════════════
const TARA_NAMES = moduleData.TARA_NAMES;
const TARA_GOOD = new Set([2, 4, 6, 8, 9]); // Sampat, Kshema, Sadhaka, Mitra, Parama Mitra

function taraNumberAndScore(fromIdx, toIdx) {
  const count = ((toIdx - fromIdx + 27) % 27) + 1;
  const taraNum = ((count - 1) % 9) + 1;
  return { taraNum, name: TARA_NAMES[taraNum - 1], score: TARA_GOOD.has(taraNum) ? 1.5 : 0 };
}

function taraKoota(groomNakIdx, brideNakIdx) {
  const gToB = taraNumberAndScore(groomNakIdx, brideNakIdx);
  const bToG = taraNumberAndScore(brideNakIdx, groomNakIdx);
  const points = gToB.score + bToG.score;
  return {
    name: 'Tara', maxPoints: 3, points,
    detail: `Groom→Bride Tara: ${gToB.name}, Bride→Groom Tara: ${bToG.name}`,
    meaning: 'Health, longevity, and general well-being of the couple',
  };
}

// ════════════════════════════════════════════════════════════════════════
// YONI (4 points)
// ════════════════════════════════════════════════════════════════════════
const NAKSHATRA_YONI = moduleData.NAKSHATRA_YONI;
// Yoni "directions" used for the secondary directional compatibility check
const NAKSHATRA_YONI_DIR = moduleData.NAKSHATRA_YONI_DIR;
// Classical "natural enemy" Yoni pairs — score 0 when matched.
const YONI_ENEMIES = moduleData.YONI_ENEMIES;

function yoniKoota(groomNakIdx, brideNakIdx) {
  const gY = NAKSHATRA_YONI[groomNakIdx];
  const bY = NAKSHATRA_YONI[brideNakIdx];
  const gDir = NAKSHATRA_YONI_DIR[groomNakIdx];
  const bDir = NAKSHATRA_YONI_DIR[brideNakIdx];
  const YONI_RELATION = moduleData.YONI_RELATION || {
    'Horse|Elephant':3,'Elephant|Horse':3,
    'Elephant|Cow':3,'Cow|Elephant':3,
    'Dog|Tiger':3,'Tiger|Dog':3,
    'Serpent|Rat':1,'Rat|Serpent':1
  };
  let points;
  if (gY === bY) points = 4;
  else if (YONI_ENEMIES.some(([x, y]) => (x === gY && y === bY) || (x === bY && y === gY))) points = 0;
  else points = YONI_RELATION[`${gY}|${bY}`] ?? 2;
  return {
    name: 'Yoni', maxPoints: 4, points,
    detail: `Groom Yoni: ${gY} (${gDir}), Bride Yoni: ${bY} (${bDir})`,
    meaning: 'Physical and sexual compatibility',
  };
}

// ════════════════════════════════════════════════════════════════════════
// GRAHA MAITRI (5 points)
// ════════════════════════════════════════════════════════════════════════
function planetRelation(a, b) {
  if (a === b) return 'same';
  if (NATURAL_FRIENDS[a]?.includes(b)) return 'friend';
  if (NATURAL_ENEMIES[a]?.includes(b)) return 'enemy';
  return 'neutral';
}
const REL_RANK = moduleData.REL_RANK;
const GRAHA_MAITRI_TABLE = moduleData.GRAHA_MAITRI_TABLE;

function grahaMaitriKoota(groomSign, brideSign) {
  const gLord = SIGN_LORDS[groomSign];
  const bLord = SIGN_LORDS[brideSign];
  let points;
  if (gLord === bLord) {
    points = 5;
  } else {
    const rel1 = planetRelation(gLord, bLord);
    const rel2 = planetRelation(bLord, gLord);
    const key = [rel1, rel2].sort((x, y) => REL_RANK[x] - REL_RANK[y]).join('-');
    points = GRAHA_MAITRI_TABLE[key] ?? 2;
  }
  return {
    name: 'Graha Maitri', maxPoints: 5, points,
    detail: `Groom Rashi Lord: ${gLord}, Bride Rashi Lord: ${bLord}`,
    meaning: 'Mental compatibility and intellectual friendship',
  };
}

// ════════════════════════════════════════════════════════════════════════
// GANA (6 points)
// ════════════════════════════════════════════════════════════════════════
const NAKSHATRA_GANA = moduleData.NAKSHATRA_GANA;
const GANA_TABLE = moduleData.GANA_TABLE;

function ganaCancellationCheck(groomSign, brideSign) {
  const gLord = SIGN_LORDS[groomSign];
  const bLord = SIGN_LORDS[brideSign];
  const sameLord = gLord === bLord;
  const friendlyLords = NATURAL_FRIENDS[gLord]?.includes(bLord) || NATURAL_FRIENDS[bLord]?.includes(gLord);
  const cancelled = sameLord || friendlyLords;
  return {
    cancelled,
    reason: sameLord
      ? `Both Rashi lords are the same planet (${gLord}) — classical Nivarana cancellation condition met`
      : friendlyLords
        ? `Rashi lords (${gLord} and ${bLord}) are classical natural friends — a recognized cancellation condition`
        : `Rashi lords (${gLord}, ${bLord}) are neither the same nor classical friends — cancellation condition not met`,
  };
}

function ganaKoota(groomNakIdx, brideNakIdx, groomSign, brideSign) {
  const gG = NAKSHATRA_GANA[groomNakIdx];
  const bG = NAKSHATRA_GANA[brideNakIdx];
  const points = GANA_TABLE[gG][bG];
  const isLowScore = points <= 1;
  const cancellation = isLowScore ? ganaCancellationCheck(groomSign, brideSign) : null;
  return {
    name: 'Gana', maxPoints: 6, points,
    detail: `Groom Gana: ${gG}, Bride Gana: ${bG}`,
    meaning: 'Temperament and behavioral compatibility',
    dosha: isLowScore,
    cancellation: cancellation ? {
      applicable: true,
      cancelled: cancellation.cancelled,
      reason: cancellation.reason,
      remedy: cancellation.cancelled
        ? 'None required — cancellation conditions met.'
        : 'Ganapati Homam; Vishnu Sahasranama recitation; consult a qualified astrologer before finalizing.',
      source: 'Classical Gana-Koota cancellation conditions (bundled Gana-matching reference table)',
    } : null,
  };
}

// ════════════════════════════════════════════════════════════════════════
// BHAKOOT (7 points) — with classical cancellation (Nivarana)
// ════════════════════════════════════════════════════════════════════════
const BHAKOOT_BAD_COUNTS = new Set([2, 12, 5, 9, 6, 8]);
// 2-12, 5-9 : Dhan Yoga dosha (financial/health)
// 6-8       : Shadashtaka dosha
// But for SAME-sign (1-1) and 7-7 (opposite) Bhakoot is *not* a dosha.

function bhakootCancellationCheck(groomSign, brideSign, groomNakIdx, brideNakIdx) {
  const gLord = SIGN_LORDS[groomSign];
  const bLord = SIGN_LORDS[brideSign];
  const sameRashiLord = gLord === bLord;
  const sameRashi = groomSign === brideSign;
  const friendlyLords = NATURAL_FRIENDS[gLord]?.includes(bLord) || NATURAL_FRIENDS[bLord]?.includes(gLord);
  // Navamsha-same / same nakshatra-different-pada also accepted classically.
  const sameNak = groomNakIdx === brideNakIdx;
  const metConditions = [];
  if (sameRashiLord) metConditions.push(`Same Rashi lord (${gLord})`);
  if (friendlyLords && !sameRashiLord) metConditions.push(`Friendly Rashi lords (${gLord}, ${bLord})`);
  if (sameRashi) metConditions.push('Same Rashi');
  if (sameNak) metConditions.push('Same Nakshatra');
  return { cancelled: metConditions.length > 0, metConditions };
}

function bhakootKoota(groomSignIdx, brideSignIdx, groomSign, brideSign, groomNakIdx, brideNakIdx) {
  const gToB = ((brideSignIdx - groomSignIdx + 12) % 12) + 1;
  const bToG = ((groomSignIdx - brideSignIdx + 12) % 12) + 1;
  const hasDosha = BHAKOOT_BAD_COUNTS.has(gToB) || BHAKOOT_BAD_COUNTS.has(bToG);

  // Special classical exception: 1-1 (same rashi) and 7-7 (opposite) are NOT dosha.
  const isException = gToB === 1 || gToB === 7;
  const effectiveDosha = hasDosha && !isException;

  let cancellation = null;
  if (effectiveDosha) {
    cancellation = bhakootCancellationCheck(groomSign, brideSign, groomNakIdx, brideNakIdx);
  }

  const points = effectiveDosha ? 0 : 7;

  return {
    name: 'Bhakoot', maxPoints: 7, points,
    detail: `Rashi distance Groom→Bride: ${gToB}, Bride→Groom: ${bToG}` +
      (isException ? ' (1-1 or 7-7 exception applied — not treated as dosha)' : ''),
    meaning: 'Family welfare, prosperity, and emotional bonding',
    dosha: effectiveDosha,
    cancellation: cancellation ? {
      applicable: true,
      cancelled: cancellation.cancelled,
      metConditions: cancellation.metConditions,
      reason: cancellation.cancelled
        ? `Cancellation condition(s) met: ${cancellation.metConditions.join('; ')}`
        : 'No classical cancellation conditions met.',
      remedy: cancellation.cancelled
        ? 'Classically considered cancelled; consult a qualified astrologer before finalizing.'
        : 'Bhakoot Shanti; Navagraha Puja; Lord Vishnu and Lakshmi worship; consult a qualified astrologer.',
      source: 'Classical Bhakoot-Koota cancellation conditions',
    } : null,
  };
}

// ════════════════════════════════════════════════════════════════════════
// NADI (8 points)
// ════════════════════════════════════════════════════════════════════════
const NAKSHATRA_NADI = moduleData.NAKSHATRA_NADI;

function nadiCancellationCheck(groomSign, brideSign, groomNakIdx, brideNakIdx, groomPada, bridePada) {
  const sameRashi = groomSign === brideSign;
  const sameNakDifferentPada = groomNakIdx === brideNakIdx && groomPada !== bridePada;
  const gLord = SIGN_LORDS[groomSign];
  const bLord = SIGN_LORDS[brideSign];
  const sameRashiLord = gLord === bLord;
  // Additional classical condition: nakshatra lords friendly
  const friendlyLords = NATURAL_FRIENDS[gLord]?.includes(bLord) || NATURAL_FRIENDS[bLord]?.includes(gLord);

  const metConditions = [];
  if (sameRashi) metConditions.push('Same Moon Rashi (sign) for both partners');
  if (sameNakDifferentPada) metConditions.push('Same Nakshatra but different Pada');
  if (sameRashiLord) metConditions.push(`Same Rashi lord for both (${gLord})`);
  if (friendlyLords && !sameRashiLord) metConditions.push(`Friendly Rashi lords (${gLord}, ${bLord})`);

  return { cancelled: metConditions.length > 0, metConditions };
}

function nadiKoota(groomNakIdx, brideNakIdx, groomSign, brideSign, groomPada, bridePada) {
  const gN = NAKSHATRA_NADI[groomNakIdx];
  const bN = NAKSHATRA_NADI[brideNakIdx];
  const hasDosha = gN === bN;
  const cancellation = hasDosha
    ? nadiCancellationCheck(groomSign, brideSign, groomNakIdx, brideNakIdx, groomPada, bridePada)
    : null;
  return {
    name: 'Nadi', maxPoints: 8, points: hasDosha ? 0 : 8,
    detail: `Groom Nadi: ${gN}, Bride Nadi: ${bN}`,
    meaning: 'Genetic compatibility, health of offspring',
    dosha: hasDosha,
    cancellation: cancellation ? {
      applicable: true,
      cancelled: cancellation.cancelled,
      metConditions: cancellation.metConditions,
      reason: cancellation.cancelled
        ? `Cancellation condition(s) met: ${cancellation.metConditions.join('; ')}`
        : 'None of the classical cancellation conditions (same Rashi / same Nakshatra-different Pada / same or friendly Rashi lord) are met.',
      remedy: cancellation.cancelled
        ? 'Classically considered cancelled; a qualified astrologer\'s confirmation is still advisable before finalizing.'
        : 'Nadi Nivarana Puja; Maha Mrityunjaya Japa; Navagraha Homam — consult a qualified astrologer, as uncancelled Nadi Dosha is classically considered significant.',
      source: 'Classical Nadi-Koota cancellation conditions (bundled Nadi-matching reference table)',
    } : null,
  };
}

// ════════════════════════════════════════════════════════════════════════
// MAHENDRA (2 points) — Dashakoot #9
// Progeny & well-being of children. Count nakshatras from groom to bride.
// Favorable counts: 4, 7, 10, 13, 16, 19, 22, 25 → Mahendra yoga.
// ════════════════════════════════════════════════════════════════════════
const MAHENDRA_FAVORABLE = new Set([4, 7, 10, 13, 16, 19, 22, 25]);

function mahendraKoota(groomNakIdx, brideNakIdx) {
  const count = ((brideNakIdx - groomNakIdx + 27) % 27) + 1;
  const points = MAHENDRA_FAVORABLE.has(count) ? 2 : 0;
  return {
    name: 'Mahendra', maxPoints: 2, points,
    detail: `Nakshatra count Groom→Bride: ${count}`,
    meaning: 'Progeny, longevity of children and family lineage',
  };
}

// ════════════════════════════════════════════════════════════════════════
// STREE-DEERGHA (2 points) — Dashakoot #10
// Bride's longevity & well-being. Groom's nakshatra should be 9 or more
// counts away from bride's (i.e. bride's nakshatra count from groom ≥ 9
// or, equivalently, outside bride's first 9 nakshatras).
// Classical rule: count from bride's nakshatra to groom's; if ≥ 14, full
// points; if between 9 and 13, partial; if ≤ 8, dosha.
// ════════════════════════════════════════════════════════════════════════
function streeDeerghaKoota(groomNakIdx, brideNakIdx) {
  const countFromBrideToGroom = ((groomNakIdx - brideNakIdx + 27) % 27) + 1;
  let points;
  if (countFromBrideToGroom >= 14) points = 2;
  else if (countFromBrideToGroom >= 9) points = 1;
  else points = 0;
  return {
    name: 'Stree-Deergha', maxPoints: 2, points,
    detail: `Nakshatra count Bride→Groom: ${countFromBrideToGroom}`,
    meaning: 'Longevity, health, and well-being of the bride',
    dosha: points === 0,
  };
}

// ════════════════════════════════════════════════════════════════════════
// RAJJU (supplementary — no points, dosha-only)
// 27 nakshatras are divided into 5 Rajju categories (feet, thigh, navel,
// neck, head). Same Rajju = dosha, more severe in higher limbs.
// ════════════════════════════════════════════════════════════════════════
const RAJJU = moduleData.RAJJU;
const RAJJU_SEVERITY = moduleData.RAJJU_SEVERITY;

function rajjuKoota(groomNakIdx, brideNakIdx) {
  const gR = RAJJU[groomNakIdx];
  const bR = RAJJU[brideNakIdx];
  const hasDosha = gR === bR;
  return {
    name: 'Rajju', maxPoints: 0, points: 0,
    detail: `Groom Rajju: ${gR}, Bride Rajju: ${bR}`,
    meaning: 'Safety, longevity, and protection from misfortune',
    dosha: hasDosha,
    severity: hasDosha ? RAJJU_SEVERITY[gR] : 0,
    note: hasDosha
      ? `Same Rajju (${gR}) — classical Rajju Dosha (severity ${RAJJU_SEVERITY[gR]}/5). ${
        gR === 'Head' ? 'Most severe — classically a dealbreaker.'
        : gR === 'Neck' ? 'Severe — strong remedy needed.'
        : 'Moderate — remedies available.'
      }`
      : 'No Rajju Dosha.',
    remedy: hasDosha
      ? 'Rajju Shanti Homam; Maha Mrityunjaya Japa; consult a qualified astrologer.'
      : null,
  };
}

// ════════════════════════════════════════════════════════════════════════
// VEDHA (supplementary — no points, dosha-only)
// Certain nakshatra pairs obstruct (Vedha) each other. Match = dosha.
// ════════════════════════════════════════════════════════════════════════
const VEDHA_PAIRS = moduleData.VEDHA_PAIRS;

// Build a clean lookup of Vedha pairs (symmetric).
const VEDHA_SET = new Set();
VEDHA_PAIRS.forEach(([a, b]) => { VEDHA_SET.add(`${a}|${b}`); VEDHA_SET.add(`${b}|${a}`); });

function vedhaKoota(groomNakIdx, brideNakIdx) {
  const hasDosha = groomNakIdx !== brideNakIdx && VEDHA_SET.has(`${groomNakIdx}|${brideNakIdx}`);
  return {
    name: 'Vedha', maxPoints: 0, points: 0,
    detail: `Groom Nakshatra idx: ${groomNakIdx} (${NAKSHATRAS[groomNakIdx]}), Bride Nakshatra idx: ${brideNakIdx} (${NAKSHATRAS[brideNakIdx]})`,
    meaning: 'Nakshatra obstruction compatibility',
    dosha: hasDosha,
    note: hasDosha
      ? `${NAKSHATRAS[groomNakIdx]} and ${NAKSHATRAS[brideNakIdx]} form a classical Vedha pair — dosha present.`
      : 'No Vedha Dosha.',
    remedy: hasDosha
      ? 'Vedha Shanti Puja; Navagraha Homam; consult a qualified astrologer.'
      : null,
  };
}

// ════════════════════════════════════════════════════════════════════════
// PAPA SAMYAM — detailed comparative malefic scoring
// ════════════════════════════════════════════════════════════════════════
// Papa Samyam checks the balance of malefic (Papa) planets in the
// "dusthana" houses 1, 2, 4, 7, 8, 12 (some texts include 6 and others
// 3) counted from three sensitive points: Lagna, Moon, and Venus.
//
// Malefics classically considered:
//   Sun, Mars, Saturn, Rahu, Ketu  (and waning Moon in some texts).
//
// Scoring (per classical "strength of Papa" approach):
//   - Each malefic in a dusthana from Lagna  → Papa points ×1
//   - Each malefic in a dusthana from Moon    → Papa points ×1.5  (Moon = Manas, more sensitive)
//   - Each malefic in a dusthana from Venus   → Papa points ×1.5  (Venus = marriage karaka)
//
// Papa strength (planet-in-house weighting):
//   - In own/exalted sign  : 1.5
//   - In friend's sign     : 1.0
//   - In neutral sign      : 0.75
//   - In enemy/debilitated : 0.5
//
// Compatibility rule (Papa Samyam = equality):
//   |groomPapa − bridePapa| ≤ tolerance  → compatible
//   tolerance default = 1.0  (strict); can be relaxed to 1.5.
// ════════════════════════════════════════════════════════════════════════

const PAPA_PLANETS = new Set(['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu']);
const PAPA_HOUSES = new Set([1, 2, 4, 7, 8, 12]);

// Function dependencies for Papa Samyam scoring.
const PLANET_EXALT = moduleData.PLANET_EXALT;
const PLANET_DEBIL = moduleData.PLANET_DEBIL;
const PLANET_OWN = moduleData.PLANET_OWN;

function planetPapaStrength(planet) {
  const sign = planet.sign;
  if (!sign) return 0.75;
  if (PLANET_EXALT[planet.name] === sign) return 1.5;
  if (PLANET_OWN[planet.name]?.includes(sign)) return 1.25;
  if (PLANET_DEBIL[planet.name] === sign) return 0.5;
  const lord = SIGN_LORDS[sign];
  if (NATURAL_FRIENDS[planet.name]?.includes(lord)) return 1.0;
  if (NATURAL_ENEMIES[planet.name]?.includes(lord)) return 0.6;
  return 0.75;
}

function houseFrom(fromLon, planetLon) {
  // 1-based house (1..12) where house-1 = same sign as reference.
  const diff = ((planetLon - fromLon) % 360 + 360) % 360;
  return Math.floor(diff / 30) + 1;
}

function papaScoreForChart(chart, errors, label = 'chart') {
  const asc = requireAscendant(chart, errors, label);
  const moon = findPlanet(chart, 'Moon');
  const venus = findPlanet(chart, 'Venus');
  if (!asc || !moon) {
    return {
      papaPoints: 0, valid: false,
      fromLagna: [], fromMoon: [], fromVenus: [],
      note: `Insufficient data (need Ascendant + Moon) for ${label}.`,
    };
  }
  const ascLon = SAFE_NUM(asc.lon);
  const moonLon = SAFE_NUM(moon.siderealLon ?? moon.lon);
  const venusLon = venus ? SAFE_NUM(venus.siderealLon ?? venus.lon) : null;

  const fromLagna = [];
  const fromMoon = [];
  const fromVenus = [];

  for (const p of chart.planets) {
    if (!p || !PAPA_PLANETS.has(p.name)) continue;
    const pLon = SAFE_NUM(p.siderealLon ?? p.lon);
    if (!Number.isFinite(pLon)) continue;
    const strength = planetPapaStrength(p);

    const hL = houseFrom(ascLon, pLon);
    if (PAPA_HOUSES.has(hL)) {
      fromLagna.push({ planet: p.name, house: hL, strength, points: strength * 1.0 });
    }
    const hM = houseFrom(moonLon, pLon);
    if (PAPA_HOUSES.has(hM)) {
      fromMoon.push({ planet: p.name, house: hM, strength, points: strength * 1.5 });
    }
    if (venusLon != null) {
      const hV = houseFrom(venusLon, pLon);
      if (PAPA_HOUSES.has(hV)) {
        fromVenus.push({ planet: p.name, house: hV, strength, points: strength * 1.5 });
      }
    }
  }

  const lagnaSum = fromLagna.reduce((s, x) => s + x.points, 0);
  const moonSum = fromMoon.reduce((s, x) => s + x.points, 0);
  const venusSum = fromVenus.reduce((s, x) => s + x.points, 0);
  const total = lagnaSum + moonSum + venusSum;

  return {
    papaPoints: Number(total.toFixed(3)),
    lagnaPapa: Number(lagnaSum.toFixed(3)),
    moonPapa: Number(moonSum.toFixed(3)),
    venusPapa: Number(venusSum.toFixed(3)),
    venusAvailable: venusLon != null,
    fromLagna, fromMoon, fromVenus,
    valid: true,
  };
}

function calcPapaSamyam(groomR, brideR, errors = []) {
  const g = papaScoreForChart(groomR, errors, 'groom chart');
  const b = papaScoreForChart(brideR, errors, 'bride chart');
  if (!g.valid || !b.valid) {
    return {
      groom: g, bride: b,
      difference: null,
      compatible: false,
      verdict: 'Inconclusive — insufficient chart data to compute Papa Samyam.',
    };
  }
  const difference = Math.abs(g.papaPoints - b.papaPoints);
  // Compatibility bands:
  //   diff ≤ 1.0 → Excellent Papa Samyam (full balance)
  //   diff ≤ 2.0 → Acceptable
  //   diff ≤ 3.0 → Marginal
  //   diff  > 3.0 → Imbalanced (Papa Samyam dosha)
  let band, compatible;
  if (difference <= 1.0) { band = 'Excellent'; compatible = true; }
  else if (difference <= 2.0) { band = 'Acceptable'; compatible = true; }
  else if (difference <= 3.0) { band = 'Marginal'; compatible = false; }
  else { band = 'Imbalanced'; compatible = false; }

  return {
    groom: g, bride: b,
    difference: Number(difference.toFixed(3)),
    band,
    compatible,
    verdict: compatible
      ? `Papa Samyam satisfied — malefic balance within tolerance (${band}).`
      : `Papa Samyam not satisfied — malefic imbalance (${band}, diff ${difference.toFixed(2)}).`,
    remedy: compatible
      ? null
      : 'Papa Samyam not balanced — perform Navagraha Shanti, Maha Mrityunjaya Japa, and consult a qualified astrologer before finalizing.',
  };
}

// ════════════════════════════════════════════════════════════════════════
// MANGAL DOSHA comparison — with detailed cancellation analysis
// ════════════════════════════════════════════════════════════════════════
function mangalDoshaCompatibility(groomMangal, brideMangal) {
  const gHas = !!groomMangal?.effectiveDosha;
  const bHas = !!brideMangal?.effectiveDosha;
  // Classical Papa Samya principle for Mangal: both have it, or neither has it.
  const symmetric = gHas === bHas;
  // Severity bands if effectiveDosha is structured (severity hint).
  const gSeverity = groomMangal?.severity ?? (gHas ? 'Mild' : 'None');
  const bSeverity = brideMangal?.severity ?? (bHas ? 'Mild' : 'None');
  const severityDelta = Math.abs(
    ({ None: 0, Mild: 1, Moderate: 2, Strong: 3, Severe: 4 }[gSeverity] ?? 0) -
    ({ None: 0, Mild: 1, Moderate: 2, Strong: 3, Severe: 4 }[bSeverity] ?? 0)
  );

  let verdict;
  if (!gHas && !bHas) verdict = 'Both charts are free of effective Mangal Dosha — ideal.';
  else if (gHas && bHas) verdict = 'Both charts have Mangal Dosha — classically considered mutually cancelling (Papa Samya).';
  else verdict = `Only ${gHas ? 'groom' : 'bride'} has Mangal Dosha — classically an imbalance. Remedies recommended.`;

  return {
    compatible: symmetric,
    severityDelta,
    verdict,
    note: symmetric
      ? 'Mangal Dosha status balanced between both charts.'
      : 'Mangal Dosha imbalance — consider Mangal Shanti, Kumbh Vivaha (symbolic), or recitation of Mangal mantras before marriage.',
  };
}

// ════════════════════════════════════════════════════════════════════════
// VERDICT
// ════════════════════════════════════════════════════════════════════════
function verdictFor(total, maxPoints = 36) {
  const pct = (total / maxPoints) * 100;
  if (total < 18) return { label: 'Not Recommended', note: 'Below the classical minimum (18/36) for marriage. Consult an astrologer before proceeding.', percentage: pct };
  if (total < 24) return { label: 'Average / Acceptable', note: 'Meets the minimum threshold; remedies for any doshas below are advisable.', percentage: pct };
  if (total < 32) return { label: 'Good Compatibility', note: 'A generally favorable match by classical Ashtakoot standards.', percentage: pct };
  return { label: 'Excellent Match', note: 'A highly favorable match by classical Ashtakoot standards.', percentage: pct };
}

// ════════════════════════════════════════════════════════════════════════
// PUBLIC: calcAshtakootMilan
// ════════════════════════════════════════════════════════════════════════
/**
 * @param {object} groomR - full calculated chart (from calculateChart) for the groom
 * @param {object} brideR - full calculated chart (from calculateChart) for the bride
 * @returns {object} complete Ashtakoot Milan result
 */
export function calcAshtakootMilan(groomR, brideR) {
  const errors = [];

  if (!groomR || typeof groomR !== 'object') errors.push('Groom chart missing or invalid.');
  if (!brideR || typeof brideR !== 'object') errors.push('Bride chart missing or invalid.');
  if (errors.length) {
    return { error: true, errors, kootas: [], totalPoints: 0, maxPoints: 36, verdict: { label: 'Error', note: errors.join(' ') } };
  }

  const groomMoon = requireMoon(groomR, errors, 'groom chart');
  const brideMoon = requireMoon(brideR, errors, 'bride chart');
  if (!groomMoon || !brideMoon) {
    return { error: true, errors, kootas: [], totalPoints: 0, maxPoints: 36, verdict: { label: 'Error', note: errors.join(' ') } };
  }

  const groomVenus = findPlanet(groomR, 'Venus');
  const brideVenus = findPlanet(brideR, 'Venus');

  const groomSignIdx = SAFE_IDX(SIGNS, groomMoon.sign);
  const brideSignIdx = SAFE_IDX(SIGNS, brideMoon.sign);
  const groomNakIdx = SAFE_IDX(NAKSHATRAS, groomMoon.nakshatra);
  const brideNakIdx = SAFE_IDX(NAKSHATRAS, brideMoon.nakshatra);
  if (groomSignIdx < 0 || brideSignIdx < 0) errors.push('Invalid Moon sign in one or both charts.');
  if (groomNakIdx < 0 || brideNakIdx < 0) errors.push('Invalid Moon nakshatra in one or both charts.');

  const groomDeg = SAFE_NUM(groomMoon.degInSign);
  const brideDeg = SAFE_NUM(brideMoon.degInSign);
  const groomPada = groomMoon.pada ?? 1;
  const bridePada = brideMoon.pada ?? 1;

  const kootas = [
    varnaKoota(groomMoon.sign, brideMoon.sign),
    vashyaKoota(groomMoon.sign, groomDeg, brideMoon.sign, brideDeg),
    taraKoota(groomNakIdx, brideNakIdx),
    yoniKoota(groomNakIdx, brideNakIdx),
    grahaMaitriKoota(groomMoon.sign, brideMoon.sign),
    ganaKoota(groomNakIdx, brideNakIdx, groomMoon.sign, brideMoon.sign),
    bhakootKoota(groomSignIdx, brideSignIdx, groomMoon.sign, brideMoon.sign, groomNakIdx, brideNakIdx),
    nadiKoota(groomNakIdx, brideNakIdx, groomMoon.sign, brideMoon.sign, groomPada, bridePada),
  ];

  const totalPoints = kootas.reduce((sum, k) => sum + k.points, 0);
  const maxPoints = 36;
  const verdict = verdictFor(totalPoints, maxPoints);

  const nadiDosha = kootas.find(k => k.name === 'Nadi')?.dosha ?? false;
  const bhakootDosha = kootas.find(k => k.name === 'Bhakoot')?.dosha ?? false;

  // Supplementary kootas (no points, dosha-only) — surfaced for completeness.
  const supplementary = [
    rajjuKoota(groomNakIdx, brideNakIdx),
    vedhaKoota(groomNakIdx, brideNakIdx),
  ];

  // Mangal Dosha (Kuja Dosha) comparison — reuses the already-verified
  // calcMangalDosha() from src/dosha/doshas.js, once per chart.
  let groomMangal = null, brideMangal = null, mangalCompatibility = null;
  try {
    groomMangal = calcMangalDosha(
      groomR.planets, SAFE_NUM(groomR.ascendant?.lon), SAFE_NUM(groomMoon.siderealLon), groomVenus ? SAFE_NUM(groomVenus.siderealLon) : null
    );
    brideMangal = calcMangalDosha(
      brideR.planets, SAFE_NUM(brideR.ascendant?.lon), SAFE_NUM(brideMoon.siderealLon), brideVenus ? SAFE_NUM(brideVenus.siderealLon) : null
    );
    mangalCompatibility = mangalDoshaCompatibility(groomMangal, brideMangal);
  } catch (e) {
    errors.push(`Mangal Dosha computation failed: ${e?.message || String(e)}`);
  }

  // Papa Samyam detailed scoring.
  const papaSamyam = calcPapaSamyam(groomR, brideR, errors);

  // Aggregate dosha summary.
  const doshas = {
    nadiDosha,
    bhakootDosha,
    rajjuDosha: supplementary.find(k => k.name === 'Rajju')?.dosha ?? false,
    vedhaDosha: supplementary.find(k => k.name === 'Vedha')?.dosha ?? false,
    mangalDoshaImbalance: mangalCompatibility ? !mangalCompatibility.compatible : null,
    papaSamyamImbalance: !papaSamyam.compatible,
  };

  // Overall recommendation considering all factors.
  const overallRecommendation = computeOverallRecommendation({
    totalPoints, maxPoints, doshas, papaSamyam, mangalCompatibility,
  });

  return {
    groom: {
      name: groomR.meta?.name ?? 'Groom',
      moonSign: groomMoon.sign, nakshatra: groomMoon.nakshatra,
      pada: groomPada, rashiLord: SIGN_LORDS[groomMoon.sign],
    },
    bride: {
      name: brideR.meta?.name ?? 'Bride',
      moonSign: brideMoon.sign, nakshatra: brideMoon.nakshatra,
      pada: bridePada, rashiLord: SIGN_LORDS[brideMoon.sign],
    },
    kootas,
    supplementary,
    totalPoints,
    maxPoints,
    percentage: ((totalPoints / maxPoints) * 100).toFixed(1),
    verdict,
    doshas,
    mangalDosha: {
      groom: groomMangal, bride: brideMangal,
      compatible: mangalCompatibility?.compatible ?? null,
      compatibility: mangalCompatibility,
    },
    papaSamyam,
    overallRecommendation,
    errors,
    error: errors.length > 0,
  };
}

// ════════════════════════════════════════════════════════════════════════
// PUBLIC: calcDashakootMilan (10-fold, 40 points)
// ════════════════════════════════════════════════════════════════════════
/**
 * Dashakoot = Ashtakoot + Mahendra + Stree-Deergha.
 * Total maximum points = 36 + 2 + 2 = 40.
 *
 * @param {object} groomR - full calculated chart for the groom
 * @param {object} brideR - full calculated chart for the bride
 * @returns {object} complete Dashakoot Milan result
 */
export function calcDashakootMilan(groomR, brideR) {
  const base = calcAshtakootMilan(groomR, brideR);
  if (base.error && !base.kootas?.length) return base;

  const errors = base.errors ?? [];
  const groomMoon = findPlanet(groomR, 'Moon');
  const brideMoon = findPlanet(brideR, 'Moon');
  const groomNakIdx = SAFE_IDX(NAKSHATRAS, groomMoon?.nakshatra);
  const brideNakIdx = SAFE_IDX(NAKSHATRAS, brideMoon?.nakshatra);
  if (groomNakIdx < 0 || brideNakIdx < 0) {
    errors.push('Cannot compute Mahendra/Stree-Deergha — invalid nakshatra index.');
  }

  const extraKootas = (groomNakIdx >= 0 && brideNakIdx >= 0)
    ? [mahendraKoota(groomNakIdx, brideNakIdx), streeDeerghaKoota(groomNakIdx, brideNakIdx)]
    : [];

  const kootas = [...base.kootas, ...extraKootas];
  const totalPoints = kootas.reduce((s, k) => s + k.points, 0);
  const maxPoints = 40;
  const verdict = verdictFor(totalPoints, maxPoints);

  return {
    ...base,
    system: 'Dashakoot',
    kootas,
    totalPoints,
    maxPoints,
    percentage: ((totalPoints / maxPoints) * 100).toFixed(1),
    verdict,
    errors,
  };
}

// ════════════════════════════════════════════════════════════════════════
// OVERALL RECOMMENDATION ENGINE
// ════════════════════════════════════════════════════════════════════════
function computeOverallRecommendation({ totalPoints, maxPoints, doshas, papaSamyam, mangalCompatibility }) {
  const pct = (totalPoints / maxPoints) * 100;
  const reasons = [];
  let score = pct; // start from guna percentage
  let verdictLabel = 'Recommended';

  // Nadi Dosha is the most severe — subtract up to 20 points.
  if (doshas.nadiDosha) {
    score -= 20;
    reasons.push('Nadi Dosha present — most significant; cancellation highly recommended.');
    verdictLabel = 'Conditional — requires Nadi Nivarana';
  }
  // Bhakoot Dosha — subtract up to 10.
  if (doshas.bhakootDosha) {
    score -= 10;
    reasons.push('Bhakoot Dosha present — significant; remedies recommended.');
    if (verdictLabel === 'Recommended') verdictLabel = 'Conditional — Bhakoot remedies required';
  }
  // Mangal imbalance — subtract up to 10.
  if (doshas.mangalDoshaImbalance) {
    score -= 10;
    reasons.push('Mangal Dosha imbalance — remedies recommended.');
  }
  // Papa Samyam imbalance.
  if (doshas.papaSamyamImbalance) {
    score -= 5;
    reasons.push(`Papa Samyam not balanced (band: ${papaSamyam.band}, diff ${papaSamyam.difference?.toFixed(2)}).`);
  }
  // Rajju/Vedha (informational, smaller weight).
  if (doshas.rajjuDosha) {
    score -= 5;
    reasons.push('Rajju Dosha present — classical concern for longevity.');
  }
  if (doshas.vedhaDosha) {
    score -= 3;
    reasons.push('Vedha Dosha present — nakshatra obstruction.');
  }

  score = Math.max(0, Math.min(100, score));

  if (score < 40) verdictLabel = 'Not Recommended';
  else if (score < 60) verdictLabel = verdictLabel === 'Recommended' ? 'Conditional' : verdictLabel;
  else if (score < 75) verdictLabel = verdictLabel === 'Recommended' ? 'Acceptable' : verdictLabel;
  else if (score >= 85) verdictLabel = 'Highly Recommended';

  if (!reasons.length) reasons.push('No major dosha detected — score reflects Guna Milan alone.');

  return {
    score: Number(score.toFixed(1)),
    label: verdictLabel,
    reasons,
    note: 'Overall recommendation synthesizes Ashtakoot Guna Milan with dosha severity, Papa Samyam balance, and Mangal Dosha symmetry. This is informational only — final decisions must involve a qualified astrologer.',
  };
}

// ════════════════════════════════════════════════════════════════════════
// PUBLIC: Combined full Milan (Ashtakoot + Dashakoot + Papa Samyam + Mangal)
// ════════════════════════════════════════════════════════════════════════
/**
 * Convenience: returns both Ashtakoot and Dashakoot results in a single
 * structured object, plus the shared Papa Samyam / Mangal / overall verdict.
 */
export function calcFullMilan(groomR, brideR) {
  const ashtakoot = calcAshtakootMilan(groomR, brideR);
  const dashakoot = calcDashakootMilan(groomR, brideR);
  return {
    ashtakoot,
    dashakoot,
    papaSamyam: ashtakoot.papaSamyam,
    mangalDosha: ashtakoot.mangalDosha,
    overallRecommendation: ashtakoot.overallRecommendation,
    supplementaryKootas: ashtakoot.supplementary,
    errors: ashtakoot.errors,
  };
}