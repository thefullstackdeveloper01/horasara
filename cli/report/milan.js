/**
 * milan.js — Prints the Kundali Milan (Ashtakoot / Guna Milan) report.
 * Pure rendering: takes the already-computed groom/bride charts and the
 * already-computed milan result object and prints them. No astrology
 * logic lives here (see src/milan/ashtakoot.js for the calculation).
 */
import { box, section, kv, table, line, C } from '../console-ui.js';
import { normalizeElapsedMs } from './reportTiming.js';

function personSummary(label, R, person) {
  console.log(C.bold + C.yellow + `  ${label}` + C.reset);
  kv('  Name', R.meta.name);
  kv('  Date of Birth', `${String(R.meta.day).padStart(2, '0')}-${String(R.meta.month).padStart(2, '0')}-${R.meta.year}  ${String(R.meta.hour).padStart(2, '0')}:${String(R.meta.min).padStart(2, '0')}`);
  kv('  Place of Birth', `${R.meta.place || `Coordinates only (Lat ${R.meta.lat}, Lon ${R.meta.lon})`}`);
  kv('  Moon Sign (Rashi)', `${person.moonSign}  (Lord: ${person.rashiLord})`);
  kv('  Moon Nakshatra', `${person.nakshatra}  Pada ${person.pada}`);
  kv('  Lagna', R.ascendant.sign);
  console.log('');
}

export function printMilanReport(groomR, brideR, milan, elapsedMs) {
  elapsedMs = normalizeElapsedMs(elapsedMs);
  console.clear?.();
  box('💞  KUNDALI MILAN — गुण मिलान (ASHTAKOOT COMPATIBILITY)  💞');
  console.log('');
  kv('Report Generated', new Date().toLocaleString());
  kv('Calculation Time', `${elapsedMs.toFixed(3)} ms`);
  console.log('');

  section('BIRTH DETAILS');
  personSummary('🤵 Groom (Var)', groomR, milan.groom);
  personSummary('👰 Bride (Vadhu)', brideR, milan.bride);

  section('ASHTAKOOT GUNA MILAN — 8-FOLD COMPATIBILITY (36 POINTS)');
  const rows = milan.kootas.map(k => [
    k.name, `${k.points}/${k.maxPoints}`, k.detail, k.meaning,
  ]);
  table(['Koota', 'Points', 'Detail', 'Significance'], rows);
  console.log('');
  console.log(
    C.bold + C.cyan + `  TOTAL SCORE: ${milan.totalPoints} / ${milan.maxPoints}  (${milan.percentage}%)` + C.reset
  );
  console.log('');

  section('VERDICT');
  const verdictColor = milan.totalPoints < 18 ? C.red : milan.totalPoints < 24 ? C.yellow : C.green;
  console.log('  ' + verdictColor + C.bold + milan.verdict.label + C.reset);
  console.log('  ' + milan.verdict.note);
  console.log('');
  console.log('  Classical guideline: minimum 18/36 required | 18-24 average |');
  console.log('  24-32 good | 32-36 excellent.');
  console.log('');

  section('DOSHA ANALYSIS');
  const nadiKootaResult = milan.kootas.find(k => k.name === 'Nadi');
  const ganaKootaResult = milan.kootas.find(k => k.name === 'Gana');

  kv('Nadi Dosha', milan.doshas.nadiDosha
    ? C.red + 'Present — same Nadi (0 points in Nadi koota above)' + C.reset
    : C.green + 'Not present' + C.reset);
  if (nadiKootaResult?.cancellation) {
    const nc = nadiKootaResult.cancellation;
    kv('  Nadi Dosha Cancellation (Nivarana)', nc.cancelled
      ? C.green + 'Conditions MET — classically cancelled' + C.reset
      : C.yellow + 'Conditions NOT met — remains uncancelled' + C.reset);
    console.log('    ' + C.dim + nc.reason + C.reset);
    console.log('    ' + C.dim + `Remedy if uncancelled: ${nc.remedy}` + C.reset);
    console.log('    ' + C.dim + `Source: ${nc.source}` + C.reset);
  }

  kv('Bhakoot Dosha', milan.doshas.bhakootDosha
    ? C.red + 'Present — inauspicious Rashi distance (0 points in Bhakoot koota above)' + C.reset
    : C.green + 'Not present' + C.reset);

  if (ganaKootaResult?.cancellation) {
    const gc = ganaKootaResult.cancellation;
    kv('  Gana Dosha Cancellation (Nivarana)', gc.cancelled
      ? C.green + 'Conditions MET — classically cancelled' + C.reset
      : C.yellow + 'Conditions NOT met — remains uncancelled' + C.reset);
    console.log('    ' + C.dim + gc.reason + C.reset);
    console.log('    ' + C.dim + `Remedy if uncancelled: ${gc.remedy}` + C.reset);
    console.log('    ' + C.dim + `Source: ${gc.source}` + C.reset);
  }

  console.log('');
  console.log('  ' + C.dim + 'Note: classical texts describe further, finer cancellation exceptions for' + C.reset);
  console.log('  ' + C.dim + 'Bhakoot dosha beyond what is evaluated above; consult an astrologer for a' + C.reset);
  console.log('  ' + C.dim + 'full review before finalizing any match.' + C.reset);
  console.log('');

  section('MANGAL DOSHA (KUJA DOSHA) COMPARISON');
  const mangalLabel = (m) => `${m.severity}${(m.doshaCount > 0 && !m.effectiveDosha) ? ' (present but cancelled)' : ''}`;
  kv('Groom Mangal Dosha', mangalLabel(milan.mangalDosha.groom));
  kv('Bride Mangal Dosha', mangalLabel(milan.mangalDosha.bride));
  console.log('');
  if (milan.mangalDosha.compatible) {
    console.log('  ' + C.green + '✓ Compatible — both charts match on Mangal Dosha status (present in both or absent in both).' + C.reset);
  } else {
    console.log('  ' + C.yellow + '⚠ Mismatch — one partner has Mangal Dosha and the other does not.' + C.reset);
    console.log('  ' + C.yellow + '  Classical texts recommend remedies (e.g. Kumbh Vivah, Mangal Shanti puja) before marriage.' + C.reset);
  }
  console.log('');

  box('✨  END OF KUNDALI MILAN REPORT — मिलान रिपोर्ट समाप्त  ✨');
  console.log(C.dim + '\nGenerated by JyotiVeda V1 — Vedic Astrology Engine (Ashtakoot Guna Milan)\n' + C.reset);
}
