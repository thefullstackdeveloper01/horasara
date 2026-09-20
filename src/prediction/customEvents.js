/** Generic structured event evaluator. Natural-language interpretation must
 * be converted into an explicit rule; the engine never guesses houses. */
import { findEventWindows } from './PredictionTruthEngine.js';
export function evaluateCustomEvent({event, houses=[], transitPlanets=[], supportingDasha=[], label=event, currentJD, planets, ascendantLon, moonLon, dashaTimeline, ayanamsa=0, horizonDays=365}={}){
 if(!event||!Array.isArray(houses)||!houses.length) return {status:'NOT_AVAILABLE',reason:'event and at least one relevant natal house are required'};
 const area=String(event).toLowerCase();
 const cfg={houses,transitPlanets,supportingDasha,label};
 const windows=findEventWindows({area:'__custom__',customConfig:cfg,planets,ascendantLon,moonLon,currentJD,dashaTimeline,ayanamsa,horizonDays});
 return {status:'AVAILABLE',event,label,houses,transitPlanets,supportingDasha,windows};
}
