/**
 * Classical Prashna / Horary calculation layer.
 *
 * This engine intentionally separates COMPUTATION from interpretation:
 * - question category is either explicit or keyword-classified;
 * - primary/secondary houses are deterministic;
 * - signification and applying lunar contacts are computed from the supplied
 *   event chart;
 * - yes/no and timing are scored from explicit, inspectable rules;
 * - no empirical probability is claimed.
 *
 * Prashna has many lineages (Prashna Marga, Tajika-derived, KP Horary, etc.).
 * `method` selects a rule family instead of blending incompatible doctrines.
 */
import { NAKSHATRAS, SIGN_LORDS, SIGNS } from '../../astronomy/constants.js';
import ruleData from '../../../dataset/used/core/system-rules.json' with { type: 'json' };
import { angularDistance } from '../../core/math/angularDistance.js';

const QUESTION_HOUSES = Object.freeze({
  marriage:[7,2,11], partnership:[7,11,2], love:[5,7,11], career:[10,6,11,2], job:[10,6,11,2], business:[7,10,11,2], finance:[2,11,5], wealth:[2,11,9], property:[4,2,11], vehicle:[4,11], education:[4,5,9], children:[5,2,11], pregnancy:[5,11], travel:[3,9,12], foreign:[9,12,7], litigation:[6,7,8,12], illness:[1,6,8,12], recovery:[1,5,11], spiritual:[5,9,12], promotion:[10,11,2], loss:[8,12,6]
});
const BENEFICS=new Set(ruleData.prashna.BENEFICS);
const MALefICS=new Set(ruleData.prashna.MALEFICS);
const ASPECTS=ruleData.prashna.ASPECTS;

export function classifyPrashnaQuestion(question=''){
  const q=String(question).toLowerCase();
  for(const [category,keys] of Object.entries({marriage:['marriage','spouse','wedding'],career:['career','job','employment','promotion'],business:['business','company','startup'],finance:['money','finance','wealth','income'],property:['house','property','land','real estate'],children:['child','children','pregnant','pregnancy'],education:['study','education','exam','college'],travel:['travel','journey','trip'],foreign:['abroad','foreign','settlement','immigration'],litigation:['court','case','lawsuit','litigation'],illness:['illness','disease','health','sick'],recovery:['recover','recovery','cure'],spiritual:['spiritual','meditation','moksha','initiation']})) if(keys.some(k=>q.includes(k))) return {category,source:'keyword-classifier'};
  return {category:'general',source:'unclassified'};
}

function moonHouseFromAsc(eventChart,moon){
  if(!moon||!Number.isFinite(Number(moon.siderealLon))) return null;
  const asc=eventChart.ascendant?.longitude??eventChart.ascendant;
  if(!Number.isFinite(Number(asc))) return null;
  return ((Math.floor(((Number(moon.siderealLon)%360)+360)%360/30)-Math.floor(((Number(asc)%360)+360)%360/30)+12)%12)+1;
}
function houseOfPlanet(p,eventChart){
  if(Number.isInteger(p.house)) return p.house;
  const asc=eventChart.ascendant?.longitude??eventChart.ascendant;
  if(!Number.isFinite(asc)||!Number.isFinite(p.siderealLon)) return null;
  return ((Math.floor(p.siderealLon/30)-Math.floor(((asc%360)+360)%360/30)+12)%12)+1;
}
function lordForHouse(h,eventChart){
  const houses=eventChart.houses||[]; const row=houses.find(x=>x.house===h)||houses[h-1]; if(row?.lord) return row.lord;
  const asc=eventChart.ascendant?.longitude??eventChart.ascendant; if(!Number.isFinite(asc)) return null;
  return SIGN_LORDS[SIGNS[(Math.floor(((asc%360)+360)%360/30)+h-1)%12]];
}
function isApplying(a,b){
  if(!Number.isFinite(a?.siderealLon)||!Number.isFinite(b?.siderealLon)||!Number.isFinite(a?.speed)||!Number.isFinite(b?.speed)) return null;
  const d=angularDistance(a.siderealLon,b.siderealLon); const rel=Math.abs(a.speed)>0?Math.sign(a.speed):0; return {distance:d,applying: rel!==0 ? (Math.sign(((b.siderealLon-a.siderealLon+540)%360)-180)===rel) : null};
}
function grahaDrishti(from,to){
  const hf=from.house, ht=to.house; if(!Number.isInteger(hf)||!Number.isInteger(ht)||hf===ht) return null;
  const n=((ht-hf+12)%12)+1; return (ASPECTS[from.name]||[7]).includes(n)?n:null;
}
function planetStrength(p){
  const dignity=String(p.dignity||'').toLowerCase(); let score=50;
  if(/exalt|own|moolatrikona/.test(dignity)) score+=25; if(/debil/.test(dignity)) score-=25; if(p.retrograde) score-=3; if(p.combust) score-=12; if(Number.isFinite(p.shadbala)) score=Math.max(score,Math.min(100,p.shadbala)); return Math.max(0,Math.min(100,score));
}

function evaluateMethodVariant(base,method,ctx){
  if(method==='kp') return {...base,ruleFamily:'KP-Horary',adjustments:['Cuspal sub-lord is evaluated separately when kpChart is supplied.']};
  if(method==='tajika') return {...base,ruleFamily:'Tajika-Horary',adjustments:[ctx.moon?.phase==='waxing'?'Muntha-like lunar growth support':'Lunar phase caution']};
  if(method==='prashna-marga') return {...base,ruleFamily:'Prashna-Marga-Inspired',adjustments:['Primary houses + Lagna lord + Moon applying contact are retained; lineage-specific omens are not invented.']};
  return {...base,ruleFamily:'Classical-Prashna-Rule-Layer',adjustments:[]};
}

