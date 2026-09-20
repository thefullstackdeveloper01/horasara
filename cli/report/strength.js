/**
 * strength.js — Section 10 (Shadbala), Section 11 (Ashtakavarga),
 * Section 12 (Special Lagnas).
 */
import { section, kv, table, C } from '../console-ui.js';

export function printShadbala(R) {
  section('10. SHADBALA — षड्बल (Six-fold Planetary Strength)');
  if (!R.shadbala) return;
  table(
    ['Graha', 'Sthana', 'Dig', 'Kala', 'Cheshta', 'Naisargika', 'Drik', 'Total', 'Rupas', 'Grade'],
    Object.entries(R.shadbala).filter(([k]) => k !== 'ranked' && typeof R.shadbala[k] === 'object').map(([name, s]) => [
      name, s.totalSthanaBala?.toFixed?.(1) ?? '-', s.digBala ?? '-',
      s.totalKalaBala?.toFixed?.(1) ?? '-', s.cheshtaBala?.toFixed?.(1) ?? '-',
      s.naisargikaBala ?? '-', s.drigBala?.toFixed?.(1) ?? '-', s.totalShadbala?.toFixed?.(1) ?? '-',
      s.rupas?.toFixed?.(2) ?? '-', s.grade ?? '-'
    ])
  );
}

// House-strength color coding: ≥30 bindus = strong, ≥25 = moderate, <25 = weak.
function bindusColor(n) {
  if (n >= 30) return C.green;
  if (n >= 25) return C.yellow;
  return C.red;
}

export function printAshtakavarga(R) {
  section('11. ASHTAKAVARGA — अष्टकवर्ग (House Strength Points)');
  if (!R.ashtakavarga?.sarva) return;
  const bindus = R.ashtakavarga.sarva;

  const rows = bindus.map((n, i) => {
    const dot = n >= 30 ? '🟢' : n >= 25 ? '🟡' : '🔴';
    const colored = bindusColor(n) + String(n).padStart(2) + C.reset;
    return [`H${i + 1}`, colored, dot];
  });
  // Print as two aligned rows of "H<n> <bindus><dot>" triplets, 6 per line.
  for (let i = 0; i < rows.length; i += 6) {
    const chunk = rows.slice(i, i + 6);
    console.log('  ' + chunk.map(([h]) => h.padEnd(4)).join(' '));
    console.log('  ' + chunk.map(([, v, d]) => `${v} ${d}`.padEnd(4 + 6)).join(' '));
    console.log('');
  }
  console.log(`  ${C.dim}🟢 Strong (≥30 bindus)   🟡 Moderate (25-29)   🔴 Weak (<25)${C.reset}`);
  console.log('');
  kv('Total Bindus (raw)', R.ashtakavarga.sarvaTotal);

  // Shodhana (reduction): raw bindus alone overstate real strength — classical
  // BPHS practice reduces them via Trikona Shodhana (averaging 1-5-9 / 2-6-10
  // / 3-7-11 / 4-8-12 house triads) and then Ekadhipatya Shodhana (removing
  // points a planet gives to houses where IT is the lord twice, since a
  // planet can't meaningfully support itself in both of its own houses at
  // full strength) — this is what real strength predictions should use.
  if (R.ashtakavarga.shodhana) {
    console.log(`  ${C.bold}Trikona & Ekadhipatya Shodhana (post-reduction points):${C.reset}`);
    console.log(`  ${C.dim}Raw bindus overstate strength — this is the reduced figure BPHS actually uses for predictions.${C.reset}`);
    console.log('');
    const shodhanaRows = Object.entries(R.ashtakavarga.shodhana).map(([planet, s]) => {
      const rawTotal = s.raw.reduce((a, b) => a + b, 0);
      const trikonaTotal = s.afterTrikona.reduce((a, b) => a + b, 0);
      const finalTotal = s.afterEkadhipatya.reduce((a, b) => a + b, 0);
      return [planet, rawTotal, trikonaTotal, finalTotal, s.pinda?.predictedEventAge ?? '-'];
    });
    table(['Graha', 'Raw Total', 'After Trikona', 'After Ekadhipatya', 'Pinda Event Age'], shodhanaRows);
    console.log('');
    console.log(`  ${C.dim}Pinda Event Age: classical estimate of when this planet's karaka events peak/manifest.${C.reset}`);
  }
}

export function printSpecialLagnas(R) {
  section('12. SPECIAL LAGNAS — विशेष लग्न');
  if (!R.specialLagnas) return;
  for (const [key, val] of Object.entries(R.specialLagnas)) {
    if (val && val.sign) console.log(`  ${val.name || key}: ${val.sign} (House ${val.house}) — ${val.purpose || ''}`);
  }
}
