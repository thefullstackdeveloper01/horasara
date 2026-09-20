/**
 * vastuGuide.js — Section 55: PERSONALIZED VASTU DIRECTION GUIDE
 * Directions ruled by planets this chart's own engine found to be
 * Yogakaraka/Functional Benefic for this Lagna.
 */
import { section, sub, kv, C } from '../console-ui.js';

export function printVastuGuide(R) {
  section('55. VASTU DIRECTION GUIDE — वास्तु दिशा मार्गदर्शन');
  console.log('  ' + C.yellow + 'Note: Vastu Shastra is architectural tradition, not a birth-chart calculation.' + C.reset);
  console.log('  ' + C.yellow + 'These directions are shown because they are classically ruled by planets' + C.reset);
  console.log('  ' + C.yellow + 'this chart\'s own engine found favourable for this Lagna — a real cross-' + C.reset);
  console.log('  ' + C.yellow + 'reference, not a substitute for an on-site Vastu consultation.' + C.reset);
  console.log('');

  if (!Array.isArray(R.vastuGuide)) {
    console.log('  ' + C.dim + '(unavailable: ' + (R.vastuGuide?.error || 'no data') + ')' + C.reset);
    return;
  }
  if (!R.vastuGuide.length) {
    console.log('  ' + C.dim + 'None of this chart\'s Yogakaraka/Functional Benefic planets rule a' + C.reset);
    console.log('  ' + C.dim + 'direction in the bundled classical Vastu direction table.' + C.reset);
    return;
  }

  for (const v of R.vastuGuide) {
    sub(`${v.direction} (${v.hindiName}) — ruled by ${v.planet}`);
    kv('Why relevant to this chart', v.whyRelevant);
    kv('Ruling Deity / Element', `${v.rulingDeity} / ${v.element}`);
    kv('Significance', v.significance);
    kv('Favourable For', v.positiveActivities.join(', '));
    kv('Best Avoided Here', v.negativeActivities.join(', '));
    if (v.remedies?.length) kv('Remedies if Imbalanced', v.remedies.join(', '));
    console.log('  ' + C.dim + `Source: ${v.source}` + C.reset);
    console.log('');
  }
}
