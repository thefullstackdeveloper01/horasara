const date = v => { const d=new Date(v); return Number.isNaN(d.valueOf())?null:d; };
export function validateHistoricalChart(record){
  const errors=[];
  if(!record?.id) errors.push('missing id');
  if(record?.verification?.status!=='verified') errors.push('chart is not verified');
  if(record?.source?.citation==null || String(record.source.citation).trim()==='') errors.push('missing source citation');
  if(!record?.expected?.provider) errors.push('missing expected provider');
  if(!record?.expected?.values || typeof record.expected.values!=='object') errors.push('missing expected values');
  return {valid:errors.length===0,errors};
}
export function validatePredictionOutcome(record){
  const errors=[]; const cutoff=date(record?.cutoff); const outcome=date(record?.event?.date);
  if(!record?.id) errors.push('missing id');
  if(record?.source?.verificationStatus!=='verified') errors.push('outcome is not verified');
  if(!record?.chartId) errors.push('missing chartId');
  if(!cutoff) errors.push('invalid cutoff');
  if(!outcome) errors.push('invalid event date');
  if(cutoff && outcome && outcome<=cutoff) errors.push('temporal leakage: outcome/event must occur after cutoff');
  return {valid:errors.length===0,errors};
}
export function validateCorpus({charts=[],outcomes=[]}={}){
  const chartResults=charts.map(validateHistoricalChart), outcomeResults=outcomes.map(validatePredictionOutcome);
  return {valid:[...chartResults,...outcomeResults].every(x=>x.valid),charts:chartResults,outcomes:outcomeResults};
}
