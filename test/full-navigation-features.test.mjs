import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createApiServer } from '../src/infrastructure/api/ApiServer.js';
import { calculateChart } from '../src/engine/InternalCalculationEngine.js';
const catalog=JSON.parse(await readFile(new URL('../dataset/used/core/public-navigation.json',import.meta.url),'utf8'));
assert.equal(catalog.signs.length,12); assert.equal(catalog.nakshatras.length,28); assert.equal(catalog.planets.length,9);
const api=createApiServer({calculate:calculateChart,host:'127.0.0.1',port:0}); await new Promise(r=>api.server.listen(0,'127.0.0.1',r)); const p=api.server.address().port;
try{
 for(const path of ['/rashi-bhavishya','/planet-bhavishya','/nakshatra-bhavishya','/astronomy','/panchang','/calendar','/kundali-milan','/calculators','/lists','/knowledge']){const r=await fetch(`http://127.0.0.1:${p}${path}`);assert.equal(r.status,200,path);}
 const h=await fetch(`http://127.0.0.1:${p}/horoscope/daily-horoscope?date=2026-09-19&sign=Aries`);assert.equal(h.status,200);assert.ok((await h.json()).horoscopes.Aries);
 const ch=await fetch(`http://127.0.0.1:${p}/panchang/choghadiya?date=2026-09-19&lat=23.0225&lon=72.5714&tz=5.5`);assert.equal((await ch.json()).choghadiya.length,16);
 const hr=await fetch(`http://127.0.0.1:${p}/panchang/hora?date=2026-09-19&lat=23.0225&lon=72.5714&tz=5.5`);assert.equal((await hr.json()).hora.length,24);
}finally{await new Promise(r=>api.server.close(r));}
console.log('full navigation / public forecast / panchang smoke: PASS');
