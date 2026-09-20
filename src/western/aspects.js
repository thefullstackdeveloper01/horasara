/** Degree-based Western aspect engine.
 * Exact angular separation + configurable orb + applying/separating phase.
 * Phase is determined from instantaneous relative motion, not guessed.
 */
import moduleData from '../../dataset/used/core/aspects.json' with { type: 'json' };
const ASPECTS = moduleData.ASPECTS;
function separation(a,b){ const d=Math.abs(((a-b)%360+360)%360); return Math.min(d,360-d); }
function deviationAt(a,b,angle){ return Math.abs(separation(a,b)-angle); }
export function findWesternAspect(lon1, lon2, opts={}) {
  const sep=separation(lon1,lon2);
  const candidates=ASPECTS.map(a=>({...a, orb: opts.orbs?.[a.name] ?? a.orb, deviation:Math.abs(sep-a.angle)}))
    .filter(a=>a.deviation<=a.orb).sort((a,b)=>a.deviation-b.deviation);
  if(!candidates[0]) return null;
  return {...candidates[0], separation:sep, applying: null, phase:'UNKNOWN'};
}

function phaseFor(a,b,aspect,opts={}) {
  const sa=Number(a.speed), sb=Number(b.speed);
  if(!Number.isFinite(sa)||!Number.isFinite(sb)) return {applying:null,phase:'UNKNOWN'};
  const dt=opts.phaseStepDays ?? 0.05;
  const futureA=((Number(a.tropicalLon ?? a.lon ?? a.siderealLon)+sa*dt)%360+360)%360;
  const futureB=((Number(b.tropicalLon ?? b.lon ?? b.siderealLon)+sb*dt)%360+360)%360;
  const nowDev=deviationAt(Number(a.tropicalLon ?? a.lon ?? a.siderealLon),Number(b.tropicalLon ?? b.lon ?? b.siderealLon),aspect.angle);
  const futureDev=deviationAt(futureA,futureB,aspect.angle);
  if(Math.abs(futureDev-nowDev)<1e-8) return {applying:null,phase:'STATIONARY'};
  return futureDev<nowDev ? {applying:true,phase:'APPLYING'} : {applying:false,phase:'SEPARATING'};
}

export function calcWesternAspects(planets, opts={}) {
  const out=[]; const ps=(planets||[]).filter(p=>Number.isFinite(p.tropicalLon ?? p.lon ?? p.siderealLon));
  for(let i=0;i<ps.length;i++) for(let j=i+1;j<ps.length;j++){
    const a=ps[i],b=ps[j]; const aa=a.tropicalLon ?? a.lon ?? a.siderealLon; const bb=b.tropicalLon ?? b.lon ?? b.siderealLon;
    const aspect=findWesternAspect(aa,bb,opts); if(aspect){ const phase=phaseFor(a,b,aspect,opts); out.push({from:a.name,to:b.name,...aspect,...phase}); }
  }
  return out;
}
export { ASPECTS };
