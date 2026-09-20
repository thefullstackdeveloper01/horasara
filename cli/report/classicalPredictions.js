/**
 * classicalPredictions.js — Section 52: CLASSICAL PREDICTION RULES
 * Cross-references this chart's own house lords/dasha against the
 * bundled real BPHS-sourced career/finance/health/marriage rule
 * databases, and Section 53: LAGNA CLASSICAL PROFILE.
 */
import { section, sub, kv, C } from '../console-ui.js';

export function printClassicalPredictions(R) {
  section('52. CLASSICAL PREDICTION RULES — शास्त्रीय भविष्यवाणी नियम (BPHS Cross-Reference)');
  const cp = R.classicalPredictions;
  if (!cp || cp.error) {
    console.log('  ' + C.dim + '(unavailable: ' + (cp?.error || 'no data') + ')' + C.reset);
    return;
  }

  if (cp.career) {
    sub('Career (10th House)');
    kv('10th House', `${cp.career.tenthHouse.sign} — Lord: ${cp.career.tenthHouse.lord} (in house ${cp.career.tenthHouse.lordPlacedInHouse}, ${cp.career.tenthHouse.lordDignity})`);
    kv('Classically Suggested Fields', cp.career.suggestedFields.join(', ') || '(no mapping for this lord)');
    kv('Strength Assessment', cp.career.strengthAssessment);
    console.log('  ' + C.dim + `Rule: ${cp.career.classicalRule} | Source: ${cp.career.source}` + C.reset);
    console.log('');
  }

  if (cp.finance) {
    sub('Finance (2nd & 11th Houses)');
    kv('2nd House', `${cp.finance.secondHouse.sign} — Lord: ${cp.finance.secondHouse.lord} (in house ${cp.finance.secondHouse.lordHouse})`);
    kv('11th House', `${cp.finance.eleventhHouse.sign} — Lord: ${cp.finance.eleventhHouse.lord} (in house ${cp.finance.eleventhHouse.lordHouse})`);
    kv('Verdict', cp.finance.bothLordsStrength.verdict);
    for (const insight of cp.finance.specificInsights) console.log(`     • ${insight}`);
    console.log('  ' + C.dim + `Rule: ${cp.finance.classicalRule} | Source: ${cp.finance.source}` + C.reset);
    console.log('');
  }

  if (cp.health) {
    sub('Health (Lagna & Lagna Lord)');
    kv('Lagna', `${cp.health.lagna.sign} — classically associated body area: ${cp.health.lagna.associatedBodyArea}`);
    kv('Lagna Lord', `${cp.health.lagnaLord.name} (house ${cp.health.lagnaLord.house}, ${cp.health.lagnaLord.dignity})`);
    kv('Constitution Assessment', cp.health.constitutionAssessment);
    for (const n of cp.health.weakPlanetHealthNotes) console.log(`     • ${n.planet}: ${n.note}`);
    console.log('  ' + C.dim + `Rule: ${cp.health.classicalRule} | Source: ${cp.health.source}` + C.reset);
    console.log('');
  }

  if (cp.marriage) {
    sub('Marriage Timing (7th House & Dasha)');
    kv('7th House', `${cp.marriage.seventhHouse.sign} — Lord: ${cp.marriage.seventhHouse.lord} (in house ${cp.marriage.seventhHouse.lordHouse})`);
    kv('Current Dasha', `${cp.marriage.currentDasha.mahadasha} / ${cp.marriage.currentDasha.antardasha}`);
    for (const f of cp.marriage.activeClassicalFactors) console.log(`     • ${f}`);
    kv('Classical Supporting Factors Checklist', cp.marriage.supportingFactorsChecklist.join(', '));
    console.log('  ' + C.dim + `Rule: ${cp.marriage.classicalRule} | Source: ${cp.marriage.source}` + C.reset);
  }
}

export function printLagnaProfile(R) {
  section('53. LAGNA CLASSICAL PROFILE — लग्न विवरण (Romanized Hindi reference source)');
  const lp = R.lagnaProfile;
  if (!lp || lp.error) {
    console.log('  ' + C.dim + '(unavailable: ' + (lp?.error || 'no matching Lagna entry in the bundled database') + ')' + C.reset);
    return;
  }
  kv('Source Language', 'Romanized Hindi (bundled traditional reference text)');
  kv('Lagna', `${lp.lagnaSanskrit} (${lp.rashi}) — Lord: ${lp.signLord}, Element: ${lp.element}, Quality: ${lp.quality}`);
  kv('Personality', lp.personality);
  kv('Strengths', lp.strengths.join(', '));
  kv('Weaknesses', lp.weaknesses.join(', '));
  kv('Physical Appearance', lp.physicalAppearance);
  console.log('');
  sub('Career & Profession');
  kv('Suitable Fields', lp.suitableCareerFields.join(', '));
  kv('Work Style', lp.workStyle);
  console.log('');
  sub('Relationships & Family');
  kv('Relationship Nature', lp.relationshipNature);
  kv('Family Life', lp.familyLife);
  console.log('');
  sub('Health');
  kv('Vulnerable Areas', lp.healthVulnerableAreas.join(', '));
  kv('General Tips', lp.healthTips);
  console.log('');
  sub('Favourable Factors (traditional)');
  kv('Lucky Numbers', lp.luckyNumbers.join(', '));
  kv('Lucky Days', lp.luckyDays.join(', '));
  kv('Lucky Colors', lp.luckyColors.join(', '));
  kv('Lucky Gemstone', lp.luckyGemstone);
  kv('Favourable Directions', lp.favorableDirections.join(', '));
  kv('Favourable Metal', lp.favorableMetal);
  console.log('');
  sub('Spiritual & Emotional');
  kv('Emotional Nature', lp.emotionalNature);
  kv('Spiritual Inclination', lp.spiritualInclination);
  console.log('  ' + C.dim + `Source: ${lp.source}` + C.reset);
}
