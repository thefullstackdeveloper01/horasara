import { buildWorldSky } from '../astronomy/worldSky.js';
import { SIGNS, NAKSHATRAS, NAKSHATRA_LORDS } from '../astronomy/constants.js';
import { signOf, mod360 } from '../astronomy/utils.js';

const SIGN_RULES={Aries:{focus:['initiative','competition','leadership']},Taurus:{focus:['resources','stability','relationships']},Gemini:{focus:['communication','learning','trade']},Cancer:{focus:['home','family','emotional security']},Leo:{focus:['visibility','creativity','leadership']},Virgo:{focus:['work','health routines','analysis']},Libra:{focus:['partnerships','negotiation','balance']},Scorpio:{focus:['transformation','shared resources','strategy']},Sagittarius:{focus:['learning','travel','beliefs']},Capricorn:{focus:['career','responsibility','structure']},Aquarius:{focus:['networks','innovation','collective goals']},Pisces:{focus:['reflection','spirituality','closure']}};
const BENEFIC=new Set(['Jupiter','Venus','Mercury']);
const MALEFIC=new Set(['Mars','Saturn']);
const ASPECTS={Mars:[4,7,8],Jupiter:[5,7,9],Saturn:[3,7,10],Sun:[7],Moon:[7],Mercury:[7],Venus:[7],Rahu:[5,7,9],Ketu:[5,7,9]};
// Classical (BPHS) house significations — used only to render the *language* of an
// interpretation; every value plugged into the sentence (planet, house, tone) still
// comes from the actual computed signal, never a canned per-user result.
const HOUSE_MEANINGS={1:'self, health and general vitality',2:'income, savings and family wealth',3:'courage, siblings and short journeys',4:'home, mother and emotional comfort',5:'creativity, children, romance and intellect',6:'daily work, health routines, debts and rivals',7:'partnerships, marriage and open dealings',8:'transformation, shared resources and sudden change',9:'fortune, higher learning, long travel and beliefs',10:'career, status and public standing',11:'income, gains, networks and goals achieved',12:'expenses, rest, foreign connections and closure'};
function house(from,to){return ((to-from+12)%12)+1}
function aspectHouses(p){return ASPECTS[p]||[7]}
function tone(score){return score>1?'supportive':score<-1?'challenging':'mixed'}
function planetScore(p){return BENEFIC.has(p)?1:MALEFIC.has(p)?-1:0}
function addDays(date,n){const d=new Date(`${date}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function periodDates(date,period){if(period==='weekly')return Array.from({length:7},(_,i)=>addDays(date,i));if(period==='monthly')return Array.from({length:30},(_,i)=>addDays(date,i));if(period==='yearly')return Array.from({length:12},(_,i)=>{const d=new Date(`${date}T00:00:00Z`);d.setUTCMonth(d.getUTCMonth()+i,1);return d.toISOString().slice(0,10)});return [date]}
function analyzeSky(sky,targetIndex){const signals=[];for(const [name,x] of Object.entries(sky.positions||{})){if(!Number.isFinite(x.longitude))continue;const h=house(targetIndex,signOf(x.longitude));if([1,5,9,10,11].includes(h))signals.push({planet:name,house:h,type:'direct',score:planetScore(name)});for(const ah of aspectHouses(name)){const target=((signOf(x.longitude)+ah-1)%12)+1;if(target===targetIndex+1)signals.push({planet:name,house:ah,type:'aspect',score:planetScore(name)})}}return signals}
// Turns one computed signal into a plain-language line an end user can read without
// knowing Jyotish terminology. Every noun in the sentence traces back to a real
// computed field (planet, house, type, score) — nothing here is a stored per-user result.
function explainSignal(sig){
  const nature=sig.score>0?'a supportive':sig.score<0?'a challenging':'a neutral';
  const placement=sig.type==='direct'?`sits in your ${sig.house}${ordinalSuffix(sig.house)} house`:`casts an aspect on your ${sig.house}${ordinalSuffix(sig.house)} house`;
  const meaning=HOUSE_MEANINGS[sig.house]||'this area of life';
  return `${sig.planet} ${placement} today, which is ${nature} influence on ${meaning}.`;
}
function ordinalSuffix(n){const s=['th','st','nd','rd'],v=n%100;return s[(v-20)%10]||s[v]||s[0]}

export function buildGeneralForecast({date=new Date().toISOString().slice(0,10),sign='Aries',planet=null,nakshatra=null,period='daily'}={}){
  const targetIndex=SIGNS.findIndex(x=>x===sign||x.toLowerCase()===String(sign).toLowerCase()); if(targetIndex<0)throw new Error('Unknown Rāśi');
  const dates=periodDates(date,period); const samples=dates.map(d=>{const sky=buildWorldSky(d);return {date:d,sky,signals:analyzeSky(sky,targetIndex)}});
  const allSignals=samples.flatMap(x=>x.signals), score=allSignals.reduce((a,x)=>a+x.score,0), focus=SIGN_RULES[sign]?.focus||['general priorities'];
  const supportive=[...new Set(allSignals.filter(x=>x.score>0).map(x=>`${x.planet} influence`))].slice(0,6);
  const caution=[...new Set(allSignals.filter(x=>x.score<0).map(x=>`${x.planet} influence`))].slice(0,6);
  const baseSky=samples[0].sky; const strongest=[...allSignals].sort((a,b)=>Math.abs(b.score)-Math.abs(a.score)).slice(0,10).map(sig=>({...sig,interpretation:explainSignal(sig)}));
  const base={period,date,sign,signIndex:targetIndex,focus,range:{start:dates[0],end:dates[dates.length-1],sampleCount:dates.length},overall:{tone:tone(score),score,summary:score>1?`Supportive themes are more prominent around ${focus.join(', ')}.`:score<-1?`More patience is useful around ${focus.join(', ')}.`:`Mixed signals call for balance across ${focus.join(', ')}.`,supportive,caution},signals:strongest,samples:samples.map(x=>({date:x.date,score:x.signals.reduce((a,v)=>a+v.score,0),signals:x.signals})),sky:baseSky};
  if(planet)base.planetForecast=buildPlanetForecast(samples,planet,period);
  if(nakshatra)base.nakshatraForecast=buildNakshatraForecast(baseSky,nakshatra,period);
  return base;
}
function buildPlanetForecast(samples,planet,period){
  const rows=samples.map(x=>{const p=x.sky.positions?.[planet];return p?{date:x.date,sign:p.sign,longitude:p.longitude}:null}).filter(Boolean);
  if(!rows.length)throw new Error('Unknown planet');
  const startSign=rows[0].sign, endSign=rows.at(-1).sign;
  const changedSign=startSign!==endSign;
  const nature=BENEFIC.has(planet)?'benefic':MALEFIC.has(planet)?'malefic':'neutral';
  const interpretation=changedSign
    ? `${planet} moves from ${startSign} into ${endSign} during this ${period} window — a sign change like this shifts which life areas it colors most strongly.`
    : `${planet} stays within ${startSign} for the whole ${period} window, so its themes stay steady rather than shifting.`;
  return {planet,period,start:rows[0],end:rows.at(-1),samples:rows,nature,changedSign,summary:`${planet} movement is tracked across the selected ${period} period from calculated planetary positions.`,interpretation,method:'Astronomical position plus traditional Jyotish sign/aspect framework.'}
}
function buildNakshatraForecast(sky,nakshatra,period){
  const moon=sky.positions?.Moon;const lunarSpan=360/27;const current=Math.floor(mod360(moon?.longitude||0)/lunarSpan);
  const currentName=NAKSHATRAS?.[current];
  const currentLord=NAKSHATRA_LORDS?.[current]||null;
  const requestedIndex=Array.isArray(NAKSHATRAS)?NAKSHATRAS.findIndex(n=>String(n).toLowerCase()===String(nakshatra).toLowerCase()):-1;
  const requestedLord=requestedIndex>=0&&NAKSHATRA_LORDS?NAKSHATRA_LORDS[requestedIndex]:null;
  const matches=requestedIndex>=0&&requestedIndex===current;
  const interpretation=matches
    ? `The Moon is currently transiting ${currentName} — your selected ${nakshatra} nakshatra, ruled by ${requestedLord}. Themes ruled by ${requestedLord} are especially active while the Moon stays here.`
    : `The Moon is currently transiting ${currentName} nakshatra (ruled by ${currentLord}). It will need to complete its cycle before reaching ${nakshatra}${requestedLord?`, ruled by ${requestedLord}`:''}.`;
  return {nakshatra,period,currentMoonNakshatra:currentName,currentMoonNakshatraIndex:current,currentMoonNakshatraLord:currentLord,currentMoonLongitude:moon?.longitude,requestedNakshatraLord:requestedLord,isCurrentlyActive:matches,summary:`The general Nakshatra view tracks the Moon's calculated position against the selected ${nakshatra} profile.`,interpretation,method:'Moon longitude mapped to the 27-Nakshatra cycle; interpretation remains traditional.'}
}