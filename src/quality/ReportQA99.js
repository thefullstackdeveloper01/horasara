/** Final report QA: catches missing explanation, unsupported certainty and provenance gaps. */
export function auditPredictionReport(report = {}) {
  const errors=[]; const warnings=[];
  if (!report.event) errors.push('missing event');
  if (!report.methodology) errors.push('missing methodology');
  if (report.probability != null && report.probabilityStatus !== 'EMPIRICALLY_CALIBRATED') errors.push('probability shown without empirical calibration');
  if (!report.evidenceScore && report.evidenceScore !== 0) errors.push('missing evidence score');
  if (!report.explanation) warnings.push('missing plain-language explanation');
  if (!report.provenance) warnings.push('missing source provenance');
  if (!report.timing) warnings.push('no timing result');
  return Object.freeze({ pass: errors.length===0, errors, warnings });
}
export function auditBatch(reports=[]) { const results=reports.map(auditPredictionReport); return Object.freeze({pass:results.every(r=>r.pass),total:results.length,failed:results.filter(r=>!r.pass).length,results}); }
