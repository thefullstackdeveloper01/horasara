/**
 * Original single-person Kundali Reading application contract.
 * This is intentionally thin: input -> canonical calculator -> complete renderer.
 */
export class JyotishApplication {
  constructor({ birthDataProvider, chartCalculator, reportRenderer } = {}) {
    if (!birthDataProvider?.collect) throw new TypeError('JyotishApplication requires birthDataProvider.collect()');
    if (!chartCalculator?.calculate) throw new TypeError('JyotishApplication requires chartCalculator.calculate()');
    if (!reportRenderer?.render) throw new TypeError('JyotishApplication requires reportRenderer.render()');
    this.birthDataProvider = birthDataProvider;
    this.chartCalculator = chartCalculator;
    this.reportRenderer = reportRenderer;
  }

  async run() {
    const birth = await this.birthDataProvider.collect();
    const started = Date.now();
    const chart = await this.chartCalculator.calculate(birth);
    const elapsedMs = Date.now() - started;
    const scope = birth?.reportScope || 'complete';
    return this.reportRenderer.render(chart, elapsedMs, scope);
  }
}
