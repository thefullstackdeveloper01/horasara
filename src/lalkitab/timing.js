/**
 * Lal Kitab timing layers.
 *
 * This module keeps Lal Kitab timing separate from Parashari/Jaimini/Tajika.
 * Published Lal Kitab editions differ in anchors and some annual techniques;
 * therefore every result records its selected convention instead of silently
 * presenting one convention as universally canonical.
 */
import timingData from '../../dataset/used/core/lal-kitab-timing.json' with { type: 'json' };

const ORDER = Object.freeze(timingData.order);
const YEARS = Object.freeze(timingData.years);
const ANNUAL_ORDER = Object.freeze(timingData.annualOrder);
const TOTAL = Object.values(YEARS).reduce((a,b)=>a+b,0);
const YEAR = 365.2425;

function normalizeAge(birthJD, nowJD){
  if(!Number.isFinite(birthJD)||!Number.isFinite(nowJD)) return null;
  return Math.max(0,(nowJD-birthJD)/YEAR);
}
function repeatedCycleRows(startAge=-35,endAge=140){
  const rows=[]; for(let cycle=-2;cycle<=5;cycle++){
    let elapsed=0;
    for(let i=0;i<ORDER.length;i++){
      const planet=ORDER[i],duration=YEARS[planet],a=cycle*TOTAL+elapsed,b=a+duration;
      if(b>=startAge&&a<=endAge) rows.push({cycle,planet,durationYears:duration,startAge:a,endAge:b,sequenceIndex:i+1});
      elapsed=b-(cycle*TOTAL);
    }
  } return rows;
}

export function lalKitab35Cycle({birthJD,nowJD,anchorAge=0,anchorPlanet='Jupiter',anchorMode='edition_default'}={}) {
  const ageYears=normalizeAge(birthJD,nowJD);
  if(ageYears===null) return {status:'NOT_AVAILABLE',reason:'birthJD and nowJD are required'};
  const base=anchorMode==='edition_default'?0:Number(anchorAge);
  const anchorIndex=Math.max(0,ORDER.indexOf(anchorPlanet));
  const offsetPlanet=ORDER[anchorIndex];
  const cycleYear=((ageYears-base)%TOTAL+TOTAL)%TOTAL;
  let acc=0,current=null;
  for(let i=0;i<ORDER.length;i++){
    const planet=ORDER[(anchorIndex+i)%ORDER.length],d=YEARS[planet];
    if(cycleYear>=acc&&cycleYear<acc+d){current={planet,startYear:acc,endYear:acc+d,sequenceIndex:i+1};break;}
    acc+=d;
  }
  return {status:'AVAILABLE',system:'Lal Kitab 35-Year Cycle',order:[...ORDER],durations:{...YEARS},totalYears:TOTAL,anchor:{mode:anchorMode,age:base,planet:offsetPlanet},ageYears,cycleYear:cycleYear+1,current,cycles:repeatedCycleRows(-base-35,Math.max(120,ageYears+35)),methodology:'Published 35-year timing sequence; anchor convention is explicit because editions differ.'};
}

export function buildLalKitabGrahphal(varshaStartJD, nowJD){
  if(!Number.isFinite(varshaStartJD)||!Number.isFinite(nowJD)) return {status:'NOT_AVAILABLE',reason:'Annual start JD and current JD are required'};
  const days=YEAR/9;
  const rows=ANNUAL_ORDER.map((planet,i)=>({planet,index:i+1,startJD:varshaStartJD+i*days,endJD:varshaStartJD+(i+1)*days,durationDays:days}));
  const current=rows.find(r=>nowJD>=r.startJD&&nowJD<r.endJD)||null;
  return {status:'AVAILABLE',method:'Nine equal annual Grahphal segments (~40.58 days each); lineage/edition dependent',rows,current,allSegments:rows.map(r=>({...r,midJD:(r.startJD+r.endJD)/2}))};
}

export function calcLalKitabAnnualHouses(planets,age){
  if(!Array.isArray(planets)||!Number.isFinite(age)) return {status:'NOT_AVAILABLE',reason:'planets and completed age are required'};
  const completed=Math.floor(Math.max(0,age));
  return {status:'AVAILABLE',age,completedAge:completed,rotation:'one-house-per-completed-year',planets:planets.filter(p=>p?.house>=1&&p.house<=12).map(p=>({...p,annualHouse:((p.house-1+completed)%12)+1}))};
}

export function calculateLalKitabTimingSuite({birthJD,nowJD,varshaStartJD,planets=[],ageYears=null,anchorAge=0,anchorPlanet='Jupiter'}={}){
  const age=Number.isFinite(ageYears)?ageYears:normalizeAge(birthJD,nowJD);
  const cycle=lalKitab35Cycle({birthJD,nowJD,anchorAge,anchorPlanet,anchorMode:'edition_default'});
  const annualHouses=calcLalKitabAnnualHouses(planets,age??0);
  const grahphal=buildLalKitabGrahphal(varshaStartJD,nowJD);
  const annualMap=annualHouses.status==='AVAILABLE'?Object.fromEntries(annualHouses.planets.map(p=>[p.name,p.annualHouse])):{};
  return {status:[cycle,annualHouses,grahphal].every(x=>x.status==='AVAILABLE')?'AVAILABLE':'PARTIAL',system:'Lal Kitab Timing Suite',cycle35:cycle,annualHouses,grahphal,annualMap,methodology:{cycle:'35-year sequence from bundled timing dataset',annualHouses:'annual house rotation by completed age',grahphal:'nine equal annual segments from Varshapravesha',variantPolicy:'edition/default convention is explicit; conflicting publications must be selected as separate variants.'}};
}
