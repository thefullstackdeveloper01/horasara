/**
 * Runtime capability audit.
 * Converts feature metadata into the actual status of the current calculation.
 * A feature is never marked available merely because a module exists.
 */
const DEFAULT_KEYS=Object.freeze({
  'D1/Rashi Chart':['chartData','planets','houses'],
  'Chalit Chart & Table (real Sripati unequal-Bhava)':['chalitTable'],
  'Planetary Position Master Table':['planetaryMasterTable'],
  'Bhava Phala (all 12 houses)':['bhavaPhala.rows'],
  'Shadbala':['shadbala'],
  'Bhavabala':['bhavaBala'],
  'Ashtakavarga / Sarvashtakavarga':['ashtakavarga'],
  'Yoga Engine (detection + classical enrichment)':['yogas'],
  'Dosha Engine (Mangal/Kalsarpa/Sade Sati/Pitru/Nadi/Grahan)':['doshas'],
  'KP Astrology Module (cusps, sub-lords, significators)':['kpChart'],
  'Western/Tropical Astrology Module':['westernChart'],
  'Vimshottari Dasha (Maha/Antar/Pratyantar)':['dasha.current','dasha.timeline'],
  'Jaimini Module (Chara Karakas, Arudhas, Karakamsha, Chara Dasha)':['jaiminiAdvanced'],
  'Varshaphal / Solar Return (any year)':['varshaphalTable'],
  'Favourable Period Engine':['favourable'],
  'Lal Kitab Module':['lkFull','lalKitabTiming'],
  'Gemstone Module':['gemstoneRecommendations'],
  'Rudraksha Module':['rudrakshaRecommendations'],
  'Yantra Module':['yantraRecommendations'],
  'Dynamic Event Engine (user-defined events)':['exactEventForecast'],
  'Contradiction Resolution Engine (cross-system agreement/disagreement)':['multiSystemSynthesis'],
  'Evidence Matrix (per-prediction factor/system/result table)':['evidenceMatrix'],
  'Calculation Audit Trail':['calculationAudit'],
  'Birth-Time Sensitivity Analysis':['extendedReport'],
});
function at(obj,path){return path.split('.').reduce((v,k)=>v?.[k],obj)}
export function buildLiveCapabilityAudit(result, featureChecklist=[]){
 const rows=featureChecklist.map(f=>{
   const keys=DEFAULT_KEYS[f.feature]||[];
   if(!keys.length) return {...f,runtimeStatus:'METADATA_ONLY'};
   const values=keys.map(k=>at(result,k)).filter(v=>v!==undefined&&v!==null);
   const nonEmpty=values.filter(v=>Array.isArray(v)?v.length>0:typeof v==='object'?Object.keys(v).length>0:true);
   return {...f,runtimeStatus:nonEmpty.length===keys.length?'AVAILABLE':nonEmpty.length?'PARTIAL':'NOT_AVAILABLE',runtimeKeys:keys};
 });
 const summary=rows.reduce((a,r)=>{a[r.runtimeStatus]=(a[r.runtimeStatus]||0)+1;return a},{});
 return {status:'AVAILABLE',dynamic:true,summary,rows,policy:'Runtime availability is derived from the actual calculation result; feature metadata is not treated as proof of a calculated result.'};
}
export default {buildLiveCapabilityAudit};
