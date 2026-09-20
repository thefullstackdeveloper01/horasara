/**
 * planets-houses.js — Section 4 (planetary positions), Section 5 (house
 * chart), Section 6 (divisional/varga charts).
 */
import { section, kv, table, C } from '../console-ui.js';

// Compact single-letter badges so the status column stays scannable:
//   R = Retrograde, C = Combust, E = Exalted, D = Debilitated
function statusBadges(p, combustionInfo) {
  const badges = [];
  if (p.retrograde) badges.push('R');
  if (combustionInfo?.combust) badges.push('C');
  if (p.dignity === 'Exalted') badges.push('E');
  if (p.dignity === 'Debilitated') badges.push('D');
  return badges.length ? badges.join('') : '-';
}

export function printPlanets(R) {
  section('4. GRAHA STHITI — Planetary Positions (Sidereal)');
  table(
    ['Graha', 'Rashi', 'Degree', 'Nakshatra', 'Pada', 'Bhava', 'Dignity', 'Badges'],
    R.planets.map(p => [
      p.name, p.sign, p.dms, p.nakshatra, p.pada, p.house,
      p.dignity, statusBadges(p, R.combustion?.[p.name])
    ])
  );
  console.log(`  ${C.dim}Badges: R=Retrograde  C=Combust  E=Exalted  D=Debilitated${C.reset}`);
}

export function printHouses(R) {
  section('5. BHAVA (HOUSES) — 12 House Chart');
  table(
    ['House', 'Sign', 'Lord', 'Occupants'],
    R.houses.map(h => [h.number, h.sign, h.lord, (h.planets || []).join(', ') || '-'])
  );

  if (R.asciiCharts?.southIndian) {
    console.log('');
    console.log(R.asciiCharts.southIndian);
  }
  if (R.asciiCharts?.northIndian) {
    console.log('');
    console.log(R.asciiCharts.northIndian);
  }
}

export function printVargas(R) {
  section('6. VARGA CHARTS — Divisional Chart Positions (D1/D9/D10 etc.)');
  if (!R.vargas) return;

  const ascV = R.vargas.ascendant;
  if (ascV && typeof ascV === 'object') {
    const parts = Object.entries(ascV)
      .filter(([, v]) => v && (typeof v === 'string' || v.sign))
      .map(([d, v]) => `${d}:${typeof v === 'string' ? v : v.sign}`);
    kv('Varga Lagna Signs', parts.join('  '));
  }

  console.log('');
  console.log('  ' + C.dim + 'Navamsa (D9) Positions:' + C.reset);
  for (const p of R.planets) {
    const nv = R.vargas[p.name];
    if (nv && nv.D9) console.log(`    ${p.name.padEnd(10)} → D9: ${nv.D9.sign || nv.D9}`);
  }
}
