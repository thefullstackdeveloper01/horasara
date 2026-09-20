import assert from 'node:assert/strict';
import { calcFunctionalNature } from '../src/strength/functional_nature.js';
import { detectYogas } from '../src/yoga/yogas.js';
import { calcMangalDosha } from '../src/dosha/doshas.js';
import { calcD9 } from '../src/charts/vargas.js';
import { calculateChart } from '../src/engine.js';
import { getBPHSRajaYoga } from '../src/prediction/bphsEngine.js';

let passed = 0, failed = 0;
function test(name, fn) { try { fn(); console.log(`  ✓ ${name}`); passed++; } catch (e) { console.log(`  ✗ ${name}\n      ${e.message}`); failed++; } }

test('Sagittarius Lagna does not misclassify Jupiter (1st+4th lord) as Yogakaraka', () => {
  const r = calcFunctionalNature(8, []);
  assert.equal(r.Jupiter.ownedHouses.join(','), '1,4');
  assert.notEqual(r.Jupiter.nature, 'Yogakaraka');
  assert.equal(r.Jupiter.nature, 'Functional Benefic');
});

test('Anapha Yoga excludes the Sun', () => {
  const planets = [
    { name:'Moon', house:5, siderealLon:120 },
    { name:'Sun', house:4, siderealLon:90 },
    { name:'Mars', house:4, siderealLon:95 },
    ...['Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'].map((name,i) => ({ name, house: i+1, siderealLon: 10 + i*30 })),
  ];
  const yogas = detectYogas(planets, 0, []);
  assert.ok(!yogas.some(y => y.name === 'Anapha Yoga (Sun)'));
  assert.ok(yogas.some(y => y.name === 'Anapha Yoga (Mars)'));
});

test('Mangal Dosha exposes formation separately from effective status after cancellation', () => {
  const planets = [
    { name:'Mars', siderealLon:10 },
    { name:'Jupiter', siderealLon:10 },
    { name:'Moon', siderealLon:100 },
    { name:'Venus', siderealLon:190 },
  ];
  const r = calcMangalDosha(planets, 10, 100, 190);
  assert.equal(r.formation, true);
  assert.equal(r.isCancelled, true);
  assert.equal(r.hasDosha, false);
  assert.equal(r.effectiveDosha, false);
});

test('Raja Yoga lookup reads the populated bundled classical database', () => {
  const hits = getBPHSRajaYoga(['yoga']);
  assert.ok(hits.length > 0);
});

test('Engine transit snapshot is immutable and reused by transitNow', async () => {
  const birth = { name:'Audit', sex:'Neutral', year:1990, month:5, day:15, hour:14, min:30, sec:0, lat:28.6139, lon:77.2090, tz:5.5, ayanamsaMode:'lahiri', houseSystem:'whole', nodeMode:'true', calculationDateTime:'2026-09-08T12:00:00Z' };
  const r = await calculateChart(birth);
  assert.strictEqual(r.canonicalTransitSnapshot.planets.Moon.siderealLon, r.transitNow.Moon.siderealLon);
  assert.equal(Object.isFrozen(r.canonicalTransitSnapshot), true);
  assert.equal(r.birthFacts.moon.nakshatra, r.planets.find(p => p.name === 'Moon').nakshatra);
  assert.equal(Object.isFrozen(r.birthFacts), true);
  const gocharMoon = r.gochar.find(x => x.planet === 'Moon');
  assert.ok(gocharMoon);
  assert.equal(gocharMoon.transitSign, ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'][r.canonicalTransitSnapshot.planets.Moon.sign]);
});

test('D9 is always derived from the same canonical longitude function', () => {
  const lon = 204.893;
  assert.equal(calcD9(lon), calcD9(lon));
});

console.log(`\n${'='.repeat(60)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));
process.exit(failed ? 1 : 0);
