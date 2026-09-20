/** Dataset-first remedy trace. It never invents a remedy when no rule exists. */
import moduleData from '../../dataset/used/core/remedy-trace.json' with { type: 'json' };

export function buildRemedyTrace({issue,planet,house,dashaLord,ruleMatches=[],source=null}={}){
  const categories=new Set(moduleData.categories || []);
  const rows=Array.isArray(ruleMatches)?ruleMatches.filter(r=>r && (r.planet==null||r.planet===planet) && (r.house==null||r.house===house)).map(r=>({id:r.id||r.ruleId||null,category:categories.has(r.category)?r.category:'behavioral',remedy:r.remedy||r.action||null,why:r.why||r.rationale||null,when:r.when||(dashaLord?`During/around ${dashaLord} activation`:'As specified by the source rule'),duration:r.duration||null,contraindications:r.contraindications||[],source:r.source||source||null})).filter(r=>r.remedy):[];
  return {status:rows.length?'AVAILABLE':'NO_DATASET_RULE',issue:issue||null,planet:planet||null,house:house??null,dashaLord:dashaLord||null,rows,policy:'Traditional/cultural guidance only; not medical, legal or guaranteed-outcome treatment.',source:source||null};
}
