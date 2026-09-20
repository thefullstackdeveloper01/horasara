import { buildCapabilityTruth, assertCapabilityTruth } from './CapabilityTruthEngine.js';
import { auditReportConsistency } from './ReportConsistencyEngine.js';
import { auditReportIntegrity } from '../../reporting/ReportIntegrityGate.js';

export function evaluateV4Release({result=null,report=null,testsPassed=true}={}){
  const capability=buildCapabilityTruth({result}); assertCapabilityTruth(capability);
  const integrity=report?auditReportIntegrity(report):{pass:true,errors:[],warnings:[]};
  const consistency=report?auditReportConsistency(report,result):{pass:true,errors:[],warnings:[]};
  const fail=[...capability.rows.filter(r=>r.status==='FAIL').map(r=>`CAPABILITY_FAIL:${r.id}`),...(testsPassed?[]:['TEST_SUITE_FAILED']),...(integrity.pass?[]:integrity.errors),...(consistency.pass?[]:consistency.errors)];
  return Object.freeze({release: '4.0.0',ready:fail.length===0,productionStatus:fail.length===0?'RELEASE_CANDIDATE':'BLOCKED',testsPassed,capability:{total:capability.total,counts:capability.counts},reportIntegrity:integrity,reportConsistency:consistency,blockers:fail,warnings:[...integrity.warnings,...consistency.warnings]});
}
