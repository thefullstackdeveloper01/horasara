/**
 * confidence.js — Section 44: overall confidence score and astronomical
 * accuracy notes for the calculation engine.
 */
import { section, sub, kv, C } from '../console-ui.js';

export function printConfidence(R) {
  section('44. CALCULATION CONFIDENCE & ACCURACY');
  kv('Overall Confidence', R.confidence?.score !== undefined ? `${R.confidence.score}% (${R.confidence.label})` : JSON.stringify(R.confidence));
  if (R.confidence?.note) kv('Note', R.confidence.note);

  if (R._accuracy) {
    sub('Astronomical Precision');
    for (const [k, v] of Object.entries(R._accuracy)) {
      if (k === 'note') continue;
      kv(k, v);
    }
    console.log('  ' + C.dim + (R._accuracy.note || '') + C.reset);
  }


  if (R.predictionTruth) {
    sub('Prediction Truth / Audit Layer');
    kv('Calculation status', R.predictionTruth.calculation?.status || 'NOT_AVAILABLE');
    kv('Current/next Dasha', R.predictionTruth.currentDasha?.mahadasha || 'NOT_AVAILABLE');
    kv('Empirical calibration', R.predictionTruth.calibration?.status || 'NOT_CALIBRATED');
    kv('Prediction accuracy', R.predictionTruth.calibration?.accuracy == null ? 'UNKNOWN — no outcome dataset' : R.predictionTruth.calibration.accuracy);
    if (R.predictionTruth.calibration?.reason) kv('Why', R.predictionTruth.calibration.reason);
    const evs = R.predictionTruth.events || [];
    kv('Timed event indications', String(evs.filter(e => e.windows?.length).length));
  }

  if (R.remedySchedule?.status === 'AVAILABLE') {
    sub('Dynamic Remedy Timing — Next 14 Days');
    console.log('  Traditional timing guidance only; it is calculated from the selected birth location/date and avoids presenting fixed dates as universal.');
    for (const row of R.remedySchedule.rows.slice(0, 7)) {
      console.log(`  ${row.date} ${row.weekday}: ${row.planet} — ${row.practice} | Japa: ${row.japaWindow} | Daan: ${row.daanWindow}`);
    }
  }
}
