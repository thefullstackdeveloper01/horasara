/**
 * Honest name for the bundled deterministic JavaScript ephemeris.
 * It is intentionally NOT called Swiss Ephemeris because it is not the
 * Swiss Ephemeris library and does not claim Swiss/JPL precision.
 */
import { EphemerisProvider } from '../../infrastructure/astronomy/EphemerisProvider.js';
import { getAllPlanetPositions } from '../vsop87.js';

export class ReferenceJsEphemerisProvider extends EphemerisProvider {
  constructor() {
    super({ id: 'reference-js-ephemeris', version: 'builtin-meeus-vsop87-abridged-v2', precision: 'documented abridged JS series', runtime: 'node-js-only', externalRuntime: false });
    Object.freeze(this);
  }
  positions(input = {}, options = {}) {
    const JD_TT = Number(options.JD_TT);
    if (!Number.isFinite(JD_TT)) throw new TypeError('ReferenceJsEphemerisProvider requires finite JD_TT');
    return getAllPlanetPositions(JD_TT, 0, options.observer || null, { nodeMode: input.nodeMode || 'true' });
  }
}
