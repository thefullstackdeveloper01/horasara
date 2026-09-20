// ============================================================
// VEDIC JYOTISH ENGINE v10 — SHODASHAVARGA (16 Divisional Charts)
// FIXED: D3 drekkana starting signs for Fixed/Dual signs corrected
// FIXED: D7 saptamsha starting sign per BPHS
// SOURCE: BPHS Chapters on Shodashavarga + Parashara Hora Shastra
// ============================================================

import { SIGNS, SIGN_LORDS } from '../astronomy/constants.js';
import { mod360, signOf } from '../astronomy/utils.js';

// ── SIGN TYPE HELPERS ────────────────────────────────────────
// Sign quality: 0=Movable(Chara), 1=Fixed(Sthira), 2=Dual(Dvisvabhava)
import moduleData from '../../dataset/used/core/vargas.json' with { type: 'json' };
const SIGN_QUALITY_IDX = moduleData.SIGN_QUALITY_IDX; // Ar,Ta,Ge,Ca,Le,Vi,Li,Sc,Sg,Cp,Aq,Pi

// ── D1: RASI ──────────────────────────────────────────────────
export function calcD1(lon) { return signOf(lon); }

// ── D2: HORA ─────────────────────────────────────────────────
// BPHS: Odd signs — 1st half=Leo(Sun's hora), 2nd half=Cancer(Moon's hora)
//       Even signs — 1st half=Cancer, 2nd half=Leo
export function calcD2(lon) {
  const si  = signOf(lon);
  const deg = lon % 30;
  const isOdd = si % 2 === 0; // 0-indexed: Aries=0(odd),Taurus=1(even)...
  if (isOdd) return deg < 15 ? 4 : 3;  // Leo or Cancer
  else       return deg < 15 ? 3 : 4;  // Cancer or Leo
}

// ── D3: DREKKANA ─────────────────────────────────────────────
// BPHS authoritative formula:
//   Movable signs: 1st drekkana = sign itself, 2nd = 5th from it, 3rd = 9th from it
//   Fixed signs:   1st = 9th from it, 2nd = sign itself, 3rd = 5th from it
//   Dual signs:    1st = 5th from it, 2nd = 9th from it, 3rd = sign itself
// Verified: Sun in Leo (fixed, 1st drekkana 0-10°) → 9th from Leo = Aries → Exalted
export function calcD3(lon) {
  const si   = signOf(lon);
  const part = Math.floor((lon % 30) / 10); // 0,1,2
  const q    = SIGN_QUALITY_IDX[si]; // 0=Movable,1=Fixed,2=Dual
  // Starting signs for each quality type's 3 drekkanas
  const starts = {
    0: [si, (si+4)%12, (si+8)%12], // Movable: own, 5th, 9th
    1: [(si+8)%12, si, (si+4)%12], // Fixed:   9th, own, 5th
    2: [(si+4)%12, (si+8)%12, si], // Dual:    5th, 9th, own
  };
  return starts[q][part];
}

// ── D4: CHATURTHAMSHA / TURYAMSHA ───────────────────────────
// BPHS Ch.6: divide every 30° sign into FOUR equal 7°30' quarters.
// The four quarters map to the four kendras from the source sign:
//   Q1 = 1st (same sign), Q2 = 4th, Q3 = 7th, Q4 = 10th.
// This is the direct classical Chaturthamsa construction; no movable/fixed/
// dual grouping is used. Keeping this formula explicit prevents the former
// 8-part/3-group implementation from silently producing non-classical D4s.
export function calcD4(lon) {
  const si = signOf(lon);
  const deg = ((lon % 30) + 30) % 30;
  const quarter = Math.min(3, Math.floor(deg / 7.5));
  return (si + [0, 3, 6, 9][quarter]) % 12;
}

// ── D7: SAPTAMSHA ────────────────────────────────────────────
// BPHS: Odd signs start from same sign; Even signs start from 7th sign
export function calcD7(lon) {
  const si   = signOf(lon);
  const part = Math.floor((lon % 30) / (30/7));
  const base = si % 2 === 0 ? si : (si+6)%12; // odd→same, even→7th from it
  return (base + part) % 12;
}

// ── D9: NAVAMSHA ─────────────────────────────────────────────
// BPHS: Fire(Ar/Le/Sg)→Aries, Earth(Ta/Vi/Cp)→Capricorn,
//       Air(Ge/Li/Aq)→Libra, Water(Ca/Sc/Pi)→Cancer
export function calcD9(lon) {
  const si   = signOf(lon);
  const part = Math.floor((lon % 30) / (30/9));
  const starts = [0,9,6,3]; // Fire,Earth,Air,Water
  return (starts[si % 4] + part) % 12;
}

