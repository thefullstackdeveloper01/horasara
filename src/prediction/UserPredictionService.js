/**
 * User-facing prediction composer.
 *
 * Design rule: calculation structures stay internal. This module converts
 * canonical chart + transit + Dasha + Panchanga inputs into a compact,
 * human-readable forecast for one selected life preference and period.
 * It never claims empirical probability or guaranteed outcomes.
 */
import { getTransitPositions } from '../transit/transits.js';
import { calcPanchanga } from '../panchanga/panchanga.js';
import { julianDay, jdToDate, signOf, sunriseSunset } from '../astronomy/utils.js';
import { SIGNS } from '../astronomy/constants.js';
import transitData from '../../dataset/used/core/transits.json' with { type: 'json' };
import predictionModel from '../../dataset/used/core/user-prediction-model.json' with { type: 'json' };
import { EVENT_CONFIG as INTERNAL_EVENT_CONFIG, PREFERENCE_LABELS } from './UserPredictionPreferences.js';
import { buildKundaliTrustPanel } from './KundaliTrustPanel.js';
import { buildLifeAreaOverview } from './LifeAreaOverview.js';

const TRANSIT_RESULTS = transitData.TRANSIT_RESULTS || {};
const PLANETS = predictionModel.planets;
const WEIGHT = predictionModel.weights;
const CHALDEAN = predictionModel.chaldeanOrder;
const WEEKDAY_LORD = predictionModel.weekdayLords;

