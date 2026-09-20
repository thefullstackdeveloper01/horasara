import { AstronomyProviderRegistry } from '../infrastructure/astronomy/AstronomyProviderRegistry.js';
import { InternalVsop87Provider } from '../infrastructure/astronomy/InternalVsop87Provider.js';
import { SwissEphemerisProvider } from './providers/index.js';

/**
 * Fully offline provider registry.
 * Every production calculation runs inside Node.js with bundled JavaScript
 * algorithms/data. No Python, pip, native module or network service is used.
 */
export function createAstronomyProviderRegistry() {
  const providers = [new InternalVsop87Provider(), new SwissEphemerisProvider()];
  return new AstronomyProviderRegistry(providers);
}

export function resolveAstronomyProvider(id = process.env.JYOTISH_EPHEMERIS || 'internal') {
  const registry = createAstronomyProviderRegistry();
  if (id === 'auto' || id === 'internal' || id === 'builtin' || id === 'js') {
    return registry.get('internal-vsop87-abridged');
  }
  // 'swiss' remains a compatibility alias, but resolves to the bundled JS
  // provider only; it must never be described as the Swiss Ephemeris library.
  if (id === 'swiss' || id === 'swiss-ephemeris') return registry.get('reference-js-ephemeris');
  if (id === 'jpl') throw new Error('JPL provider is not bundled in this offline JS build; use a real JPL/DE441 data provider explicitly.');
  return registry.get(id);
}
