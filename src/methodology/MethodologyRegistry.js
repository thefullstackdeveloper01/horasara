/** Explicit methodology profiles. Algorithms are selected by data/configuration, never silently mixed. */
const PROFILES = Object.freeze({
  PARASHARI: { id:'PARASHARI', name:'Parashari', families:['graha','bhava','yoga','dasha','gochara'], requires:['chart','bhava','dasha'] },
  KP: { id:'KP', name:'Krishnamurti Paddhati', families:['cuspal','nakshatra','sub-lord','ruling-planets','dasha'], requires:['cusps','nakshatra','subLord'] },
  JAIMINI: { id:'JAIMINI', name:'Jaimini', families:['chara-karaka','rashi-drishti','arudha','dasha'], requires:['charaKaraka','rashiDrishti'] },
  TAJIKA: { id:'TAJIKA', name:'Tajika / Varshaphala', families:['annual-chart','muntha','sahams','yoga'], requires:['annualChart','muntha'] },
  LAL_KITAB: { id:'LAL_KITAB', name:'Lal Kitab', families:['planet-house','remedy','annual'], requires:['planetHouse'] },
  PRASHNA: { id:'PRASHNA', name:'Prashna', families:['horary-chart','question-lord','timing'], requires:['question','horaryChart'] },
});
export const listMethodologies = () => Object.values(PROFILES).map(x => Object.freeze({...x}));
export const getMethodology = id => PROFILES[String(id || '').toUpperCase()] ? Object.freeze({...PROFILES[String(id).toUpperCase()]}) : null;
export function validateMethodologyInput(id, input = {}) {
  const p = getMethodology(id);
  if (!p) return {valid:false, errors:[`Unknown methodology: ${id}`]};
  const missing = p.requires.filter(k => input[k] == null);
  return Object.freeze({valid: missing.length === 0, methodology:p.id, missing});
}
