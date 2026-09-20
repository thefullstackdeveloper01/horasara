/**
 * ghatak.js — Section 50: GHATAK (UNFAVOURABLE) & FAVOURABLE POINTS
 * Traditional/classical timing-and-selection points derived from this
 * chart's own values. These are traditional Jyotish indicators, not
 * scientifically verified facts — presented that way throughout.
 */
import { section, sub, kv, C } from '../console-ui.js';

function printList(label, entry, formatter = (v) => String(v)) {
  if (!entry) return;
  if (entry.status === 'NOT_AVAILABLE') {
    kv(label, C.dim + 'STATUS = NOT_AVAILABLE' + C.reset);
    console.log('  ' + C.dim + `  REASON = ${entry.reason}` + C.reset);
    return;
  }
  const vals = entry.values || [];
  const text = vals.length ? vals.map(formatter).join(', ') : '(none identified)';
  kv(label, text);
  console.log('  ' + C.dim + `  Source: ${entry.source}` + C.reset);
}

export function printGhatakFavourable(R) {
  section('50. GHATAK / UNFAVOURABLE & FAVOURABLE POINTS — घातक व शुभ बिंदु');
  console.log('  ' + C.yellow + 'Note: everything in this section is traditional Jyotish/Muhurta belief,' + C.reset);
  console.log('  ' + C.yellow + 'not a scientifically verified fact. Each line states its classical source.' + C.reset);

  if (R.ghatak?.error || R.favourable?.error) {
    console.log('  ' + C.dim + '(unavailable: ' + (R.ghatak?.error || R.favourable?.error) + ')' + C.reset);
    return;
  }

  const g = R.ghatak || {};
  const f = R.favourable || {};

  sub('Ghatak / Unfavourable');
  printList('Bad Day', g.badDay);
  printList('Bad Karan', g.badKaran);
  printList('Bad Lagna', g.badLagna);
  printList('Bad Month', g.badMonth);
  printList('Bad Nakshatra', g.badNakshatra);
  printList('Bad Prahar', g.badPrahar, (p) => `${p.name} (${p.window})`);
  printList('Bad Rashi', g.badRashi);
  printList('Bad Tithi', g.badTithi);
  printList('Bad Yoga', g.badYoga);
  printList('Bad Planets', g.badPlanets, (p) => `${p.planet} (${p.nature})`);

  console.log('');
  sub('Favourable');
  printList('Lucky Numbers', f.luckyNumbers);
  printList('Good Numbers', f.goodNumbers);
  printList('Challenging Numbers', f.challengingNumbers);
  printList('Good Years (Dasha)', f.goodYears, (y) => `${y.mahadasha} Mahadasha (${y.nature})`);
  printList('Lucky Days', f.luckyDays);
  printList('Good Planets', f.goodPlanets, (p) => `${p.planet} (${p.nature})`);
  printList('Friendly Signs', f.friendlySigns);
  printList('Good Lagna', f.goodLagna);
  printList('Lucky Metal', f.luckyMetal);
  printList('Lucky Stone', f.luckyStone, (s) => `${s.stone} (${s.planet}, set in ${s.metal}, ${s.finger}, ${s.day})`);
}
