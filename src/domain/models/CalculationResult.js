/** Immutable boundary object around a completed calculation. */
export class CalculationResult {
  constructor({ data, diagnostics = [], metadata = {} }) {
    this.data = data;
    this.diagnostics = Object.freeze(diagnostics.map(x => Object.freeze({ ...x })));
    this.metadata = Object.freeze({ ...metadata }); Object.freeze(this);
  }
  get ok() { return !this.diagnostics.some(x => x?.status === 'ERROR'); }
  get degraded() { return this.diagnostics.length > 0; }
  get failed() { return this.diagnostics.some(x => x?.status === 'ERROR'); }
}
