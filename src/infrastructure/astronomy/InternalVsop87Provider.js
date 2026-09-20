import { getAllPlanetPositions } from '../../astronomy/vsop87.js';
import { EphemerisProvider } from './EphemerisProvider.js';

/** Built-in deterministic provider. The reduced series is explicitly versioned and never presented as Swiss-grade. */
export class InternalVsop87Provider extends EphemerisProvider {
  constructor() { super({ id:'internal-vsop87-abridged', version:'meeus-abridged', precision:'documented-truncated-series' }); Object.freeze(this); }
  positions(input, options = {}) {
    const { JD_TT } = options;
    if (!Number.isFinite(JD_TT)) throw new TypeError('InternalVsop87Provider requires finite JD_TT');
    return getAllPlanetPositions(JD_TT, 0, options.observer || null, { nodeMode: input?.nodeMode || options.nodeMode || 'true' });
  }
}