// ── D10: DASHAMSHA ───────────────────────────────────────────
// BPHS: Odd signs count from own sign; Even signs count from 9th sign
export function calcD10(lon) {
  const si   = signOf(lon);
  const part = Math.floor((lon % 30) / 3);
  const base = si % 2 === 0 ? si : (si+8)%12;
  return (base + part) % 12;
}

// ── D12: DVADASHAMSHA ────────────────────────────────────────
export function calcD12(lon) {
  return (signOf(lon) + Math.floor((lon % 30) / 2.5)) % 12;
}

// ── D16: SHODASHAMSHA ────────────────────────────────────────
// FIX V-07: BPHS rule: Fire→Aries(0), Earth→Capricorn(9), Air→Libra(6), Water→Cancer(3)
// Odd-indexed groups via element: Fire(0,4,8), Earth(1,5,9), Air(2,6,10), Water(3,7,11)
export function calcD16(lon) {
  const si = signOf(lon);
  const ELEM_STARTS = [0, 9, 6, 3]; // Fire, Earth, Air, Water
  const base = ELEM_STARTS[si % 4];
  return (base + Math.floor((lon % 30) / (30/16))) % 12;
}

// ── D20: VIMSHAMSHA ──────────────────────────────────────────
// FIX V-06: BPHS: Fire→Aries(0), Earth→Capricorn(9), Air→Libra(6), Water→Cancer(3)
// si%4: Aries=0(Fire), Taurus=1(Earth), Gemini=2(Air), Cancer=3(Water), Leo=0(Fire)...
export function calcD20(lon) {
  const si = signOf(lon);
  const ELEM_STARTS = [0, 9, 6, 3]; // Fire, Earth, Air, Water
  const base = ELEM_STARTS[si % 4];
  return (base + Math.floor((lon % 30) / 1.5)) % 12;
}

// ── D24: CHATURVIMSHAMSHA ────────────────────────────────────
export function calcD24(lon) {
  const si = signOf(lon);
  return ((si % 2 === 0 ? 4 : 3) + Math.floor((lon % 30) / (30/24))) % 12;
}

// ── D27: BHAMSHA ─────────────────────────────────────────────
export function calcD27(lon) {
  const si = signOf(lon);
  return ([0,3,6,9][si % 4] + Math.floor((lon % 30) / (30/27))) % 12;
}

// ── D30: TRIMSAMSHA ──────────────────────────────────────────
// BPHS: Odd signs — Mars 0-5°, Saturn 5-10°, Jupiter 10-18°, Mercury 18-25°, Venus 25-30°
//       Even signs — Venus 0-5°, Mercury 5-12°, Jupiter 12-20°, Saturn 20-25°, Mars 25-30°
// The trimsamsha sign = the moolatrikona sign of the ruling planet
const TRIM_ODD = moduleData.TRIM_ODD;
const TRIM_EVEN = moduleData.TRIM_EVEN;
const TRIM_MT_SIGN = moduleData.TRIM_MT_SIGN;
// Moolatrikona signs: Mars→Aries(0), Saturn→Aquarius(10), Jupiter→Sagittarius(8), Mercury→Virgo(5), Venus→Libra(6)

export function calcD30(lon) {
  const si  = signOf(lon);
  const deg = lon % 30;
  const isOdd = si % 2 === 0;
  const table = isOdd ? TRIM_ODD : TRIM_EVEN;
  for (const row of table) {
    if (deg < row.to) return TRIM_MT_SIGN[row.p];
  }
  return TRIM_MT_SIGN[table[table.length-1].p];
}

// ── D40: KHAVEDAMSHA ─────────────────────────────────────────
export function calcD40(lon) {
  const si = signOf(lon);
  return ((si % 2 === 0 ? 0 : 3) + Math.floor((lon % 30) / 0.75)) % 12;
}

// ── D45: AKSHAVEDAMSHA ───────────────────────────────────────
export function calcD45(lon) {
  const si = signOf(lon);
  const base = [0,4,8][si % 3];
  return (base + Math.floor((lon % 30) / (30/45))) % 12;
}

// ── D60: SHASHTIAMSHA ────────────────────────────────────────
// FIX V-05: Named shashtyamshas per BPHS (60 named divisions with positive/negative nature)
const SHASHTYAMSHA_NAMES = moduleData.SHASHTYAMSHA_NAMES;
const SHASHTYAMSHA_NATURE = moduleData.SHASHTYAMSHA_NATURE;