function clamp(n,a=0,b=100){ return Math.max(a,Math.min(b,Math.round(Number(n)||0))); }
function uniq(a){ return [...new Set(a.filter(Boolean))]; }
function localDateParts(jd, tz=0){ return jdToDate(Number(jd)+Number(tz||0)/24); }
function isoLocal(jd,tz=0){ const d=localDateParts(jd,tz); return `${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}T${String(d.hour||0).padStart(2,'0')}:${String(d.min||0).padStart(2,'0')}`; }
function dateOnly(jd,tz=0){ const d=localDateParts(jd,tz); return `${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}`; }
function localDateToJD(dateStr,hour=12,tz=0){ const [y,m,d]=String(dateStr).split('-').map(Number); return julianDay(y,m,d,Number(hour)-Number(tz||0),0,0,0); }
function todayLocalDate(tz=0){ const now=new Date(); const shifted=new Date(now.getTime()+Number(tz||0)*3600000); return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth()+1).padStart(2,'0')}-${String(shifted.getUTCDate()).padStart(2,'0')}`; }
function scoreLabel(score){ return score>=68?'Favorable':score>=48?'Neutral':'Challenging'; }
function scoreTone(score){ return score>=68?'positive':score>=48?'neutral':'negative'; }
function guidanceFor(score){ return score>=68?'Good time for constructive action.':score>=48?'Stay balanced, use the stronger windows and avoid forcing weak timing.':'Prefer caution, simplify commitments and use the more supportive windows.'; }
function preferenceConfig(preference){ return INTERNAL_EVENT_CONFIG[preference] || INTERNAL_EVENT_CONFIG.general; }
function houseFromSign(transitSign,natalSign){ return ((transitSign-natalSign+12)%12)+1; }
function weekdayName(jd,tz){ return localDateParts(jd,tz).weekday; }
function exactAspectStrength(transitPlanet, transitLon, natal){
  const angles = transitPlanet==='Jupiter' ? [0,120,180] : transitPlanet==='Saturn' ? [0,60,90,180] : transitPlanet==='Mars' ? [0,90,150,180] : [0,180];
  let best=null;
  for(const n of natal||[]) for(const angle of angles){
    const raw=Math.abs((((Number(transitLon)-Number(n.lon)-angle+540)%360)-180));
    if(raw<=3 && (!best || raw<best.orb)) best={target:n.planet,angle,orb:raw};
  }
  return best;
}
function weekdayIndex(y,m,d){ return new Date(Date.UTC(y,m-1,d)).getUTCDay(); }
function horaRuler(jd,lat,lon,tz=0){
  try{
    const local=localDateParts(jd,tz);
    const date=`${local.year}-${String(local.month).padStart(2,'0')}-${String(local.day).padStart(2,'0')}`;
    const atNoon=localDateToJD(date,12,tz);
    const sun=sunriseSunset(atNoon,lat,lon);
    if(!sun?.sunrise||!sun?.sunset) return null;
    const dayLord=WEEKDAY_LORD[weekdayIndex(local.year,local.month,local.day)];
    const startIndex=CHALDEAN.indexOf(dayLord);
    if(jd>=sun.sunrise && jd<sun.sunset){
      const len=(sun.sunset-sun.sunrise)/12;
      const idx=Math.min(11,Math.max(0,Math.floor((jd-sun.sunrise)/len)));
      return CHALDEAN[(startIndex+idx)%7];
    }
    const prev=sunriseSunset(atNoon-1,lat,lon);
    const next=sunriseSunset(atNoon+1,lat,lon);
    const nightStart=jd<sun.sunrise?(prev?.sunset||atNoon):sun.sunset;
    const nightEnd=jd<sun.sunrise?sun.sunrise:(next?.sunrise||atNoon+1);
    if(!nightStart||!nightEnd||nightEnd<=nightStart) return null;
    const len=(nightEnd-nightStart)/12;
    const idx=Math.min(11,Math.max(0,Math.floor((jd-nightStart)/len)));
    return CHALDEAN[(startIndex+12+idx)%7];
  }catch{return null;}
}

function makeFactors(chart, jd, preference, extra={}){
  const cfg=preferenceConfig(preference); const tz=Number(chart.meta?.tz||chart.tz||extra.tz||0);
  const natalMoonSign=signOf(Number(chart.birthFacts?.moon?.siderealLongitude ?? chart.moon?.siderealLon ?? chart.planets?.find(p=>p.name==='Moon')?.siderealLon ?? 0));
  const natalAscSign=signOf(Number(chart.birthFacts?.ascendant?.siderealLongitude ?? chart.lagna?.siderealLongitude ?? chart.lagna?.lon ?? chart.planets?.find(p=>p.name==='Ascendant')?.siderealLon ?? 0));
  const natalPlanets=(chart.planets||[]).filter(p=>PLANETS.includes(p.name)).map(p=>({planet:p.name,lon:Number(p.siderealLon),house:Number(p.house||0),sign:p.sign}));
  const transits=getTransitPositions(Number(jd), null);
  let score=50; const positives=[], negatives=[], neutral=[]; let strongestPositive=-Infinity,strongestNegative=Infinity;
  for(const name of PLANETS){
    const tp=transits[name]; if(!tp) continue;
    const hMoon=houseFromSign(tp.sign,natalMoonSign), hAsc=houseFromSign(tp.sign,natalAscSign);
    const result=TRANSIT_RESULTS[name]||{}; let impact=0;
    if((result.good||[]).includes(hMoon)) impact += 6*WEIGHT[name];
    if((result.bad||[]).includes(hMoon)) impact -= 5*WEIGHT[name];
    if(cfg.positiveHouses.includes(hAsc)) impact += 4*WEIGHT[name];
    if(cfg.pressureHouses.includes(hAsc)) impact -= 3.5*WEIGHT[name];
    if(cfg.relevantPlanets.includes(name)) impact *= 1.25;
    const asp=exactAspectStrength(name,tp.siderealLon,cfg.relevantPlanets.length?natalPlanets.filter(p=>cfg.relevantPlanets.includes(p.planet)):natalPlanets);
    if(asp) impact += (name==='Saturn'||name==='Rahu'||name==='Ketu' ? -2.5 : 2.5)*WEIGHT[name];
    if(Math.abs(impact)>=0.5){
      if(impact>0){ positives.push({planet:name,impact,houseMoon:hMoon,houseAsc:hAsc,aspect:asp}); strongestPositive=Math.max(strongestPositive,impact); }
      else { negatives.push({planet:name,impact,houseMoon:hMoon,houseAsc:hAsc,aspect:asp}); strongestNegative=Math.min(strongestNegative,impact); }
      score += impact;
    } else neutral.push(name);
  }
  const dashaCurrent=chart.dasha?.current||null;
  if(dashaCurrent?.mahadasha){
    if(cfg.supportingDasha.includes(dashaCurrent.mahadasha)){ score+=10; positives.push({planet:dashaCurrent.mahadasha,impact:10,dasha:true}); }
    else if(cfg.neutralDasha?.includes(dashaCurrent.mahadasha)) score+=2;
    else score-=1;
  }
  let panchanga=null; try{
    const sun=transits.Sun?.siderealLon||0, moon=transits.Moon?.siderealLon||0;
    panchanga=calcPanchanga(Number(jd),sun,moon,Number(chart.meta?.lat||0),Number(chart.meta?.lon||0),tz,transits.Moon?.speed,transits.Sun?.speed);
  }catch{}
  const label=scoreLabel(clamp(score));
  const topPos=positives.sort((a,b)=>b.impact-a.impact).slice(0,3); const topNeg=negatives.sort((a,b)=>a.impact-b.impact).slice(0,3);
  const area=PREFERENCE_LABELS[preference]||PREFERENCE_LABELS.general;
  const drivers=[];
  for(const x of topPos){
    drivers.push({tone:'positive',planet:x.planet,text:x.dasha
      ? `${x.planet} is reinforcing this part of your current timing pattern, which can make progress in ${area} easier when you act deliberately.`
      : `${x.planet}'s current movement is supportive for ${area}. This is a better period for constructive action, communication and steady progress.`});
  }
  for(const x of topNeg){
    drivers.push({tone:'negative',planet:x.planet,text:`${x.planet}'s current movement adds pressure around ${area}. Slow down, double-check important choices and avoid unnecessary risk.`});
  }
  if(!drivers.length) drivers.push({tone:'neutral',planet:null,text:`The current planetary pattern is mixed for ${area}. Use the stronger timing windows and avoid forcing an outcome when the pattern is not supportive.`});
  return {score:clamp(score),label,tone:scoreTone(clamp(score)),drivers:drivers.slice(0,5)};
}

