import fs from 'node:fs';
import {buildEvidenceScore} from '../../src/quality/v13/EvidenceCompletionEngine.js';
const load=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8')).records||JSON.parse(fs.readFileSync(p,'utf8')).cases||[]}catch{return[]}};
const charts=load('dataset/used/validation/v13_verified-chart-corpus.json');
const outcomes=load('dataset/used/validation/v13_outcome-corpus.json');
const cases=load('dataset/used/validation/v13_cross-engine-benchmark.json');
const s=buildEvidenceScore({charts,outcomes,benchmarkCases:cases,independentEngines:0,predictionFolds:0});
console.log(JSON.stringify(s,null,2));
