import { section, kv, C } from '../console-ui.js';

export function printAdvancedCalculations(R) {
  section('ADVANCED CALCULATIONS — PRASHTARA / WESTERN ASPECTS / BHAVA-MADHYA / JAIMINI');
  if (R.prastharashtakavarga && !R.prastharashtakavarga.error) {
    console.log('  ' + C.cyan + 'Prastharashtakavarga' + C.reset);
    for (const [planet, d] of Object.entries(R.prastharashtakavarga)) {
      console.log(`  ${planet}: total ${d.totalBindus ?? '—'} | ${d.totals?.join(' ') || '—'}`);
    }
  }
  if (Array.isArray(R.westernAspects)) {
    console.log('  ' + C.cyan + 'Western exact-angle aspects' + C.reset);
    for (const a of R.westernAspects) console.log(`  • ${a.from} ${a.name} ${a.to} — orb ${a.deviation.toFixed(2)}° (separation ${a.separation.toFixed(2)}°)`);
    if (!R.westernAspects.length) console.log('  • None within configured orbs.');
  }
  if (Array.isArray(R.bhavaMadhyaAspects)) {
    console.log('  ' + C.cyan + 'Planet → Bhava Madhya aspects' + C.reset);
    for (const a of R.bhavaMadhyaAspects) console.log(`  • ${a.planet} ${a.name} House ${a.house} — cusp ${a.houseCusp.toFixed(2)}°`);
    if (!R.bhavaMadhyaAspects.length) console.log('  • None within configured orbs.');
  }
  const j=R.jaiminiAdvanced;
  if (j?.arudha?.padas) {
    console.log('  ' + C.cyan + 'Jaimini Arudha Padas' + C.reset);
    for (const x of j.arudha.padas) if (x) console.log(`  • A${x.house}: ${x.padaSign} (lord ${x.lord})`);
  }
  if (j?.karakamsa) {
    console.log('  ' + C.cyan + 'Karakamsa' + C.reset);
    kv('Status', j.karakamsa.status);
    kv('Atmakaraka', j.karakamsa.atmakaraka || '—');
    kv('Karakamsha Sign', j.karakamsa.karakamshaSign || '—');
  }
  if (R.mangalDoshaDeep) {
    console.log('  ' + C.cyan + 'Mangal Dosha Deep' + C.reset);
    kv('Formation', R.mangalDoshaDeep.formation === true ? 'DETECTED' : 'NOT_DETECTED');
    kv('Cancelled', R.mangalDoshaDeep.cancelled ? 'YES' : 'NO');
    kv('Severity', R.mangalDoshaDeep.severity ?? '—');
  }
}

export function printEvidenceMatrix(R) {
  section('EVIDENCE MATRIX — CANONICAL PREDICTION BREAKDOWN');
  const e=R.evidenceMatrix;
  if (!e || e.status !== 'AVAILABLE') { console.log('  STATUS = NOT_CALCULATED'); console.log('  ' + C.dim + (e?.reason || 'Unified prediction unavailable.') + C.reset); return; }
  for (const r of e.rows) console.log(`  ${r.event} | ${r.factor} | value=${r.rawValue} | weight=${r.weight} | contribution=${r.contribution} | score=${r.score}`);
}
