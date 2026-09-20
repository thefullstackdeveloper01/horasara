import assert from 'node:assert/strict';
import { auditReportIntegrity } from '../src/reporting/ReportIntegrityGate.js';
const ids=['executive','calculation-audit','basic-details','planetary-position','charts','houses','vargas','strength','dasha','transits','prediction','timing','evidence','remedies','provenance','validation','qa'];
const ok=auditReportIntegrity({reportVersion:'3',generatedAt:new Date().toISOString(),fingerprint:'x',sections:ids.map(id=>({id})),predictions:[{event:'career',probability:null,probabilityStatus:'NOT_CALIBRATED'}]});
assert.equal(ok.pass,true);
const bad=auditReportIntegrity({reportVersion:'3',generatedAt:'x',sections:ids.map(id=>({id,body:id==='prediction'?'100% accurate':''})),predictions:[{event:'x',probability:.9,probabilityStatus:'NOT_CALIBRATED'}]});
assert.equal(bad.pass,false); assert.ok(bad.errors.some(x=>x.startsWith('UNCALIBRATED_PROBABILITY'))); assert.ok(bad.errors.some(x=>x.startsWith('UNSUPPORTED_CERTAINTY')));
console.log('report integrity v3: PASS');
