#!/usr/bin/env node
/**
 * cli.js — Composition root.
 *
 * First asks which of the three modes the user wants (see cli/menu.js —
 * or pass --mode milan|reading|panchang non-interactively), then
 * constructs the collaborator classes for THAT mode and runs it:
 *
 *   - Kundali Reading  → JyotishApplication  (unchanged, original pipeline)
 *   - Kundali Milan    → MilanApplication    (groom + bride → Ashtakoot)
 *   - Daily Panchang   → PanchangApplication (date + place → Panchanga)
 *
 * This file still contains no astrology logic, no input-parsing logic,
 * and no rendering logic — see README.md §2/§3 for the architecture this
 * wires together, and each Application class's own header comment for
 * why it's a separate, sibling composition root rather than a branch
 * bolted into JyotishApplication.
 */
import { chooseMode } from './cli/menu.js';
import { BirthInputProvider } from './app/BirthInputProvider.js';
import { PanchangInputProvider } from './app/PanchangInputProvider.js';
import { ChartCalculatorService } from './app/ChartCalculatorService.js';
import { ConsoleReportRenderer } from './app/ConsoleReportRenderer.js';
import { JyotishApplication } from './app/JyotishApplication.js';
import { MilanApplication } from './app/MilanApplication.js';
import { PanchangApplication } from './app/PanchangApplication.js';
import { chooseReportScope } from './cli/report-scope.js';

async function main() {
  const mode = await chooseMode();

  if (mode === 'milan') {
    const app = new MilanApplication({
      groomInputProvider: new BirthInputProvider({
        prefix: 'groom-',
        label: '🤵 Groom (Var) ki Janm Kundali jaankari darj karein (Enter groom\'s birth details)',
      }),
      brideInputProvider: new BirthInputProvider({
        prefix: 'bride-',
        label: '👰 Bride (Vadhu) ki Janm Kundali jaankari darj karein (Enter bride\'s birth details)',
      }),
      chartCalculator: new ChartCalculatorService(),
    });
    return app.run();
  }

  if (mode === 'panchang') {
    const app = new PanchangApplication({
      panchangInputProvider: new PanchangInputProvider(),
      chartCalculator: new ChartCalculatorService(),
    });
    return app.run();
  }

  // Default / 'reading': select Basic vs Full first. Existing explicit
  // --report values remain supported, while non-interactive runs default to full.
  const reportScope = await chooseReportScope();
  const app = new JyotishApplication({
    birthDataProvider: new BirthInputProvider({ reportScope }),
    chartCalculator: new ChartCalculatorService(),
    reportRenderer: new ConsoleReportRenderer(),
  });
  return app.run();
}

main().catch((err) => {
  console.error('\n\x1b[31mFatal error while generating the report:\x1b[0m');
  console.error(err?.stack || err);
  process.exit(1);
});
