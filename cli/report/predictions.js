/**
 * predictions.js — Section 17 (BPHS shloka-backed predictions), Section 18
 * (dasha-derived life events), Section 19 (current transits/Gochar),
 * Section 20 (Varshaphal year-by-year table).
 */
import { section, table, C, kv } from '../console-ui.js';

export function printBphsPredictions(R) {
  section('17. BPHS PREDICTIONS — बृहत् पराशर होरा शास्त्र आधारित भविष्यवाणी');
  if (!R.bphsPredictions) return;

  // The current-dasha prediction is the same for every life area (it's tied
  // to the person's one running dasha, not to any single area) — print it
  // once, up front, instead of repeating identical text under every heading.
  const sharedDasha = Object.values(R.bphsPredictions).find(p => p?.dashaPrediction)?.dashaPrediction;
  if (sharedDasha) {
    console.log(`  ${C.bold}CURRENT DASHA INFLUENCE (applies across all areas below):${C.reset}`);
    console.log(`  ⏰ ${sharedDasha}`);
    console.log('');
  }

  for (const [area, pred] of Object.entries(R.bphsPredictions)) {
    console.log(`  ${C.bold}${area.toUpperCase()}${C.reset}`);
    if (pred?.prediction) console.log('  ' + pred.prediction.split('\n\n').join('\n  '));
    else if (typeof pred === 'string') console.log('  ' + pred);
    console.log('');
  }
}

export function printLifeEvents(R) {
  section('18. PREDICTED LIFE EVENTS — संभावित जीवन घटनाएं (Dasha-based)');
  if (!R.lifeEvents?.length) return;
  for (const ev of R.lifeEvents) {
    console.log(`  ${C.yellow}●${C.reset} ${C.bold}${ev.event}${C.reset} [${ev.area}] — Evidence: ${ev.confidenceLabel} (${ev.confidence}%)`);
    console.log(`     ${ev.description}`);
    if (ev.timing) console.log(`     ${C.dim}Dasha window: ${ev.timing.mahadasha} (${ev.timing.startYear}-${ev.timing.endYear}) [${ev.timing.status}]${C.reset}`);
    const truth = R.predictionTruth?.events?.find(x => x.event === ev.event);
    if (truth) {
      console.log(`     ${C.dim}Truth layer: ${truth.status} | rule score ${truth.evidence?.classicalRuleScore ?? 'N/A'} | dasha support ${truth.evidence?.dashaSupport ? 'YES' : 'NO'}${C.reset}`);
      if (truth.windows?.length) {
        console.log(`     ${C.bold}Candidate timing windows (next 365 days):${C.reset}`);
        for (const w of truth.windows.slice(0, 3)) {
          console.log(`       • ${w.start} → ${w.end} | evidence ${w.evidenceScore}/100 | ${w.confidenceLabel}${w.dasha ? ` | Dasha: ${w.dasha}` : ''}`);
          if (w.startDateTime) console.log(`         Calculated local interval: ${w.startDateTime} → ${w.endDateTime}`);
          if (w.exactTriggers?.length) console.log(`         Exact natal-factor hits: ${w.exactTriggers.map(t => `${t.planet}→${t.target} ${t.angle}° @ ${t.dateTime || t.date}`).join(', ')}`);
          if (w.triggers?.length) console.log(`         House activations: ${w.triggers.map(t => `${t.planet} in H${t.houseFromAsc}/H${t.houseFromMoon}`).join(', ')}`);
        }
      } else {
        console.log(`     ${C.dim}No event-specific transit window found; the report keeps the broader Dasha indication instead of inventing a date.${C.reset}`);
      }
    }
    console.log('');
  }
}

