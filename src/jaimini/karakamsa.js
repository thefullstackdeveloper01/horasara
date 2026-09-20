import { calcCharaKarakas } from '../dasha/chara.js';
import { SIGNS } from '../astronomy/constants.js';

export function calcKarakamsa(planets, vargas){
  const karakas=calcCharaKarakas(planets||[]);
  const ak=karakas.find(k=>k.karakaShort==='AK');
  if(!ak) return {status:'NOT_CALCULATED',reason:'Atmakaraka could not be determined'};
  const d9=vargas?.[ak.planet]?.D9;
  const sign=d9?.sign;
  if(!sign) return {status:'NOT_CALCULATED',atmakaraka:ak.planet,reason:'Atmakaraka D9 placement unavailable'};
  const d9Asc=vargas?.ascendant?.D9;
  const swamsha = d9Asc?.sign || null;
  return {
    status:'AVAILABLE',
    atmakaraka:ak.planet,
    karakamshaSign:sign,
    karakamshaDegree:d9.degree ?? null,
    swamshaSign:swamsha,
    distinction:'Karakamsha = sign occupied by Atmakaraka in D9; Swamsha is exposed separately here as the D9 Ascendant sign. Some Jaimini lineages use the terms differently.',
    source:'Jaimini Chara Karaka + Navamsa placement'
  };
}
export default {calcKarakamsa};
