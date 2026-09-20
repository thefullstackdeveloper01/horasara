/**
 * chartsAndMasterTable.js — Sections 56-59:
 *   56. Chart Generation Index
 *   57. Chalit Table & Chart
 *   58. Planetary Position Master Table
 *   59. Western Tropical Chart & Western House/Cusp Chart
 */
import { section, sub, kv, table, C } from '../console-ui.js';

export function printChartGenerationIndex(R) {
  section('56. CHART GENERATION INDEX — उपलब्ध कुंडली सूची');
  const idx = R.chartGenerationIndex;
  if (!Array.isArray(idx)) {
    console.log('  ' + C.dim + '(unavailable: ' + (idx?.error || 'no data') + ')' + C.reset);
    return;
  }
  const s = R.chartGenerationSummary;
  kv('Total Charts Supported', `${s.total} (${s.available} available for this chart)`);
  console.log('');
  const byCat = {};
  for (const c of idx) { (byCat[c.category] = byCat[c.category] || []).push(c); }
  for (const [cat, charts] of Object.entries(byCat)) {
    sub(`${cat} (${charts.length})`);
    for (const c of charts) {
      const status = c.available ? C.green + '✓' + C.reset : C.red + '✗' + C.reset;
      console.log(`  ${status} ${c.label}  ${C.dim}[${c.zodiacFrame}]${C.reset}`);
    }
    console.log('');
  }
  console.log('  ' + C.dim + 'Rendering note: each chart above is raw calculated data, independent of' + C.reset);
  console.log('  ' + C.dim + 'any interpretation — the report sections below add interpretation on top' + C.reset);
  console.log('  ' + C.dim + 'of this same data without altering it.' + C.reset);
}

export function printChalitTable(R) {
  section('57. CHALIT TABLE & CHART — चलित कोष्ठक (Real Unequal-Bhava, Sripati System)');
  const ct = R.chalitTable;
  if (!ct || ct.error) {
    console.log('  ' + C.dim + '(unavailable: ' + (ct?.error || 'no data') + ')' + C.reset);
    return;
  }

  const rows = ct.houses.map(h => [
    String(h.bhavaNumber), h.sign, h.houseLord,
    `${h.bhavaBeginning.dms} ${h.bhavaBeginning.sign}`,
    `${h.bhavaMiddleCusp.dms} ${h.bhavaMiddleCusp.sign}`,
    `${h.bhavaEnding.dms} ${h.bhavaEnding.sign}`,
    h.occupyingPlanets.join(', ') || '—',
  ]);
  table(['Bhava', 'Sign', 'Lord', 'Begin', 'Middle/Cusp', 'End', 'Planets'], rows);

  console.log('');
  sub('Rashi vs Chalit — Differences Explained');
  const differing = ct.differenceExplanations.filter(d => d.differs);
  if (!differing.length) {
    console.log('  ' + C.green + 'No planet differs between Rashi (Whole Sign) and Chalit placement for this chart.' + C.reset);
  } else {
    for (const d of differing) {
      console.log(`  ${C.yellow}⚡ ${d.planet}${C.reset}: Rashi H${d.rashiHouse} → Chalit H${d.chalitHouse}`);
      console.log('     ' + C.dim + d.explanation + C.reset);
    }
  }
}

export function printPlanetaryMasterTable(R) {
  section('58. PLANETARY POSITION MASTER TABLE — ग्रह स्थिति सारणी');
  const pt = R.planetaryMasterTable;
  if (!Array.isArray(pt)) {
    console.log('  ' + C.dim + '(unavailable: ' + (pt?.error || 'no data') + ')' + C.reset);
    return;
  }

  console.log('  ' + C.yellow + 'Vedic (sidereal) and Western (tropical) values are reported separately below —' + C.reset);
  console.log('  ' + C.yellow + 'never combined into one figure.' + C.reset);
  console.log('');

  for (const p of pt) {
    sub(`${p.planet}`);
    kv('Sidereal Longitude (Vedic)', `${p.vedic.siderealLongitude}° — ${p.vedic.dms} ${p.vedic.sign}`);
    kv('Tropical Longitude (Western)', `${p.western.tropicalLongitude}°`);
    kv('Nakshatra / Pada', `${p.vedic.nakshatra} / Pada ${p.vedic.pada}`);
    kv('House / Bhava', `${p.vedic.house} / ${p.vedic.bhava}`);
    kv('Sign Lord / Nakshatra Lord', `${p.vedic.signLord} / ${p.vedic.nakshatraLord}`);
    if (p.kpSubLord) kv('KP Sub Lord', p.kpSubLord);
    kv('Retrograde', p.retrogradeLabel);
    kv('Speed', typeof p.speed === 'number' ? `${p.speed.toFixed(4)}°/day` : String(p.speed));
    kv('Dignity', p.vedic.dignity);
    kv('Exalted / Debilitated', `${p.vedic.exalted} / ${p.vedic.debilitated}`);
    kv('Own Sign / Moolatrikona', `${p.vedic.ownSign} / ${p.vedic.moolatrikona}`);
    kv('Functional Nature', p.vedic.functionalNature || '—');
    kv('Dispositor', p.vedic.dispositor);
    kv('Combust', p.combust);
    kv('Eclipse Status', p.eclipseStatus);
    kv('Planetary War', p.planetaryWar);
    console.log('');
  }
}

export function printWesternChart(R) {
  section('59. WESTERN TROPICAL CHART & HOUSE/CUSP CHART — पाश्चात्य कुंडली');
  const w = R.westernChart;
  if (!w || w.error) {
    console.log('  ' + C.dim + '(unavailable: ' + (w?.error || 'no data') + ')' + C.reset);
    return;
  }
  console.log('  ' + C.yellow + w.note + C.reset);
  console.log('');
  kv('System / House System', `${w.system} / ${w.houseSystem}`);
  kv('Ascendant (Tropical)', `${w.ascendant.dms} ${w.ascendant.sign} (${w.ascendant.tropicalLongitude}°)`);
  kv('Midheaven / MC (Tropical)', `${w.midheaven.dms} ${w.midheaven.sign} (${w.midheaven.tropicalLongitude}°)`);
  console.log('');

  sub('House Cusps (Tropical, Placidus)');
  const cuspRows = w.houseCusps.map(c => [String(c.house), c.sign, c.modernRuler, `${c.cuspLongitude}°`]);
  table(['House', 'Sign', 'Modern Ruler', 'Cusp Longitude'], cuspRows);

  console.log('');
  sub('Planets (Tropical Zodiac)');
  const planetRows = w.planets.map(p => [p.planet, p.sign, `${p.degreeInSign}°`, String(p.house), p.modernRuler, p.retrograde ? 'R' : 'D']);
  table(['Planet', 'Sign', 'Degree', 'House', 'Modern Ruler', 'Motion'], planetRows);
}
