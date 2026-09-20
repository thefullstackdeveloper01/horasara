import { calcVimshottari } from '../dasha/vimshottari.js';
import { buildVimshottariHierarchy, buildYoginiHierarchy } from '../dasha/deepDashaLevels.js';
import { calcYoginiDasha } from '../dasha/yogini.js';
import { calcKalachakraDasha } from '../dasha/kalachakra.js';
import { calcCharaDasha, calcCharaAntardashas } from '../dasha/chara.js';
import { calculateConditionalDasha, evaluateConditionalDashaEligibility, calculateNarayanaDasha, calculateNaisargikaDasha } from '../dasha/completeDashaSuite.js';
import { SUPPORTED_VARIANTS, variantStatus } from './SupportedVariantRegistry.js';

function dateWindow(rows=[]){ return rows.map(r=>({lord:r.lord??r.planet??r.sign, startJD:r.startJD, endJD:r.endJD, start:r.start, end:r.end, years:r.years})); }

/** Full selected-variant dasha facade. Every result exposes its formula lineage and eligibility. */
export function calculateCompleteDasha({variant='vimshottari',birthJD,moonLon,ascLon,planets=[],endYear=null,birth={},nowJD=null}={}){
  if(!SUPPORTED_VARIANTS.dasha[variant]) return {status:'UNSUPPORTED_VARIANT',variant,available:Object.keys(SUPPORTED_VARIANTS.dasha)};
  let result;
  if(variant==='vimshottari') result=calcVimshottari(birthJD,moonLon,endYear);
  else if(variant==='yogini') result=calcYoginiDasha(birthJD,moonLon,endYear);
  else if(variant==='kalachakra') result=calcKalachakraDasha(birthJD,moonLon,endYear);
  else if(variant==='chara') result=calcCharaDasha(birthJD,ascLon,planets,endYear);
  else if(['ashtottari','shodashottari','dwadashottari','panchottari','shatabdika','chaturashiti','dwisaptati','shastihayani','shattrimshat'].includes(variant)) {
    const eligibility=evaluateConditionalDashaEligibility(variant,{planets,ascLon,birth,...birth});
    if(eligibility.status!=='ELIGIBLE') return {status:'INELIGIBLE',variant,eligibility,variantId:SUPPORTED_VARIANTS.dasha[variant]};
    result=calculateConditionalDasha(variant,{birthJD,moonLon,endYear,eligibility});
  } else if(variant==='narayana') {
    result=calculateNarayanaDasha({birthJD,ascLon,planets,endYear});
  } else if(variant==='nisarga') {
    result=calculateNaisargikaDasha({birthJD});
  }
  const rows=Array.isArray(result)?result:(result?.dashas||result?.periods||result||[]);
  const enriched=Array.isArray(rows)?rows.map(r=>({...r,sourceVariant:SUPPORTED_VARIANTS.dasha[variant]})):rows;
  const current=Number.isFinite(nowJD)&&Array.isArray(enriched)?enriched.find(r=>nowJD>=Number(r.startJD)&&nowJD<Number(r.endJD))||null:null;
  const antar=current&&variant==='chara' ? calcCharaAntardashas(current,enriched) : [];
  const eligibility=(variant.startsWith('asht')||variant.startsWith('shod')||variant.startsWith('dwad')||variant.startsWith('panch')||variant.startsWith('shat')||variant.startsWith('chatur')||variant.startsWith('dwi')||variant.startsWith('shas')||variant.startsWith('shattrim')) ? evaluateConditionalDashaEligibility(variant,{planets,ascLon,birth,...birth}) : {status:'ELIGIBLE',reason:'Universal/selected variant'};
  const hierarchy = variant==='vimshottari' ? buildVimshottariHierarchy(enriched,5) : variant==='yogini' ? buildYoginiHierarchy(enriched,2) : null;
  return {status:'IMPLEMENTED_VARIANT',variant,variantId:SUPPORTED_VARIANTS.dasha[variant],formulaStatus:'EXPLICIT_VARIANT',eligibility,periods:enriched,current,antardashas:antar,windowCount:Array.isArray(enriched)?enriched.length:0,hierarchy,dateWindow:dateWindow(enriched),methodology:{variantId:SUPPORTED_VARIANTS.dasha[variant],balance:'variant-specific; reported by source calculator',limitation:'Only explicitly encoded variants are calculated; unsupported lineage variants are never guessed.'}};
}

export function listCompleteDashaCorpus(){ return Object.entries(SUPPORTED_VARIANTS.dasha).map(([id,variantId])=>({id,variantId,status:'IMPLEMENTED_VARIANT'})); }
