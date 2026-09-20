import assert from 'node:assert/strict';
import {buildMaster100Gate} from '../src/quality/v12/Master100Gate.js';
import {validateOutcomeCases,walkForward} from '../src/quality/v12/OutcomeValidation.js';
import {benchmarkEngines,compareOutputs} from '../src/benchmark/v12/CompetitorBenchmark.js';
const g=buildMaster100Gate(); assert.equal(g.engineeringComplete,true); assert.equal(g.score,100); assert.equal(g.releaseReady,false);
const bad=validateOutcomeCases([{id:'x',chart:{},eventType:'job',cutoffAt:'2025-01-02T00:00:00Z',eventAt:'2025-01-01T00:00:00Z'}]); assert.equal(bad.valid,false); assert.equal(bad.issues[0].error,'temporal_leakage');
assert.equal(walkForward([],3).length,3);
const r=benchmarkEngines([{id:'1',input:{x:1}}],[{name:'A',calculate:i=>i},{name:'B',calculate:i=>i}]); assert.equal(r.length,1); assert.equal(compareOutputs(r)[0].comparisons.every(x=>x.match),true);
console.log('V12 master gate: PASS — 100/100 target is evidence-gated; no fabricated competitor or outcome data.');
