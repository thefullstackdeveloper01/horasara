/**
 * deepReportsAndChecklist.js — Sections 60-64:
 *   60. Planet-by-Planet Full Report
 *   61. Ascendant Deep Report
 *   62. Moon Sign Deep Report
 *   63. Nakshatra Deep Report
 *   64. Missing-Feature Checklist (engine capability audit)
 */
import { section, sub, kv, C } from '../console-ui.js';
import { buildReportCompleteness } from '../../src/reporting/ReportCompleteness.js';

function kvSmart(label, val) {
  if (val && typeof val === 'object' && val.status === 'NOT CALCULATED') {
    kv(label, C.dim + 'NOT CALCULATED' + C.reset);
    console.log('  ' + C.dim + `  Reason: ${val.reason}` + C.reset);
  } else if (Array.isArray(val)) {
    kv(label, val.join(', '));
  } else {
    kv(label, val ?? '-');
  }
}

export function printPlanetByPlanetReport(R) {
  section('60. PLANET-BY-PLANET INTERPRETATION — ग्रह विवेचन (All 9 Grahas)');
  const rows = R.planetByPlanetReport;
  if (!Array.isArray(rows)) {
    console.log('  ' + C.dim + '(unavailable: ' + (rows?.error || 'no data') + ')' + C.reset);
    return;
  }
  console.log('  ' + C.dim + 'Placement, sign, degree, nakshatra, house and motion are already shown in the canonical Planetary Position Master Table (Section 58). This section contains only interpretation and evidence to avoid repeating raw data.' + C.reset);
  console.log('');
  for (const p of rows) {
    if (p.status === 'NOT CALCULATED') {
      sub(p.planet);
      console.log('  ' + C.dim + `NOT CALCULATED — ${p.reason}` + C.reset);
      continue;
    }
    sub(p.planet);
    kvSmart('Strength', p.strength);
    kvSmart('Shadbala', p.shadbala && !p.shadbala.status ? `${p.shadbala.totalRupas} rupas (need ${p.shadbala.requiredRupas}) — ${p.shadbala.ratio}x, ${p.shadbala.grade}` : p.shadbala);
    kvSmart('Ashtakavarga Contribution', p.ashtakavargaContribution);
    kvSmart('Relevant Yogas', Array.isArray(p.relevantYogas) ? p.relevantYogas.map(y => typeof y === 'string' ? y : `${y.name} (${y.strength})`) : p.relevantYogas);
    kvSmart('Relevant Doshas', p.relevantDoshas);
    kvSmart('Dasha Activation', p.dashaActivation);
    kv('Life-Area Impact', p.lifeAreaImpact);
    kv('Classical Interpretation', p.classicalInterpretation);
    kv('Modern Synthesized Interpretation', p.modernSynthesizedInterpretation);
    kv('Weakness', p.weakness);
    kv('Timing', p.timing);
    kv('Confidence', p.confidence);
    console.log('');
  }
}

export function printAscendantDeepReport(R) {
  section('61. ASCENDANT DEEP REPORT — लग्न की व्याख्या');
  const a = R.ascendantDeepReport;
  if (!a || a.error) { console.log('  ' + C.dim + '(unavailable)' + C.reset); return; }
  console.log('  ' + C.dim + 'Ascendant sign, degree, nakshatra and lord are already shown in the Orientation/Calculation sections. This section focuses on derived interpretation.' + C.reset);
  kvSmart('Aspects on Lagna', a.aspectsOnLagna);
  kvSmart('Conjunctions in Lagna', a.conjunctionsInLagna);
  kv('Dispositor', a.dispositor);
  kvSmart('Physical Constitution', a.physicalConstitution);
  kvSmart('Personality', a.personality);
  kvSmart('Temperament', a.temperament);
  kvSmart('Behaviour', a.behaviour);
  kv('Strengths', a.strengths.join(', ') || '—');
  kv('Weaknesses', a.weaknesses.join(', ') || '—');
  kvSmart('Career Style', a.careerStyle);
  kvSmart('Relationship Style', a.relationshipStyle);
  kvSmart('Health Symbolism', a.healthSymbolism);
  kvSmart('Life Direction', a.lifeDirection);
  console.log('  ' + C.dim + a.source + C.reset);
}

