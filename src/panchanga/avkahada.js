import { VARNA,VASYA,YONI,GANA,NADI,PAYA } from '../astronomy/constants.js';
export function buildAvkahada(R){
 const p=R?.panchanga, sign=p?.moonSign, nak=p?.nakshatra?.name;
 if(!sign||!nak) return {status:'NOT_CALCULATED',reason:'Moon sign/nakshatra unavailable'};
 return {status:'AVAILABLE',rashi:sign,nakshatra:nak,varna:VARNA[sign]??null,vasya:VASYA[sign]??null,yoni:YONI[nak]??null,gana:GANA[nak]??null,nadi:NADI[nak]??null,paya:PAYA[nak]??null,pada:p?.nakshatra?.pada??null};
}
export default {buildAvkahada};
