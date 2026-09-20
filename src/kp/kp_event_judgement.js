import { mod360 } from '../astronomy/utils.js';
import { DASHA_ORDER, DASHA_YEARS, NAKSHATRA_LORDS, NAKSHATRAS } from '../astronomy/constants.js';
import { getKPPosition } from './kp_system.js';

/** KP Ruling Planets: day lord, Moon star/sub, Lagna star/sub, with de-duplication. */
export function calcRulingPlanets({lagnaLon, moonLon, dayLord}={}) {
  const l=Number(lagnaLon), m=Number(moonLon);
  const lp=Number.isFinite(l)?getKPPosition(mod360(l)):null;
  const mp=Number.isFinite(m)?getKPPosition(mod360(m)):null;
  const planets=[dayLord, lp?.nakLord, lp?.subLord, mp?.nakLord, mp?.subLord].filter(Boolean);
  return {dayLord:dayLord||null,lagna:lp,moon:mp,planets:[...new Set(planets)]};
}

/**
 * KP event judgement using the supplied house significators and a cuspal sub-lord.
 * Positive/negative house sets are explicit; no blended probability is returned.
 */
export function judgeKPEvent({significators, cuspalHouse, positiveHouses=[], negativeHouses=[], dashaLords=[]}={}) {
  const rows=significators||{};
  const csl=rows[cuspalHouse]?.kpSubLord||null;
  const cslRow=Object.values(rows).find(r=>r.significators?.some(s=>s.planet===csl));
  const cslHouses=Object.values(rows).filter(r=>r.significators?.some(s=>s.planet===csl)).map(r=>r.house);
  const pos=cslHouses.filter(h=>positiveHouses.includes(h));
  const neg=cslHouses.filter(h=>negativeHouses.includes(h));
  const dashaSupport=dashaLords.map(lord=>({lord,houses:Object.values(rows).filter(r=>r.significators?.some(s=>s.planet===lord)).map(r=>r.house)}));
  const supported=dashaSupport.filter(x=>x.houses.some(h=>positiveHouses.includes(h))).map(x=>x.lord);
  const blocked=dashaSupport.filter(x=>x.houses.some(h=>negativeHouses.includes(h))).map(x=>x.lord);
  let verdict='INCONCLUSIVE';
  if(csl && pos.length && !neg.length && supported.length) verdict='FAVOURABLE';
  else if(csl && neg.length && !pos.length) verdict='UNFAVOURABLE';
  return {status:'CALCULATED',cuspalHouse,cuspalSubLord:csl,cuspalSubLordHouseSignifications:cslHouses,positiveSignifications:pos,negativeSignifications:neg,dashaSupport:dashaSupport,dashaPositive:supported,dashaNegative:blocked,verdict,rule:'CSL must signify supporting houses and avoid negating houses; dasha support is a confirmation layer.',sourceNote:'KP event judgement is method-specific and should not be converted into empirical probability.'};
}
