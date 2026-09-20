import crypto from 'node:crypto';

export function canonicalCase(c){
  if(!c?.id||!c?.input) throw new Error('case requires id and input');
  return {id:String(c.id),input:c.input,conventions:c.conventions||{}};
}
export function runBenchmark(cases, adapters){
  if(!Array.isArray(cases)||!Array.isArray(adapters)||adapters.length<2) throw new Error('at least two adapters required');
  return cases.map(raw=>{
    const c=canonicalCase(raw), outputs={};
    for(const a of adapters){
      if(!a?.name||typeof a.calculate!=='function') throw new Error('invalid engine adapter');
      outputs[a.name]=a.calculate(c.input,c.conventions);
    }
    return {id:c.id,conventions:c.conventions,outputs,hash:crypto.createHash('sha256').update(JSON.stringify(outputs)).digest('hex')};
  });
}
export function compareNumericAngles(a,b,tolerance=0.001){
  const d=Math.abs(((Number(a)-Number(b)+180)%360+360)%360-180);
  return d<=tolerance;
}
export function benchmarkSummary(results, comparator=(a,b)=>JSON.stringify(a)===JSON.stringify(b)){
  const engines=[...new Set(results.flatMap(r=>Object.keys(r.outputs)))];
  const comparisons=[];
  for(const r of results){
    const base=r.outputs[engines[0]];
    for(const e of engines.slice(1)) comparisons.push({caseId:r.id,engine:e,match:comparator(base,r.outputs[e])});
  }
  const matches=comparisons.filter(x=>x.match).length;
  return {cases:results.length,engines,comparisons,matchRate:comparisons.length?matches/comparisons.length:0};
}
