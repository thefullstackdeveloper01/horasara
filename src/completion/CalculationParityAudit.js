import { SUPPORTED_VARIANTS, UNSUPPORTED_VARIANTS } from './SupportedVariantRegistry.js';

/** Detects claims that are broader than the actually encoded calculation corpus. */
export function auditCalculationParity() {
  const findings=[];
  for(const [domain,variants] of Object.entries(SUPPORTED_VARIANTS)){
    for(const [name,id] of Object.entries(variants)){
      if(!id || typeof id!=='string') findings.push({severity:'FAIL',domain,name,reason:'Variant has no explicit implementation id'});
    }
  }
  findings.push({severity:'INFO',domain:'unsupported',count:UNSUPPORTED_VARIANTS.examples.length,reason:'Unencoded lineages remain explicitly unsupported'});
  return {status:findings.some(f=>f.severity==='FAIL')?'FAIL':'PASS',findings,policy:'No universal-complete claim may be emitted for an unencoded lineage.'};
}
