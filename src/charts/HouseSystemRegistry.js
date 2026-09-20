/** Canonical house-system capability registry. Algorithms live in houses.js; this
 * registry prevents UI/report layers from claiming a system merely because a
 * label exists. Each system is classified by its actual cusp resolver. */
export const HOUSE_SYSTEMS = Object.freeze([
  { id:'whole', name:'Whole Sign', frame:'sidereal', method:'sign boundaries', status:'AVAILABLE' },
  { id:'equal', name:'Equal', frame:'sidereal', method:'30° from Ascendant', status:'AVAILABLE' },
  { id:'sripati', name:'Sripati', frame:'sidereal', method:'quadrant bhava-madhya construction', status:'AVAILABLE' },
  { id:'placidus', name:'Placidus', frame:'sidereal/tropical-compatible', method:'time-based semi-arc iteration', status:'AVAILABLE' },
  { id:'koch', name:'Koch', frame:'sidereal/tropical-compatible', method:'MC semi-diurnal arc', status:'AVAILABLE' },
  { id:'porphyry', name:'Porphyry', frame:'sidereal/tropical-compatible', method:'quadrant trisect in ecliptic longitude', status:'AVAILABLE' },
]);
export function listHouseSystems(){ return HOUSE_SYSTEMS.map(x=>({...x})); }
export function getHouseSystem(id){ return HOUSE_SYSTEMS.find(x=>x.id===String(id).toLowerCase()) || null; }
