/**
 * CompetitiveKernel is the integration boundary for the next-generation
 * architecture. It deliberately keeps calculation, evidence, timing and
 * interpretation separate so that one weak rule cannot silently overwrite
 * independently calculated facts.
 */
import { reconcileEvidence } from '../prediction/CompetitiveEvidenceEngine.js';

export function buildCompetitiveResult({ calculation = {}, evidenceStreams = [], timing = [], predictions = [] } = {}) {
  const evidence = reconcileEvidence(evidenceStreams);
  return Object.freeze({
    calculation,
    evidence,
    timing: Array.isArray(timing) ? timing : [],
    predictions: Array.isArray(predictions) ? predictions : [],
    contract: Object.freeze({
      order: ['calculation', 'evidence', 'timing', 'prediction', 'explanation'],
      deterministic: true,
      offline: true,
      probabilityClaim: false,
    }),
  });
}
