/** Deterministic calibration utilities: Brier, log-loss, reliability bins and holdout split. */
export function brierScoreV2(rows = []) { return rows.length ? rows.reduce((s,r)=>s+(Number(r.probability)-Number(r.outcome))**2,0)/rows.length : null; }
export function logLoss(rows = []) { if (!rows.length) return null; const e=1e-12; return -rows.reduce((s,r)=>s+Number(r.outcome)*Math.log(Math.max(e,Math.min(1-e,Number(r.probability))))+(1-Number(r.outcome))*Math.log(Math.max(e,Math.min(1-e,1-Number(r.probability)))),0)/rows.length; }
export function reliabilityBins(rows = [], binCount = 10) {
  return Array.from({length:binCount},(_,i)=>{const lo=i/binCount, hi=(i+1)/binCount; const a=rows.filter(r=>Number(r.probability)>=lo && (i===binCount-1?Number(r.probability)<=hi:Number(r.probability)<hi)); return {lo,hi,n:a.length,meanProbability:a.length?a.reduce((s,r)=>s+Number(r.probability),0)/a.length:null,observedRate:a.length?a.reduce((s,r)=>s+Number(r.outcome),0)/a.length:null};});
}
export function chronologicalHoldout(rows = [], fraction = .2) { const n=Math.max(1,Math.floor(rows.length*(1-fraction))); return Object.freeze({train:rows.slice(0,n),holdout:rows.slice(n)}); }
