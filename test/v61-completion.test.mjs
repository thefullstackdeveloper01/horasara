import assert from 'node:assert/strict';
import { SwissEphemerisProvider } from '../src/astronomy/providers/SwissEphemerisProvider.js';
import { calculateSynastry, calculateComposite } from '../src/systems/synastry/index.js';
import { buildSarvatobhadraChakra } from '../src/systems/sarvatobhadra/index.js';
import { calculatePrashna } from '../src/systems/prashna/index.js';
import { backtestPredictions, brierScore } from '../src/quality/backtesting/index.js';

const swiss=new SwissEphemerisProvider();
const sun=swiss.positions({}, {JD_TT:2451545}).Sun;
assert.ok(Number.isFinite(sun.longitude));
assert.ok(sun.longitude>=0&&sun.longitude<360);

const A={planets:[{name:'Sun',siderealLon:0},{name:'Moon',siderealLon:60}]};
const B={planets:[{name:'Sun',siderealLon:120},{name:'Moon',siderealLon:180}]};
const syn=calculateSynastry(A,B); assert.ok(syn.aspects.some(x=>x.a==='Sun'&&x.b==='Sun'&&x.aspect==='trine'));
const comp=calculateComposite(A,B); assert.equal(comp.planets.length,2);
const sb=buildSarvatobhadraChakra({moonNakshatra:'Ashwini',moonSign:0,weekday:0,tithi:{name:'Shukla Pratipada'}}); assert.equal(sb.nakshatras.length,28); assert.equal(sb.vedha.length,3);
const pr=calculatePrashna({eventChart:{ascendant:0,planets:[{name:'Moon',siderealLon:30,nakshatra:'Bharani'}]},question:'Will the matter proceed?'}); assert.equal(pr.derivedMoonHouse,2);
const bt=backtestPredictions([{id:1,outcome:'yes'},{id:2,outcome:'no'}],c=>c.outcome); assert.equal(bt.accuracy,1); assert.ok(Math.abs(brierScore([{probability:.9,outcome:1},{probability:.1,outcome:0}])-.01)<1e-12);
console.log('v6.1 completion modules: PASS');
