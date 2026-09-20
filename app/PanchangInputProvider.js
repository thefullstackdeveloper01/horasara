/** Compatibility application port for the original standalone Panchang input flow. */
import { gatherPanchangData } from '../cli/panchang-input.js';

export class PanchangInputProvider {
  async collect() {
    return gatherPanchangData();
  }
}
