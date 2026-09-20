import assert from 'node:assert/strict';
import { buildEventPrediction, calibrateEventProbability } from '../src/prediction/EventPredictionEngine.js';
import { capabilitySummary, assertNoUnknownStatuses } from '../src/application/services/CanonicalCapabilityRegistry.js';
import { resolveAstronomyProvider } from '../src/astronomy/ProviderFactory.js';

assertNoUnknownStatuses();
const c = capabilitySummary();
assert.equal(c.PASS + c.PARTIAL + c.FAIL, 100);
assert.equal(resolveAstronomyProvider('swiss').id, 'reference-js-ephemeris');

const p = buildEventPrediction({
  event:'career',
  ruleMatches:[{evidence:{classicalRuleScore:80}}],
  windows:[{start:'2030-01-01',end:'2030-02-01',startJD:2462500,endJD:2462531,durationDays:31,evidenceScore:80,activationType:'EXACT',exactTriggers:[{planet:'Jupiter'}],triggers:[{planet:'Jupiter'}],dashaSupport:true}],
  dashaTimeline:[{mahadasha:'Jupiter',startJD:2462490,endJD:2462600}],
  currentJD:2462501,
  supportingDasha:['Jupiter'],
  birthTimeConfidence:'exact',
});
assert.ok(p.evidenceScore >= 70);
assert.equal(p.probability, null);
assert.equal(p.probabilityStatus,'NOT_CALIBRATED');
const calibrated=calibrateEventProbability(p,{observations:Array.from({length:40},(_,i)=>({score:80+(i%3)-1,outcome:i<30?1:0}))});
assert.equal(calibrated.probabilityStatus,'EMPIRICALLY_CALIBRATED');
assert.ok(calibrated.probability > 0 && calibrated.probability < 1);
console.log('v17 strict prediction fixes: PASS');
