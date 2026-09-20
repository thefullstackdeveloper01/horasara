/**
 * Deterministic birth-time rectification framework.
 * It ranks candidate times using supplied, dated life events. It does not claim
 * a rectified time when there is insufficient evidence.
 */
import { angularDistance } from '../science/ScientificToolkit.js';

function scoreCandidate(candidate, events, evaluator) {
  if (typeof evaluator !== 'function') return 0;
  const results = events.map(e => Number(evaluator(candidate,e)) || 0);
  return results.length ? results.reduce((a,b)=>a+b,0)/results.length : 0;
}

export function generateCandidateTimes(centerJD, radiusMinutes=60, stepMinutes=1) {
  const center=Number(centerJD), r=Math.max(0,Number(radiusMinutes)), step=Math.max(1,Number(stepMinutes));
  const out=[]; for(let m=-r;m<=r;m+=step) out.push(center+m/1440); return out;
}

export function rectifyBirthTime({centerJD, radiusMinutes=60, stepMinutes=1, events=[], evaluator, minimumEvents=3}={}) {
  if (!Number.isFinite(Number(centerJD))) throw new Error('centerJD is required');
  if (!Array.isArray(events) || events.length < minimumEvents) return Object.freeze({status:'INSUFFICIENT_EVENTS', candidates:[], best:null});
  const candidates=generateCandidateTimes(centerJD,radiusMinutes,stepMinutes).map(jd=>({jd,score:scoreCandidate(jd,events,evaluator)}));
  candidates.sort((a,b)=>b.score-a.score || Math.abs(a.jd-centerJD)-Math.abs(b.jd-centerJD));
  const best=candidates[0];
  const second=candidates[1];
  const margin=second ? best.score-second.score : best.score;
  return Object.freeze({status: margin>0 ? 'CANDIDATE_SELECTED' : 'AMBIGUOUS', best, margin, candidates:candidates.slice(0,25)});
}

export function comparePlanetaryTrigger(a,b){ return angularDistance(a,b); }
