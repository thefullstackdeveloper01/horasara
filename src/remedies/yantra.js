import remedyData from '../../dataset/used/core/extended_sections.json' with { type: 'json' };

export function buildYantraRecommendations(R){
  const weak=Object.entries(R?.shadbala||{}).filter(([,v])=>v?.grade==='Weak'||v?.grade==='Very Weak').map(([planet])=>planet);
  const current=R?.dasha?.current?.mahadasha;
  const planets=[...new Set([...weak,current].filter(Boolean))];
  const rows=planets.map(planet=>({planet,yantra:remedyData.FULL_REMEDIES?.[planet]?.yantra||null,trigger:weak.includes(planet)?'Weak Shadbala':planet===current?'Current Mahadasha':'Supporting factor'})).filter(x=>x.yantra);
  return {status:rows.length?'AVAILABLE':'NOT_AVAILABLE',recommendations:rows,methodology:'Traditional reference mapping already bundled in the application; selection is constrained by chart-derived weak planets/current Mahadasha.',source:'dataset/used/core/extended_sections.json'};
}
export default {buildYantraRecommendations};
