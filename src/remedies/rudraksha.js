import remedyData from '../../dataset/used/core/extended_sections.json' with { type: 'json' };

/** Lagna-aware Rudraksha selection. Functional nature is a gate/priority,
 * while Shadbala weakness and current Mahadasha supply the activation signal.
 * This avoids the old rule of recommending every weak planet indiscriminately.
 */
export function buildRudrakshaRecommendations(R){
 const fn=R?.functionalNature||{};
 const weak=Object.entries(R?.shadbala||{})
   .filter(([,v])=>v?.grade==='Weak'||v?.grade==='Very Weak')
   .map(([planet,v])=>({planet,ratio:v.ratio}));
 const current=R?.dasha?.current?.mahadasha;
 const candidates=[...weak.map(x=>x.planet), current].filter(Boolean);
 const unique=[...new Set(candidates)];
 const rows=unique.map(planet=>{
   const nature=fn[planet]?.nature||'Unknown';
   const functionalPositive=['Yogakaraka','Functional Benefic','Neutral'].includes(nature);
   const active=planet===current;
   const weakFlag=weak.some(x=>x.planet===planet);
   const mapping=remedyData.FULL_REMEDIES?.[planet]?.rudraksha||null;
   if(!mapping) return null;
   if(!functionalPositive && !active) return {planet,rudraksha:mapping,eligible:false,reason:`Functional nature is ${nature}; no active Dasha signal, so no recommendation is made.`};
   return {planet,rudraksha:mapping,eligible:true,functionalNature:nature,trigger:[weakFlag?'Weak Shadbala':null,active?'Current Mahadasha':null].filter(Boolean).join(' + ')||'Functional nature',reason:`Lagna-aware selection: ${nature}; activated by ${weakFlag?'weak Shadbala':'functional priority'}${active?' and current Mahadasha':''}.`};
 }).filter(Boolean);
 const recommendations=rows.filter(r=>r.eligible);
 return {status:recommendations.length?'AVAILABLE':'NOT_AVAILABLE',recommendations,excluded:rows.filter(r=>!r.eligible),methodology:'Traditional Rudraksha mapping constrained by this chart\'s Lagna-derived functional nature plus Shadbala/Mahadasha activation. This is a traditional practice, not a medical or guaranteed-outcome claim.',source:'dataset/used/core/extended_sections.json'};
}
export default {buildRudrakshaRecommendations};
