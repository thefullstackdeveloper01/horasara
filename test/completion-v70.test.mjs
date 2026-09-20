import assert from 'node:assert/strict';
import { calculateAllClassicalDashas } from '../src/dasha/completeDashaSuite.js';
import { calculatePrashna } from '../src/systems/prashna/PrashnaEngine.js';
import { buildSarvatobhadraChakra } from '../src/systems/sarvatobhadra/SarvatobhadraEngine.js';
import { calculateSynastry, calculateComposite } from '../src/systems/synastry/SynastryEngine.js';
import { validateOutcomeDataset, walkForwardBacktest } from '../src/quality/backtesting/BacktestEngine.js';

const planets=[
 {name:'Sun',siderealLon:10,house:1, speed:1},{name:'Moon',siderealLon:40,house:2,speed:13},
 {name:'Mars',siderealLon:80,house:3,speed:.5},{name:'Mercury',siderealLon:100,house:4,speed:1},
 {name:'Jupiter',siderealLon:130,house:5,speed:.08},{name:'Venus',siderealLon:160,house:6,speed:1},
 {name:'Saturn',siderealLon:200,house:7,speed:.03},{name:'Rahu',siderealLon:250,house:8,speed:-.05},{name:'Ketu',siderealLon:70,house:2,speed:-.05}
];
const dashas=calculateAllClassicalDashas({birthJD:2451545,ascLon:15,moonLon:40,sunLon:10,planets,houses:Array.from({length:12},(_,i)=>({house:i+1,lord:['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'][i]})),vargas:{ascendant:{vargottama:true,D9:{sign:'Aries'}}},birth:{paksha:'Shukla',isDayBirth:true},currentDasha:{planet:'Jupiter'}});
assert.equal(dashas.systemCount,45); assert.equal(Object.keys(dashas.rows).length,45); assert.ok(Object.values(dashas.rows).every(r=>r && r.status));

const sb=buildSarvatobhadraChakra({moonNakshatra:'Ashwini',moonSign:0,weekday:0,tithi:1,planetPositions:planets});
assert.equal(sb.dimensions.cells,81); assert.equal(sb.grid.flat().flatMap(c=>c.items).length,81); assert.equal(sb.nakshatras.length,28);

const eventChart={ascendant:0,planets:[{name:'Moon',siderealLon:30,nakshatra:'Bharani',speed:13},{name:'Jupiter',siderealLon:60,house:3,speed:.1},{name:'Saturn',siderealLon:210,house:8,speed:.03}],houses:Array.from({length:12},(_,i)=>({house:i+1,lord:['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'][i]}))};
const pr=calculatePrashna({eventChart,question:'Will the matter proceed?',method:'prashna-marga'}); assert.equal(pr.derivedMoonHouse,2); assert.equal(pr.confidence.status,'RULE_BASED_NOT_EMPIRICAL'); assert.equal(pr.answer.ruleFamily,'Prashna-Marga-Inspired');

const A={planets:planets.map(p=>({...p,nakshatra:'Ashwini',sign:'Aries',pada:1})),ascendant:{longitude:0,lon:'0'}}; const B={planets:planets.map(p=>({...p,siderealLon:(p.siderealLon+120)%360,nakshatra:'Bharani',sign:'Taurus',pada:1})),ascendant:{longitude:120,lon:'120'}};
const syn=calculateSynastry(A,B); assert.equal(syn.fullMilan?.ashtakoot?.maxPoints,36); assert.ok(Array.isArray(syn.fullMilan?.ashtakoot?.kootas));
const comp=calculateComposite(A,B); assert.ok(Array.isArray(comp.aspects)); assert.ok(comp.planets.every(p=>Number.isFinite(p.longitude)));

const ds=validateOutcomeDataset([{id:1,predictionCutoffJD:10,outcomeJD:11,outcome:'yes'}]); assert.equal(ds.valid,true);
const rows=Array.from({length:40},(_,i)=>({id:i,predictionCutoffJD:i,outcomeJD:i+1,outcome:i%2?'yes':'no'})); const wf=walkForwardBacktest(rows,c=>({verdict:c.outcome}),{folds:4,minTrainSize:5}); assert.ok(wf.folds.length>0);
console.log('v7.0 completion tests: PASS');
