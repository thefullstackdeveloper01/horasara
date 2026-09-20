/**
 * dasha.js — Section 7: Full life dasha timelines (Vimshottari Mahadasha/
 * Antardasha/Pratyantardasha, Chara Dasha, Yogini Dasha).
 */
import { section, sub, kv, table, C } from '../console-ui.js';

// FIX (audit Bug #9): R.dasha.current is legitimately null whenever the
// requested "current" date falls outside the birth chart's calculated
// 120-year Vimshottari cycle (e.g. a birth date old enough that all nine
// Mahadashas have already elapsed by today). The old code used `?.` to
// avoid a crash, but `${obj?.field}` still interpolates the *string*
// "undefined" into the printed report when obj is null — so the person
// saw "Mahadasha: undefined (undefined → undefined)" instead of an
// honest explanation. Centralize the "is this period over?" formatting
// here so every period line (Maha/Antar/Pratyantar) handles it the same,
// explicit way instead of three separate silent failures.
function formatPeriod(label, period, nameKey, startKey, endKey) {
  if (!period) {
    return `N/A — outside the calculated 120-year Vimshottari cycle for this chart (this dasha period has already run its full course)`;
  }
  return `${period[nameKey]} (${period[startKey]} → ${period[endKey]})`;
}

function progressBar(startStr, endStr) {
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  const now = Date.now();
  if (!start || !end || end <= start) return null;
  const pct = Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
  const filled = Math.round(pct / 10);
  return `[${'█'.repeat(filled)}${'░'.repeat(10 - filled)}] ${pct}% elapsed`;
}

// FIX (New-spec audit — Section 4 "Dasha Status Check"): every dasha
// table in this report showed only Start/End dates, leaving the person
// to work out for themselves whether a given period is in the past,
// currently running, or still to come. The spec explicitly requires this
// be marked explicitly. Single shared helper so every table (Mahadasha,
// Antardasha, Pratyantardasha, Chara, Yogini, Kalachakra) gets the same,
// consistently-computed label rather than five separate implementations
// that could drift out of sync with each other.
function dashaStatus(startStr, endStr) {
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  const now = Date.now();
  if (isNaN(start) || isNaN(end)) return '—';
  if (now < start) return 'Upcoming';
  if (now >= start && now < end) return 'Active';
  return 'Past';
}

export function printDasha(R) {
  section('7. VIMSHOTTARI DASHA — महादशा (Full Life Timeline)');
  kv('Dasha Balance at Birth', `${R.dasha.lord} — ${R.dasha.balance}`);

  console.log('');
  console.log('  ' + C.bold + 'CURRENT RUNNING PERIOD:' + C.reset);
  kv('  Mahadasha', formatPeriod('Mahadasha', R.dasha.current, 'mahadasha', 'mdStart', 'mdEnd'));
  const mdBar = R.dasha.current && progressBar(R.dasha.current.mdStart, R.dasha.current.mdEnd);
  if (mdBar) kv('    Progress', mdBar);
  kv('  Antardasha', formatPeriod('Antardasha', R.dasha.current, 'antardasha', 'adStart', 'adEnd'));
  const adBar = R.dasha.current && progressBar(R.dasha.current.adStart, R.dasha.current.adEnd);
  if (adBar) kv('    Progress', adBar);
  kv('  Pratyantardasha', formatPeriod('Pratyantardasha', R.dasha.current, 'pratyantar', 'ptStart', 'ptEnd'));
  const ptBar = R.dasha.current && progressBar(R.dasha.current.ptStart, R.dasha.current.ptEnd);
  if (ptBar) kv('    Progress', ptBar);

  console.log('');
  console.log('  ' + C.bold + 'FULL MAHADASHA TIMELINE (LIFE):' + C.reset);
  table(['Mahadasha', 'Start', 'End', 'Status'], R.dasha.timeline.map(d => [d.mahadasha, d.start, d.end, dashaStatus(d.start, d.end)]));

  console.log('');
  console.log('  ' + C.bold + 'ANTARDASHAS WITHIN CURRENT MAHADASHA:' + C.reset);
  table(['Antardasha', 'Start', 'End', 'Status'], (R.dasha.antardasha || []).map(a => [a.antardasha, a.start, a.end, dashaStatus(a.start, a.end)]));

  if (R.pratyantarList?.length) {
    console.log('');
    console.log('  ' + C.bold + 'PRATYANTARDASHAS WITHIN CURRENT ANTARDASHA:' + C.reset);
    table(['Pratyantardasha', 'Start', 'End', 'Status'], R.pratyantarList.map(p => [p.pratyantar, p.start, p.end, dashaStatus(p.start, p.end)]));
  }

  sub('Chara Dasha (Jaimini)');
  table(['Sign', 'Start', 'End', 'Status'], (R.dasha.chara || []).slice(0, 9).map(c => [c.sign, c.start, c.end, dashaStatus(c.start, c.end)]));

  sub('Yogini Dasha');
  table(['Yogini', 'Start', 'End', 'Status'], (R.dasha.yogini || []).slice(0, 8).map(y => [y.yogini || y.name, y.start, y.end, dashaStatus(y.start, y.end)]));

  if (R.dasha.kalachakra) {
    sub('Kalachakra Dasha ("Wheel of Time")');
    console.log('  ' + C.dim + 'One documented scholarly interpretation of a classically disputed' + C.reset);
    console.log('  ' + C.dim + 'system — see src/dasha/kalachakra.js for the specific source and' + C.reset);
    console.log('  ' + C.dim + 'known alternate views. Natal: ' + R.dasha.kalachakra.natalNakshatra + ' pada ' + R.dasha.kalachakra.natalPada + C.reset);
    table(['Sign', 'Start', 'End', 'Status'], R.dasha.kalachakra.dashas.slice(0, 9).map(k => [k.sign, k.start, k.end, dashaStatus(k.start, k.end)]));
  }
}
