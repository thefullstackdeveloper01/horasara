/**
 * Explicit Varga variant registry. The calculation kernel remains in
 * charts/vargas.js; this layer records the selectable tradition/variant and
 * prevents one school's formula from masquerading as universal.
 */
import { calcD1,calcD2,calcD3,calcD4,calcD7,calcD9,calcD10,calcD12,calcD16,calcD20,calcD24,calcD27,calcD30,calcD40,calcD45,calcD60 } from './vargas.js';

const KERNELS=Object.freeze({D1:calcD1,D2:calcD2,D3:calcD3,D4:calcD4,D7:calcD7,D9:calcD9,D10:calcD10,D12:calcD12,D16:calcD16,D20:calcD20,D24:calcD24,D27:calcD27,D30:calcD30,D40:calcD40,D45:calcD45,D60:calcD60});
const VARIANTS=Object.freeze({
  D1:['rashi-standard'],D2:['bphs-hora'],D3:['bphs-drekkana'],D4:['bphs-chaturthamsha'],D7:['bphs-saptamsha'],D9:['bphs-navamsha'],D10:['bphs-dashamsha'],D12:['bphs-dvadashamsha'],D16:['bphs-shodashamsha'],D20:['bphs-vimshamsha'],D24:['bphs-chaturvimshamsha'],D27:['bphs-bhamsha'],D30:['bphs-trimshamsha'],D40:['bphs-khavedamsha'],D45:['bphs-akshavedamsha'],D60:['bphs-shashtiamsha'],
});
export function listVargaVariants(){return Object.entries(VARIANTS).flatMap(([division,variants])=>variants.map(id=>({division,id,status:'IMPLEMENTED_VARIANT',sensitivity:['D60','D45','D40'].includes(division)?'HIGH':'STANDARD'})));}
export function calculateVargaVariant(division,longitude,variant=null){const d=String(division).toUpperCase();const fn=KERNELS[d];if(typeof fn!=='function')return {status:'UNSUPPORTED_DIVISION',division:d};const chosen=variant||VARIANTS[d]?.[0];if(!chosen||!VARIANTS[d].includes(chosen))return {status:'UNSUPPORTED_VARIANT',division:d,variant,available:VARIANTS[d]};const value=fn(Number(longitude));return {status:'IMPLEMENTED_VARIANT',division:d,variant:chosen,value,sensitivity:['D60','D45','D40'].includes(d)?'HIGH':'STANDARD',warning:['D60','D45','D40'].includes(d)?'Small birth-time changes can change this Varga; use only with reliable birth time.':null};}
export function compareVargaVariants(division,longitude){const d=String(division).toUpperCase();return (VARIANTS[d]||[]).map(v=>calculateVargaVariant(d,longitude,v));}
export { VARIANTS };
