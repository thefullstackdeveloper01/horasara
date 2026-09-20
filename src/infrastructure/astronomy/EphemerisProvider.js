/** Stable astronomy boundary. Implementations can be swapped without changing astrology modules. */
export class EphemerisProvider {
  constructor({ id = 'unknown', version = '0.0.0', precision = 'unknown' } = {}) {
    this.id = id; this.version = version; this.precision = precision;
  }
  positions() { throw new Error(`${this.id} does not implement positions()`); }
  metadata() { return Object.freeze({ id: this.id, version: this.version, precision: this.precision }); }
}

export class FunctionEphemerisProvider extends EphemerisProvider {
  constructor({ id, version, precision, calculate }) {
    super({ id, version, precision });
    if (typeof calculate !== 'function') throw new TypeError('FunctionEphemerisProvider requires calculate()');
    this._calculate = calculate;
    Object.freeze(this);
  }
  positions(input, options = {}) { return this._calculate(input, options); }
}
