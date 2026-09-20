import assert from 'node:assert/strict';
import {validateOutcomeCorpus,evaluateWalkForward} from '../src/quality/v10/OutcomeValidation.js';
import {buildBenchmarkMatrix} from '../src/quality/v10/CrossEngineBenchmark.js';
import {buildProductionReadiness} from '../src/quality/v10/ProductionReadiness.js';
assert.equal(validateOutcomeCorpus([]).valid,true);
const r=evaluateWalkForward([{id:'x',cutoff:'2026-01-01',events:[{type:'career',date:'2026-02-01'}]}],()=>({eventTypes:['career']}));assert.equal(r.hitRate,1);assert.equal(r.leakageChecked,true);
assert.equal(buildBenchmarkMatrix({engines:['JyotiVeda','JHora'],cases:0}).comparisons.length,1);
assert.equal(buildProductionReadiness().ready,false);
console.log('V10 master release: PASS — validation, walk-forward, cross-engine and production gates operational; verified outcome corpus remains data-gated.');
