/** Original two-chart Kundali Milan application contract. */
import { calcFullMilan } from '../src/milan/ashtakoot.js';

export class MilanApplication {
  constructor({ groomInputProvider, brideInputProvider, chartCalculator } = {}) {
    if (!groomInputProvider?.collect || !brideInputProvider?.collect) throw new TypeError('MilanApplication requires both input providers');
    if (!chartCalculator?.calculate) throw new TypeError('MilanApplication requires chartCalculator.calculate()');
    this.groomInputProvider = groomInputProvider;
    this.brideInputProvider = brideInputProvider;
    this.chartCalculator = chartCalculator;
  }

  async run() {
    const groom = await this.groomInputProvider.collect();
    const bride = await this.brideInputProvider.collect();
    const started = Date.now();
    const [groomChart, brideChart] = await Promise.all([
      this.chartCalculator.calculate(groom),
      this.chartCalculator.calculate(bride),
    ]);
    const result = calcFullMilan(groomChart, brideChart);
    const elapsedMs = Date.now() - started;
    console.log('\n' + '='.repeat(78));
    console.log('  KUNDALI MILAN — COMPLETE ASHTAKOOT / DASHAKOOT REPORT');
    console.log('='.repeat(78));
    console.log(`  Groom: ${groom.name || 'Groom'}    Bride: ${bride.name || 'Bride'}`);
    console.log(`  Calculation time: ${elapsedMs} ms`);
    console.dir(result, { depth: 12 });
    console.log('='.repeat(78));
    return result;
  }
}
