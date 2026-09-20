/**
 * avkahada.js — Section 49: AVKAHADA / PANCHANGA PHALA
 * For every Panchanga limb (Tithi, Paksha, Vara, Nakshatra, Pada, Yoga,
 * Karana) and Avakahada Chakra attribute (Paya, Varna, Yoni, Gana,
 * Vasya, Nadi): calculated value, classical meaning, personality effect,
 * behavioural tendencies, strengths, challenges, and practical
 * interpretation — each tied to this chart's own calculated value.
 */
import { section, sub, kv, C } from '../console-ui.js';

export function printAvkahadaPhala(R) {
  section('49. AVKAHADA / PANCHANGA PHALA — पञ्चांग फल विश्लेषण');

  if (!Array.isArray(R.avkahadaPhala)) {
    console.log('  ' + C.dim + '(unavailable: ' + (R.avkahadaPhala?.error || 'no data') + ')' + C.reset);
    return;
  }

  for (const c of R.avkahadaPhala) {
    sub(`${c.component}: ${c.value}`);
    if (c.classicalMeaning) kv('Classical Meaning', c.classicalMeaning);
    if (c.personalityEffect) kv('Personality Effect', c.personalityEffect);
    if (c.behaviouralTendencies) kv('Behavioural Tendencies', c.behaviouralTendencies);
    if (c.strengths) kv('Strengths', c.strengths);
    if (c.challenges) kv('Challenges', c.challenges);
    if (c.practicalInterpretation) kv('Practical Interpretation', c.practicalInterpretation);
    kv('Source', C.dim + c.source + C.reset);
  }
}
