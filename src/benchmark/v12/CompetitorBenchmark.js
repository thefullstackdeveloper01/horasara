import crypto from 'node:crypto';

export function normalizeCase(c){
  if(!c?.id || !c?.input) throw new Error('benchmark case requires id and input');
  return {id:String(c.id),input:c.input,conventions:c.conventions||{}};
}
export function benchmarkEngines(cases, adapters){
  if(!Array.isArray(cases)||!Array.isArray(adapters)||!adapters.length) throw new Error('cases and adapters required');
  return cases.map(raw=>{
    const c=normalizeCase(raw), outputs={};
    for(const a of adapters){
      if(typeof a.calculate!=='function') throw new Error(`adapter ${a.name} has no calculate()`);
      outputs[a.name]=a.calculate(c.input,c.conventions);
    }
    const digest=crypto.createHash('sha256').update(JSON.stringify(outputs)).digest('hex');
    return {id:c.id,conventions:c.conventions,outputs,digest};
  });
}
export function compareOutputs(results, comparator=(a,b)=>JSON.stringify(a)===JSON.stringify(b)){
  return results.map(r=>{const vals=Object.values(r.outputs), baseline=vals[0];
    const comparisons=Object.entries(r.outputs).map(([engine,value])=>({engine,match:comparator(baseline,value)}));
    return {...r,comparisons};});
}
