export function reconcileSystems(systemResults=[],{policy='evidence-first'}={}){
 const usable=systemResults.filter(x=>x&&x.status!=='error');
 const contradictions=[]; for(let i=0;i<usable.length;i++)for(let j=i+1;j<usable.length;j++)if(JSON.stringify(usable[i].conclusion)!==JSON.stringify(usable[j].conclusion))contradictions.push({a:usable[i].system,b:usable[j].system});
 return {policy,systems:usable.map(x=>x.system),contradictions,count:contradictions.length,requiresReview:contradictions.length>0,rule:'No system is silently treated as ground truth; conflicts retain provenance.'};
}
