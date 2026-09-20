import assert from 'node:assert/strict';
import { calculateChart } from '../src/engine/InternalCalculationEngine.js';
import { printFullReport } from '../cli/report/index.js';
import { evaluateMuhurtaInstant, scanMuhurtaWindows } from '../src/muhurta/MuhurtaEngine.js';

const birth = { name:'audit', sex:'M', year:1993, month:8, day:21, hour:12, min:0, sec:0, lat:23.0225, lon:72.5714, tz:5.5, ayanamsaMode:'lahiri', houseSystem:'whole', nodeMode:'true' };
const R = await calculateChart(birth);
assert.equal(R.extendedReport.conflictResolution.some(x => String(x).includes('calcD9 is not defined')), false);
assert.match(String(R.extendedReport.conflictResolution.join('\n')), /D9:/);
assert.equal(R._accuracy.goldenRegressionObservedMax, '0.4881° (maximum longitude deviation across the bundled 1,000-epoch Swiss-Ephemeris Lahiri golden regression suite; measured by test:golden)');
assert.equal(R.lagnaProfile.sourceLanguage, 'Romanized Hindi');
assert.equal(R.extendedReport.muhurta.status, undefined);
assert.ok(Array.isArray(R.extendedReport.muhurta.factors));
const m = evaluateMuhurtaInstant({ jd: Number(R.meta.JD), lat: birth.lat, lon: birth.lon, tz: birth.tz, natalMoonNakshatraIndex: ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'].indexOf(R.panchanga?.nakshatra?.name), natalMoonSignIndex: Math.floor(R.planets.find(p=>p.name==='Moon').siderealLon/30) });
assert.ok(Number.isFinite(m.score));
assert.ok(m.factors.length >= 3);
const windows = scanMuhurtaWindows({ startJD:Number(R.meta.JD), endJD:Number(R.meta.JD)+1/24, stepMinutes:15, lat:birth.lat, lon:birth.lon, tz:birth.tz, natalMoonNakshatraIndex:0, natalMoonSignIndex:0 });
assert.equal(windows.length, 5);
let output=''; const old=console.log; console.log=(...a)=>{output += a.join(' ')+'\n';};
try { printFullReport(R, 12.5); } finally { console.log=old; }
assert.doesNotMatch(output, /calcD9 is not defined/);
assert.match(output, /0\.4881°/);
console.log('Audit-fix report tests: crash regression, measured-accuracy disclosure, localization metadata, and dynamic Muhurta all passed');
