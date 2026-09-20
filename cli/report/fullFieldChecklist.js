/**
 * fullFieldChecklist.js — Prints the complete 60-Section Master Spec field
 * listing for this Kundali report: every calculation field, then every
 * prediction field, point-wise, each marked AVAILABLE / PARTIAL /
 * NOT_AVAILABLE against what this engine build actually computes.
 *
 * This is a pure listing section — additive only, does not alter or
 * replace any existing section or calculation.
 */
import { section, sub, C } from '../console-ui.js';

const colorFor = (s) =>
  s === 'AVAILABLE' ? C.green : s === 'PARTIAL' ? C.yellow : C.red;

function printGroup(g) {
  sub(g.group);
  for (const it of g.items) {
    console.log(`  ${colorFor(it.status)}[${it.status}]${C.reset} ${it.field}`);
    if (it.note) console.log('     ' + C.dim + `Note: ${it.note}` + C.reset);
    if (it.reason) console.log('     ' + C.dim + `Reason: ${it.reason}` + C.reset);
  }
}

export function printFullFieldChecklist(R) {
  section('64–65. CONSOLIDATED ENGINE AUDIT — क्षमता + पूर्ण Field Coverage');

  const calc = R.fullFieldChecklistCalculations;
  const pred = R.fullFieldChecklistPredictions;
  const summary = R.fullFieldChecklistSummary;

  if (!Array.isArray(calc) || !Array.isArray(pred)) {
    console.log('  ' + C.dim + '(unavailable)' + C.reset);
    return;
  }

  if (summary) {
    console.log(
      '  ' + C.dim + 'Summary: ' + C.reset +
      Object.entries(summary).map(([k, v]) => `${k}: ${v}`).join('  |  ')
    );
  }

  console.log('');
  console.log(C.bold + C.cyan + '  ── PART A — CALCULATIONS COVERAGE ──────────────────────────────' + C.reset);
  for (const g of calc) printGroup(g);

  console.log('');
  console.log(C.bold + C.cyan + '  ── PART B — PREDICTIONS / INTERPRETATIONS ─────────────' + C.reset);
  for (const g of pred) printGroup(g);

  console.log('');
  console.log('  ' + C.dim + 'Status meanings: AVAILABLE = implemented and exposed; PARTIAL = implemented only for a subset; NOT_AVAILABLE = intentionally not fabricated.' + C.reset);
}

export default { printFullFieldChecklist };
