/** Original standalone Daily Panchang application contract. */
export class PanchangApplication {
  constructor({ panchangInputProvider, chartCalculator } = {}) {
    if (!panchangInputProvider?.collect) throw new TypeError('PanchangApplication requires panchangInputProvider.collect()');
    if (!chartCalculator?.calculate) throw new TypeError('PanchangApplication requires chartCalculator.calculate()');
    this.panchangInputProvider = panchangInputProvider;
    this.chartCalculator = chartCalculator;
  }

  async run() {
    const input = await this.panchangInputProvider.collect();
    const started = Date.now();
    const chart = await this.chartCalculator.calculate(input);
    const elapsedMs = Date.now() - started;
    console.log('\n' + '='.repeat(78));
    console.log('  DAILY PANCHANG — COMPLETE REPORT');
    console.log('='.repeat(78));
    console.log(`  Date: ${input.day}-${input.month}-${input.year}    Place: ${input.place || 'Not available'}`);
    console.log(`  Calculation time: ${elapsedMs} ms`);
    console.dir(chart.panchanga, { depth: 12 });
    console.log('='.repeat(78));
    return chart.panchanga;
  }
}
