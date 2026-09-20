/**
 * Scientific Assurance Layer
 * ===========================
 * This module defines what the engine can legitimately call "validated".
 * It deliberately separates:
 *   1) deterministic mathematical correctness,
 *   2) independent astronomical reference parity,
 *   3) classical-text traceability, and
 *   4) empirical prediction validation.
 *
 * It NEVER treats astrological tradition as scientific proof of predictive
 * efficacy. Prediction claims require labelled, independently collected,
 * leakage-controlled outcome data.
 */
import crypto from 'node:crypto';

const sha256 = value => crypto.createHash('sha256').update(String(value)).digest('hex');

export const ASSURANCE_LEVELS = Object.freeze({
  DETERMINISTIC: 'DETERMINISTIC',
  REFERENCE_VERIFIED: 'REFERENCE_VERIFIED',
  CLASSICAL_TRACEABLE: 'CLASSICAL_TRACEABLE',
  EMPIRICALLY_VALIDATED: 'EMPIRICALLY_VALIDATED',
  NOT_CERTIFIED: 'NOT_CERTIFIED',
});

export function buildCalculationAssurance({
  calculation = null,
  invariants = [],
  referenceChecks = [],
  ruleProvenance = [],
  outcomeValidation = null,
} = {}) {
  const deterministic = calculation?.deterministic === true && invariants.length > 0 && invariants.every(x => x?.passed === true);
  const referenceVerified = deterministic && referenceChecks.length > 0 && referenceChecks.every(x => x?.passed === true && x?.independent === true);
  const classicalTraceable = ruleProvenance.length > 0 && ruleProvenance.every(x => x?.source && x?.formulaId);
  const empiricalValidated = referenceVerified && outcomeValidation?.status === 'PASSED' && Number(outcomeValidation?.eligibleCases || 0) >= 100;

  let level = ASSURANCE_LEVELS.NOT_CERTIFIED;
  if (deterministic) level = ASSURANCE_LEVELS.DETERMINISTIC;
  if (classicalTraceable && level === ASSURANCE_LEVELS.DETERMINISTIC) level = ASSURANCE_LEVELS.CLASSICAL_TRACEABLE;
  if (referenceVerified) level = ASSURANCE_LEVELS.REFERENCE_VERIFIED;
  if (empiricalValidated) level = ASSURANCE_LEVELS.EMPIRICALLY_VALIDATED;

  return Object.freeze({
    level,
    claims: {
      deterministicCalculation: deterministic,
      independentAstronomicalReferenceParity: referenceVerified,
      classicalRuleTraceability: classicalTraceable,
      empiricalPredictionValidation: empiricalValidated,
      scientificProofOfAstrology: false,
    },
    gate: empiricalValidated ? 'PREDICTION_VALIDATION_GATE_PASSED' : 'CALCULATION_VALIDATION_ONLY',
    reason: empiricalValidated
      ? 'Prediction metrics passed the empirical validation contract on labelled outcome data.'
      : 'No code-only test can prove astrological predictive efficacy; only calculation correctness and reproducibility can be certified without independent outcome data.',
    fingerprints: {
      calculation: calculation ? sha256(JSON.stringify(calculation)) : null,
      invariants: sha256(JSON.stringify(invariants)),
      references: sha256(JSON.stringify(referenceChecks)),
      rules: sha256(JSON.stringify(ruleProvenance)),
      outcomes: outcomeValidation ? sha256(JSON.stringify(outcomeValidation)) : null,
    },
  });
}

export function validateOutcomeGate({ eligibleCases = 0, metrics = {}, leakageDetected = false, independent = false } = {}) {
  const n = Number(eligibleCases);
  const finiteMetrics = Object.values(metrics).every(v => Number.isFinite(Number(v)));
  const passed = n >= 100 && independent === true && leakageDetected === false && finiteMetrics;
  return {
    status: passed ? 'PASSED' : 'BLOCKED',
    eligibleCases: n,
    independent,
    leakageDetected,
    metrics,
    reasons: [
      ...(n < 100 ? ['At least 100 eligible labelled outcome cases are required for this gate.'] : []),
      ...(!independent ? ['Outcome data must be independently collected or externally auditable.'] : []),
      ...(leakageDetected ? ['Temporal/data leakage invalidates the validation.'] : []),
      ...(!finiteMetrics ? ['All supplied validation metrics must be finite numeric values.'] : []),
    ],
  };
}

export function buildReproducibilityManifest({ input, result, algorithmVersion, datasetFingerprints = {} } = {}) {
  const canonical = JSON.stringify({ input, result, algorithmVersion, datasetFingerprints });
  return Object.freeze({
    algorithmVersion: String(algorithmVersion || 'unknown'),
    inputFingerprint: sha256(JSON.stringify(input ?? null)),
    resultFingerprint: sha256(JSON.stringify(result ?? null)),
    datasetFingerprints: { ...datasetFingerprints },
    reproducibilityFingerprint: sha256(canonical),
  });
}

export default { buildCalculationAssurance, validateOutcomeGate, buildReproducibilityManifest, ASSURANCE_LEVELS };
