/** Immutable domain value object for birth/calculation input. */
export class BirthData {
  constructor(input) {
    if (!input || typeof input !== 'object') throw new TypeError('BirthData requires an object');
    Object.assign(this, structuredClone(input));
    Object.freeze(this);
  }
}
