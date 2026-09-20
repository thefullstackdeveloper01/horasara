import { buildEventPrediction } from './EventPredictionEngine.js';
import { buildPredictionExplanation } from './PredictionExplanationEngine.js';
import { resolveRemedies } from './RemedyResolutionEngine.js';
import { auditPredictionReport } from '../quality/ReportQA99.js';

/** Single auditable output contract for every event prediction surface. */
export function buildUnifiedPrediction(input = {}) {
  const prediction = buildEventPrediction(input);
  const explanation = buildPredictionExplanation({event: prediction.event, factors: input.factors || input.ruleMatches || [], timing: prediction.timing, methodology: prediction.methodology});
  const remedies = resolveRemedies({event: prediction.event, issues: input.issues || [], datasets: input.remedyDatasets || []});
  const report = Object.freeze({...prediction, explanation: explanation.summary, explanationDetail: explanation, remedies, provenance: input.provenance || null});
  return Object.freeze({...report, qa: auditPredictionReport(report)});
}
