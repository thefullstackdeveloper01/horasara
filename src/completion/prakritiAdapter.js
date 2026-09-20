/** Ayurvedic adapter: chart data is never presented as clinical diagnosis. */
export function buildAyurvedicPrakriti(input, result) {
  const answers = input?.prakritiAnswers;
  if (!answers || typeof answers !== 'object') return { status:'QUESTIONNAIRE_REQUIRED', method:'weighted questionnaire', doshas:{Vata:null,Pitta:null,Kapha:null}, chartOverlay:'available separately; not a physiological diagnosis' };
  const keys = Object.keys(answers); const scores={Vata:0,Pitta:0,Kapha:0};
  for (const key of keys) { const a=answers[key]; if (a && typeof a==='object') for (const d of Object.keys(scores)) scores[d]+=Number(a[d]||0); else if (typeof a==='string' && scores[a]!==undefined) scores[a]++; }
  const total=Object.values(scores).reduce((a,b)=>a+b,0); const pct={}; for(const d of Object.keys(scores)) pct[d]=total?Math.round(scores[d]*1000/total)/10:0;
  return { status:'QUESTIONNAIRE_SCORED', method:'user-supplied weighted questionnaire', raw:scores, percentage:pct, chartOverlay:{lagna:result.lagna?.sign||null, moon:result.planets?.find(p=>p.name==='Moon')?.sign||null}, clinicalNote:'Not a clinical diagnosis and not a substitute for an Ayurvedic physician assessment.' };
}
