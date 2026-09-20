import assert from 'node:assert/strict';
import { mod360, signOf, padaOf, nakshatraOf } from '../src/astronomy/utils.js';
import { calcCustomVarga } from '../src/charts/vargas.js';
function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
const r=rng(20260910); let checks=0;
for(let i=0;i<5000;i++){const x=(r()*200000)-100000;assert.ok(mod360(x)>=0&&mod360(x)<360);assert.ok(signOf(x)>=0&&signOf(x)<12);assert.ok(padaOf(x)>=1&&padaOf(x)<=4);assert.ok(nakshatraOf(x)>=0&&nakshatraOf(x)<27);checks+=4;}
for(let d=1;d<=300;d++)for(let i=0;i<10;i++){const x=r()*360;const v=calcCustomVarga(x,d);assert.ok(v>=0&&v<12);checks++}
console.log(`Property/boundary tests: ${checks} invariants passed, 0 failed`);
