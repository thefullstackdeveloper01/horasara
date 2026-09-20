/**
 * Unified empirical validation facade. Deterministic scores are never relabelled
 * as probabilities. Calibration is only enabled by chronological labelled data.
 */
import { backtestPredictions, validateOutcomeDataset, walkForwardBacktest } from '../backtesting/BacktestEngine.js';
import { brierScoreV2, logLoss, reliabilityBins, chronologicalHoldout } from '../CalibrationV2.js';

export function validatePredictionDataset(rows=[]) {
  const base=validateOutcomeDataset(rows);
  if(!base.valid) return Object.freeze({...base,status:'INVALID'});
  const ordered=[...rows].sort((a,b)=>Number(a.predictionCutoffJD)-Number(b.predictionCutoffJD));
  const holdout=chronologicalHoldout(ordered,.2);
  return Object.freeze({status:'VALID',...base,chronological:true,trainSize:holdout.train.length,holdoutSize:holdout.holdout.length});
}

export function evaluatePredictionModel({cases=[],predictor,folds=5,minTrainSize=30}={}) {
  const dataset=validatePredictionDataset(cases);
  if(!dataset.valid) return Object.freeze({status:'INVALID_DATASET',dataset});
  const walk=walkForwardBacktest(cases,predictor,{folds,minTrainSize});
  const final=backtestPredictions(cases,predictor);
  const probs=final.rows.filter(r=>Number.isFinite(r.probability)&&Number.isFinite(r.actual)).map(r=>({probability:r.probability,outcome:r.actual}));
  return Object.freeze({status:walk.status==='AVAILABLE'?'EVALUATED':'INSUFFICIENT_SAMPLE',dataset,walkForward:walk,overall:final,brierScore:brierScoreV2(probs),logLoss:logLoss(probs),reliability:reliabilityBins(probs,10),probabilityPolicy:'Only use calibrated probabilities on held-out labelled outcomes; otherwise display evidence score only.'});
}
