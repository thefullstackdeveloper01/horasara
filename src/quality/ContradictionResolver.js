/** Deterministic evidence reconciliation: strongest evidence wins; ties remain explicit. */
export function resolveContradictions(evidence = []) {
  if (!Array.isArray(evidence)) throw new TypeError('evidence must be an array');
  const groups=new Map(); for(const item of evidence){if(!item?.claimId)continue;const list=groups.get(item.claimId)||[];list.push(item);groups.set(item.claimId,list)}
  const resolved={}; for(const [claimId,list] of groups){const ranked=[...list].sort((a,b)=>(Number(b.weight)||0)-(Number(a.weight)||0));const top=ranked[0];const tie=ranked.filter(x=>(Number(x.weight)||0)===(Number(top.weight)||0));resolved[claimId]=Object.freeze({decision:tie.length===1?top.decision:'CONTRADICTED',confidence:tie.length===1?'RESOLVED':'UNRESOLVED',evidence:ranked})}
  return Object.freeze(resolved);
}
