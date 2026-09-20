/**
 * Cross-section report consistency gate. It catches stale/contradictory
 * presentation before PDF rendering without recalculating the chart.
 */
const has = (v) => v !== null && v !== undefined && v !== '';
const arr = v => Array.isArray(v) ? v : [];
const flatten = (v, out=[]) => {
  if (v == null) return out;
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach(x=>flatten(x,out));
  else if (typeof v === 'object') Object.values(v).forEach(x=>flatten(x,out));
  return out;
};

export function auditReportConsistency(report={}, result={}) {
  const errors=[]; const warnings=[];
  const sections=arr(report.sections);
  const ids=new Set(sections.map(s=>s?.id).filter(Boolean));
  for (const required of ['executive','calculation-audit','planetary-position','houses','vargas','dasha','prediction','timing','evidence','provenance','validation','qa']) {
    if (!ids.has(required)) errors.push(`MISSING_SECTION:${required}`);
  }
  if (report.fingerprint && result.calculationAuditFinal?.input?.fingerprint && report.fingerprint !== result.calculationAuditFinal.input.fingerprint) errors.push('FINGERPRINT_MISMATCH');
  if (result.planets && sections.some(s=>s.id==='planetary-position') && !result.planets.length) errors.push('PLANETS_MISSING');
  if (result.dasha && !result.dasha.current && !result.dasha.timeline?.length) warnings.push('DASHA_NO_CURRENT_OR_TIMELINE');
  const text=flatten(sections.filter(s=>!['validation','qa'].includes(s?.id))).join('\n');
  if (/Swiss Ephemeris.*true|100% accurate|scientifically proven astrology|guaranteed prediction/i.test(text)) errors.push('UNSUPPORTED_PRODUCT_CLAIM');
  if (arr(report.predictions).some(p=>p?.probability!=null && p?.probabilityStatus!=='EMPIRICALLY_CALIBRATED')) errors.push('UNCALIBRATED_PROBABILITY');
  const duplicateIds=sections.length-new Set(sections.map(s=>s?.id)).size;
  if (duplicateIds) errors.push('DUPLICATE_SECTION_IDS');
  return Object.freeze({pass:errors.length===0,errors,warnings,sectionCount:sections.length,uniqueSectionCount:new Set(sections.map(s=>s?.id)).size});
}

export function assertReportConsistency(report,result){
  const audit=auditReportConsistency(report,result);
  if(!audit.pass){const e=new Error(`Report consistency failed: ${audit.errors.join(', ')}`);e.audit=audit;throw e;}
  return audit;
}
