import { getLalKitabDebts, getLalKitabConjunctions } from '../lalkitab/lalkitab.js';
import { calculateLalKitabTimingSuite } from '../lalkitab/timing.js';
import { SUPPORTED_VARIANTS } from './SupportedVariantRegistry.js';

export function calculateCompleteLalKitab({planets=[],birthJD=null,nowJD=null,varshaStartJD=null,ageYears=null,variant='teva'}={}){
  const debts=getLalKitabDebts(planets); const conjunctions=getLalKitabConjunctions(planets);
  const timing=calculateLalKitabTimingSuite({birthJD,nowJD,varshaStartJD,planets,ageYears});
  return {status:'IMPLEMENTED_VARIANT',variant,variantId:SUPPORTED_VARIANTS.lalkitab[variant]||variant,teva:{planets,debts,conjunctions},timing,coverage:{housePlanetInterpretation:true,rin:true,conjunctions:true,timing35:timing.cycle35?.status==='AVAILABLE',annual:timing.annualHouses?.status==='AVAILABLE',grahphal:timing.grahphal?.status==='AVAILABLE'},provenance:{sourcePolicy:'Selected bundled Lal Kitab dataset/timing variant; edition differences remain explicit.',unsupportedEditionMixing:true}};
}
