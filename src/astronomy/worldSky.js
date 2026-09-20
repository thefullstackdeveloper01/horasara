import { getAllPlanetPositions } from './vsop87.js';
import { julianDay, signOf, mod360 } from './utils.js';
import { SIGNS } from './constants.js';
import moduleData from '../../dataset/used/core/astronomy-world-sky.json' with { type: 'json' };
const PLANETS=moduleData.planets;
const RULES=moduleData.rules;
/*
 'Sun|Moon':['mixed','Visibility, vitality and public/emotional themes are traditionally emphasized; avoid treating this as a causal world-event forecast.'],
 'Sun|Mercury':['supportive','Traditionally associated with communication, trade, learning and administration.'],
 'Sun|Venus':['supportive','Traditionally associated with arts, diplomacy, relationships and material refinement.'],
 'Sun|Mars':['challenging','Traditionally read as heightened initiative and conflict potential; practical caution is emphasized.'],
 'Sun|Jupiter':['supportive','Traditionally associated with leadership, learning, institutions and expansion.'],
 'Sun|Saturn':['challenging','Traditionally associated with pressure, regulation, delay and restructuring.'],
 'Moon|Mars':['challenging','Traditionally associated with emotional intensity, urgency and reactive decisions.'],
 'Moon|Jupiter':['supportive','Traditionally associated with public optimism, learning and supportive growth.'],
 'Moon|Saturn':['challenging','Traditionally associated with restraint, responsibility and heavier collective moods.'],
 'Mercury|Venus':['supportive','Traditionally associated with arts, negotiation, commerce and social communication.'],
 'Mercury|Mars':['challenging','Traditionally associated with fast decisions, debate and communication friction.'],
 'Mercury|Jupiter':['supportive','Traditionally associated with study, teaching, planning and broad communication.'],
 'Mercury|Saturn':['mixed','Traditionally associated with serious analysis, rules and slower communication.'],
 'Venus|Mars':['mixed','Traditionally associated with attraction, creativity and stronger passions.'],
 'Venus|Jupiter':['supportive','Traditionally associated with abundance, culture, generosity and social harmony.'],
 'Venus|Saturn':['mixed','Traditionally associated with commitment, restraint and restructuring of relationships/resources.'],
 'Mars|Jupiter':['mixed','Traditionally associated with ambitious expansion and the need to moderate excess.'],
 'Mars|Saturn':['challenging','Traditionally associated with friction between urgency and delay; disciplined execution is emphasized.'],
 'Jupiter|Saturn':['mixed','Traditionally associated with expansion meeting limits, institutions and long-term restructuring.']
*/
export function buildWorldSky(date){
 const d=new Date(`${date}T00:00:00Z`); if(Number.isNaN(d.getTime())) throw new Error('Invalid date');
 const jd=julianDay(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate(),0); const p=getAllPlanetPositions(jd,0); const pos={Sun:{longitude:p.Sun.longitude},Moon:{longitude:p.Moon.longitude},Mercury:{longitude:p.Mercury.longitude},Venus:{longitude:p.Venus.longitude},Mars:{longitude:p.Mars.longitude},Jupiter:{longitude:p.Jupiter.longitude},Saturn:{longitude:p.Saturn.longitude},Rahu:{longitude:p.Rahu.longitude},Ketu:{longitude:p.Ketu.longitude}};
 const conjunctions=[];
 for(let i=0;i<PLANETS.length;i++)for(let j=i+1;j<PLANETS.length;j++){const a=PLANETS[i],b=PLANETS[j],la=pos[a]?.longitude,lb=pos[b]?.longitude;if(!Number.isFinite(la)||!Number.isFinite(lb))continue;let sep=Math.abs(mod360(la-lb));sep=Math.min(sep,360-sep);if(sep<=5){const key=[a,b].sort().join('|');const rule=RULES[key]||['mixed','A close conjunction is present; interpretation is methodology-dependent.'];conjunctions.push({planets:[a,b],separationDegrees:Number(sep.toFixed(3)),sign:SIGNS[signOf((la+lb)/2)],nature:rule[0],traditionalInterpretation:rule[1]});}}
 return {date,julianDay:jd,orbDegrees:5,positions:Object.fromEntries(PLANETS.map(x=>[x,{longitude:Number(pos[x]?.longitude?.toFixed(4)),sign:SIGNS[signOf(pos[x]?.longitude||0)]}])),conjunctions};
}
