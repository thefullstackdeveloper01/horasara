/** Canonical calculation audit manifest. It records the input/configuration
 * that materially determines a result and the output fingerprints. High-impact
 * rule families are attached by stable IDs so a result is reproducible and
 * inspectable without serialising the entire chart twice.
 */
import crypto from 'node:crypto';
import { buildRuleProvenance } from '../reference/RuleRegistry.js';
import ruleData from '../../dataset/used/core/system-rules.json' with { type: 'json' };
function stable(v){ if(v===null||typeof v!=='object') return v; if(Array.isArray(v)) return v.map(stable); return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])); }
function hash(v){ return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex'); }
const RULE_IDS=ruleData.audit.RULE_IDS;
/*['BPHS.DASHA.VIMSHOTTARI','BPHS.DASHA.UDU-CONDITIONAL','KP.CUSP-SUB-LORD','JAIMINI.ARUDHA','JAIMINI.KARAKAMSHA','TAJIKA.VARSHAPHAL','LAL.KITAB.35Y','SBC.81GRID','PRASHNA.HORARY','MILAN.ASHTAKOOT'];
*/
export function buildCalculationAudit({meta={},birth={},config={},planets=[],houses=[],dasha={},predictionTruth=null}={}){
 const input={birth,config,ayanamsa:meta.ayanamsaMode,houseSystem:meta.houseSystem,nodeMode:meta.nodeMode,provider:meta.ephemerisProvider};
 const result={planetCount:planets.length,houseCount:houses.length,dashaCurrent:dasha.current||null,predictionStatus:predictionTruth?.status||null};
 return {status:'AVAILABLE',version:'2.0',pipeline:['INPUT','TIME NORMALIZATION','EPHEMERIS','SIDEREAL CONVERSION','ASCENDANT/HOUSES','VARGAS','DASHAS','STRENGTH','YOGAS/DOSHAS','TRANSITS','PREDICTION RULES','EVIDENCE','TIMING','REPORT'],input:{...input,fingerprint:hash(input)},formulas:{astronomy:'Selected ephemeris provider + configured ayanamsa',houses:meta.houseSystem||'configured',dashas:'Registered dasha engines with explicit eligibility/variant metadata',prediction:'Canonical event rules + event-specific transit evidence'},parameters:{ayanamsa:meta.ayanamsaMode,houseSystem:meta.houseSystem,nodeMode:meta.nodeMode},rules:buildRuleProvenance(RULE_IDS),result:{...result,fingerprint:hash(result)},auditHash:hash({input,result,rules:RULE_IDS})};
}
