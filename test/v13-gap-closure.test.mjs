import assert from 'node:assert/strict';
import test from 'node:test';
import { calcD4 } from '../src/charts/vargas.js';
import { buildVargaSignifications } from '../src/prediction/vargaSignifications.js';
import { enrichYogasWithClassicalDetail } from '../src/prediction/yogaEnrichment.js';
import { listHouseSystems } from '../src/charts/HouseSystemRegistry.js';
import { assessScientificReadiness } from '../src/quality/ScientificReadiness.js';

test("D4 uses four 7°30' quarters and kendra mapping", () => {
  assert.equal(calcD4(0), 0);
  assert.equal(calcD4(7.49), 0);
  assert.equal(calcD4(7.5), 3);
  assert.equal(calcD4(15), 6);
  assert.equal(calcD4(22.5), 9);
  assert.equal(calcD4(29.999), 9);
});

test('all 16 standard Vargas have calculation + classical catalog coverage', () => {
  const R={vargas:{ascendant:{D1:{sign:'Aries'},D9:{sign:'Aries'},D10:{sign:'Aries'}},D1:{},D2:{},D3:{},D4:{},D7:{},D9:{},D10:{},D12:{},D16:{},D20:{},D24:{},D27:{},D30:{},D40:{},D45:{},D60:{}},planets:[]};
  const out=buildVargaSignifications(R);
  assert.equal(out.coverage.catalogComplete,true);
  assert.equal(out.coverage.calculationComplete,true);
  assert.equal(out.coverage.interpretationComplete,true);
});

test('yoga enrichment always exposes an explicit classification', () => {
  const out=enrichYogasWithClassicalDetail([{name:'Gaja Kesari Yoga',type:'Dhana',strength:'Strong',desc:'test'}]);
  assert.ok(['CONFIRMED','CONDITIONAL','CANCELLED','CLASSICAL_MATCH','ENGINE_DETECTED'].includes(out[0].classification));
});

test('house registry exposes six actually implemented systems', () => {
  assert.deepEqual(listHouseSystems().map(x=>x.id),['whole','equal','sripati','placidus','koch','porphyry']);
});

test('scientific gate refuses unsupported certification', () => {
  const r=assessScientificReadiness({vargaCoverage:{status:'AVAILABLE'},astronomy:{precisionGrade:'TRUNCATED',independentValidation:false},outcomeDataset:{eligibleCases:0}});
  assert.equal(r.status,'NOT_SCIENTIFICALLY_CERTIFIED');
  assert.equal(r.empiricalPrediction.status,'UNPROVEN');
});
