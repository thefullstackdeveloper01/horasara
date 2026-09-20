import fs from 'node:fs/promises';
import { getAllPlanetPositions } from '../../src/astronomy/vsop87.js';
import { deltaT } from '../../src/astronomy/utils.js';
import { runBenchmark } from '../../src/quality/v9/BenchmarkSuite.js';
const data=JSON.parse(await fs.readFile('test/fixtures/ephemeris-golden.json','utf8'));const names=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
const cases=data.fixtures.map(f=>({id:f.id,input:{jd:f.jd},expected:Object.fromEntries(names.map(n=>[n,f.positions[n].longitude]))}));
const r=await runBenchmark({name:'Swiss Ephemeris golden parity',cases,calculate:({jd})=>Object.fromEntries(names.map(n=>[n,getAllPlanetPositions(jd,deltaT(new Date((jd-2440587.5)*86400000).getUTCFullYear()))[n].longitude])),tolerance:0.1});
console.log(JSON.stringify({version:r.version,name:r.name,cases:r.cases,passed:r.passed,failed:r.failed,accuracy:r.accuracy,maxError:Math.max(...r.results.flatMap(x=>x.rows.map(y=>y.error||0)))},null,2));
