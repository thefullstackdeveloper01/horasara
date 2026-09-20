import assert from 'node:assert/strict';
import { calculateCompleteDasha } from '../src/completion/CompleteDashaEngine.js';
import { auditCalculationParity } from '../src/completion/CalculationParityAudit.js';
import { calcRulingPlanets, judgeKPEvent } from '../src/kp/kp_event_judgement.js';
import { calcVimshottari } from '../src/dasha/vimshottari.js';

const birthJD=2451545, moonLon=120, ascLon=100;
const v=calculateCompleteDasha({variant:'vimshottari',birthJD,moonLon,ascLon,endYear:2025});
assert.equal(v.status,'IMPLEMENTED_VARIANT');
assert.ok(v.hierarchy?.length>0);
assert.ok(v.hierarchy[0].antardashas.length===9);
assert.ok(v.hierarchy[0].antardashas[0].pratyantars.length===9);
assert.ok(v.hierarchy[0].antardashas[0].pratyantars[0].sookshmas.length===9);
assert.ok(v.hierarchy[0].antardashas[0].pratyantars[0].sookshmas[0].pranas.length===9);
const audit=auditCalculationParity(); assert.equal(audit.status,'PASS');
const rp=calcRulingPlanets({lagnaLon:ascLon,moonLon,dayLord:'Sun'}); assert.ok(rp.planets.includes('Sun'));
const ev=judgeKPEvent({significators:{7:{house:7,kpSubLord:'Venus',significators:[{planet:'Venus',level:1}]},2:{house:2,significators:[{planet:'Venus',level:1}]}},cuspalHouse:7,positiveHouses:[2,7,11],negativeHouses:[6,8,12],dashaLords:['Venus']});
assert.equal(ev.verdict,'FAVOURABLE');
console.log('calculation parity v11: PASS');
