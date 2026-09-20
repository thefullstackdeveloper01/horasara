import assert from 'node:assert/strict';
import { normalizeDegrees } from '../src/core/math/normalizeDegrees.js';
import { angularDistance } from '../src/core/math/angularDistance.js';

for (let x=-10800;x<=10800;x+=0.25) {
  const n=normalizeDegrees(x);
  assert.ok(n>=0 && n<360, `normalization range failed for ${x}`);
  assert.equal(normalizeDegrees(n), n);
}
for(let a=0;a<360;a+=1)for(let b=0;b<360;b+=7){const d=angularDistance(a,b);assert.ok(d>=0&&d<=180);assert.equal(d,angularDistance(b,a));}
console.log('Formal angular invariants: PASS');
