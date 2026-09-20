import { findWesternAspect } from './aspects.js';
export function calcBhavaMadhyaAspects(planets, houses, opts={}) {
  const hs=Array.isArray(houses)?houses:Object.values(houses||{});
  const out=[];
  for(const p of planets||[]) for(const h of hs){
    const cusp=h.cusp ?? h.startDeg ?? h.middle ?? h.bhavaMadhya;
    if(!Number.isFinite(cusp) || !Number.isFinite(p.siderealLon)) continue;
    const aspect=findWesternAspect(p.siderealLon,cusp,opts);
    if(aspect) out.push({planet:p.name,house:h.number,houseCusp:cusp,...aspect});
  }
  return out;
}
export default {calcBhavaMadhyaAspects};
