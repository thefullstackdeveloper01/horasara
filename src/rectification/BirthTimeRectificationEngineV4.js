/**
 * Birth-time rectification V4: deterministic candidate search + event scoring
 * + sensitivity. It ranks candidates; it does not invent a "true" birth time.
 */
import { angularDistance } from '../science/ScientificToolkit.js';

function finite(v){return Number.isFinite(Number(v));}
function scoreEvent(candidate,event,evaluator){
  if(typeof evaluator==='function') return Number(evaluator(candidate,event))||0;
  if(typeof event?.score==='function') return Number(event.score(candidate))||0;
  return 0;
}
function summarize(scores){
  const xs=scores.map(x=>x.score); const mean=xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
  const variance=xs.length?xs.reduce((s,x)=>s+(x-mean)**2,0)/xs.length:0;
  return {mean,sd:Math.sqrt(variance),min:xs.length?Math.min(...xs):0,max:xs.length?Math.max(...xs):0};
}
export function generateRectificationCandidates(centerJD,{radiusMinutes=120,stepMinutes=1}={}){
  if(!finite(centerJD)) throw new TypeError('centerJD is required');
  const r=Math.max(0,Math.floor(Number(radiusMinutes))), step=Math.max(1,Math.floor(Number(stepMinutes)));
  const out=[]; for(let m=-r;m<=r;m+=step) out.push(Number(centerJD)+m/1440); return out;
}
export function rectifyBirthTimeV4({centerJD,radiusMinutes=120,stepMinutes=1,events=[],evaluator,minimumEvents=3,acceptanceMargin=0.05}={}){
  if(!Array.isArray(events)||events.length<minimumEvents) return Object.freeze({status:'INSUFFICIENT_EVENTS',requiredEvents:minimumEvents,receivedEvents:Array.isArray(events)?events.length:0,candidates:[]});
  const candidates=generateRectificationCandidates(centerJD,{radiusMinutes,stepMinutes}).map(jd=>{
    const eventScores=events.map(event=>({eventId:event.id??null,score:scoreEvent(jd,event,evaluator)}));
    const total=eventScores.length?eventScores.reduce((s,x)=>s+x.score,0)/eventScores.length:0;
    return {jd,offsetMinutes:(jd-Number(centerJD))*1440,score:total,eventScores};
  }).sort((a,b)=>b.score-a.score||Math.abs(a.offsetMinutes)-Math.abs(b.offsetMinutes));
  const best=candidates[0],second=candidates[1];
  const margin=second?best.score-second.score:best.score;
  const relative=best.score!==0?margin/Math.max(Math.abs(best.score),1):0;
  const status=relative>=Number(acceptanceMargin)?'CANDIDATE_SELECTED':'AMBIGUOUS';
  return Object.freeze({status,best,runnerUp:second||null,margin,relativeMargin:Number(relative.toFixed(6)),eventCount:events.length,candidateCount:candidates.length,scoreSummary:summarize(candidates.slice(0,Math.min(25,candidates.length))),candidates:candidates.slice(0,50),warning:'Rectification is a model-assisted ranking, not proof of the historical birth time.'});
}
export function sensitivityAround(candidateJD,{evaluator,events=[],radiusMinutes=5,stepMinutes=.5}={}){
  if(!finite(candidateJD)||typeof evaluator!=='function') return {status:'NOT_AVAILABLE'};
  const rows=[]; for(let m=-Number(radiusMinutes);m<=Number(radiusMinutes)+1e-9;m+=Number(stepMinutes)){const jd=Number(candidateJD)+m/1440;const score=events.length?events.reduce((s,e)=>s+(Number(evaluator(jd,e))||0),0)/events.length:Number(evaluator(jd,events[0]||{}))||0;rows.push({offsetMinutes:m,jd,score});}
  return {status:'AVAILABLE',rows,range:{min:Math.min(...rows.map(r=>r.score)),max:Math.max(...rows.map(r=>r.score))},angularDistance:events[0]?.targetLon!=null?angularDistance(candidateJD,events[0].targetLon):null};
}
