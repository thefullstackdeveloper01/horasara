import data from '../../dataset/used/core/event-remedies.json' with { type: 'json' };
export function buildEventRemedies(R){
 const events=R?.predictionTruth?.events||[];
 const out=events.map(e=>{const m=data[e.area]; if(!m) return null; return {event:e.event,area:e.area,windows:e.windows||[],triggerPlanets:m.planets,practices:m.practices,avoid:m.avoid,status:'TRADITIONAL_GUIDANCE'};}).filter(Boolean);
 return {status:'AVAILABLE',events:out,methodology:'Event remedies are attached only to chart-derived event windows and remain traditional guidance; they never convert an evidence window into a guarantee.'};
}
