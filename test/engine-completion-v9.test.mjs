import assert from 'node:assert/strict';
import { calcAshtakootMilan } from '../src/milan/ashtakoot.js';
import { buildSarvatobhadraChakra } from '../src/systems/sarvatobhadra/SarvatobhadraEngine.js';

const chart=(moon)=>({meta:{name:moon.name},ascendant:{lon:0},planets:[
  {name:'Moon',siderealLon:moon.siderealLon,sign:moon.sign,nakshatra:moon.nakshatra,pada:moon.pada,degInSign:moon.degInSign,house:1},
  {name:'Venus',siderealLon:10,sign:'Aries',house:1},
  {name:'Mars',siderealLon:200,sign:'Libra',house:7},
  {name:'Sun',siderealLon:100,sign:'Cancer',house:4},
  {name:'Saturn',siderealLon:250,sign:'Sagittarius',house:9},
  {name:'Jupiter',siderealLon:300,sign:'Aquarius',house:11},
  {name:'Mercury',siderealLon:40,sign:'Taurus',house:2},
  {name:'Rahu',siderealLon:70,sign:'Gemini',house:3},
  {name:'Ketu',siderealLon:250,sign:'Sagittarius',house:9}
]});

const ash=chart({name:'A',siderealLon:5,sign:'Aries',nakshatra:'Ashwini',pada:1,degInSign:5});
const roh=chart({name:'B',siderealLon:45,sign:'Taurus',nakshatra:'Rohini',pada:1,degInSign:15});
const milan=calcAshtakootMilan(ash,roh);
assert.equal(milan.kootas.length,8);
assert.equal(milan.kootas.find(x=>x.name==='Vashya').points,2);
assert.equal(milan.kootas.find(x=>x.name==='Yoni').points,2);
assert.equal(milan.maxPoints,36);

const sb=buildSarvatobhadraChakra({moonNakshatra:'Ashwini',moonSign:'Aries',weekday:0,tithi:1,planetPositions:[{name:'Saturn',siderealLon:45,retrograde:true}]});
assert.equal(sb.grid.length,9);
assert.equal(sb.grid.every(r=>r.length===9),true);
assert.equal(sb.nakshatras.length,28);
assert.equal(sb.vedha.length,4); // 3 structural rays + Saturn transit ray
assert.equal(sb.layoutVariant,'standard-9x9');
console.log('v9 engine completion tests: PASS');
