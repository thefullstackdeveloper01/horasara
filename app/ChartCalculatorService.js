/**
 * Compatibility facade retained for the original CLI/application contract.
 * The authoritative calculation implementation remains the existing engine.
 */
import { calculateChart } from '../src/engine/InternalCalculationEngine.js';

export class ChartCalculatorService {
  async calculate(input) {
    return calculateChart(input);
  }
}
