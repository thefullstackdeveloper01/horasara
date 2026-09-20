const LEVELS = Object.freeze(['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH']);
const clamp = n => Math.max(0, Math.min(1, n));

/**
 * Transparent confidence heuristic. It is intentionally not a probability model.
 * Every score keeps its contributing factors so the report can explain it.
 */
export class ConfidenceEngine {
  evaluate({ calculationValidation = 0, birthTime = 0, datasetCompleteness = 0, ruleAvailability = 0, crossSystemAgreement = 0, inputPrecision = 0, boundarySensitivity = 0 } = {}) {
    const factors = { calculationValidation, birthTime, datasetCompleteness, ruleAvailability, crossSystemAgreement, inputPrecision, boundarySensitivity };
    for (const [key, value] of Object.entries(factors)) if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError(`${key} must be between 0 and 1`);
    const weights = { calculationValidation: .25, birthTime: .15, datasetCompleteness: .15, ruleAvailability: .15, crossSystemAgreement: .15, inputPrecision: .10, boundarySensitivity: .05 };
    const score = clamp(Object.entries(factors).reduce((sum, [key, value]) => sum + value * weights[key], 0));
    const level = score >= .80 ? 'HIGH' : score >= .60 ? 'MEDIUM' : score >= .35 ? 'LOW' : 'UNKNOWN';
    return Object.freeze({ level, score, factors: Object.freeze({ ...factors }), weights: Object.freeze({ ...weights }), probabilistic: false });
  }
  static levels() { return LEVELS; }
}
