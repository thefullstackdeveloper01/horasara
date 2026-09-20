export function walkForwardEvaluate(cases=[], predict, {minTraining=0}={}){
  if(typeof predict!=='function') throw new TypeError('predict must be a function');
  const ordered=[...cases].sort((a,b)=>new Date(a.event.date)-new Date(b.event.date));
  const results=[];
  for(let i=minTraining;i<ordered.length;i++){
    const test=ordered[i], training=ordered.slice(0,i);
    const prediction=predict(test,training);
    const observed=Boolean(test.outcome?.observed), predicted=Boolean(prediction?.predicted);
    results.push({id:test.id,predicted,observed,correct:predicted===observed,cutoff:test.cutoff,eventDate:test.event.date});
  }
  const correct=results.filter(r=>r.correct).length;
  return {cases:results.length,correct,incorrect:results.length-correct,accuracy:results.length?correct/results.length:null,results};
}