function formatDayHeadline(f,pref){
  const area=PREFERENCE_LABELS[pref]||PREFERENCE_LABELS.general;
  if(f.label==='Favorable') return `${area}: conditions lean supportive today.`;
  if(f.label==='Challenging') return `${area}: move carefully and focus on what you can control.`;
  return `${area}: a mixed day — use the strongest windows and avoid forcing weak ones.`;
}

function buildDay(chart,pref,date,tz){
  const base=localDateToJD(date,0,tz); const sample=localDateToJD(date,12,tz); const f=makeFactors(chart,sample,pref,{tz});
  const hours=[];
  const lat=Number(chart.meta?.lat||chart.lat||0), lon=Number(chart.meta?.lon||chart.lon||0);
  const HORA_QUALITY=predictionModel.horaQuality;
  for(let h=0;h<24;h++){
    const jd=localDateToJD(date,h+0.5,tz); const hf=makeFactors(chart,jd,pref,{tz});
    const ruler=horaRuler(jd,lat,lon,tz); let score=hf.score+(HORA_QUALITY[ruler]||0)*(preferenceConfig(pref).relevantPlanets.includes(ruler)?1.3:1); score=clamp(score);
    const label=scoreLabel(score), tone=scoreTone(score); const hourLabel=String(h).padStart(2,'0')+':00';
    let reason=hf.drivers[0]?.text||'Mixed planetary influences.'; if(ruler) reason += ` ${ruler} Hora adds ${HORA_QUALITY[ruler]>=0?'supportive':'more demanding'} timing to this hour.`;
    hours.push({hour:hourLabel,label,tone,score,summary:reason,ruler});
  }
  const best=[...hours].filter(x=>x.tone==='positive').sort((a,b)=>b.score-a.score).slice(0,3).map(x=>x.hour);
  const watch=[...hours].filter(x=>x.tone==='negative').sort((a,b)=>a.score-b.score).slice(0,2).map(x=>x.hour);
  return {period:'day',date,label:f.label,tone:f.tone,score:f.score,guidance:guidanceFor(f.score),headline:formatDayHeadline(f,pref),summary:`Today blends your personal chart pattern with current planetary movement. The strongest periods are highlighted so you can plan with context rather than treat every hour alike.`,drivers:f.drivers,bestTimes:best,watchTimes:watch,hourly:hours.map(({ruler,...h})=>h),timingNote:'Your reading combines your personal chart pattern, current planetary movement and daily timing windows.',basis:['Your personal chart pattern','Current planetary movement','Daily timing windows','Selected life-area rules']};
}

