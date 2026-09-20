export function buildPredictionEvidence({prediction,claims=[],rules=[],timing=[],validation={}}={}){
  return {version:'8.0.0',prediction,claims,rules,timing,validation,provenance:{generatedAt:new Date().toISOString(),status:validation?.status||'UNVERIFIED'}};
}