export function printMoonSignDeepReport(R) {
  section('62. MOON SIGN DEEP REPORT — चंद्र राशि की व्याख्या');
  const m = R.moonSignDeepReport;
  if (!m || m.status === 'NOT CALCULATED') { console.log('  ' + C.dim + '(unavailable)' + C.reset); return; }
  console.log('  ' + C.dim + 'Moon sign, nakshatra and placement are already available in the canonical planetary table. This section focuses on derived interpretation.' + C.reset);
  kvSmart('Aspects', m.aspects);
  kvSmart('Conjunctions', m.conjunctions);
  kvSmart('Emotional Nature', m.emotionalNature);
  kv('Mental Tendencies', m.mentalTendencies);
  kv('Personality', m.personality);
  kv('Behaviour', m.behaviour);
  kv('Stress Response', m.stressResponse);
  kv('Relationships', m.relationships);
  kv('Health Symbolism', m.healthSymbolism);
  kv('Life Patterns', m.lifePatterns);
  console.log('  ' + C.dim + m.source + C.reset);
}

export function printNakshatraDeepReport(R) {
  section('63. NAKSHATRA DEEP REPORT — जन्म नक्षत्र की व्याख्या');
  const n = R.nakshatraDeepReport;
  if (!n || n.status === 'NOT CALCULATED') { console.log('  ' + C.dim + '(unavailable)' + C.reset); return; }
  console.log('  ' + C.dim + 'Nakshatra name, pada, lord and core attributes are already shown in the canonical planetary/nakshatra data. This section focuses on interpretation.' + C.reset);
  kvSmart('Symbol', n.symbol);
  kvSmart('Personality', n.personality);
  kvSmart('Education', n.education);
  kvSmart('Career', n.career);
  kvSmart('Income', n.income);
  kvSmart('Family', n.family);
  kvSmart('Marriage', n.marriage);
  kvSmart('Children', n.children);
  kvSmart('Behaviour', n.behaviour);
  kvSmart('Strengths', n.strengths);
  kvSmart('Weaknesses', n.weaknesses);
  kvSmart('Traditional Age Markers', n.traditionalAgeMarkers);
  kvSmart('Practical Interpretation', n.practicalInterpretation);
  console.log('  ' + C.dim + n.source + C.reset);
}

export function printFeatureChecklist(R) {
  const completeness = buildReportCompleteness(R);
  section('64. MISSING-FEATURE CHECKLIST — इंजन क्षमता लेखा-परीक्षा (Engine Capability Audit)');
  const list = R.featureChecklist;
  const summary = R.featureChecklistSummary;
  if (!Array.isArray(list)) { console.log('  ' + C.dim + '(unavailable)' + C.reset); return; }

  kv('Overall Report Completeness', `${completeness.overallPercent}% — ${completeness.status} (${completeness.available}/${completeness.total} required runtime blocks)`);
  kv('Completeness Method', completeness.methodology);
  kv('Summary', Object.entries(summary.byStatus).map(([k, v]) => `${k}: ${v}`).join('  |  ') + `  (Total: ${summary.total})`);
  console.log('');

  const colorFor = (s) => s === 'IMPLEMENTED' ? C.green : s === 'PARTIAL' ? C.yellow : C.red;
  for (const f of list) {
    console.log(`  ${colorFor(f.status)}[${f.status}]${C.reset} ${f.feature}`);
    if (f.note) console.log('     ' + C.dim + `Note: ${f.note}` + C.reset);
    if (f.reason) console.log('     ' + C.dim + `Reason: ${f.reason}` + C.reset);
  }
  console.log('');
  console.log('  ' + C.yellow + 'Per the No-Fabrication Rule: every NOT_SUPPORTED item above is intentionally' + C.reset);
  console.log('  ' + C.yellow + 'left out rather than filled with invented data.' + C.reset);
}
