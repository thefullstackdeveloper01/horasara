/** Public calculation boundary. The implementation is injected through a provider. */
import { calculateChart as calculateInternalChart } from './engine/InternalCalculationEngine.js';

export async function calculateChart(birth) {
  return calculateInternalChart(birth);
}

export { SIGNS, NAKSHATRAS, NAKSHATRA_LORDS, DASHA_YEARS, DASHA_ORDER } from './engine/InternalCalculationEngine.js';
