// ============================================================
// VEDIC JYOTISH ENGINE v12 — UPAGRAHAS (Sub-Planets)
// Implements: Gulika, Mandi, Dhuma, Vyatipata, Parivesha,
//             Indrachapa, Upaketu, Kala, Mrityu, Ardhaprahara,
//             Yamaghantaka, Gulika (day/night variants)
//
// Source: BPHS Ch.9 Upagraha Sphuta; Sarvartha Chintamani
// ============================================================

import { mod360, signOf } from '../astronomy/utils.js';

import moduleData from '../../dataset/used/core/upagrahas.json' with { type: 'json' };
const PLANET_ORDER_WEEKDAY = moduleData.PLANET_ORDER_WEEKDAY;

// ── DAY/NIGHT DIVISION ────────────────────────────────────────
// Each day is divided into 8 parts (hora), each 1.5 hora = 1/8 of day
// The weekday starts from the ruler of that weekday
// Parts belong to: Sun,Venus,Mercury,Moon,Saturn,Jupiter,Mars (7 + 1 leftover)

function getWeekdayIdx(jd) {
  // JD 0 = Monday, offset to Sun=0
  return Math.floor(jd + 1.5) % 7; // 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
}

// BPHS formula for Gulika, Mandi, and other Upagrahas
// Based on dividing day into 8 equal parts from sunrise
// Each sub-planet occupies a specific part of the day
// Part assignments depend on weekday ruler sequence

const WEEKDAY_RULERS = moduleData.WEEKDAY_RULERS;

// Gulika: 8th part of night belongs to Saturn's segment
// Different formula for day birth vs night birth

/**
 * Calculate Upagraha positions
 * @param {number} jd - Julian Day of birth (UT)
 * @param {number} sunriseJD - JD of sunrise
 * @param {number} sunsetJD - JD of sunset
 * @param {number} lat - latitude
 * @param {number} lon - longitude
 * @param {number} ayanamsa - ayanamsa degrees
 * @returns {Object} upagraha longitudes
 */
