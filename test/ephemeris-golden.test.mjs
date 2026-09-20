import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getAllPlanetPositions } from '../src/astronomy/vsop87.js';
import { deltaT } from '../src/astronomy/utils.js';
const data=JSON.parse(fs.readFileSync(new URL('./fixtures/ephemeris-golden.json',import.meta.url),'utf8'));
assert.equal(data.meta.count,1000); assert.equal(data.fixtures.length,1000);
const names=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']; let max=0; let checked=0;
for(const f of data.fixtures){
  const year=new Date((f.jd-2440587.5)*86400000).getUTCFullYear();
  const actual=getAllPlanetPositions(f.jd,deltaT(year));
  for(const name of names){let d=Math.abs(actual[name].longitude-f.positions[name].longitude)%360;d=Math.min(d,360-d);max=Math.max(max,d);checked++;assert.ok(d<=0.1,`${name} fixture ${f.id} exceeded 0.1°: ${d}`)}
}
assert.equal(checked,7000); console.log(`Ephemeris golden fixtures: ${data.fixtures.length} epochs / ${checked} planet checks; max error ${max.toFixed(4)}°`);
