function cutoffMs(x){return Date.parse(x?.cutoffAt||'');}
function eventMs(x){return Date.parse(x?.eventAt||'');}
export function validateOutcomeCases(cases=[]){
  const issues=[]; const seen=new Set(); let eligible=0;
  for(const c of cases){
    if(!c?.id||seen.has(c.id)) issues.push({id:c?.id||null,error:'missing_or_duplicate_id'});
    seen.add(c?.id);
    if(!c?.chart||!c?.eventType||!c?.cutoffAt||!c?.eventAt) issues.push({id:c?.id,error:'required_fields_missing'});
    if(Number.isNaN(cutoffMs(c))||Number.isNaN(eventMs(c))) issues.push({id:c?.id,error:'invalid_dates'});
    else if(cutoffMs(c)>=eventMs(c)) issues.push({id:c?.id,error:'temporal_leakage'}); else eligible++;
  }
  return {valid:issues.length===0,cases:cases.length,eligible,issues};
}
export function walkForward(cases=[], folds=5){
  const clean=cases.filter(c=>cutoffMs(c)<eventMs(c)).sort((a,b)=>cutoffMs(a)-cutoffMs(b));
  const size=Math.max(1,Math.floor(clean.length/folds));
  return Array.from({length:folds},(_,i)=>({fold:i+1,train:clean.slice(0,i*size),test:clean.slice(i*size,(i+1)*size)}));
}
