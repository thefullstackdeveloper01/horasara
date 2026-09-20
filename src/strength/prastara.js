/**
 * PRASHTARASHTAKAVARGA — sign-wise contributor matrix.
 * One row per contributor (7 grahas + Lagna), 12 sign columns.
 * A cell is 1 when that contributor gives a bindu to the target sign.
 */
import { ASHTAK_CONTRIBUTIONS, SIGNS } from '../astronomy/constants.js';
import { signOf } from '../astronomy/utils.js';

export function calcPrastharashtakavarga(planet, planets, ascLon) {
  const contributions = ASHTAK_CONTRIBUTIONS[planet];
  if (!contributions) return { planet, signs: SIGNS, rows: [], totals: Array(12).fill(0) };
  const positions = Object.fromEntries((planets || []).map(p => [p.name, signOf(p.siderealLon)]));
  positions.Lagna = signOf(ascLon);
  const rows = [];
  const totals = Array(12).fill(0);
  for (const [source, offsets] of Object.entries(contributions)) {
    const sourceSign = positions[source];
    if (sourceSign == null) continue;
    const cells = Array(12).fill(0);
    for (const offset of offsets) {
      const target = (sourceSign + offset - 1) % 12;
      cells[target] = 1;
    }
    cells.forEach((v, i) => totals[i] += v);
    rows.push({ source, cells });
  }
  return { planet, signs: SIGNS, rows, totals, totalBindus: totals.reduce((a,b)=>a+b,0) };
}

export function calcAllPrastharashtakavarga(planets, ascLon) {
  const out = {};
  for (const planet of ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']) {
    out[planet] = calcPrastharashtakavarga(planet, planets, ascLon);
  }
  return out;
}
