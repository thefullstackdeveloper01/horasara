/** Compatibility application port for the original CLI birth-input provider. */
import { gatherBirthData } from '../cli/birth-input.js';

export class BirthInputProvider {
  constructor({ prefix = '', label, reportScope } = {}) {
    this.prefix = prefix;
    this.label = label;
    this.reportScope = reportScope;
  }
  async collect() {
    return gatherBirthData({ prefix: this.prefix, label: this.label, reportScope: this.reportScope });
  }
}
