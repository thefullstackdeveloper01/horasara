/**
 * Backward-compatible report-engine name retained from the previous release.
 * The current canonical implementation is HoraSaarReportEngine; this adapter
 * preserves the old import/API so PDF generation and older integrations keep working.
 */
import { buildHoraSaarReport } from './HoraSaarReportEngine.js';

export function buildJyotiVedaReport(result, options = {}) {
  const report = buildHoraSaarReport(result, { ...options, version: options.version || '4.0' });
  return Object.freeze({
    ...report,
    title: 'JyotiVeda — Authentic & Powerful Jyotish Calculation + Prediction Report',
  });
}