export function calcUpagrahas(jd, sunriseJD, sunsetJD, lat, lon, ayanamsa) {
  const dayDuration  = sunsetJD  - sunriseJD;
  const nightDuration = 1.0 - dayDuration; // approximate (next sunrise - sunset)

  const horaDay   = dayDuration / 8;   // 1/8 of day in JD
  const horaNight = nightDuration / 8; // 1/8 of night in JD

  // Weekday index 0=Sun through 6=Sat
  const wday = getWeekdayIdx(sunriseJD);

  // Determine if birth is during day or night
  const isDay = jd >= sunriseJD && jd < sunsetJD;

  // ── Part assignments (BPHS) ──────────────────────────────────
  // For each weekday, the 8 parts of the day are ruled in a specific sequence
  // starting from the ruler of that weekday, cycling through the 7-planet week order
  // Part 8 (the 8th) is the "dead" part — for Gulika specifically it falls in Saturn's slice

  // Gulika/Mandi calculation:
  // The 8 parts of the day start with the weekday's ruler and cycle
  // Gulika occupies the START of the part ruled by Saturn
  // Mandi = Gulika in South Indian system (same point)

  function ruleOfPart(partIdx) {
    return WEEKDAY_RULERS[(wday + partIdx) % 7];
  }

  // Find which part is ruled by Saturn
  function findSaturnPart() {
    for (let i = 0; i < 8; i++) {
      if (ruleOfPart(i) === 'Saturn') return i;
    }
    return 6; // fallback (Saturn is 6th planet)
  }

  const saturnPart = findSaturnPart();

  // Gulika starts at beginning of Saturn's part
  let gulikaJD;
  if (isDay) {
    gulikaJD = sunriseJD + saturnPart * horaDay;
  } else {
    // Night: cycle starts from 5th part sequence (BPHS night sequence offset)
    const nightWday = (wday + 4) % 7; // night ruler offset
    let satPartNight = 0;
    for (let i = 0; i < 8; i++) {
      if (WEEKDAY_RULERS[(nightWday + i) % 7] === 'Saturn') { satPartNight = i; break; }
    }
    gulikaJD = sunsetJD + satPartNight * horaNight;
  }

  // Convert Gulika JD to longitude using RAMC
  function jdToLagna(gjd) {
    // Compute LST at that moment, get ascendant
    const T = (gjd - 2451545.0) / 36525.0;
    const GMST = mod360(280.46061837 + 360.98564736629*(gjd-2451545.0) + 0.000387933*T*T);
    const LST = mod360(GMST + lon);
    const eps = 23.4392911 - 0.0130042*T;
    // Ascendant from LST
    const y = -Math.cos(LST * Math.PI/180);
    const x = Math.sin(LST * Math.PI/180)*Math.cos(eps * Math.PI/180) + Math.tan(lat * Math.PI/180)*Math.sin(eps * Math.PI/180);
    let asc = Math.atan2(y, x) * 180/Math.PI;
    if (asc < 0) asc += 360;
    return mod360(asc - ayanamsa);
  }

  const gulikaLon = jdToLagna(gulikaJD);

  // Mandi = same as Gulika in most traditions (BPHS equates them)
  const mandiLon = gulikaLon;

  // ── DHUMA (Smoke) ─────────────────────────────────────────────
  // Dhuma = Sun + 133°20' (4 signs + 13°20')
  // Source: BPHS, Jataka Parijata
  function getDhuma(sunLon) {
    return mod360(sunLon + 133.333333);
  }

  // ── VYATIPATA ─────────────────────────────────────────────────
  // Vyatipata = 360° - Dhuma
  function getVyatipata(dhumaLon) {
    return mod360(360 - dhumaLon);
  }

  // ── PARIVESHA (Halo) ──────────────────────────────────────────
  // Parivesha = Vyatipata + 180°
  function getParivesha(vyatipataLon) {
    return mod360(vyatipataLon + 180);
  }

  // ── INDRACHAPA (Bow of Indra) ─────────────────────────────────
  // Indrachapa = 360° - Parivesha = Dhuma + 180°
  function getIndrachapa(pariLon) {
    return mod360(360 - pariLon);
  }

  // ── UPAKETU ───────────────────────────────────────────────────
  // Upaketu = Indrachapa + 16°40' (16.6667°)
  function getUpaketu(indrachapa) {
    return mod360(indrachapa + 16.6667);
  }

  // ── KALA ──────────────────────────────────────────────────────
  // Kala (Time) = Sun's hora lord's position calculated from hora start
  // Simplified: Kala = (Sun longitude * 8 / 30) mod 360 + some offset
  // BPHS: Each planet rules its "Kala" in the 8-division system
  // Standard formula: Kala = Sun + 180° (varies by text; using common version)
  function getKala(sunLon) {
    return mod360(sunLon + 180);
  }

  // ── MRITYU (Death) ────────────────────────────────────────────
  // Mrityu = Moon + 198° (6 signs + 18°)
  // Source: Jataka Parijata
  function getMrityu(moonLon) {
    return mod360(moonLon + 198);
  }

  // ── ARDHAPRAHARA ─────────────────────────────────────────────
  // Ardhaprahara = Sun + 165° (5 signs + 15°)
  function getArdhaprahara(sunLon) {
    return mod360(sunLon + 165);
  }

  // ── YAMAGHANTAKA ─────────────────────────────────────────────
  // Yamaghantaka = Moon + 228° (7 signs + 18°) 
  function getYamaghantaka(moonLon) {
    return mod360(moonLon + 228);
  }

  return {
    gulika: gulikaLon,
    mandi:  mandiLon,   // same as gulika
    // dhuma/vyatipata require sun position — set by engine
    _needsSun: true,
    _needsMoon: true,
  };
}

// ── POST-CALC: attach sun/moon dependent upagrahas ────────────
export function finalizeUpagrahas(base, sunLon, moonLon) {
  const dhuma       = mod360(sunLon + 133.333333);
  const vyatipata   = mod360(360 - dhuma);
  const parivesha   = mod360(vyatipata + 180);
  const indrachapa  = mod360(360 - parivesha);
  const upaketu     = mod360(indrachapa + 16.6667);
  const kala        = mod360(sunLon + 180);
  const mrityu      = mod360(moonLon + 198);
  const ardhaprahara = mod360(sunLon + 165);
  const yamaghantaka = mod360(moonLon + 228);

  return {
    gulika:        { lon: base.gulika,    sign: signOf(base.gulika),    source: 'BPHS Saturn-part' },
    mandi:         { lon: base.mandi,     sign: signOf(base.mandi),     source: 'Same as Gulika (S.Indian)' },
    dhuma:         { lon: dhuma,          sign: signOf(dhuma),          source: 'Sun + 133°20\'' },
    vyatipata:     { lon: vyatipata,      sign: signOf(vyatipata),      source: '360° - Dhuma' },
    parivesha:     { lon: parivesha,      sign: signOf(parivesha),      source: 'Vyatipata + 180°' },
    indrachapa:    { lon: indrachapa,     sign: signOf(indrachapa),     source: '360° - Parivesha' },
    upaketu:       { lon: upaketu,        sign: signOf(upaketu),        source: 'Indrachapa + 16°40\'' },
    kala:          { lon: kala,           sign: signOf(kala),           source: 'Sun + 180°' },
    mrityu:        { lon: mrityu,         sign: signOf(mrityu),         source: 'Moon + 198°' },
    ardhaprahara:  { lon: ardhaprahara,   sign: signOf(ardhaprahara),   source: 'Sun + 165°' },
    yamaghantaka:  { lon: yamaghantaka,   sign: signOf(yamaghantaka),   source: 'Moon + 228°' },
  };
}
