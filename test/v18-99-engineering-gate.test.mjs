import assert from 'node:assert/strict';
import { calculateEngineeringReleaseScore, buildUnifiedPrediction, brierScoreV2, reliabilityBins, appendOutcome, outcomeSummary, auditPredictionReport } from '../src/index.js';

const score = calculateEngineeringReleaseScore({calculationArchitecture:100,predictionPipeline:100,auditability:100,deterministicRuntime:100,reportingAndExplanations:100,validationInfrastructure:100,safetyAndTruthfulness:100,extensibility:100});
assert.equal(score.score,100);
const p = buildUnifiedPrediction({event:'Marriage',method:'PARASHARI',ruleMatches:[{confidence:80,evidence:{classicalRuleScore:80}}],windows:[{startJD:2450000,endJD:2450100,start:'2030-01-01',end:'2030-04-11',exactTriggers:['Jupiter']}],dashaTimeline:[{mahadasha:'Venus',startJD:2449000,endJD:2451000}],supportingDasha:['Venus'],currentJD:2450050,provenance:{source:'test'}});
assert.ok(p.explanation.includes('Marriage'));
assert.equal(p.probability,null);
assert.equal(p.qa.pass,true);
assert.ok(Math.abs(brierScoreV2([{probability:.8,outcome:1}])-.04)<1e-12);
assert.equal(reliabilityBins([{probability:.8,outcome:1}],10).length,10);
const ledger=appendOutcome([], {event:'Marriage',predictionScore:80,outcome:1});
assert.equal(outcomeSummary(ledger).n,1);
assert.equal(auditPredictionReport({...p,probability:.9,probabilityStatus:'NOT_CALIBRATED'}).pass,false);
console.log('v18 99 engineering gate: PASS');
