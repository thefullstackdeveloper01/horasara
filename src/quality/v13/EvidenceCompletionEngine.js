import crypto from 'node:crypto';

export const V13_THRESHOLDS = Object.freeze({
  minimumVerifiedCharts: 1000,
  minimumVerifiedOutcomes: 1000,
  minimumBenchmarkCases: 250,
  minimumIndependentEngines: 3,
  minimumPredictionFolds: 5
});

function sha(value){ return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function validDate(v){ return !Number.isNaN(Date.parse(v)); }

export function validateVerifiedChart(c){
  const issues=[];
  if(!c?.id) issues.push('missing_id');
  if(!c?.source?.name || !c?.source?.url) issues.push('missing_source_provenance');
  if(!c?.birth?.date || !validDate(c.birth.date)) issues.push('invalid_birth_date');
  if(typeof c?.birth?.latitude!=='number'||typeof c?.birth?.longitude!=='number') issues.push('missing_coordinates');
  if(!c?.reference?.positions) issues.push('missing_reference_positions');
  if(c?.verification?.status!=='independently_verified') issues.push('not_independently_verified');
  return {valid:issues.length===0,issues};
}

export function validateOutcome(c){
  const issues=[];
  if(!c?.id||!c?.chartId||!c?.eventType) issues.push('required_identity_missing');
  if(!c?.source?.url) issues.push('missing_source');
  if(!validDate(c?.cutoffAt)||!validDate(c?.eventAt)) issues.push('invalid_dates');
  else if(Date.parse(c.cutoffAt)>=Date.parse(c.eventAt)) issues.push('temporal_leakage');
  if(c?.verification?.status!=='independently_verified') issues.push('not_independently_verified');
  return {valid:issues.length===0,issues};
}

export function buildEvidenceScore({charts=[],outcomes=[],benchmarkCases=[],independentEngines=0,predictionFolds=0}={}){
  const chart=Math.min(1,charts.length/V13_THRESHOLDS.minimumVerifiedCharts);
  const outcome=Math.min(1,outcomes.length/V13_THRESHOLDS.minimumVerifiedOutcomes);
  const benchmark=Math.min(1,benchmarkCases.length/V13_THRESHOLDS.minimumBenchmarkCases);
  const engines=Math.min(1,independentEngines/V13_THRESHOLDS.minimumIndependentEngines);
  const folds=Math.min(1,predictionFolds/V13_THRESHOLDS.minimumPredictionFolds);
  const score=Math.round(100*(0.2*chart+0.3*outcome+0.2*benchmark+0.15*engines+0.15*folds));
  const empiricalComplete=score===100;
  return {score,empiricalComplete,components:{chart,outcome,benchmark,engines,folds},thresholds:V13_THRESHOLDS};
}

export function sealEvidenceReport(report){ return {...report,contentHash:sha(report)}; }
