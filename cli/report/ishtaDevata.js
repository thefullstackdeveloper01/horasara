/**
 * ishtaDevata.js — Section: ISHTA DEVATA (Spec §33)
 * Reports THIS chart's own computed Atmakaraka and the resulting
 * Ishta Devata lookup — or an honest NOT_AVAILABLE with the exact reason
 * when the bundled dataset doesn't yet cover this chart's Atmakaraka.
 */
import { section, kv, C } from '../console-ui.js';

export function printIshtaDevata(R) {
  section('66. ISHTA DEVATA — इष्ट देवता (Chosen Deity, Jaimini)');
  console.log('  ' + C.yellow + 'Note: traditional Jyotish spiritual guidance, not a claim of religious fact.' + C.reset);
  console.log('');

  const d = R.ishtaDevata;
  if (!d) {
    console.log('  ' + C.dim + '(unavailable: no data)' + C.reset);
    return;
  }

  kv("This chart's Atmakaraka", d.atmakaraka || '(could not be determined)');
  if (d.karakamshaSign) kv('Karakamsha Lagna Sign', d.karakamshaSign);

  if (d.status === 'AVAILABLE') {
    kv('Ishta Devata', C.green + d.deity + C.reset);
    if (d.deitySanskrit) kv('Sanskrit Name', d.deitySanskrit);
    kv('Reasoning', d.reasoning);
    kv('Traditional Practice', d.traditionalPractice);
    kv('Methodology', d.methodology);
    kv('Confidence', d.confidence);
    console.log('  ' + C.dim + `Source: ${d.source}` + C.reset);
  } else {
    console.log('  ' + C.red + 'STATUS = NOT_AVAILABLE' + C.reset);
    console.log('  ' + C.dim + `Reason: ${d.reason}` + C.reset);
  }
}

export default { printIshtaDevata };
