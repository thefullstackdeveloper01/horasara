/** Multi-system contradiction ledger. It never forces agreement; it reports
 * convergence, divergence and which independent system supplied each signal.
 */
import ruleData from '../../dataset/used/core/system-rules.json' with { type: 'json' };
const EVENTS=Object.freeze(ruleData.contradiction.EVENTS);

function directionOf(value){const s=String(value??'').toUpperCase();if(/FAVOUR|POSITIVE|GOOD|SUPPORT|TIMED/.test(s))return'POSITIVE';if(/CHALL|NEGATIVE|BAD|UNFAVOUR/.test(s))return'CHALLENGING';return'NEUTRAL';}
function add(rows,system,entry){if(!entry)return;rows.push({system,...entry,direction:directionOf(entry.direction)});}
export function buildMultiSystemSynthesis(R){
 const rows=[];
 for(const event of EVENTS){
   const sources=[];
   const u=R?.unifiedPrediction?.predictions?.[event]; if(u)add(sources,'Parashara/Unified',{direction:u.direction,score:u.score,rule:'unified-event'});
   const kp=R?.kpChart?.predictions?.[event] || R?.kpChart?.predictions?.[event==='foreign'?'foreign_travel':event]; if(kp)add(sources,'KP',{direction:kp.trigger?'SUPPORTED':'NEUTRAL',score:kp.houses?.length?60:50,rule:'cuspal-significator'});
   const truth=R?.predictionTruth?.events?.find?.(x=>String(x.event).toLowerCase().includes(event)); if(truth)add(sources,'Transit/Dasha',{direction:truth.windows?.length?'TIMED':'NO_TIMED_WINDOW',score:truth.evidenceScore??null,rule:'event-specific-transit'});
   const lk=R?.lalKitabTiming?.cycle35?.current; if(lk && ['career','wealth','finance'].includes(event))add(sources,'Lal Kitab',{direction:'VARIANT_SUPPORT',score:null,rule:`35Y current ${lk.planet}`});
   const taj=R?.varshaphalCurrentYear; if(taj)add(sources,'Tajika',{direction:'ANNUAL_CONTEXT',score:null,rule:'solar-return-context'});
   const pos=sources.filter(s=>s.direction==='POSITIVE'),neg=sources.filter(s=>s.direction==='CHALLENGING');
   if(!sources.length)continue;
   const distinct=new Set(sources.map(s=>s.system)).size;
   rows.push({event,sources,systemsCovered:distinct,convergence:pos.length&&neg.length?'CONTRADICTED':pos.length===sources.length?'CONVERGENT_POSITIVE':neg.length===sources.length?'CONVERGENT_CHALLENGING':'MIXED',strongest:[...sources].sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0))[0]});
 }
 return {status:rows.length?'AVAILABLE':'NOT_CALCULATED',rows,methodology:'Independent systems are retained and directionally compared. No unsupported score averaging, probability fabrication or forced agreement is performed.'};
}
