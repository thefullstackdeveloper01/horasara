import assert from 'node:assert/strict';
import { validateCalculationSurface, buildScientificValidation } from '../src/quality/ScientificValidationSuite.js';
const r={planets:Array.from({length:9},(_,i)=>({siderealLon:i*30})),houses:Array.from({length:12},(_,i)=>({house:i+1})),dasha:{timeline:[{startJD:1,endJD:2},{startJD:2,endJD:3}]},calculationAuditFinal:{input:{fingerprint:'a'}}};
const v=validateCalculationSurface(r); assert.equal(v.passed,true);
const s=buildScientificValidation({result:r}); assert.equal(s.calculation.passed,true); assert.equal(s.scientificProofOfAstrology,false);
console.log('scientific validation v3: PASS');