function evaluateYesNo({ascLord,moon,beneficContact,maleficContact,relevantHouses,planets,method}){
  let score=50; const reasons=[];
  const ascStrength=ascLord?planetStrength(ascLord):50;
  score += (ascStrength-50)*0.25; reasons.push(`Lagna lord strength ${ascStrength.toFixed(0)}`);
  if(moon){ if(moon.phase==='waxing'||moon.waxing===true){score+=8;reasons.push('waxing Moon support');} else if(moon.phase==='waning'||moon.waxing===false){score-=5;reasons.push('waning Moon');} }
  if(beneficContact){score+=15; reasons.push(`applying benefic contact from ${beneficContact.from}`);} if(maleficContact){score-=15; reasons.push(`applying malefic contact from ${maleficContact.from}`);}
  const relevantSet=new Set(relevantHouses||[]); for(const p of planets){if(relevantSet.has(p.house) && BENEFICS.has(p.name)) score+=4; if(relevantSet.has(p.house) && MALefICS.has(p.name)) score-=3;}
  const s=Math.max(0,Math.min(100,score)); return {score:s,verdict:s>=60?'YES':s<=40?'NO':'UNCERTAIN',reasons,method};
}

export function calculatePrashna({eventChart,question='',significatorHouse=null,method='classical'}={}){
  if(!eventChart?.planets) throw new TypeError('Prashna requires an event-time chart');
  const asc=eventChart.ascendant?.longitude??eventChart.ascendant??null; const planets=eventChart.planets.map(p=>({...p,house:houseOfPlanet(p,eventChart)}));
  const derivedMoonHouse = moonHouseFromAsc(eventChart, eventChart.planets.find(p=>p.name==='Moon'));
  const moon=planets.find(p=>p.name==='Moon'); const q=typeof question==='object'&&question?question:classifyPrashnaQuestion(question); const category=q.category||'general';
  const relevantHouses=significatorHouse?[significatorHouse]:QUESTION_HOUSES[category]||[1,7,10,11];
  const lagnaLordName=lordForHouse(1,eventChart); const ascLord=planets.find(p=>p.name===lagnaLordName);
  const significators=relevantHouses.map(h=>({house:h,lord:lordForHouse(h,eventChart),occupants:planets.filter(p=>p.house===h).map(p=>p.name)}));
  let bestBenefic=null,bestMalefic=null;
  if(moon){ for(const p of planets.filter(p=>p.name!=='Moon')){const app=isApplying(moon,p); if(!app?.applying) continue; const dr=grahaDrishti(moon,p); if(dr||angularDistance(moon.siderealLon,p.siderealLon)<=12){const row={from:p.name,distance:app.distance,aspect:dr||'conjunction',type:BENEFICS.has(p.name)?'benefic':'malefic'}; if(row.type==='benefic'&&!bestBenefic)bestBenefic=row; if(row.type==='malefic'&&!bestMalefic)bestMalefic=row;}} }
  const yesNo=evaluateMethodVariant(evaluateYesNo({ascLord,moon,beneficContact:bestBenefic,maleficContact:bestMalefic,relevantHouses,planets,method}),method,{moon});
  const timingBase=moon&&Number.isFinite(moon.speed)?Math.max(0.5,Math.min(12,12-Math.min(11,angularDistance(moon.siderealLon,planets.find(p=>p.name!== 'Moon')?.siderealLon??moon.siderealLon)/Math.max(0.1,Math.abs(moon.speed))))):null;
  const kp={status:'NOT_APPLIED'};
  if(method==='kp' && eventChart.kpChart){ const cusp=eventChart.kpChart.cusps?.find(c=>c.house===relevantHouses[0]); kp.status=cusp?'AVAILABLE':'NOT_AVAILABLE'; kp.cuspSubLord=cusp?.kp?.subLord||null; kp.rule='Event is supported when relevant cuspal sub-lord signifies the required house set; this is evaluated without blending classical Prashna rules.'; }
  return {type:'prashna',derivedMoonHouse,typeOfQuestion:q.category,question:String(question||''),eventJD:eventChart.JD_UT??eventChart.JD_TT??null,method,questionClassification:q,primaryHouses:relevantHouses,lagna:{longitude:Number.isFinite(asc)?asc:null,lord:lagnaLordName,lordStrength:ascLord?planetStrength(ascLord):null},moon:{name:moon?.name||null,house:moon?.house??null,nakshatra:moon?.nakshatra||null,nakshatraIndex:Number.isFinite(moon?.siderealLon)?Math.floor(moon.siderealLon/(40/3)):null},significators,contacts:{applyingBenefic:bestBenefic,applyingMalefic:bestMalefic},answer:yesNo,timing:{status:timingBase==null?'NOT_AVAILABLE':'INDICATIVE',estimatedUnits:timingBase,unit:'context-dependent periods, not guaranteed calendar dates'},kp,confidence:{status:'RULE_BASED_NOT_EMPIRICAL',score:yesNo.score,meaning:'Rule-consistency score, not probability.'},audit:{housesSource:eventChart.houses?'event-chart-houses':'derived-from-Lagna',rulesVersion:'prashna-v3',ruleFamily:yesNo.ruleFamily}};
}
