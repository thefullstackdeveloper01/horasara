/** Explicit dependency container. No service locator: dependencies are assembled once. */
export class ApplicationContainer {
  constructor({ kernel, logger = console } = {}) {
    if (!kernel?.calculate) throw new TypeError('ApplicationContainer requires a kernel');
    this.kernel = kernel;
    this.logger = logger;
  }
  chartCalculator() {
    return Object.freeze({ calculate: input => this.kernel.calculate(input).then(result => result.data) });
  }
}
