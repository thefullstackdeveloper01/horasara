import { C, box, kv, sub } from '../console-ui.js';
import { buildBasicReport } from '../../src/reporting/BasicReport.js';

function printSection(s) {
  sub(s.title);
  if (s.pre) for (const p of s.pre) console.log('\n' + p + '\n');
  if (s.rows) for (const [k,v] of s.rows) kv(k, v);
  if (s.table) {
    console.log('');
    console.log('  ' + C.bold + s.table.headers.join(' | ') + C.reset);
    for (const row of s.table.rows) console.log('  ' + row.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v ?? '-')).join(' | '));
  }
}

export function printBasicReport(R, elapsedMs = 0) {
  const report = buildBasicReport(R, {elapsedMs});
  box('🕉️   BASIC VEDIC JYOTISH REPORT (मूल जन्म कुंडली)  🕉️');
  console.log('');
  console.log(C.dim + '  Basic Report — concise customer-facing birth chart summary. Full calculations remain available in Full Report.' + C.reset);
  console.log('');
  for (const s of report.sections) printSection(s);
  box('✨  END OF BASIC REPORT — मूल रिपोर्ट समाप्त  ✨');
  return report;
}
