/**
 * grahaShanti.js — Section 51: GRAHA SHANTI (Classical Planetary Remedies)
 * Only lists planets THIS chart's own Shadbala found below classical
 * minimum strength, with the real classical remedy for each.
 */
import { section, sub, kv, C } from '../console-ui.js';

export function printGrahaShanti(R) {
  section('51. GRAHA SHANTI — ग्रह शान्ति (Classical Planetary Remedies)');
  console.log('  ' + C.yellow + 'Note: traditional Jyotish remedial practice, not medical/financial advice.' + C.reset);
  console.log('  ' + C.yellow + 'Consult a qualified priest/astrologer before gemstone or ritual commitments.' + C.reset);
  console.log('');

  if (!Array.isArray(R.grahaShanti)) {
    console.log('  ' + C.dim + '(unavailable: ' + (R.grahaShanti?.error || 'no data') + ')' + C.reset);
    return;
  }
  if (!R.grahaShanti.length) {
    console.log('  ' + C.green + 'No planet in this chart falls below its classical minimum Shadbala' + C.reset);
    console.log('  ' + C.green + 'strength requirement — no Graha Shanti remedy is indicated.' + C.reset);
    return;
  }

  for (const entry of R.grahaShanti) {
    const r = entry.remedy;
    sub(`${entry.planet} (${r.sanskritName}) — Shadbala ${entry.shadbalaRatio}x required (${entry.grade})`);
    kv('Day / Direction', `${r.day} / ${r.direction}`);
    kv('Gemstone / Metal', `${r.gemstone} / ${r.metal}`);
    kv('Beej Mantra', r.beejMantra);
    kv('Tantric Mantra', r.tantricMantra);
    kv('Japa Count', `${r.japaCount}`);
    kv('Donations (Daan)', r.donations);
    if (r.stotra) kv('Stotra', r.stotra);
    if (r.kavach) kv('Kavach', r.kavach);
    if (r.specificRemedies?.length) {
      console.log('  ' + C.bold + 'Specific Remedies:' + C.reset);
      for (const s of r.specificRemedies) console.log(`     • ${s}`);
    }
    kv('If left weak — Health', r.healthEffectsIfWeak);
    kv('If left weak — Career', r.careerEffectsIfWeak);
    console.log('  ' + C.dim + `Source: ${r.source}` + C.reset);
    console.log('');
  }
}