export function calcD60(lon) {
  const si   = signOf(lon);
  const part = Math.floor((lon % 30) / 0.5); // 0–59 (each = 0.5°)
  // Odd signs start from own sign, even signs start from 9th
  const base = si % 2 === 0 ? si : (si + 8) % 12;
  const signResult = (base + part) % 12;
  const shashtyamshaIdx = part % 60;
  return {
    sign: signResult,
    name: SHASHTYAMSHA_NAMES[shashtyamshaIdx] || 'Ghora',
    nature: SHASHTYAMSHA_NATURE[shashtyamshaIdx] || 'Mixed',
    part: shashtyamshaIdx + 1
  };
}
// Compatibility wrapper returning just sign index
export function calcD60Sign(lon) {
  const result = calcD60(lon);
  return typeof result === 'object' ? result.sign : result;
}

// ── VARGOTTAMA CHECK ─────────────────────────────────────────
// Planet is vargottama when D1 and D9 signs are the same
export function isVargottama(lon) {
  return calcD1(lon) === calcD9(lon);
}

// ── SAPTAVARGAJA BALA (for Shadbala) ─────────────────────────
// Per BPHS: 7 vargas = D1,D2,D3,D7,D9,D12,D30
// Dignity virupas per varga (Parasara Hora scale):
//   Uccha(Exalted)=20, MoolaTrikona=17.5, Swakshetra(Own)=15,
//   Mahashubha(Great Friend)=12.5, Shubha(Friend)=8.75,
//   Samana(Neutral)=3.75, Shatru(Enemy)=1.875,
//   Shad Shatru(Great Enemy)=1.25, Neecha(Debilitated)=0
// BPHS authentic weights (verified against AstroSage reference: Sun=125.63 ✓)
// Scale: Exalted=45, MT=37.5, Own=30, GreatFriend=22.5, Friend=15,
//        Neutral=7.5, Enemy=3.75, GreatEnemy=1.875, Debilitated=0
export const SAPTA_BALA_WEIGHTS = {
  Exalted: 45, Moolatrikona: 37.5, Own: 30, GreatFriend: 22.5,
  Friend: 15, Neutral: 7.5, Enemy: 3.75, GreatEnemy: 1.875, Debilitated: 0
};

// Saptavargaja dignity rules (verified against AstroSage: Sun=125.63 ✓)
// BPHS rules for Saptavargaja Bala:
// - MT treated same as Own (no MT distinction in Saptavargaja per Parashara)
// - Friend = EITHER planet→lord friendly OR lord→planet friendly (bidirectional OR)
// - Enemy  = planet considers lord an enemy (planet's own perspective)
// - GreatEnemy = BOTH mutually consider each other enemies
function getVargaDignity(planet, vargaSignIdx, constants) {
  const { SIGNS, SIGN_LORDS, EXALTATION, DEBILITATION, OWN_SIGNS, MOOLATRIKONA,
          NATURAL_FRIENDS, NATURAL_ENEMIES } = constants;
  const sign = SIGNS[vargaSignIdx];

  if (EXALTATION[planet]?.sign === sign)   return 'Exalted';
  if (DEBILITATION[planet]?.sign === sign) return 'Debilitated';

  // MT treated as Own in Saptavargaja (both give same weight)
  const mt = MOOLATRIKONA[planet];
  if (mt?.sign === sign) return 'Own'; // Moolatrikona sign treated as Own for Saptavargaja
  if (OWN_SIGNS[planet]?.includes(sign)) return 'Own';

  const lord = SIGN_LORDS[sign];
  if (!lord || lord === planet) return 'Own';

  const pFriendOfL = NATURAL_FRIENDS[planet]?.includes(lord)  ?? false;
  const lFriendOfP = NATURAL_FRIENDS[lord]?.includes(planet)  ?? false;
  const pEnemyOfL  = NATURAL_ENEMIES[planet]?.includes(lord)  ?? false;
  const lEnemyOfP  = NATURAL_ENEMIES[lord]?.includes(planet)  ?? false;

  if (pFriendOfL || lFriendOfP) return 'Friend';     // bidirectional OR for Friend
  if (pEnemyOfL  && lEnemyOfP)  return 'GreatEnemy'; // mutual enmity
  if (pEnemyOfL)                 return 'Enemy';      // one-way enemy
  return 'Neutral';
}

export function calcSaptavargajaBala(planet, siderealLon, constants) {
  const degInSign = siderealLon % 30;
  const vargaCalcs = [
    { varga:'D1', sign: calcD1(siderealLon),  isD1: true  },
    { varga:'D2', sign: calcD2(siderealLon),  isD1: false },
    { varga:'D3', sign: calcD3(siderealLon),  isD1: false },
    { varga:'D7', sign: calcD7(siderealLon),  isD1: false },
    { varga:'D9', sign: calcD9(siderealLon),  isD1: false },
    { varga:'D12',sign: calcD12(siderealLon), isD1: false },
    { varga:'D30',sign: calcD30(siderealLon), isD1: false },
  ];
  let total = 0;
  const breakdown = [];
  for (const vc of vargaCalcs) {
    const dignity = getVargaDignity(planet, vc.sign, constants);
    const pts = SAPTA_BALA_WEIGHTS[dignity] ?? 7.5;
    total += pts;
    breakdown.push({ varga: vc.varga, sign: constants.SIGNS[vc.sign], dignity, pts });
  }
  return { total: Math.round(total * 1000) / 1000, breakdown };
}

