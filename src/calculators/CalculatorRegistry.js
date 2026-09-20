import catalog from '../../dataset/used/core/calculator_catalog_v15.json' with { type: 'json' };

export function listCalculators() { return Object.freeze(catalog.calculators.map(x => ({ ...x }))); }
export function getCalculator(id) { return catalog.calculators.find(x => x.id === id) || null; }
export function listPanchangFeatures() { return Object.freeze(catalog.panchang.map(x => ({ ...x }))); }
export function listHoroscopeRoutes() { return Object.freeze(catalog.horoscopeRoutes.map(x => ({ ...x }))); }
export function buildCalculatorAudit() {
  return { version: catalog.version, totalCalculators: catalog.calculators.length, totalPanchangFeatures: catalog.panchang.length, totalHoroscopeRoutes: catalog.horoscopeRoutes.length, calculators: listCalculators(), panchang: listPanchangFeatures(), horoscopeRoutes: listHoroscopeRoutes() };
}
