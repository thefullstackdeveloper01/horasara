/**
 * numerology-insights.js — Section 15 (Numerology) and Section 16
 * (life-area scores + narrative insights).
 */
import { section, sub, C } from '../console-ui.js';

export function printNumerology(R) {
  section('15. NUMEROLOGY — अंक ज्योतिष');
  if (!R.numerology?.numbers) return;
  for (const [key, val] of Object.entries(R.numerology.numbers)) {
    if (val && typeof val === 'object' && 'value' in val) {
      console.log(`  ${key.padEnd(14)} : ${val.value}  — ${val.name || ''}`);
      if (val.desc) console.log(`  ${' '.repeat(16)}${C.dim}${val.desc}${C.reset}`);
    }
  }
}

export function printLifeAreaInsights(R) {
  section('16. LIFE AREA INSIGHTS — जीवन क्षेत्र विश्लेषण');

  if (R.lifeAreaScores) {
    sub('Domain Strength Scorecard (0-100)');
    for (const [area, obj] of Object.entries(R.lifeAreaScores)) {
      let pct;
      if (obj && typeof obj === 'object' && 'score' in obj) {
        pct = Math.round((obj.score / 5) * 100);
      } else if (typeof obj === 'number') {
        pct = Math.round(obj);
      } else {
        continue;
      }
      const color = pct >= 70 ? C.green : pct >= 40 ? C.yellow : C.red;
      const filled = Math.round(pct / 10);
      const label = (obj?.label || area).padEnd(28);
      const gradeText = obj?.grade ? `  (${obj.grade})` : '';
      console.log(`  ${label}: ${color}[${'█'.repeat(filled)}${'░'.repeat(10 - filled)}] ${String(pct).padStart(3)}/100${C.reset}${gradeText}`);
    }
  }

  if (R.insights) {
    sub('Detailed Insights');
    for (const [area, text] of Object.entries(R.insights)) {
      console.log(`  ${C.bold}${area.toUpperCase()}${C.reset}`);
      console.log('  ' + text);
      console.log('');
    }
  }
}
