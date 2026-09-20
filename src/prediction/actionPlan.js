export function buildFiveYearActionPlan(R){
 const current=R?.dasha?.current?.mahadasha||null; const timeline=R?.dasha?.timeline||[];
 const areas=R?.lifeAreaScores||{};
 const weakest=Object.entries(areas).sort((a,b)=>(a[1]?.score??9)-(b[1]?.score??9)).slice(0,3).map(([k,v])=>({area:k,score:v.score}));
 const years=[]; const now=new Date().getUTCFullYear();
 for(let i=0;i<5;i++){
   const year=now+i; const period=timeline.find(d=>{const y=Number(String(d.start).slice(0,4)); const ey=Number(String(d.end).slice(0,4)); return y<=year&&year<=ey;});
   years.push({year,mahadasha:period?.mahadasha||current,priority:i===0?'Stabilise current cycle':'Develop the strongest chart-supported opportunity',watchAreas:weakest,actions:['Use the active dasha/transit evidence as the timing layer','Prefer measurable real-world milestones over prediction certainty','Review the chart again when birth-time/input assumptions change']});
 }
 return {status:'AVAILABLE',years,methodology:'Five-year strategy is a planning layer derived from the canonical Dasha, life-area scores and evidence windows; it is not a deterministic event promise.'};
}

export function buildDoshaYogaActivationTimeline(R){
 const rows=[];
 for(const y of R?.yogas||[]) if(y?.name) rows.push({type:'YOGA',name:y.name,status:y.status||'FORMED',timing:y.timing||null});
 for(const [k,v] of Object.entries(R?.doshas||{})){
   if(Array.isArray(v)) for(const d of v) rows.push({type:'DOSHA',name:d?.name||k,status:d?.status||'PRESENT',timing:d?.timing||null});
 }
 return {status:'AVAILABLE',rows,methodology:'Consolidated from canonical Yoga/Dosha outputs; absent timing is shown as null rather than fabricated.'};
}
