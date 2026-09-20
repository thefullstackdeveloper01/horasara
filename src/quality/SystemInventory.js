/**
 * Canonical capability inventory. Counts only what the current codebase can
 * expose through a named registry/module. A catalogue entry is not upgraded
 * to VERIFIED merely because a similarly named feature exists in a competitor.
 */
import { listHouseSystems } from '../charts/HouseSystemRegistry.js';
import { listClassicalDashaSystems } from '../dasha/completeDashaSuite.js';

export const STANDARD_VARGAS = Object.freeze([
  'D1','D2','D3','D4','D7','D9','D10','D12','D16','D20','D24','D27','D30','D40','D45','D60'
]);

export const SYSTEM_FAMILIES = Object.freeze([
  { id:'astronomy', name:'Astronomical calculation', status:'IMPLEMENTED_BUT_PROVIDER_PRECISION_DEPENDENT' },
  { id:'panchanga', name:'Panchanga / calendrical astronomy', status:'IMPLEMENTED' },
  { id:'varga', name:'Shodashavarga', status:'IMPLEMENTED' },
  { id:'house', name:'House systems', status:'IMPLEMENTED' },
  { id:'dasha', name:'Dasha systems', status:'CATALOGUED_WITH_EXPLICIT_VARIANTS' },
  { id:'strength', name:'Planetary/house strength', status:'IMPLEMENTED' },
  { id:'ashtakavarga', name:'Ashtakavarga', status:'IMPLEMENTED' },
  { id:'yoga', name:'Yoga detection/enrichment', status:'IMPLEMENTED_WITH_COVERAGE_CLASSIFICATION' },
  { id:'jaimini', name:'Jaimini', status:'IMPLEMENTED' },
  { id:'kp', name:'KP', status:'IMPLEMENTED' },
  { id:'tajika', name:'Tajika / Varshaphala', status:'IMPLEMENTED' },
  { id:'prashna', name:'Prashna', status:'IMPLEMENTED' },
  { id:'muhurta', name:'Muhurta', status:'IMPLEMENTED' },
  { id:'lalkitab', name:'Lal Kitab', status:'PARTIAL' },
  { id:'numerology', name:'Numerology', status:'IMPLEMENTED' },
  { id:'compatibility', name:'Compatibility / synastry', status:'IMPLEMENTED' },
  { id:'prediction', name:'Evidence/prediction synthesis', status:'IMPLEMENTED_BUT_EMPIRICAL_ACCURACY_UNPROVEN' },
]);

export function buildSystemInventory() {
  const houses = listHouseSystems();
  const dashas = listClassicalDashaSystems();
  const dashaImplemented = dashas.filter(x => x.implemented).length;
  const dashaVariants = dashas.filter(x => !x.implemented).length;
  return {
    version: '14.0.0',
    standardVargas: STANDARD_VARGAS.map(chart => ({ chart, status:'IMPLEMENTED' })),
    houseSystems: houses,
    dasha: {
      catalogueCount: dashas.length,
      directlyImplementedCount: dashaImplemented,
      explicitVariantAdapterCount: dashaVariants,
      systems: dashas,
    },
    families: SYSTEM_FAMILIES,
    claimsPolicy: {
      jhoraParity: 'NOT_CLAIMED_WITHOUT_SYSTEM_BY_SYSTEM_REFERENCE_CHECK',
      scientificPredictionProof: false,
      astronomicalPrecision: 'PROVIDER_DEPENDENT',
      classicalTextTraceability: true,
    },
  };
}

export default { STANDARD_VARGAS, SYSTEM_FAMILIES, buildSystemInventory };
