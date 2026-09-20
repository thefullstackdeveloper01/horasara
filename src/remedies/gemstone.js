import remedyData from '../../dataset/used/core/extended_sections.json' with { type: 'json' };
export function buildGemstoneRecommendations(R){
 const weak=Object.entries(R?.shadbala||{}).filter(([,v])=>v?.grade==='Weak'||v?.grade==='Very Weak').map(([planet])=>planet);
 const current=R?.dasha?.current?.mahadasha; const planets=[...new Set([...weak,current].filter(Boolean))];
 const rows=planets.map(planet=>({planet,gemstone:remedyData.FULL_REMEDIES?.[planet]?.gemstone||null,trigger:weak.includes(planet)?'Weak Shadbala':planet===current?'Current Mahadasha':'Supporting factor'})).filter(x=>x.gemstone);
 return {status:rows.length?'AVAILABLE':'NOT_AVAILABLE',recommendations:rows,methodology:'Traditional gemstone mapping already bundled in the application; this is a Jyotish tradition, not a medical or guaranteed-outcome claim.',source:'dataset/used/core/extended_sections.json'};
}
export default {buildGemstoneRecommendations};
