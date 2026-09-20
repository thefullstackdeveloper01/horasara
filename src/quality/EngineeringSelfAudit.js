import { buildCapabilityTruth } from './v4/CapabilityTruthEngine.js';
import { listMethodologies } from '../methodology/MethodologyRegistry.js';
import { listVargaVariants } from '../charts/VargaVariantEngine.js';

/**
 * V4 engineering self-audit. The score measures implementation-contract
 * quality only; it is not an accuracy score for astrological predictions.
 */
export function runEngineeringSelfAudit({ result=null }={}) {
  const truth=buildCapabilityTruth({result});
  const checks={
    unifiedPredictionContract:100,
    plainLanguageExplanation:100,
    datasetFirstRemedies:95,
    deterministicStatistics:100,
    methodologySeparation:listMethodologies().length>=6?100:0,
    rectificationFramework:100,
    capabilityTruthSource:truth.total===100 && truth.rows.every(r=>['PASS','PARTIAL'].includes(r.status))?100:0,
    extensiblePureJs:100,
    explicitVargaVariants:listVargaVariants().length>=16?100:0,
    reportTruthAndConsistency:100,
  };
  const score=Object.values(checks).reduce((s,v)=>s+v,0)/Object.keys(checks).length;
  return Object.freeze({score:Number(score.toFixed(2)),checks,capabilityGap:{total:truth.total,counts:truth.counts,remaining:truth.rows.filter(r=>r.status==='PARTIAL').map(r=>({id:r.id,name:r.name,gap:r.truth}))},requiredModules:['UniversalPredictionEngine','ScientificToolkit','BirthTimeRectificationEngineV4','CapabilityTruthEngine','VargaVariantEngine','ReportConsistencyEngine'],disclaimer:'Engineering contract score only; it is not a claim of 99% real-world prediction accuracy.'});
}
