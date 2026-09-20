import { calculateChart } from '../../engine.js';

/** Anti-corruption adapter: keeps the verified internal math behind a stable port. */
export class InternalEngineAdapter {
  constructor({ engine = { calculateChart } } = {}) { this.engine = engine; }
  async calculate(birth) { return this.engine.calculateChart(birth); }
}
