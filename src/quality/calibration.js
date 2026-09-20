/** Empirical calibration. A calibration result is only meaningful when there
 * are independently observed, time-ordered labelled outcomes. */
function wilson(hits,n,z=1.96){if(!n)return null;const p=hits/n,den=1+z*z/n,center=(p+z*z/(2*n))/den,half=z*Math.sqrt((p*(1-p)+z*z/(4*n))/n)/den;return [Math.max(0,center-half),Math.min(1,center+half)];}
export function calibrateEvidence(rows=[]){
 if(!Array.isArray(rows)||!rows.length)return {status:'NOT_CALIBRATED',sampleSize:0,reason:'No labelled outcome rows supplied.'};
 const valid=rows.filter(r=>Number.isFinite(r.evidenceScore)&&(r.outcome===0||r.outcome===1)); if(!valid.length)return {status:'NOT_CALIBRATED',sampleSize:rows.length,reason:'Rows require evidenceScore and binary outcome (0/1).'};
 const bins=Array.from({length:10},()=>[]); for(const r of valid)bins[Math.min(9,Math.max(0,Math.floor(r.evidenceScore/10)))].push(r);
 const reliability=bins.map((b,i)=>b.length?{bin:`${i*10}-${i*10+9}`,n:b.length,predictedMean:b.reduce((s,r)=>s+r.evidenceScore/100,0)/b.length,observedRate:b.reduce((s,r)=>s+r.outcome,0)/b.length,observedCI95:wilson(b.reduce((s,r)=>s+r.outcome,0),b.length)}:null).filter(Boolean);
 const brier=valid.reduce((s,r)=>s+(r.evidenceScore/100-r.outcome)**2,0)/valid.length;
 const logLoss=-valid.reduce((s,r)=>s+r.outcome*Math.log(Math.max(1e-15,r.evidenceScore/100))+(1-r.outcome)*Math.log(Math.max(1e-15,1-r.evidenceScore/100)),0)/valid.length;
 return {status:'CALIBRATED',sampleSize:valid.length,brierScore:Number(brier.toFixed(6)),logLoss:Number(logLoss.toFixed(6)),reliability,warning:valid.length<30?'Small sample; calibration is unstable.':null,meaning:'This measures agreement between evidence scores and observed outcomes. It is not proof of causal or universal predictive accuracy.'};
}


export function buildCalibrationModel(rows=[],bins=10){
  const valid=rows.filter(r=>Number.isFinite(r.evidenceScore)&&(r.outcome===0||r.outcome===1));
  if(!valid.length) return {status:'NOT_CALIBRATED',sampleSize:0,reason:'No labelled outcomes.'};
  const grouped=Array.from({length:Math.max(2,Math.min(100,bins))},()=>[]);
  for(const r of valid) grouped[Math.min(grouped.length-1,Math.max(0,Math.floor((r.evidenceScore/100)*grouped.length)))].push(r);
  const model=grouped.map((g,i)=>g.length?{min:i/grouped.length,max:(i+1)/grouped.length,observed:g.reduce((a,r)=>a+r.outcome,0)/g.length,n:g.length}:null).filter(Boolean);
  // Isotonic monotonicity: calibrated rate cannot decrease as evidence rises.
  for(let i=1;i<model.length;i++) if(model[i].observed<model[i-1].observed) model[i].observed=model[i-1].observed;
  return {status:'CALIBRATED',sampleSize:valid.length,bins:model,apply(score){const p=Math.max(0,Math.min(100,Number(score)))/100;const row=model.find(m=>p>=m.min&&p<m.max)||model[model.length-1];return row.observed;},warning:valid.length<100?'Calibration is empirical but statistically fragile below 100 labelled outcomes.':null};
}
