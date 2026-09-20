import { calculatePrashna } from '../systems/prashna/PrashnaEngine.js';
import { variantStatus, SUPPORTED_VARIANTS } from './SupportedVariantRegistry.js';

function houseJudgement(result){
  const rows=result.significators||[];
  return rows.map(r=>({house:r.house,lord:r.lord,occupants:r.occupants||[],role:r.house===1?'querent':r.house===7?'counterparty':'matter'}));
}
export function calculateCompletePrashna(input={}){
  const method=input.method||'classical';
  const base=calculatePrashna(input);
  const variant=method==='kp'?'kp':method==='tajika'?'tajika':'classical';
  return {...base,methodology:{...base.audit,variantId:SUPPORTED_VARIANTS.prashna[variant],components:['question classification','Prashna Lagna','Lagna lord','Moon','relevant houses','house lords','occupants','applying contacts','yes/no judgement','timing estimate','method-specific branch','cancellation slot'],status:'IMPLEMENTED_VARIANT'},houseJudgement:houseJudgement(base),provenance:variantStatus('prashna',variant),guardrails:{probabilityClaim:false,medicalDiagnosis:false,deathDate:false,unsupportedOmens:false}};
}
