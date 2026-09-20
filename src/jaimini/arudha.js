import { SIGNS, SIGN_LORDS } from '../astronomy/constants.js';
import { signOf } from '../astronomy/utils.js';

function normalizePada(original, raw) {
  const same = raw === original;
  const seventh = ((raw-original+12)%12) === 7;
  return (same || seventh) ? (raw + 10) % 12 : raw;
}
export function calcArudhaPadaForHouse(houseNumber, houses, planets, ascLon) {
  const hs=Array.isArray(houses)?houses:Object.values(houses||{});
  const h=hs.find(x=>x.number===houseNumber);
  if(!h) return null;
  const signIdx=signOf(h.cusp ?? h.startDeg ?? (ascLon+(houseNumber-1)*30));
  const lord=h.lord || SIGN_LORDS[SIGNS[signIdx]];
  const lp=(planets||[]).find(p=>p.name===lord);
  if(!lp) return {house:houseNumber,sign:SIGNS[signIdx],lord,status:'NOT_CALCULATED',reason:'House lord position unavailable'};
  const lordSign=signOf(lp.siderealLon);
  const distance=(lordSign-signIdx+12)%12;
  const raw=(lordSign+distance)%12;
  const pada=normalizePada(signIdx,raw);
  return {house:houseNumber,houseSign:SIGNS[signIdx],lord,lordSign:SIGNS[lordSign],distance:distance||12,rawPada:SIGNS[raw],padaSign:SIGNS[pada],padaSignIndex:pada};
}
export function calcArudhaLagna(houses,planets,ascLon){
  const padas=[]; for(let h=1;h<=12;h++) padas.push(calcArudhaPadaForHouse(h,houses,planets,ascLon));
  return {lagnaPada:padas[0],padas};
}
export default {calcArudhaLagna,calcArudhaPadaForHouse};
