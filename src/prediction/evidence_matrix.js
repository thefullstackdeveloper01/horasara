/** Structured evidence view over the canonical unified prediction output. */
export function buildEvidenceMatrix(R) {
  const u=R?.unifiedPrediction;
  if(!u || u.error) return {status:'NOT_CALCULATED',reason:u?.error||'Unified prediction unavailable'};
  const rows=[];
  for(const [area,p] of Object.entries(u.predictions||{})){
    for(const [factor,b] of Object.entries(p.breakdown||{})){
      rows.push({event:area,factor,rawValue:b.value,weight:b.weight,contribution:b.contribution,direction:p.direction,score:p.score});
    }
  }
  return {status:'AVAILABLE',methodology:'Directly surfaced from the canonical unified prediction breakdown; no second scoring engine.',rows};
}
export default {buildEvidenceMatrix};
