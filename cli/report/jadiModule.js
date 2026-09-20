/**
 * jadiModule.js — Section: JADI / HERBAL ROOT REMEDY (Spec §40)
 * One entry per planet THIS chart's own Shadbala genuinely finds weak.
 * AVAILABLE where the bundled dataset covers that planet; otherwise an
 * honest NOT_AVAILABLE with the exact reason — never a fabricated herb.
 */
import { section, sub, kv, C } from '../console-ui.js';

export function printJadiRemedies(R) {
  section('67. JADI — जड़ी (Traditional Herbal Root Remedies)');
  console.log('  ' + C.yellow + 'Note: traditional folk-astrology practice, not medical advice.' + C.reset);
  console.log('  ' + C.yellow + 'Consult a qualified practitioner before use.' + C.reset);
  console.log('');

  if (!Array.isArray(R.jadiRemedies)) {
    console.log('  ' + C.dim + '(unavailable: ' + (R.jadiRemedies?.error || 'no data') + ')' + C.reset);
    return;
  }
  if (!R.jadiRemedies.length) {
    console.log('  ' + C.green + 'No planet in this chart falls below its classical minimum Shadbala' + C.reset);
    console.log('  ' + C.green + 'strength requirement — no Jadi remedy is indicated.' + C.reset);
    return;
  }

  for (const entry of R.jadiRemedies) {
    sub(`${entry.planet} — Shadbala ${entry.shadbalaRatio}x required (${entry.grade})`);
    if (entry.status === 'AVAILABLE') {
      kv('Recommended Jadi', C.green + entry.jadi + C.reset);
      kv('Purpose', entry.purpose);
      kv('Traditional Usage', entry.traditionalUsage);
      kv('Wearing Method', entry.wearingMethod);
      kv('Precautions', entry.precautions);
      kv('Confidence', entry.confidence);
      console.log('  ' + C.dim + `Source: ${entry.source}` + C.reset);
    } else {
      console.log('  ' + C.red + 'STATUS = NOT_AVAILABLE' + C.reset);
      console.log('  ' + C.dim + `Reason: ${entry.reason}` + C.reset);
    }
    console.log('');
  }
}

export default { printJadiRemedies };
