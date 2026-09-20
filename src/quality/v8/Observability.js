export function createObservability(){
  const counters=new Map(), timings=new Map();
  const inc=(name,n=1)=>counters.set(name,(counters.get(name)||0)+n);
  const time=(name,ms)=>{if(!timings.has(name))timings.set(name,{count:0,totalMs:0,maxMs:0});const x=timings.get(name);x.count++;x.totalMs+=ms;x.maxMs=Math.max(x.maxMs,ms);};
  return {inc,time,snapshot:()=>({counters:Object.fromEntries(counters),timings:Object.fromEntries([...timings].map(([k,v])=>[k,{...v,avgMs:v.count?v.totalMs/v.count:0}]))})};
}
