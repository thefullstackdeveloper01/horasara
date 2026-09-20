/**
 * Top-level algorithm inventory. This is deliberately a calculation inventory,
 * not a marketing feature list. Every entry states the implementation method,
 * evidence class and known limitation.
 */
export const ALGORITHMS = Object.freeze([
  {id:'TIME-JD',family:'Time',name:'Julian Day',method:'Gregorian/Julian calendar → JD',evidence:'REFERENCE_TESTED',source:'src/astronomy/vsop87.js',limitation:null},
  {id:'TIME-DELTAT',family:'Time',name:'Delta-T',method:'Espenak/Meeus segmented polynomials + long-term model',evidence:'REFERENCE_TESTED',source:'src/astronomy/deltat.js',limitation:'uncertainty grows outside fitted eras'},
  {id:'TIME-SIDEREAL',family:'Time',name:'Local Sidereal Time',method:'GMST/GAST + longitude',evidence:'DETERMINISTIC',source:'src/astronomy/vsop87.js',limitation:null},
  {id:'ASTRO-VSOP87',family:'Astronomy',name:'Planetary ephemeris',method:'truncated Meeus/VSOP87 heliocentric series',evidence:'REFERENCE_TESTED',source:'src/astronomy/vsop87.js',limitation:'not full VSOP87 coefficient set'},
  {id:'ASTRO-LIGHTTIME',family:'Astronomy',name:'Planetary light-time',method:'iterated retarded-time planet evaluation',evidence:'DETERMINISTIC',source:'src/astronomy/vsop87.js',limitation:'inherits ephemeris truncation'},
  {id:'ASTRO-ABERRATION',family:'Astronomy',name:'Annual aberration',method:'Meeus directional aberration correction',evidence:'DETERMINISTIC',source:'src/astronomy/vsop87.js',limitation:'inherits source ephemeris'},
  {id:'ASTRO-NUTATION',family:'Astronomy',name:'Nutation',method:'IAU 2000B',evidence:'REFERENCE_TESTED',source:'src/astronomy/nutation2000b.js',limitation:null},
  {id:'ASTRO-TOPO',family:'Astronomy',name:'Topocentric correction',method:'oblate-Earth observer geometry',evidence:'DETERMINISTIC',source:'src/astronomy/corrections.js',limitation:'refraction is optional'},
  {id:'ASTRO-NODES',family:'Astronomy',name:'Lunar nodes',method:'mean/true node models',evidence:'REFERENCE_TESTED',source:'src/astronomy/vsop87.js',limitation:'true-node model is not a numerical ephemeris'},
  {id:'ASTRO-AYANAMSA',family:'Astronomy',name:'Ayanamsa',method:'configurable sidereal offsets',evidence:'DETERMINISTIC',source:'src/astronomy/utils.js',limitation:'traditions differ'},
  {id:'GEO-HIST-TZ',family:'Geography',name:'Historical timezone',method:'bundled city/timezone/DST data + Intl validation',evidence:'REFERENCE_TESTED',source:'src/time/HistoricalTimeEngine.js',limitation:'coverage depends on bundled atlas'},
  {id:'CHART-D1',family:'Charts',name:'Rashi',method:'sidereal longitude → sign',evidence:'DETERMINISTIC',source:'src/charts/vargas.js',limitation:null},
  {id:'CHART-D2-D60',family:'Charts',name:'Shodashavarga',method:'classical division-specific mapping',evidence:'REFERENCE_TESTED',source:'src/charts/vargas.js',limitation:'tradition-specific variants exist'},
  {id:'HOUSE-WHOLE',family:'Houses',name:'Whole Sign',method:'sign boundaries from ascendant sign',evidence:'DETERMINISTIC',source:'src/charts/houses.js',limitation:null},
  {id:'HOUSE-EQUAL',family:'Houses',name:'Equal',method:'30° increments from ascendant',evidence:'DETERMINISTIC',source:'src/charts/houses.js',limitation:null},
  {id:'HOUSE-SRIPATI',family:'Houses',name:'Sripati',method:'Porphyry quadrant construction + bhava-midpoint transformation',evidence:'REFERENCE_TESTED',source:'src/charts/houses.js',limitation:'lineage-dependent implementation details'},
  {id:'HOUSE-PLACIDUS',family:'Houses',name:'Placidus',method:'time/right-ascension semi-arc iteration',evidence:'REFERENCE_TESTED',source:'src/charts/houses.js',limitation:'circumpolar fallback to Equal'},
  {id:'HOUSE-KOCH',family:'Houses',name:'Koch',method:'MC semi-diurnal arc construction',evidence:'REFERENCE_TESTED',source:'src/charts/houses.js',limitation:'circumpolar fallback to Equal'},
  {id:'HOUSE-PORPHYRY',family:'Houses',name:'Porphyry',method:'ecliptic trisection of quadrants',evidence:'DETERMINISTIC',source:'src/charts/houses.js',limitation:null},
  {id:'STRENGTH-SHADBALA',family:'Strength',name:'Shadbala',method:'component-wise classical strength aggregation',evidence:'REFERENCE_TESTED',source:'src/strength',limitation:'tradition-specific thresholds/rounding'},
  {id:'STRENGTH-BHAVABALA',family:'Strength',name:'Bhava Bala',method:'house strength aggregation',evidence:'REFERENCE_TESTED',source:'src/strength',limitation:'tradition-specific variants'},
  {id:'STRENGTH-VIMSHOPAKA',family:'Strength',name:'Vimshopaka',method:'varga-weighted dignity score',evidence:'REFERENCE_TESTED',source:'src/charts/vargas.js',limitation:'scheme selection matters'},
  {id:'ASHTAKAVARGA-BAV-SAV',family:'Strength',name:'Ashtakavarga',method:'canonical contributor matrices + reductions',evidence:'REFERENCE_TESTED',source:'src',limitation:'reference tradition/planet inclusion choices'},
  {id:'DASHA-VIM',family:'Dasha',name:'Vimshottari',method:'Moon nakshatra balance + 120-year sequence',evidence:'REFERENCE_TESTED',source:'src/dasha/vimshottari.js',limitation:'year-length configuration affects calendar dates'},
  {id:'DASHA-YOGINI',family:'Dasha',name:'Yogini',method:'nakshatra-anchored 36-year sequence',evidence:'REFERENCE_TESTED',source:'src/dasha/yogini.js',limitation:null},
  {id:'DASHA-KALACHAKRA',family:'Dasha',name:'Kalachakra',method:'nakshatra-pada/rashi progression',evidence:'REFERENCE_TESTED',source:'src/dasha/kalachakra.js',limitation:'variant traditions exist'},
  {id:'DASHA-JAIMINI',family:'Dasha',name:'Chara Dasha',method:'rashi-based Jaimini progression',evidence:'REFERENCE_TESTED',source:'src/dasha/chara.js',limitation:'co-lord and direction variants'},
  {id:'PANCHANGA',family:'Calendar',name:'Panchanga',method:'tithi/nakshatra/yoga/karana + sunrise/sunset',evidence:'REFERENCE_TESTED',source:'src/panchanga',limitation:'calendar tradition settings'},
  {id:'KP-SUBLORD',family:'KP',name:'KP sub-lords',method:'KP cusp + star/sub subdivision',evidence:'REFERENCE_TESTED',source:'src/kp/kp_system.js',limitation:'requires exact cusp/ayanamsa configuration'},
  {id:'JAIMINI-KARAKAS',family:'Jaimini',name:'Chara Karakas',method:'degree ranking within signs',evidence:'REFERENCE_TESTED',source:'src/dasha/chara.js',limitation:'7-vs-8 karaka tradition'},
  {id:'TAJIKA-RETURN',family:'Tajika',name:'Solar return / Varshaphala',method:'solar longitude return search',evidence:'REFERENCE_TESTED',source:'src',limitation:'Tajika interpretation variants'},
  {id:'PRASHNA',family:'Prashna',name:'Prashna engine',method:'question-time chart + rule synthesis',evidence:'IMPLEMENTED',source:'src/systems/prashna',limitation:'empirical predictive efficacy unproven'},
  {id:'MUHURTA',family:'Muhurta',name:'Muhurta windows',method:'panchanga/transit constraint scanning',evidence:'IMPLEMENTED',source:'src/muhurta',limitation:'tradition-specific election rules'},
  {id:'YOGA',family:'Yoga',name:'Yoga detection/enrichment',method:'condition graph + classical dataset matching',evidence:'CLASSICAL_TRACEABLE',source:'src/yoga;src/prediction/yogaEnrichment.js',limitation:'database coverage is not universal'},
  {id:'EVIDENCE-GRAPH',family:'Prediction',name:'Evidence synthesis',method:'supporting/counter-evidence graph + contradiction resolution',evidence:'DETERMINISTIC',source:'src/prediction;src/quality',limitation:'not a proof of predictive truth'},
  {id:'BACKTEST',family:'Prediction',name:'Outcome backtesting',method:'leakage-resistant labelled-outcome evaluation',evidence:'DETERMINISTIC',source:'src/quality/backtesting',limitation:'no outcome dataset bundled'},
]);

export function listAlgorithms(){ return ALGORITHMS.map(x=>({...x})); }
export function getAlgorithm(id){ return ALGORITHMS.find(x=>x.id===id) || null; }
export function summarizeAlgorithms(){
  return ALGORITHMS.reduce((a,x)=>{a[x.evidence]=(a[x.evidence]||0)+1;return a;},{});
}
export default {ALGORITHMS,listAlgorithms,getAlgorithm,summarizeAlgorithms};
