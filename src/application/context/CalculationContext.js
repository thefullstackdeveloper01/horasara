/**
 * Immutable calculation context shared by calculation modules.
 * The context separates inputs, configuration, computed data, evidence and diagnostics.
 */
export class CalculationContext {
  constructor({ birth, chart = null, config = {}, datasets = null, results = {}, evidence = [], diagnostics = [], metadata = {} } = {}) {
    if (!birth) throw new TypeError('CalculationContext requires birth data');
    this.birth = birth;
    this.chart = chart;
    this.config = config;
    this.datasets = datasets;
    this.results = Object.freeze({ ...results });
    this.evidence = Object.freeze([...evidence]);
    this.diagnostics = Object.freeze([...diagnostics]);
    this.metadata = Object.freeze({ ...metadata });
    Object.freeze(this);
  }

  withResults(results) { return new CalculationContext({ ...this, results }); }
  withEvidence(...evidence) { return new CalculationContext({ ...this, evidence: [...this.evidence, ...evidence.flat()] }); }
  withDiagnostics(...diagnostics) { return new CalculationContext({ ...this, diagnostics: [...this.diagnostics, ...diagnostics.flat()] }); }
}