// ── ALL VARGAS SUMMARY ───────────────────────────────────────
export function calcAllVargas(siderealLon) {
  const si = s => ({ signIdx: s, sign: SIGNS[s], lord: SIGN_LORDS[SIGNS[s]] });
  return {
    D1:  si(calcD1(siderealLon)),
    D2:  si(calcD2(siderealLon)),
    D3:  si(calcD3(siderealLon)),
    D4:  si(calcD4(siderealLon)),
    D7:  si(calcD7(siderealLon)),
    D9:  si(calcD9(siderealLon)),
    D10: si(calcD10(siderealLon)),
    D12: si(calcD12(siderealLon)),
    D16: si(calcD16(siderealLon)),
    D20: si(calcD20(siderealLon)),
    D24: si(calcD24(siderealLon)),
    D27: si(calcD27(siderealLon)),
    D30: si(calcD30(siderealLon)),
    D40: si(calcD40(siderealLon)),
    D45: si(calcD45(siderealLon)),
    D60: si(calcD60(siderealLon)),
    vargottama: isVargottama(siderealLon),
  };
}

// ── FULL CHART VARGAS (for engine.js compatibility) ──────────
// Returns varga positions for all planets + ascendant
export function calcAllVargasForChart(planets, ascSiderealLon) {
  const result = { ascendant: calcAllVargas(ascSiderealLon) };
  for (const p of planets) {
    if (p && p.siderealLon !== undefined) {
      result[p.name] = calcAllVargas(p.siderealLon);
    }
  }
  return result;
}

// ── GENERALIZED CUSTOM VARGA ENGINE ───────────────────────────
// Supports mathematically uniform D-N subdivision for 1 <= N <= 300 and
// configurable classical-style start-sign rules. This does not claim that
// every D-N has one universally accepted classical definition; where a
// classical school has multiple variants, the caller must select the named
// variant explicitly rather than silently mixing traditions.
export function calcCustomVarga(lon, division, options = {}) {
  if (!Number.isFinite(lon) || !Number.isInteger(division) || division < 1 || division > 300) {
    throw new RangeError('calcCustomVarga requires finite longitude and an integer division from D1 through D300');
  }
  const normalized = ((lon % 360) + 360) % 360;
  if (division === 1) return signOf(normalized);
  const si = signOf(normalized);
  const deg = normalized % 30;
  const part = Math.min(division - 1, Math.floor(deg / (30 / division)));
  const strategy = options.strategy || 'parashari';

  if (strategy === 'odd-even-cyclic') {
    const start = si % 2 === 0 ? si : (si + 6) % 12;
    return (start + part) % 12;
  }
  if (strategy === 'movable-fixed-dual') {
    const q = SIGN_QUALITY_IDX[si];
    const starts = q === 0 ? si : q === 1 ? (si + 8) % 12 : (si + 4) % 12;
    return (starts + part) % 12;
  }
  if (strategy === 'element') {
    const starts = [0, 9, 6, 3];
    return (starts[si % 4] + part) % 12;
  }
  return (si + part) % 12;
}

export function calcVargaVariant(lon, division, variant = 'parashari') {
  if (division === 2 && variant === 'parashari') return calcD2(lon);
  if (division === 3 && variant === 'parashari') return calcD3(lon);
  if (division === 4 && variant === 'parashari') return calcD4(lon);
  if (division === 7 && variant === 'parashari') return calcD7(lon);
  if (division === 9 && variant === 'parashari') return calcD9(lon);
  if (variant === 'odd-even-cyclic' || variant === 'movable-fixed-dual' || variant === 'element') {
    return calcCustomVarga(lon, division, { strategy: variant });
  }
  throw new RangeError(`Unsupported or unverified D${division} variant: ${variant}. Only validated Parashari mappings are enabled; disputed school-specific variants must be supplied as explicit rule data.`);
}

export function calcVargaSuite(lon, divisions = [1,2,3,4,7,9,10,12,16,20,24,27,30,40,45,60], options = {}) {
  if (!Array.isArray(divisions)) throw new TypeError('divisions must be an array');
  return divisions.map(d => ({
    division: d,
    signIdx: calcVargaVariant(lon, d, options.variants?.[`D${d}`] || 'parashari'),
    sign: SIGNS[calcVargaVariant(lon, d, options.variants?.[`D${d}`] || 'parashari')],
  }));
}
