export async function runScaleHarness(task,{iterations=100,concurrency=10}={}){
  if(typeof task!=='function') throw new TypeError('task must be a function');
  const started=Date.now(); let completed=0,failed=0;
  async function worker(){while(true){const i=completed+failed;if(i>=iterations)return;completed++;try{await task(i);}catch{failed++;}}}
  await Promise.all(Array.from({length:Math.min(concurrency,iterations)},worker));
  const elapsedMs=Date.now()-started;
  return {iterations,concurrency,completed,failed,elapsedMs,throughputPerSecond:elapsedMs?completed/(elapsedMs/1000):0};
}
