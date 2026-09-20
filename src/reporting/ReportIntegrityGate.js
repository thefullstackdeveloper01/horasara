/**
 * Final customer-report integrity gate.
 *
 * This is deliberately conservative: it validates the report contract and
 * blocks unsupported certainty language. It does not certify astrology.
 */
import reportingData from '../../dataset/used/core/reporting-policy.json' with { type: 'json' };
const FORBIDDEN_CERTAINTY = reportingData.forbiddenCertaintyPatterns.map(pattern=>new RegExp(pattern,'i'));
const REQUIRED_SECTION_IDS = reportingData.requiredSectionIds;

function flattenStrings(value, out = []) {
  if (value == null) return out;
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach(v => flattenStrings(v, out));
  else if (typeof value === 'object') Object.values(value).forEach(v => flattenStrings(v, out));
  return out;
}

export function auditReportIntegrity(report = {}) {
  const errors = [];
  const warnings = [];
  const ids = new Set((report.sections || []).map(s => s?.id).filter(Boolean));

  if (!report.reportVersion) errors.push('REPORT_VERSION_MISSING');
  if (!report.generatedAt) errors.push('GENERATED_AT_MISSING');
  if (!report.fingerprint) warnings.push('CALCULATION_FINGERPRINT_MISSING');
  for (const id of REQUIRED_SECTION_IDS) if (!ids.has(id)) warnings.push(`SECTION_MISSING:${id}`);

  const customerSurface = {
    predictions: report.predictions || [],
    sections: (report.sections || []).filter(s => !['validation','qa','capability-registry','provenance'].includes(s?.id)),
  };
  const strings = flattenStrings(customerSurface);
  for (const rule of FORBIDDEN_CERTAINTY) {
    if (strings.some(s => rule.test(s) && !/\bnot\b[^.]{0,80}\bguaranteed\b/i.test(s))) errors.push(`UNSUPPORTED_CERTAINTY:${rule.source}`);
  }

  const predictions = report.predictions || [];
  for (const p of predictions) {
    if (p?.probability != null && p?.probabilityStatus !== 'EMPIRICALLY_CALIBRATED') {
      errors.push(`UNCALIBRATED_PROBABILITY:${p.event || 'unknown'}`);
    }
  }

  const pass = errors.length === 0;
  return Object.freeze({ pass, errors, warnings, requiredSections: REQUIRED_SECTION_IDS.length, presentSections: ids.size });
}
