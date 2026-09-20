import { calculateSynastry, calculateComposite } from '../systems/synastry/SynastryEngine.js';
import { calcFullMilan } from '../milan/ashtakoot.js';
import { mod360 } from '../astronomy/utils.js';
import { SUPPORTED_VARIANTS } from './SupportedVariantRegistry.js';

function midpoint(a,b){ const x=Math.cos(a*Math.PI/180)+Math.cos(b*Math.PI/180),y=Math.sin(a*Math.PI/180)+Math.sin(b*Math.PI/180); return mod360(Math.atan2(y,x)*180/Math.PI); }
function epochJD(a,b){return Number.isFinite(a)&&Number.isFinite(b)?(a+b)/2:null;}
function planetMap(c){return new Map((c?.planets||[]).filter(p=>Number.isFinite(Number(p.siderealLon))).map(p=>[p.name,p]));}
function davison(a,b){const ma=planetMap(a),mb=planetMap(b),names=[...new Set([...ma.keys(),...mb.keys()])]; const planets=names.map(name=>{const x=ma.get(name)?.siderealLon,y=mb.get(name)?.siderealLon;return Number.isFinite(x)&&Number.isFinite(y)?{name,longitude:midpoint(x,y)}:null}).filter(Boolean); const ascA=Number(a?.ascendant?.longitude??a?.ascendant),ascB=Number(b?.ascendant?.longitude??b?.ascendant); return {method:'davison-epoch-midpoint',epochJD:epochJD(Number(a?.JD_UT??a?.JD_TT),Number(b?.JD_UT??b?.JD_TT)),planets,ascendant:Number.isFinite(ascA)&&Number.isFinite(ascB)?midpoint(ascA,ascB):null}; }
function progressedComposite(a,b,progressedA=a,progressedB=b){ const c=calculateComposite(progressedA,progressedB); return {...c,method:'secondary-progressed-midpoint'}; }
export function calculateCompleteRelationship({chartA,chartB,includeMilan=true,includeDavison=true,progressedCharts=null}={}){
 const syn=calculateSynastry(chartA,chartB,{includeKoota:false}); const milan=includeMilan?calcFullMilan(chartA,chartB):null; const composite=calculateComposite(chartA,chartB,{method:'midpoint'}); const dav=includeDavison?davison(chartA,chartB):null; const prog=progressedCharts?progressedComposite(chartA,chartB,progressedCharts.chartA,progressedCharts.chartB):{status:'NOT_AVAILABLE',reason:'Provide progressed chart pair to calculate progressed composite'};
 return {status:'IMPLEMENTED_VARIANT',western:syn,vedicMilan:milan,composite, davison:dav,progressedComposite:prog,methodology:{vedic:SUPPORTED_VARIANTS.relationship.vedic,western:SUPPORTED_VARIANTS.relationship.western,composite:SUPPORTED_VARIANTS.relationship.composite,davison:SUPPORTED_VARIANTS.relationship.davison,progressedComposite:SUPPORTED_VARIANTS.relationship.progressedComposite},separation:'Vedic Koota, Western synastry, midpoint composite and Davison are independent systems; no blended score is silently created.'};
}
