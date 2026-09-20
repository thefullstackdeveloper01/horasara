import { calcVimshottari, getDashaBalance } from './vimshottari.js';
import { calcCharaDasha } from './chara.js';
import { calcYoginiDasha, calcAshtottariDasha } from './yogini.js';
import { calcKalachakraDasha } from './kalachakra.js';
import { calculateConditionalDasha, evaluateConditionalDashaEligibility, calculateNarayanaDasha, calculateSudarshanaDasha, calculateNaisargikaDasha, calculatePindaDasha, calculateAshtakavargaDasha, calculateSandhyaDasha, calculatePachakaDasha, calculateTaraDasha, calculateRashiVariantDasha, listClassicalDashaSystems } from './completeDashaSuite.js';

export function createBuiltinDashaPlugins() {
  const base = [
    { id:'vimshottari', name:'Vimshottari', status:'VERIFIED', source:'BPHS Ch.46, 61–74', calculate:({ birthJD, moonLon }) => calcVimshottari(birthJD, moonLon) },
    { id:'chara', name:'Chara', status:'AVAILABLE', source:'Jaimini/Chara implementation', calculate:({ birthJD, ascLon, planets }) => calcCharaDasha(birthJD, ascLon, planets) },
    { id:'yogini', name:'Yogini', status:'AVAILABLE', source:'BPHS Ch.46', calculate:({ birthJD, moonLon }) => calcYoginiDasha(birthJD, moonLon) },
    { id:'kalachakra', name:'Kalachakra', status:'AVAILABLE', source:'BPHS Ch.46', calculate:({ birthJD, moonLon }) => calcKalachakraDasha(birthJD, moonLon) },
  ];
  const ids=['ashtottari','shodashottari','dwadashottari','panchottari','shatabdika','chaturashiti','dwisaptati','shastihayani','shattrimshat'];
  const conditional=ids.map(id=>{const meta=listClassicalDashaSystems().find(x=>x.id===id);return {id,name:meta?.name||id,status:'CONDITIONAL',source:'BPHS Ch.46; explicit eligibility required',calculate:(input)=>calculateConditionalDasha(id,input),eligibility:(input)=>evaluateConditionalDashaEligibility(id,input)};});
  const specialized=[
    {id:'ashtottari-legacy',name:'Ashtottari (legacy)',status:'CONDITIONAL',source:'Existing implementation retained for compatibility',calculate:({birthJD,moonLon,startPlanet,planets,ascLon})=>calcAshtottariDasha(birthJD,moonLon,startPlanet,planets,ascLon)},
    {id:'narayana',name:'Narayana',status:'AVAILABLE',source:'Jaimini rashi-dasha variant',calculate:calculateNarayanaDasha},
    {id:'sudarshana',name:'Sudarshana Chakra',status:'AVAILABLE',source:'BPHS rashi-year confirmatory system',calculate:calculateSudarshanaDasha},
    {id:'naisargika',name:'Naisargika',status:'AVAILABLE',source:'Classical natural dasha layer',calculate:calculateNaisargikaDasha},
    {id:'pinda',name:'Pinda',status:'AVAILABLE',source:'Strength-based supplementary dasha',calculate:calculatePindaDasha},
    {id:'ashtakavarga',name:'Ashtakavarga Dasha',status:'AVAILABLE',source:'Sarvashtakavarga-weighted supplementary timing',calculate:calculateAshtakavargaDasha},
    {id:'sandhya',name:'Sandhya',status:'AVAILABLE',source:'Dasha-junction supplementary layer',calculate:({dashaRows})=>calculateSandhyaDasha(dashaRows)},
    {id:'pachaka',name:'Pachaka',status:'AVAILABLE',source:'Planetary-ripening supplementary layer',calculate:({currentDasha,planets})=>calculatePachakaDasha(currentDasha,{planets})},
    {id:'tara',name:'Tara',status:'AVAILABLE',source:'Kendra-priority supplementary layer',calculate:calculateTaraDasha},
    {id:'balance',name:'Vimshottari Balance',status:'VERIFIED',source:'Moon nakshatra balance',calculate:({moonLon})=>getDashaBalance(moonLon)}
  ];
  const covered=new Set([...base,...conditional,...specialized].map(x=>x.id));
  const variantPlugins=listClassicalDashaSystems().filter(meta=>!covered.has(meta.id)).map(meta=>({id:meta.id,name:meta.name,status:'AVAILABLE_VARIANT',source:'Explicit deterministic variant adapter; tradition-specific variants remain selectable',calculate:(input)=>calculateRashiVariantDasha(meta.id,input)}));
  return [...base,...conditional,...specialized,...variantPlugins];
}
