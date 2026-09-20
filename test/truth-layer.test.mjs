import assert from 'node:assert/strict';
import { validateOutcomeDataset, walkForwardBacktest } from '../src/quality/backtesting/index.js';
import { buildCalibrationModel } from '../src/quality/calibration.js';
import { calcKarmicDoshas } from '../src/dosha/doshas.js';
import { buildPredictionTruth, buildRemedySchedule } from '../src/prediction/PredictionTruthEngine.js';
import { julianDay } from '../src/astronomy/utils.js';

const p = [
  {name:'Saturn',siderealLon:10,house:1},
  {name:'Rahu',siderealLon:12,house:1},
  {name:'Jupiter',siderealLon:190,house:7},
  {name:'Moon',siderealLon:20,house:1},
  {name:'Ketu',siderealLon:30+180,house:7},
];
const k=calcKarmicDoshas(p);
assert.equal(k.shrapit.status,'FORMED');
assert.equal(k.chandal.status,'NOT_FORMED');
assert.equal(k.vish.status,'FORMED');

const now=julianDay(2026,9,10,15);
const truth=buildPredictionTruth({
  planets:[...p,{name:'Venus',siderealLon:210,house:7}],
  houses:[{number:1,sign:'Sagittarius',lord:'Jupiter'}],
  dasha:{timeline:[{mahadasha:'Jupiter',startJD:now-100,endJD:now+100,start:'',end:''}]},
  currentJD:now,ascendantLon:250,moonLon:200,ayanamsa:23.7,
  metadata:{birthTimeConfidence:{value:'approximate'},ephemeris:{model:'test'}},diagnostics:[]
});
assert.ok(Array.isArray(truth.events));
assert.equal(truth.calibration.status,'NOT_CALIBRATED');
const schedule=buildRemedySchedule({lat:23.02,lon:72.57,tz:5.5,currentJD:now,remedies:[{planet:'Jupiter',weekday:4,practice:'Jupiter mantra'}]});
assert.equal(schedule.status,'AVAILABLE');
assert.match(schedule.rows[0].japaWindow,/–/);
console.log('truth-layer tests: PASS');

const dataset=validateOutcomeDataset([{id:'a',predictionCutoffJD:1,outcomeJD:2,outcome:1}]); assert.equal(dataset.valid,true);
const wf=walkForwardBacktest(Array.from({length:40},(_,i)=>({id:i,predictionCutoffJD:i,outcomeJD:i+1,outcome:i%2})), c=>({verdict:c.outcome?'YES':'NO'}), {folds:4,minTrainSize:5}); assert.ok(wf.folds.length>0);
const cm=buildCalibrationModel([{evidenceScore:10,outcome:0},{evidenceScore:90,outcome:1}]); assert.equal(cm.status,'CALIBRATED'); assert.ok(cm.apply(90)>=cm.apply(10));
