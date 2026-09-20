export const V8_VALIDATION_CONTRACTS={
  yoga_dosha:['formation','cancellation','strength','exceptions','edge_cases'],
  varga:['all_supported_vargas','variants','boundary_cases'],
  dasha:['start_boundary','end_boundary','nested_levels','timezone_dst'],
  kp:['cusps','sub_lords','significators','ruling_planets','timing'],
  panchanga:['tithi','nakshatra','yoga','karana','sunrise_sunset','regional_conventions'],
  muhurta:['reference_cases','regional_rules','outcome_validation']
};
export function contractReport(fixtures={}){return Object.fromEntries(Object.entries(V8_VALIDATION_CONTRACTS).map(([k,areas])=>[k,{required:areas,covered:areas.filter(a=>Array.isArray(fixtures[k]?.[a])&&fixtures[k][a].length>0),missing:areas.filter(a=>!(Array.isArray(fixtures[k]?.[a])&&fixtures[k][a].length>0))}]));}
