import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAstronomyProvider } from '../src/astronomy/ProviderFactory.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'src/astronomy/ProviderFactory.js'), 'utf8');
assert.equal(/pyswisseph|spiceypy|python3|spawnSync/.test(src), false);
const p = resolveAstronomyProvider('auto');
const positions = p.positions({ nodeMode: 'true' }, { JD_TT: 2451545.0 });
assert.ok(Number.isFinite(positions.Sun.longitude));
assert.ok(Number.isFinite(positions.Moon.longitude));
assert.ok(Number.isFinite(positions.Rahu.longitude));
assert.equal(p.metadata().runtime, undefined);
console.log('offline-js-runtime: PASS');
