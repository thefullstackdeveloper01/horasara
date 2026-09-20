import { getCanonicalCapabilityRegistry } from '../application/services/CanonicalCapabilityRegistry.js';

export function buildCapabilityGapReport(){
  const rows=getCanonicalCapabilityRegistry();
  const byStatus=rows.reduce((a,r)=>(a[r.status].push(r),a),{PASS:[],PARTIAL:[],FAIL:[]});
  return Object.freeze({total:rows.length, counts:{PASS:byStatus.PASS.length,PARTIAL:byStatus.PARTIAL.length,FAIL:byStatus.FAIL.length}, gaps:Object.freeze(byStatus), completionPercent:Number((byStatus.PASS.length/rows.length*100).toFixed(2))});
}
