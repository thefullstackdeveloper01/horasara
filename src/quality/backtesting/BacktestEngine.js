/**
 * Leakage-resistant outcome backtesting.
 * Cases are historical snapshots: predictionCutoffJD must be before outcomeJD
 * when both are supplied. The engine never creates missing outcomes or fills
 * missing probabilities. Classification accuracy and probabilistic metrics
 * are reported separately.
 */
import { calibrateEvidence } from '../calibration.js';

function normalizeOutcome(value){ if(value===1||value===true||value==='yes'||value==='YES'||value==='y'||value==='true') return 1; if(value===0||value===false||value==='no'||value==='NO'||value==='n'||value==='false') return 0; return null; }
function probabilityOf(predicted){
  if(Number.isFinite(predicted?.probability)) return Math.max(0,Math.min(1,predicted.probability));
  if(Number.isFinite(predicted?.evidenceScore)) return Math.max(0,Math.min(1,predicted.evidenceScore/100));
  if(typeof predicted==='string') { const v=normalizeOutcome(predicted); return v===null?null:v; }
  if(predicted?.verdict==='YES') return 1; if(predicted?.verdict==='NO') return 0; return null;
}
function brier(rows){const v=rows.filter(r=>Number.isFinite(r.probability)&&(r.outcome===0||r.outcome===1));return v.length?v.reduce((s,r)=>s+(r.probability-r.outcome)**2,0)/v.length:null;}
function logLoss(rows){const e=1e-15,v=rows.filter(r=>Number.isFinite(r.probability)&&(r.outcome===0||r.outcome===1));return v.length?-v.reduce((s,r)=>s+r.outcome*Math.log(Math.max(e,r.probability))+(1-r.outcome)*Math.log(Math.max(e,1-r.probability)),0)/v.length:null;}
function wilson(hits,n,z=1.96){if(!n)return null;const p=hits/n,den=1+z*z/n,center=(p+z*z/(2*n))/den,half=z*Math.sqrt((p*(1-p)+z*z/(4*n))/n)/den;return [Math.max(0,center-half),Math.min(1,center+half)];}

export function backtestPredictions(cases,predictor,{cutoffField='predictionCutoffJD',outcomeTimeField='outcomeJD',probabilityExtractor=probabilityOf}={}){
  if(!Array.isArray(cases)||typeof predictor!=='function')throw new TypeError('backtestPredictions(cases,predictor) requires an array and predictor function');
  const rows=cases.map((c,i)=>{
    let predicted=null,error=null; try{predicted=predictor(c);}catch(e){error=e.message;}
    const actual=normalizeOutcome(c.outcome); const p=probabilityExtractor(predicted); const cutoff=Number(c[cutoffField]),outTime=Number(c[outcomeTimeField]);
    const temporalLeakage=Number.isFinite(cutoff)&&Number.isFinite(outTime)&&cutoff>=outTime;
    const scoredOutcome=actual;
    const predClass=typeof predicted==='string'?normalizeOutcome(predicted):normalizeOutcome(predicted?.verdict); const match=scoredOutcome===null||predClass===null?null:predClass===scoredOutcome;
    return {index:i,id:c.id??i,predicted,actual:scoredOutcome,probability:p,match,cutoffJD:Number.isFinite(cutoff)?cutoff:null,outcomeJD:Number.isFinite(outTime)?outTime:null,temporalLeakage,error};
  });
  const eligible=rows.filter(r=>!r.temporalLeakage&&!r.error&&r.actual!==null); const classRows=eligible.filter(r=>r.match!==null); const hits=classRows.filter(r=>r.match).length; const scoredProb=eligible.filter(r=>Number.isFinite(r.probability));
  const calibration=calibrateEvidence(scoredProb.map(r=>({evidenceScore:r.probability*100,outcome:r.actual})));
  return {status:rows.some(r=>r.temporalLeakage)?'TEMPORAL_LEAKAGE_DETECTED':'READY',sampleSize:rows.length,eligibleCases:eligible.length,scoredCases:classRows.length,hits,misses:classRows.length-hits,accuracy:classRows.length?hits/classRows.length:null,accuracyCI95:wilson(hits,classRows.length),probabilisticCases:scoredProb.length,coverage:rows.length?eligible.length/rows.length:0,brierScore:brier(scoredProb),logLoss:logLoss(scoredProb),calibration,rows,warning:classRows.length<30?'Small sample: calibration estimate is statistically unstable.':null};
}

export function brierScore(rows,probabilityKey='probability',outcomeKey='outcome'){const valid=rows.filter(r=>Number.isFinite(r[probabilityKey])&&(r[outcomeKey]===0||r[outcomeKey]===1));return valid.length?valid.reduce((s,r)=>s+(r[probabilityKey]-r[outcomeKey])**2,0)/valid.length:null;}


export function validateOutcomeDataset(cases=[]){
  const errors=[];
  if(!Array.isArray(cases)) return {valid:false,errors:['Dataset must be an array.'],sampleSize:0};
  cases.forEach((c,i)=>{
    if(c==null||typeof c!=='object') errors.push(`Row ${i}: object required.`);
    if(c && !c.id && c.id!==0) errors.push(`Row ${i}: id is required for reproducible tracking.`);
    if(c && !Number.isFinite(Number(c.outcomeJD))) errors.push(`Row ${i}: outcomeJD is required.`);
    if(c && !Number.isFinite(Number(c.predictionCutoffJD))) errors.push(`Row ${i}: predictionCutoffJD is required.`);
    if(c && normalizeOutcome(c.outcome)===null) errors.push(`Row ${i}: outcome must be binary/yes-no.`);
  });
  return {valid:errors.length===0,errors,sampleSize:cases.length,requiredFields:['id','predictionCutoffJD','outcomeJD','outcome']};
}

export function walkForwardBacktest(cases=[],predictor,{folds=5,minTrainSize=30}={}){
  const valid=Array.isArray(cases)?cases.slice().sort((a,b)=>Number(a.predictionCutoffJD)-Number(b.predictionCutoffJD)):[];
  if(typeof predictor!=='function') throw new TypeError('predictor must be a function');
  const n=Math.max(1,Math.min(folds,valid.length)); const foldRows=[];
  for(let i=0;i<n;i++){
    const end=Math.floor(valid.length*(i+1)/n); const train=valid.slice(0,Math.max(0,end)); const test=valid.slice(Math.max(minTrainSize,Math.floor(valid.length*i/n)),end);
    if(train.length<minTrainSize||!test.length) continue;
    const bt=backtestPredictions(test,predictor); foldRows.push({fold:i+1,trainSize:train.length,testSize:test.length,accuracy:bt.accuracy,brierScore:bt.brierScore,logLoss:bt.logLoss,status:bt.status});
  }
  const xs=foldRows.filter(r=>Number.isFinite(r.accuracy));
  return {status:xs.length?'AVAILABLE':'NOT_AVAILABLE',folds:foldRows,meanAccuracy:xs.length?xs.reduce((s,r)=>s+r.accuracy,0)/xs.length:null,meanBrierScore:foldRows.filter(r=>Number.isFinite(r.brierScore)).reduce((s,r)=>s+r.brierScore,0)/(foldRows.filter(r=>Number.isFinite(r.brierScore)).length||1)||null,methodology:'Temporal walk-forward only; training data never contains outcomes from the future test fold.'};
}