export function printGochar(R) {
  section('19. GOCHAR — वर्तमान गोचर (Current Transits, ' + new Date().toDateString() + ')');
  if (!R.gochar) return;
  const rows = Object.values(R.gochar)
    .filter(g => g && g.planet)
    .map(g => [g.planet, g.transitSign, g.houseFromAsc, g.result, g.effect || '-']);
  if (rows.length) table(['Graha', 'Rashi', 'Bhava', 'Result', 'Effect'], rows);

  // Dasha + Transit combined: only meaningful when a running dasha lord
  // is also transiting a favorable/unfavorable house — flags double-weight periods.
  if (R.dashaTransit?.length) {
    console.log('');
    console.log(`  ${C.bold}DASHA × GOCHAR OVERLAP — वर्तमान दशा स्वामी का गोचर${C.reset}`);
    for (const d of R.dashaTransit) {
      const tag = d.power.startsWith('Double Favorable') ? C.green : C.red;
      console.log(`  ${tag}●${C.reset} ${C.bold}${d.planet}${C.reset} (${d.boost}) is transiting ${d.transitSign} — ${C.bold}${d.power}${C.reset}`);
    }
  }

  // Next sign ingress dates — when each planet's transit result above will change.
  if (R.nextIngress?.length) {
    console.log('');
    console.log(`  ${C.bold}UPCOMING SIGN CHANGES (Rashi Parivartan)${C.reset}`);
    const rows2 = R.nextIngress.slice(0, 9).map(i => [i.planet, `${i.currentSign} → ${i.nextSign}`, i.date, `${i.daysLeft}d`]);
    table(['Graha', 'Transition', 'Date', 'In'], rows2);
  }
}

export function printVarshaphal(R) {
  section('20. VARSHAPHAL — वार्षिक फल (Tajik Annual Chart / Solar Return)');
  if (!R.varshaphalTable?.length) return;
  console.log('  ' + C.dim + 'Varshapravesha — exact instant the Sun returns to its natal degree each year:' + C.reset);
  console.log('');
  const curYear = new Date().getFullYear();
  const rows = R.varshaphalTable
    .filter(v => v.year >= curYear - 2)
    .slice(0, 20)
    .map(v => [v.year, v.age, v.annualLagna, v.varshaLord, v.varshapravesha]);
  table(['Year', 'Age', 'Annual Lagna', 'Varsha Lord', 'Varshapravesha (exact entry moment)'], rows);

  const cy = R.varshaphalCurrentYear;
  if (!cy) return;

  console.log('');
  console.log(`  ${C.bold}CURRENT YEAR DEEP DIVE — Age ${cy.age} (${cy.year})${C.reset}`);
  kv('Varshapravesha', cy.varshapravesha);
  kv('Annual Lagna', cy.annualLagna);
  kv('Muntha', `${cy.muntha}  (lord: ${cy.munthaLord})`);
  if (cy.varshaLordBala) {
    const b = cy.varshaLordBala.bala;
    kv('Varshesha (Year Lord)', `${cy.varshaLordBala.lord} — ${b.total}/${b.maxScore} (${b.percentage}) — ${b.grade}`);
    if (cy.varshaLordBala.candidates?.length > 1) {
      console.log('  ' + C.dim + 'Candidates considered: ' +
        cy.varshaLordBala.candidates.map(c => `${c.planet} (${c.total})`).join(', ') + C.reset);
    }
  }

  if (cy.sahams && Object.keys(cy.sahams).length) {
    console.log('');
    console.log(`  ${C.bold}SAHAMS (Sensitive Points) — this year's chart${C.reset}`);
    table(['Saham', 'Sign'], Object.entries(cy.sahams).map(([name, s]) => [name, s.sign]));
  }

  if (cy.tajikAspects?.length) {
    console.log('');
    console.log(`  ${C.bold}TAJIK ASPECTS (Ithasala / Ishrafa) — this year's chart${C.reset}`);
    table(['Planet 1', 'Planet 2', 'Aspect', 'Type'],
      cy.tajikAspects.slice(0, 10).map(a => [a.planet1, a.planet2, a.aspect, a.type]));
  }

  if (cy.muddaDasha?.length) {
    console.log('');
    console.log(`  ${C.bold}MUDDA DASHA (Patyayini) — month-by-month for this year${C.reset}`);
    table(['Planet', 'Months', 'From', 'To'],
      cy.muddaDasha.map(m => [m.planet, m.months, m.startDate, m.endDate]));
  }
}
