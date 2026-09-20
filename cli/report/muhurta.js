import { section, sub, kv, C } from '../console-ui.js';

export function printMuhurta(R) {
  section('MUHURTA — DYNAMIC ELECTIONAL FACTOR ANALYSIS');
  const m = R.extendedReport?.muhurta;
  if (!m || m.status === 'NOT_AVAILABLE') {
    kv('Status', 'NOT_AVAILABLE');
    kv('Reason', m?.reason || 'Muhurta calculation unavailable');
    return;
  }
  kv('Current Moon Nakshatra', m.nakshatra || 'NOT_CALCULATED');
  kv('Composite Factor Score', `${m.score}/100`);
  kv('Tarabala', m.tara === null ? 'NOT_CALCULATED' : String(m.tara));
  kv('Chandrabala', m.chandrabala === null ? 'NOT_CALCULATED' : String(m.chandrabala));
  sub('Transparent Factors');
  for (const f of m.factors || []) {
    const value = f.value === undefined ? '' : ` (${f.value})`;
    const status = f.status || 'UNKNOWN';
    console.log(`  ${status.padEnd(16)} ${f.name}${value}${f.rule ? ' — ' + f.rule : ''}${f.reason ? ' — ' + f.reason : ''}`);
  }
  console.log('  ' + C.dim + 'This score is a deterministic screening aid, not a claim that every traditional Muhurta lineage uses the same rule weights.' + C.reset);
}
