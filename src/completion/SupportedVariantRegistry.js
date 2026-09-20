/**
 * HoraSaar V1 finite, explicit classical corpus.
 * "Complete" means complete calculation for the selected documented variant,
 * never "every manuscript/lineage on earth". Unsupported variants are named.
 */
export const SUPPORTED_VARIANTS = Object.freeze({
  dasha: Object.freeze({
    vimshottari:'vimshottari-bphs', yogini:'yogini-classical', kalachakra:'kalachakra-narasimha-rao',
    ashtottari:'ashtottari-conditional', shodashottari:'shodashottari-conditional',
    dwadashottari:'dwadashottari-conditional', panchottari:'panchottari-conditional',
    shatabdika:'shatabdika-conditional', chaturashiti:'chaturashiti-sama',
    dwisaptati:'dwisaptati-sama', shastihayani:'shastihayani', shattrimshat:'shattrimshat-sama',
    chara:'jaimini-chara-v1', narayana:'jaimini-narayana-v1', nisarga:'naisargika-v1'
  }),
  jaimini: Object.freeze({ karakas:'7-graha', arudha:'standard-arudha-pada', karakamsa:'d9-atmakaraka' }),
  kp: Object.freeze({ sublord:'vimshottari-proportional-9-sub', cusps:'placidus', significators:'four-level-plus-ownership-occupancy' }),
  tajika: Object.freeze({ varshaphal:'annual-solar-return', mudda:'nine-lord-mudda', sahams:'bundled-tajika-sahams' }),
  lalkitab: Object.freeze({ teva:'house-planet-teva', timing35:'bundled-35-year-sequence', annual:'age-house-rotation', grahphal:'nine-segment-annual' }),
  prashna: Object.freeze({ classical:'rule-based-prashna-v3', kp:'kp-horary', tajika:'tajika-horary' }),
  sarvatobhadra: Object.freeze({ layout:'standard-9x9-v1' }),
  relationship: Object.freeze({ vedic:'full-ashtakoot-dashakoot-v1', western:'synastry-aspect-overlay-v1', composite:'midpoint-v1', davison:'epoch-midpoint-v1', progressedComposite:'secondary-progressed-midpoint-v1' })
});

export const UNSUPPORTED_VARIANTS = Object.freeze({
  note:'Variants without independently encoded, testable rules are not silently substituted.',
  examples:['unverified manuscript-specific Kalachakra variants','unverified Lal Kitab edition-specific annual doctrines','school-specific Jaimini exceptions without a selected source','progression techniques not explicitly implemented']
});

export function variantStatus(domain, variant){
  const chosen=SUPPORTED_VARIANTS[domain]?.[variant];
  return chosen ? {status:'IMPLEMENTED_VARIANT',domain,variant,id:chosen} : {status:'UNSUPPORTED_VARIANT',domain,variant:null};
}
