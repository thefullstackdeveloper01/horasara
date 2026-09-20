import { createHash } from 'node:crypto';
import { deterministicClone } from '../../core/runtime/deterministicClone.js';
import { deepFreeze } from '../../core/runtime/deepFreeze.js';

const hash = value => createHash('sha256').update(JSON.stringify(deterministicClone(value))).digest('hex');

export class CalculationManifest {
  constructor({ engineVersion = '5.3.0', schemaVersion = 3, config = {}, input, datasets = {}, ephemeris = null, featureSet = [] } = {}) {
    const sortedFeatures = [...new Set(featureSet)].sort();
    const canonicalInput = deterministicClone(input);
    const canonicalConfig = deterministicClone(config);
    const canonicalDatasets = deterministicClone(datasets);
    const canonicalEphemeris = deterministicClone(ephemeris);
    this.engineVersion = engineVersion;
    this.schemaVersion = schemaVersion;
    this.inputHash = hash(canonicalInput);
    this.configHash = hash(canonicalConfig);
    this.datasetHash = hash(canonicalDatasets);
    this.featureHash = hash(sortedFeatures);
    this.fingerprint = hash({ input: canonicalInput, config: canonicalConfig, datasets: canonicalDatasets, ephemeris: canonicalEphemeris, featureSet: sortedFeatures });
    this.configuration = structuredClone(canonicalConfig);
    this.ephemeris = canonicalEphemeris || {};
    this.featureSet = sortedFeatures;
    deepFreeze(this.configuration); deepFreeze(this.ephemeris); deepFreeze(this.featureSet); Object.freeze(this);
  }
}
