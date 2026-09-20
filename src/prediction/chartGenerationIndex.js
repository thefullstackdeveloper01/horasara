/**
 * CHART GENERATION INDEX
 * ========================
 * Section 7 spec: "Generate all supported charts dynamically... Support
 * chart rendering independently from interpretation."
 *
 * This module does not compute any new astronomy — every chart listed
 * here is already computed elsewhere in the engine (vargas.js, kp_system.js,
 * special_lagnas.js, houses.js, chalitTable.js, westernChart.js). What
 * this module adds is a single, render-agnostic INDEX: a flat list of
 * every chart this app supports, each with a stable id, a human label,
 * which zodiac/frame it uses (Vedic sidereal vs Western tropical — never
 * mixed), and a pointer to the raw data already sitting on the result
 * object — so a UI/report layer can loop over `listAvailableCharts(R)`
 * and render whichever charts it wants without needing to know the
 * engine's internal field names, and without that rendering step being
 * coupled to any interpretation logic.
 */

/**
 * @param {object} R - the calculated chart object from calculateChart()
 * @returns {Array<{id, label, category, zodiacFrame, dataPath, available}>}
 */
export function listAvailableCharts(R) {
  const charts = [];

  const push = (id, label, category, zodiacFrame, data) => {
    charts.push({ id, label, category, zodiacFrame, available: data !== undefined && data !== null && !data.error, data });
  };

  // ── D1 / Rashi Chart ────────────────────────────────────────────────
  push('D1', 'D1 — Rashi Chart (Birth Chart)', 'Core Vedic', 'Vedic (Sidereal)', { houses: R.houses, planets: R.planets, ascendant: R.ascendant });

  // ── Chalit Chart & Table ────────────────────────────────────────────
  push('CHALIT', 'Chalit Chart (real unequal-Bhava, Sripati system)', 'Core Vedic', 'Vedic (Sidereal)', R.chalitTable);
  push('CHALIT_SIMPLE', 'Chalit Shift Summary (Rashi→Bhava, simplified ±15°)', 'Core Vedic', 'Vedic (Sidereal)', R.bhavaChalit);

  // ── All configured Divisional (Varga) charts ────────────────────────
  const vargaLabels = {
    D1: 'D1 — Rashi (Self)', D2: 'D2 — Hora (Wealth)', D3: 'D3 — Drekkana (Siblings)',
    D4: 'D4 — Chaturthamsa (Fortune/Property)', D7: 'D7 — Saptamsa (Children)',
    D9: 'D9 — Navamsa (Spouse/Dharma)', D10: 'D10 — Dashamsa (Career)',
    D12: 'D12 — Dwadashamsa (Parents)', D16: 'D16 — Shodashamsa (Vehicles/Comforts)',
    D20: 'D20 — Vimshamsa (Spiritual Life)', D24: 'D24 — Chaturvimshamsa (Education)',
    D27: 'D27 — Bhamsa (Strengths/Weaknesses)', D30: 'D30 — Trimshamsa (Misfortunes)',
    D40: 'D40 — Khavedamsa (Maternal Legacy)', D45: 'D45 — Akshavedamsa (Paternal Legacy)',
    D60: 'D60 — Shashtiamsa (Past-Life Karma)',
  };
  for (const [k, label] of Object.entries(vargaLabels)) {
    push(k, label, 'Divisional (Varga)', 'Vedic (Sidereal)', R.vargas?.ascendant?.[k] ? R.vargas : null);
  }

  // ── KP Chart ─────────────────────────────────────────────────────────
  push('KP', 'KP Chart (Krishnamurti Paddhati — cusps, sub-lords, significators)', 'KP System', 'Vedic (Sidereal, Placidus cusps)', R.kpChart);

  // ── Jaimini charts ───────────────────────────────────────────────────
  push('JAIMINI_KARAKAS', 'Chara Karakas (Jaimini 7-planet soul-significator ranking)', 'Jaimini', 'Vedic (Sidereal)', R.vargaSignifications?.charaKarakas);
  push('JAIMINI_ARUDHAS', 'Arudha Padas — all 12 houses (Jaimini)', 'Jaimini', 'Vedic (Sidereal)', R.allArudhas);
  push('JAIMINI_KARAKAMSHA', 'Karakamsha Lagna (Jaimini)', 'Jaimini', 'Vedic (Sidereal)', R.vargaSignifications?.karakamshaLagna);
  push('JAIMINI_CHARA_DASHA', 'Chara Dasha (Jaimini sign-based Dasha)', 'Jaimini', 'Vedic (Sidereal)', R.dasha?.chara);
  push('SPECIAL_LAGNAS', 'Special Lagnas (Hora/Ghati/Bhava/Prana/Sree/Varnada/Indu Lagna)', 'Jaimini / Classical', 'Vedic (Sidereal)', R.specialLagnas);

  // ── Western charts ───────────────────────────────────────────────────
  push('WESTERN_TROPICAL', 'Western Tropical Chart (planets in tropical zodiac)', 'Western', 'Western (Tropical)', R.westernChart);
  push('WESTERN_HOUSES', 'Western House/Cusp Chart (Placidus, tropical)', 'Western', 'Western (Tropical)', R.westernChart ? { houseCusps: R.westernChart.houseCusps, ascendant: R.westernChart.ascendant, midheaven: R.westernChart.midheaven } : null);

  return charts;
}

/**
 * @param {object} R
 * @returns {{total, byCategory}} a quick summary — how many charts are
 *   actually available for this specific chart (some, like KP, can be
 *   null if an upstream calculation failed) grouped by category.
 */
export function summarizeAvailableCharts(R) {
  const charts = listAvailableCharts(R);
  const byCategory = {};
  for (const c of charts) {
    byCategory[c.category] = byCategory[c.category] || { total: 0, available: 0 };
    byCategory[c.category].total += 1;
    if (c.available) byCategory[c.category].available += 1;
  }
  return { total: charts.length, available: charts.filter(c => c.available).length, byCategory };
}

export default { listAvailableCharts, summarizeAvailableCharts };
