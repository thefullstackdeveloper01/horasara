/** Machine-readable provenance registry. Every high-impact rule can carry a
 * stable rule id, school/lineage, implementation status and source note.
 * Conflicting traditions remain explicit instead of being silently merged.
 */
import ruleData from '../../dataset/used/core/rule-registry.json' with { type: 'json' };
const RULES = Object.freeze(ruleData);
export function listRules(filter={}){return RULES.filter(r=>Object.entries(filter).every(([k,v])=>r[k]===v)).map(r=>({...r}));}
export function getRule(id){const r=RULES.find(x=>x.id===id);return r?{...r}:null;}
export function buildRuleProvenance(ruleIds=[]){return ruleIds.map(id=>getRule(id)).filter(Boolean);}
export { RULES };
