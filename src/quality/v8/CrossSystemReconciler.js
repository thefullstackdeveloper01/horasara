export function reconcileSystems(systemResults={}){
  const systems=Object.entries(systemResults).map(([system,result])=>({system,result}));
  const claims=[];
  for(const {system,result} of systems){
    for(const claim of (result?.claims||[])) claims.push({...claim,system});
  }
  const byTopic=new Map();
  for(const claim of claims){ const k=claim.topic||claim.id||'unknown'; if(!byTopic.has(k)) byTopic.set(k,[]); byTopic.get(k).push(claim); }
  return {systems:systems.map(s=>s.system),topics:[...byTopic.entries()].map(([topic,claims])=>({topic,claims,agreement:claims.length>0&&new Set(claims.map(c=>JSON.stringify(c.value))).size===1}))};
}
