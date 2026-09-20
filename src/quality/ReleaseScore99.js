/**
 * Transparent release scoring. 99+ is an ENGINEERING-CONTRACT score, not a
 * claim that astrology predicts real-world events with 99% accuracy.
 */
const clamp = (n) => Math.max(0, Math.min(100, Number(n) || 0));
export const RELEASE_SCORE_MODEL = Object.freeze({
  calculationArchitecture: 20,
  predictionPipeline: 20,
  auditability: 15,
  deterministicRuntime: 15,
  reportingAndExplanations: 10,
  validationInfrastructure: 10,
  safetyAndTruthfulness: 5,
  extensibility: 5,
});
export function calculateEngineeringReleaseScore(checks = {}) {
  const weights = RELEASE_SCORE_MODEL;
  const values = Object.entries(weights).map(([k, w]) => ({ key: k, weight: w, score: clamp(checks[k] ?? 0) }));
  const score = values.reduce((s, x) => s + x.weight * x.score / 100, 0);
  return Object.freeze({ score: Number(score.toFixed(2)), scale: 100, label: score >= 99 ? '99+ ENGINEERING CONTRACT' : score >= 90 ? '90+ ENGINEERING CONTRACT' : 'BELOW TARGET', breakdown: values });
}
