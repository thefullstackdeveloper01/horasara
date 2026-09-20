/**
 * kp-lalkitab.js — Section 13 (Krishnamurti Paddhati significators)
 * and Section 14 (Lal Kitab karmic debts & summary).
 */
import { section, sub, kv, table, C } from '../console-ui.js';

export function printKP(R) {
  section('13. KP SYSTEM — कृष्णमूर्ति पद्धति');
  if (!R.kpChart) return;
  kv('KP Ayanamsa', R.kpChart.ayanamsa);

  // FIX (New-spec audit — real Placidus KP House Cusps): calcKPChart()
  // has always computed real cuspal sub-lords via getKPCusps() (using
  // true Placidus cusps when mc/lat/ramc/eps are available — see
  // engine.js), but this table was never actually rendered anywhere in
  // the report. A separate, buggy re-implementation in Section 40
  // (buildKPAdvanced) WAS rendered instead, using a fake mid-sign cusp
  // approximation that produced a suspiciously perfect repeating 4-house
  // sub-lord pattern. That duplicate has been removed; this is now the
  // one and only KP House Cusps table, using the correct, already-
  // computed data.
  if (Array.isArray(R.kpChart.cusps) && R.kpChart.cusps.length) {
    sub('KP House Cusps & Sub-Lords (' + (R.kpChart.cusps[0]?.cuspSystem || 'Placidus') + ')');
    const cuspRows = R.kpChart.cusps.map(c => [
      'H' + c.house,
      c.sign,
      `${c.kp?.nakLord || '-'} | ${c.kp?.subLord || '-'}`,
    ]);
    table(['House', 'Sign', 'Nak Lord | Sub Lord'], cuspRows);
  }

  if (!R.kpChart.significators) return;

  sub('House Significators (Top)');
  const sig = R.kpChart.significators;
  const keys = Object.keys(sig).slice(0, 12);
  const rows = keys.map(k => {
    const h = sig[k];
    let sigStr = '-';
    if (h && Array.isArray(h.significators)) {
      sigStr = h.significators.map(s => `${s.planet}(L${s.level})`).join(', ');
    } else if (Array.isArray(h)) {
      sigStr = h.join(', ');
    }
    const subLord = h?.kpSubLord ? `  [Sub: ${h.kpSubLord}]` : '';
    return [k, (h?.owner ? 'Owner:' + h.owner + '  ' : '') + sigStr + subLord];
  });
  table(['House', 'Significators'], rows);
}

export function printLalKitab(R) {
  section('14. LAL KITAB ANALYSIS — लाल किताब विश्लेषण');
  if (!R.lkFull) return;

  if (R.lkFull.debts?.length) {
    sub('Rin (Karmic Debts)');
    for (const debt of R.lkFull.debts) {
      console.log(`  • ${C.bold}${debt.name}${C.reset} — ${debt.label} (Houses: ${debt.houses.join(', ')}, Severity: ${debt.severity})`);
      console.log(`     Triggered by: ${debt.triggeringPlanets.join(', ')}`);
      console.log(`     ${debt.indication}`);
      console.log(`     ${C.dim}Remedy: ${debt.remedy}${C.reset}`);
    }
  }
  if (R.lkFull.summary) {
    sub('Summary');
    console.log('  ' + (typeof R.lkFull.summary === 'string' ? R.lkFull.summary : JSON.stringify(R.lkFull.summary)));
  }
}