function aggregate(chart,pref,startDate,count,stepDays,tz,period){
  const days=[]; const startJd=localDateToJD(startDate,12,tz);
  for(let i=0;i<count;i++){
    const jd=startJd+i*stepDays; const d=dateOnly(jd,tz); const f=makeFactors(chart,jd,pref,{tz});
    days.push({date:d,score:f.score,label:f.label,tone:f.tone,summary:f.drivers[0]?.text||`The planetary pattern is mixed for ${PREFERENCE_LABELS[pref]||PREFERENCE_LABELS.general}.`,drivers:f.drivers.slice(0,2)});
  }
  const score=clamp(days.reduce((s,x)=>s+x.score,0)/Math.max(1,days.length));
  const tone=scoreTone(score); const label=scoreLabel(score);
  const positiveDays=days.filter(d=>d.tone==='positive').length, negativeDays=days.filter(d=>d.tone==='negative').length;
  let units=days;
  if(period==='month'){
    units=[];
    for(let i=0;i<days.length;i+=7){
      const chunk=days.slice(i,i+7); const avg=clamp(chunk.reduce((a,b)=>a+b.score,0)/chunk.length); const top=chunk.slice().sort((a,b)=>b.score-a.score)[0];
      units.push({week:i/7+1,startDate:chunk[0].date,endDate:chunk.at(-1).date,score:avg,label:scoreLabel(avg),tone:scoreTone(avg),guidance:guidanceFor(avg),summary:top?.summary||'Use the stronger timing within this week.'});
    }
  }
  return {period,startDate:dateOnly(startJd,tz),endDate:days.at(-1)?.date||startDate,label,tone,score,guidance:guidanceFor(score),headline:`${PREFERENCE_LABELS[pref]||PREFERENCE_LABELS.general}: ${period} outlook is ${label.toLowerCase()}.`,summary:`This ${period} outlook combines your personal chart pattern with changing planetary movement, while the detail below explains where the tone shifts.`,days,units,positiveDays,negativeDays,basis:['Your personal chart pattern','Changing planetary movement','Timing-cycle context','Selected life-area rules']};
}

export function buildUserPrediction({chart,preference='general',period='day',date=null,tz=0}={}){
  if(!chart||typeof chart!=='object') throw new Error('chart is required');
  const pref=String(preference).toLowerCase(); const safePref=INTERNAL_EVENT_CONFIG[pref]?pref:'general'; const zone=Number.isFinite(Number(tz))?Number(tz):Number(chart.meta?.tz||0);
  const targetDate=date||todayLocalDate(zone);
  // Chart-level (not period-specific): computed once and attached below.
  let kundaliTrust; try { kundaliTrust=buildKundaliTrustPanel(chart); } catch(e) { kundaliTrust={hasIssues:false,cards:[],disclaimer:null,error:e.message}; }
  const attach=(result)=>Object.assign(result,{kundaliTrust, ...(safePref==='general' ? {lifeAreas:buildLifeAreaOverview({chart,period,date:targetDate,tz:zone,makeFactors,localDateToJD})} : {})});
  if(period==='day') return attach(buildDay(chart,safePref,targetDate,zone));
  if(period==='week') return attach(aggregate(chart,safePref,targetDate,7,1,zone,'week'));
  if(period==='month') return attach(aggregate(chart,safePref,targetDate,30,1,zone,'month'));
  if(period==='year'){
    const start=localDateToJD(targetDate,12,zone); const months=[];
    for(let m=0;m<12;m++){
      const mid=start+m*30.436875; const factors=[0,7,14,21].map(offset=>makeFactors(chart,mid+offset,safePref,{tz:zone})); const samples=factors.map(x=>x.score); const s=clamp(samples.reduce((a,b)=>a+b,0)/samples.length); const strongest=factors.slice().sort((a,b)=>b.score-a.score)[0]; months.push({month:dateOnly(mid,zone).slice(0,7),label:scoreLabel(s),tone:scoreTone(s),score:s,guidance:guidanceFor(s),summary:strongest?.drivers?.[0]?.text||'Use the month steadily and watch for the highlighted timing changes.'});
    }
    const score=clamp(months.reduce((a,b)=>a+b.score,0)/months.length); return attach({period:'year',startDate:dateOnly(start,zone),endDate:dateOnly(start+365,zone),label:scoreLabel(score),tone:scoreTone(score),score,guidance:guidanceFor(score),headline:`${PREFERENCE_LABELS[safePref]||PREFERENCE_LABELS.general}: your 12-month outlook is ${scoreLabel(score).toLowerCase()}.`,summary:`A month-by-month directional view built from your personal chart pattern and the changing planetary movement.`,months,basis:['Your personal chart pattern','Monthly planetary movement','Timing-cycle context','Selected life-area rules']});
  }
  throw new Error('period must be day, week, month or year');
}

export { PREFERENCE_LABELS as LABELS };
