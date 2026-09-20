import assert from 'node:assert/strict';
import { DashaRegistry } from '../src/dasha/DashaRegistry.js';
import { createBuiltinDashaPlugins } from '../src/dasha/builtinPlugins.js';
import { VargaRegistry } from '../src/charts/VargaRegistry.js';
import { HistoricalTimeEngine } from '../src/time/HistoricalTimeEngine.js';
import { resolveContradictions } from '../src/quality/ContradictionResolver.js';
import { AstronomyProviderRegistry } from '../src/infrastructure/astronomy/AstronomyProviderRegistry.js';
import { InternalVsop87Provider } from '../src/infrastructure/astronomy/InternalVsop87Provider.js';
import { auditStrengthResult } from '../src/strength/StrengthAudit.js';
import { calcD9 } from '../src/charts/vargas.js';
import { calculateChart } from '../src/engine.js';

const dasha = new DashaRegistry(createBuiltinDashaPlugins());
assert.equal(dasha.get('vimshottari').status, 'VERIFIED');
assert.ok(dasha.list().length >= 5);
const varga = new VargaRegistry();
assert.equal(varga.calculate(15, 9), calcD9(15));
assert.throws(() => varga.calculate(15, 301));
const ny = new HistoricalTimeEngine({timeZone:'America/New_York'});
assert.equal(ny.offsetMinutes(new Date('2024-07-01T12:00:00Z')), -240);
assert.equal(ny.offsetMinutes(new Date('2024-01-01T12:00:00Z')), -300);
const contradictions = resolveContradictions([
  {claimId:'career',decision:'YES',weight:0.9}, {claimId:'career',decision:'NO',weight:0.2},
  {claimId:'health',decision:'YES',weight:0.5}, {claimId:'health',decision:'NO',weight:0.5}
]);
assert.equal(contradictions.career.decision,'YES');
assert.equal(contradictions.health.confidence,'UNRESOLVED');
const providers = new AstronomyProviderRegistry([new InternalVsop87Provider()]);
assert.equal(providers.get('internal-vsop87-abridged').metadata().id,'internal-vsop87-abridged');
assert.equal(auditStrengthResult({a:1},{requiredComponents:['a']}).valid,true);
const chart = await calculateChart({year:1990,month:7,day:1,hour:12,min:0,sec:0,lat:40.7128,lon:-74.006,timeZone:'America/New_York'});
assert.equal(chart.meta.tz, -4);
assert.equal(chart.meta.historicalTime.offsetMinutes, -240);
assert.equal(chart.meta.utcAtBirth, '16:00:00 UTC, 01-07-1990');
console.log('System boundary tests: 11 passed, 0 failed');

